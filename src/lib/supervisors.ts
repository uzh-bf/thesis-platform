import type { Department, PrismaClient } from '@prisma/client'
import { UserRole } from 'src/lib/constants'

export interface Supervisor {
  id: string
  name: string
  email: string
  topicAreaSlugs: string[]
  submissionNotifications: boolean
  // Internal admin notes; not part of the supervisor's own settings.
  notes: string | null
}

export interface SupervisorUser extends Supervisor {
  role: string
  department: Department | null
}

export interface TopicAreaOption {
  slug: string
  name: string
}

export interface SupervisorSettings {
  topicAreaSlugs: string[]
  submissionNotifications: boolean
}

export interface SupervisorStore {
  listSupervisors(): Promise<Supervisor[]>
  findUserById(id: string): Promise<SupervisorUser | null>
  findUserByEmail(email: string): Promise<SupervisorUser | null>
  // Topic areas of this department; supervisors can only pick from these.
  listTopicAreas(): Promise<TopicAreaOption[]>
  createSupervisor(
    data: {
      name: string
      email: string
      notes: string | null
    } & SupervisorSettings
  ): Promise<Supervisor>
  updateUser(
    id: string,
    data: {
      name?: string
      role?: string
      department?: Department
      notes?: string | null
    } & Partial<SupervisorSettings>
  ): Promise<Supervisor>
  findSupervisorsToNotify(
    topicAreaSlug: string
  ): Promise<{ name: string; email: string }[]>
}

export type SupervisorErrorCode =
  | 'NOT_FOUND'
  | 'NOT_A_SUPERVISOR'
  | 'OTHER_DEPARTMENT'
  | 'DEVELOPER'
  | 'ALREADY_SUPERVISOR'
  | 'UNKNOWN_TOPIC_AREA'

export class SupervisorError extends Error {
  constructor(
    readonly code: SupervisorErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'SupervisorError'
  }
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  supervisorSubmissionNotifications: true,
  supervisorNotes: true,
  supervisorTopicAreas: { select: { slug: true }, orderBy: { name: 'asc' } },
} as const

type SelectedUser = {
  id: string
  name: string
  email: string
  role: string
  department: Department | null
  supervisorSubmissionNotifications: boolean
  supervisorNotes: string | null
  supervisorTopicAreas: { slug: string }[]
}

const toSupervisorUser = (user: SelectedUser): SupervisorUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  topicAreaSlugs: user.supervisorTopicAreas.map((area) => area.slug),
  submissionNotifications: user.supervisorSubmissionNotifications,
  notes: user.supervisorNotes,
})

const toSupervisor = ({ role: _r, department: _d, ...rest }: SupervisorUser) =>
  rest

export function createPrismaSupervisorStore(
  prisma: PrismaClient,
  department: Department
): SupervisorStore {
  const settingsData = (settings: Partial<SupervisorSettings>) => ({
    ...(settings.submissionNotifications !== undefined
      ? {
          supervisorSubmissionNotifications: settings.submissionNotifications,
        }
      : {}),
    ...(settings.topicAreaSlugs !== undefined
      ? {
          supervisorTopicAreas: {
            set: settings.topicAreaSlugs.map((slug) => ({ slug })),
          },
        }
      : {}),
  })

  return {
    async listSupervisors() {
      const users = await prisma.user.findMany({
        where: { role: UserRole.SUPERVISOR, department },
        select: userSelect,
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
      })
      return users.map((user) => toSupervisor(toSupervisorUser(user)))
    },

    async findUserById(id) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: userSelect,
      })
      return user ? toSupervisorUser(user) : null
    },

    async findUserByEmail(email) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: userSelect,
      })
      return user ? toSupervisorUser(user) : null
    },

    listTopicAreas() {
      return prisma.topicArea.findMany({
        where: { department },
        select: { slug: true, name: true },
        orderBy: { name: 'asc' },
      })
    },

    async createSupervisor({
      name,
      email,
      notes,
      topicAreaSlugs,
      ...settings
    }) {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: UserRole.SUPERVISOR,
          department,
          supervisorSubmissionNotifications: settings.submissionNotifications,
          supervisorNotes: notes,
          supervisorTopicAreas: {
            connect: topicAreaSlugs.map((slug) => ({ slug })),
          },
        },
        select: userSelect,
      })
      return toSupervisor(toSupervisorUser(user))
    },

    async updateUser(
      id,
      { name, role, department: newDepartment, notes, ...rest }
    ) {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(notes !== undefined ? { supervisorNotes: notes } : {}),
          ...(role !== undefined ? { role } : {}),
          ...(newDepartment !== undefined ? { department: newDepartment } : {}),
          ...settingsData(rest),
        },
        select: userSelect,
      })
      return toSupervisor(toSupervisorUser(user))
    },

    findSupervisorsToNotify(topicAreaSlug) {
      return prisma.user.findMany({
        where: {
          role: UserRole.SUPERVISOR,
          department,
          supervisorSubmissionNotifications: true,
          supervisorTopicAreas: { some: { slug: topicAreaSlug } },
        },
        select: { name: true, email: true },
        orderBy: { email: 'asc' },
      })
    },
  }
}

async function assertKnownTopicAreas(store: SupervisorStore, slugs: string[]) {
  const known = new Set((await store.listTopicAreas()).map((a) => a.slug))
  const unknown = slugs.filter((slug) => !known.has(slug))
  if (unknown.length > 0) {
    throw new SupervisorError(
      'UNKNOWN_TOPIC_AREA',
      `Unknown topic area: ${unknown.join(', ')}`
    )
  }
}

const sortSlugs = (slugs: string[]) =>
  [...slugs].sort((a, b) => a.localeCompare(b))

const uniqueSlugs = (slugs: string[]) => sortSlugs([...new Set(slugs)])

// Blank notes are stored as null; undefined leaves stored notes unchanged.
const normalizeNotes = (notes: string | undefined) =>
  notes === undefined ? undefined : notes.trim() || null

// Replaces the Power Automate "User Creation With Supervisor Role" flow: adds
// a new user as supervisor, or makes an existing user of this department one.
// An existing user gets the new name, as with the flow. Existing supervisors
// are refused so that adding someone twice cannot wipe their settings.
export async function addSupervisor({
  store,
  department,
  name,
  email,
  topicAreaSlugs,
  submissionNotifications,
  notes,
}: {
  store: SupervisorStore
  department: Department
  name: string
  email: string
  notes?: string
} & SupervisorSettings): Promise<{
  // The user before it became a supervisor; null for a new user.
  before: SupervisorUser | null
  after: Supervisor
}> {
  const settings = {
    topicAreaSlugs: uniqueSlugs(topicAreaSlugs),
    submissionNotifications,
  }
  await assertKnownTopicAreas(store, settings.topicAreaSlugs)

  const normalizedEmail = email.trim().toLowerCase()
  const trimmedName = name.trim()
  const existing = await store.findUserByEmail(normalizedEmail)

  if (!existing) {
    const after = await store.createSupervisor({
      name: trimmedName,
      email: normalizedEmail,
      notes: normalizeNotes(notes) ?? null,
      ...settings,
    })
    return { before: null, after }
  }

  if (existing.department && existing.department !== department) {
    throw new SupervisorError(
      'OTHER_DEPARTMENT',
      `${existing.email} belongs to another department`
    )
  }
  // Developers already see everything supervisors see; the single role field
  // cannot hold both.
  if (existing.role === UserRole.DEVELOPER) {
    throw new SupervisorError(
      'DEVELOPER',
      `${existing.email} is a developer and cannot be made a supervisor`
    )
  }
  if (existing.role === UserRole.SUPERVISOR) {
    throw new SupervisorError(
      'ALREADY_SUPERVISOR',
      `${existing.email} is already a supervisor; use Edit to change their settings`
    )
  }

  const after = await store.updateUser(existing.id, {
    name: trimmedName,
    role: UserRole.SUPERVISOR,
    department,
    ...settings,
    ...(notes !== undefined ? { notes: normalizeNotes(notes) } : {}),
  })
  return { before: existing, after }
}

async function findSupervisor(
  store: SupervisorStore,
  department: Department,
  userId: string
) {
  const user = await store.findUserById(userId)
  if (!user || user.department !== department) {
    throw new SupervisorError('NOT_FOUND', 'Supervisor not found')
  }
  if (user.role !== UserRole.SUPERVISOR) {
    throw new SupervisorError(
      'NOT_A_SUPERVISOR',
      `${user.email} is not a supervisor`
    )
  }
  return user
}

// Used by admins for any supervisor and by supervisors for themselves; only
// admins pass notes.
export async function updateSupervisorSettings({
  store,
  department,
  userId,
  topicAreaSlugs,
  submissionNotifications,
  notes,
}: {
  store: SupervisorStore
  department: Department
  userId: string
  notes?: string
} & SupervisorSettings): Promise<{ before: Supervisor; after: Supervisor }> {
  const settings = {
    topicAreaSlugs: uniqueSlugs(topicAreaSlugs),
    submissionNotifications,
  }
  await assertKnownTopicAreas(store, settings.topicAreaSlugs)
  const existing = await findSupervisor(store, department, userId)
  const after = await store.updateUser(existing.id, {
    ...settings,
    ...(notes !== undefined ? { notes: normalizeNotes(notes) } : {}),
  })
  return { before: toSupervisor(existing), after }
}

// The user is kept: proposals, supervisions and feedback reference it. Notes
// are kept too, as context in case the person is added again.
export async function removeSupervisorRole({
  store,
  department,
  userId,
}: {
  store: SupervisorStore
  department: Department
  userId: string
}): Promise<{ before: Supervisor; after: Supervisor }> {
  const existing = await findSupervisor(store, department, userId)
  const after = await store.updateUser(existing.id, {
    role: 'UNSET',
    topicAreaSlugs: [],
    submissionNotifications: false,
  })
  return { before: toSupervisor(existing), after }
}

// Supervisors to email about a new student submission in the given topic
// area: those who chose the area and enabled notifications.
export function findSupervisorsToNotify(
  store: SupervisorStore,
  topicAreaSlug: string
) {
  return store.findSupervisorsToNotify(topicAreaSlug)
}

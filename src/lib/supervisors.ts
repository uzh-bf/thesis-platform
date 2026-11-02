import type { Department, PrismaClient } from '@prisma/client'
import { UserRole } from 'src/lib/constants'

export interface Supervisor {
  id: string
  name: string
  email: string
  topicAreaSlugs: string[]
  submissionNotifications: boolean
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
    data: { name: string; email: string } & SupervisorSettings
  ): Promise<Supervisor>
  updateUser(
    id: string,
    data: {
      name?: string
      role?: string
      department?: Department
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
  supervisorTopicAreas: { select: { slug: true }, orderBy: { name: 'asc' } },
} as const

type SelectedUser = {
  id: string
  name: string
  email: string
  role: string
  department: Department | null
  supervisorSubmissionNotifications: boolean
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

    async createSupervisor({ name, email, topicAreaSlugs, ...settings }) {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: UserRole.SUPERVISOR,
          department,
          supervisorSubmissionNotifications: settings.submissionNotifications,
          supervisorTopicAreas: {
            connect: topicAreaSlugs.map((slug) => ({ slug })),
          },
        },
        select: userSelect,
      })
      return toSupervisor(toSupervisorUser(user))
    },

    async updateUser(id, { name, role, department: newDepartment, ...rest }) {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
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

// Replaces the Power Automate "User Creation With Supervisor Role" flow: adds
// a new user as supervisor, or makes an existing user of this department one.
// Like the flow, the name of an existing user is updated.
export async function addSupervisor({
  store,
  department,
  name,
  email,
  topicAreaSlugs,
  submissionNotifications,
}: {
  store: SupervisorStore
  department: Department
  name: string
  email: string
} & SupervisorSettings): Promise<{
  before: Supervisor | null
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

  const after = await store.updateUser(existing.id, {
    name: trimmedName,
    role: UserRole.SUPERVISOR,
    department,
    ...settings,
  })
  return {
    before:
      existing.role === UserRole.SUPERVISOR ? toSupervisor(existing) : null,
    after,
  }
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

// Used by admins for any supervisor and by supervisors for themselves.
export async function updateSupervisorSettings({
  store,
  department,
  userId,
  topicAreaSlugs,
  submissionNotifications,
}: {
  store: SupervisorStore
  department: Department
  userId: string
} & SupervisorSettings): Promise<{ before: Supervisor; after: Supervisor }> {
  const settings = {
    topicAreaSlugs: uniqueSlugs(topicAreaSlugs),
    submissionNotifications,
  }
  await assertKnownTopicAreas(store, settings.topicAreaSlugs)
  const existing = await findSupervisor(store, department, userId)
  const after = await store.updateUser(existing.id, settings)
  return { before: toSupervisor(existing), after }
}

// The user is kept: proposals, supervisions and feedback reference it.
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

// --- One-time import of the SharePoint "Thesis Supervisors" list -----------

export interface SupervisorImportRow {
  line: number
  name: string
  // Set when the export contains the person's email address.
  email: string | null
  areasOfInterest: string
  emailNotification: string
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '')
  const firstLine = source.split(/\r?\n/, 1)[0] ?? ''
  const delimiter =
    firstLine.split(';').length > firstLine.split(',').length ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  let i = 0
  while (i < source.length) {
    const char = source[i]
    if (char === '"') {
      const quoted = readQuotedField(source, i + 1)
      field += quoted.value
      i = quoted.end
      continue
    }
    if (char === delimiter) endField()
    else if (char === '\n') endRow()
    else if (char !== '\r') field += char
    i++
  }
  if (field !== '' || row.length > 0) endRow()

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

// Reads a quoted field from just after its opening quote; "" stands for one
// quote. Returns the value and the index after the closing quote.
function readQuotedField(source: string, start: number) {
  let value = ''
  let i = start
  while (i < source.length) {
    if (source[i] !== '"') {
      value += source[i]
      i++
    } else if (source[i + 1] === '"') {
      value += '"'
      i += 2
    } else {
      return { value, end: i + 1 }
    }
  }
  return { value, end: i }
}

const normalizeHeader = (value: string) =>
  value.toLowerCase().replace(/[^a-z]/g, '')

const isEmail = (value: string) => {
  const at = value.indexOf('@')
  const dot = value.lastIndexOf('.')
  return (
    at > 0 &&
    at === value.lastIndexOf('@') &&
    dot > at + 1 &&
    dot < value.length - 1 &&
    !/\s/.test(value)
  )
}

// Reads a CSV export of the SharePoint list. Columns are found by header
// (Name, Person, AreasOfInterest, EmailNotification), so column order and
// extra columns do not matter.
export function parseSupervisorCsv(text: string): SupervisorImportRow[] {
  const [header, ...rows] = parseCsv(text)
  if (!header) return []

  const headers = header.map(normalizeHeader)
  const column = (...names: string[]) =>
    headers.findIndex((h) => names.includes(h))
  const nameColumn = column('name')
  const personColumn = column('person', 'personemail', 'email')
  const areasColumn = column('areasofinterest', 'areaofinterest')
  const notificationColumn = column('emailnotification', 'emailnotifications')

  if (nameColumn < 0 || areasColumn < 0 || notificationColumn < 0) {
    throw new Error(
      'The CSV needs the columns Name, AreasOfInterest and EmailNotification'
    )
  }

  return rows.map((cells, index) => {
    const person = personColumn >= 0 ? (cells[personColumn] ?? '').trim() : ''
    return {
      line: index + 2,
      name: (cells[nameColumn] ?? '').trim(),
      email: isEmail(person) ? person.toLowerCase() : null,
      areasOfInterest: cells[areasColumn] ?? '',
      emailNotification: (cells[notificationColumn] ?? '').trim(),
    }
  })
}

// SharePoint joins multi-choice values with ";#", ", " or ";" depending on the
// export, and IBW area names contain commas themselves. Looking for each known
// name in the cell works for all of these; no area name contains another.
export function matchTopicAreas(value: string, topicAreas: TopicAreaOption[]) {
  const cell = value.toLowerCase()
  return topicAreas
    .filter((area) => cell.includes(area.name.toLowerCase()))
    .map((area) => area.slug)
    .sort((a, b) => a.localeCompare(b))
}

// The flow only notified supervisors whose EmailNotification was "y".
export const isNotificationEnabled = (value: string) =>
  /^(y|yes|true|1|ja)$/i.test(value.trim())

export interface SupervisorImportMatch {
  line: number
  supervisor: Supervisor
  settings: SupervisorSettings
  changed: boolean
}

export interface SupervisorImportSkip {
  line: number
  name: string
  reason: string
}

export async function planSupervisorImport({
  store,
  rows,
}: {
  store: SupervisorStore
  rows: SupervisorImportRow[]
}): Promise<{
  matches: SupervisorImportMatch[]
  skipped: SupervisorImportSkip[]
}> {
  const [supervisors, topicAreas] = await Promise.all([
    store.listSupervisors(),
    store.listTopicAreas(),
  ])
  const byEmail = new Map(supervisors.map((s) => [s.email.toLowerCase(), s]))
  const byName = new Map<string, Supervisor[]>()
  for (const supervisor of supervisors) {
    const key = supervisor.name.trim().toLowerCase()
    byName.set(key, [...(byName.get(key) ?? []), supervisor])
  }

  const matches: SupervisorImportMatch[] = []
  const skipped: SupervisorImportSkip[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const skip = (reason: string) =>
      skipped.push({
        line: row.line,
        name: row.name || row.email || '',
        reason,
      })

    let supervisor = row.email ? byEmail.get(row.email) : undefined
    if (!supervisor) {
      const candidates = byName.get(row.name.toLowerCase()) ?? []
      if (candidates.length > 1) {
        skip('Several supervisors have this name')
        continue
      }
      supervisor = candidates[0]
    }
    if (!supervisor) {
      skip('No supervisor with this name or email in the app')
      continue
    }
    if (seen.has(supervisor.id)) {
      skip(`${supervisor.email} appears more than once`)
      continue
    }
    seen.add(supervisor.id)

    const settings = {
      topicAreaSlugs: matchTopicAreas(row.areasOfInterest, topicAreas),
      submissionNotifications: isNotificationEnabled(row.emailNotification),
    }
    matches.push({
      line: row.line,
      supervisor,
      settings,
      changed:
        settings.submissionNotifications !==
          supervisor.submissionNotifications ||
        settings.topicAreaSlugs.join() !==
          sortSlugs(supervisor.topicAreaSlugs).join(),
    })
  }

  return { matches, skipped }
}

export async function applySupervisorImport({
  store,
  matches,
}: {
  store: SupervisorStore
  matches: SupervisorImportMatch[]
}): Promise<number> {
  const changed = matches.filter((match) => match.changed)
  await Promise.all(
    changed.map((match) =>
      store.updateUser(match.supervisor.id, match.settings)
    )
  )
  return changed.length
}

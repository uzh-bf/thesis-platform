import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SupervisorError,
  addSupervisor,
  findSupervisorsToNotify,
  removeSupervisorRole,
  updateSupervisorSettings,
  type SupervisorStore,
  type SupervisorUser,
} from './supervisors'

const topicAreas = [
  { slug: 'corporate_finance', name: 'Corporate Finance' },
  { slug: 'banking_and_insurance', name: 'Banking and Insurance' },
  {
    slug: 'strategy_organization_and_innovation',
    name: 'Strategy, Organization & Innovation',
  },
]

const user = (overrides: Partial<SupervisorUser> = {}): SupervisorUser => ({
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@df.uzh.ch',
  role: 'SUPERVISOR',
  department: 'DF',
  topicAreaSlugs: [],
  submissionNotifications: false,
  notes: null,
  ...overrides,
})

function createStore(initial: SupervisorUser[] = []) {
  const users = new Map(initial.map((u) => [u.id, { ...u }]))
  const strip = ({ role: _r, department: _d, ...rest }: SupervisorUser) => rest
  const store: SupervisorStore = {
    async listSupervisors() {
      return [...users.values()]
        .filter((u) => u.role === 'SUPERVISOR' && u.department === 'DF')
        .map(strip)
    },
    async findUserById(id) {
      return users.get(id) ?? null
    },
    async findUserByEmail(email) {
      return (
        [...users.values()].find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        ) ?? null
      )
    },
    async listTopicAreas() {
      return topicAreas
    },
    async createSupervisor(data) {
      const created = user({ id: `u${users.size + 1}`, ...data })
      users.set(created.id, created)
      return strip(created)
    },
    async updateUser(id, data) {
      const updated = { ...users.get(id)!, ...data }
      users.set(id, updated)
      return strip(updated)
    },
    async findSupervisorsToNotify(slug) {
      return [...users.values()]
        .filter(
          (u) =>
            u.role === 'SUPERVISOR' &&
            u.submissionNotifications &&
            u.topicAreaSlugs.includes(slug)
        )
        .map(({ name, email }) => ({ name, email }))
    },
  }
  return { store, users }
}

const settings = {
  topicAreaSlugs: ['corporate_finance'],
  submissionNotifications: true,
}

test('adds a new supervisor with normalized email and settings', async () => {
  const { store, users } = createStore()
  const result = await addSupervisor({
    store,
    department: 'DF',
    name: '  Grace Hopper ',
    email: ' Grace@DF.uzh.ch ',
    topicAreaSlugs: ['corporate_finance', 'corporate_finance'],
    submissionNotifications: true,
  })

  assert.equal(result.before, null)
  assert.equal(result.after.email, 'grace@df.uzh.ch')
  assert.equal(result.after.name, 'Grace Hopper')
  assert.deepEqual(result.after.topicAreaSlugs, ['corporate_finance'])
  assert.equal(users.size, 1)
})

test('promotes an existing user and updates the name like the flow did', async () => {
  const { store, users } = createStore([
    user({ role: 'UNSET', department: null, name: 'Old Name' }),
  ])
  const result = await addSupervisor({
    store,
    department: 'DF',
    name: 'Ada Lovelace',
    email: 'ADA@df.uzh.ch',
    ...settings,
  })

  assert.equal(result.before?.role, 'UNSET')
  const stored = users.get('u1')!
  assert.equal(stored.role, 'SUPERVISOR')
  assert.equal(stored.department, 'DF')
  assert.equal(stored.name, 'Ada Lovelace')
  assert.equal(stored.submissionNotifications, true)
})

test('re-adding a former supervisor sets only the new name and areas', async () => {
  const { store, users } = createStore([user()])
  await removeSupervisorRole({ store, department: 'DF', userId: 'u1' })

  await addSupervisor({
    store,
    department: 'DF',
    name: 'Ada King',
    email: 'ada@df.uzh.ch',
    topicAreaSlugs: ['banking_and_insurance'],
    submissionNotifications: false,
  })

  assert.deepEqual(users.get('u1'), {
    ...user(),
    name: 'Ada King',
    topicAreaSlugs: ['banking_and_insurance'],
  })
})

test('refuses to add an existing supervisor and changes nothing', async () => {
  const existing = user({
    topicAreaSlugs: ['corporate_finance'],
    submissionNotifications: true,
  })
  const { store, users } = createStore([existing])

  await assert.rejects(
    addSupervisor({
      store,
      department: 'DF',
      name: 'Duplicate Check',
      email: ' ADA@df.uzh.ch ',
      topicAreaSlugs: [],
      submissionNotifications: false,
    }),
    {
      code: 'ALREADY_SUPERVISOR',
      message:
        'ada@df.uzh.ch is already a supervisor; use Edit to change their settings',
    }
  )
  assert.deepEqual(users.get('u1'), existing)
})

test('refuses users of another department and developers', async () => {
  const { store } = createStore([
    user({ department: 'IBW' }),
    user({ id: 'u2', email: 'dev@df.uzh.ch', role: 'DEVELOPER' }),
  ])
  const add = (email: string) =>
    addSupervisor({ store, department: 'DF', name: 'X', email, ...settings })

  await assert.rejects(add('ada@df.uzh.ch'), { code: 'OTHER_DEPARTMENT' })
  await assert.rejects(add('dev@df.uzh.ch'), { code: 'DEVELOPER' })
})

test('rejects topic areas of other departments', async () => {
  const { store } = createStore([user()])
  await assert.rejects(
    updateSupervisorSettings({
      store,
      department: 'DF',
      userId: 'u1',
      topicAreaSlugs: ['accounting'],
      submissionNotifications: false,
    }),
    (error) =>
      error instanceof SupervisorError && error.code === 'UNKNOWN_TOPIC_AREA'
  )
})

test('updates settings only for supervisors of this department', async () => {
  const { store, users } = createStore([
    user(),
    user({ id: 'u2', email: 'b@df.uzh.ch', role: 'UNSET' }),
    user({ id: 'u3', email: 'c@ibw.uzh.ch', department: 'IBW' }),
  ])

  const result = await updateSupervisorSettings({
    store,
    department: 'DF',
    userId: 'u1',
    ...settings,
  })
  assert.deepEqual(result.before.topicAreaSlugs, [])
  assert.deepEqual(users.get('u1')!.topicAreaSlugs, ['corporate_finance'])

  const update = (userId: string) =>
    updateSupervisorSettings({ store, department: 'DF', userId, ...settings })
  await assert.rejects(update('u2'), { code: 'NOT_A_SUPERVISOR' })
  await assert.rejects(update('u3'), { code: 'NOT_FOUND' })
  await assert.rejects(update('missing'), { code: 'NOT_FOUND' })
})

test('removing the role keeps the user and clears the settings', async () => {
  const { store, users } = createStore([
    user({
      topicAreaSlugs: ['corporate_finance'],
      submissionNotifications: true,
    }),
  ])
  await removeSupervisorRole({ store, department: 'DF', userId: 'u1' })

  assert.deepEqual(users.get('u1'), {
    ...user(),
    role: 'UNSET',
    topicAreaSlugs: [],
    submissionNotifications: false,
  })
})

test('notifies only opted-in supervisors of the topic area', async () => {
  const { store } = createStore([
    user({
      topicAreaSlugs: ['corporate_finance'],
      submissionNotifications: true,
    }),
    user({
      id: 'u2',
      email: 'b@df.uzh.ch',
      topicAreaSlugs: ['corporate_finance'],
    }),
    user({
      id: 'u3',
      email: 'c@df.uzh.ch',
      topicAreaSlugs: ['banking_and_insurance'],
      submissionNotifications: true,
    }),
  ])
  assert.deepEqual(await findSupervisorsToNotify(store, 'corporate_finance'), [
    { name: 'Ada Lovelace', email: 'ada@df.uzh.ch' },
  ])
})

test('admins set notes; blank notes are cleared and omitted notes are kept', async () => {
  const { store, users } = createStore()
  await addSupervisor({
    store,
    department: 'DF',
    name: 'Grace Hopper',
    email: 'grace@df.uzh.ch',
    ...settings,
    notes: '  Extern  ',
  })
  assert.equal(users.get('u1')!.notes, 'Extern')

  // Supervisors updating their own settings pass no notes.
  await updateSupervisorSettings({
    store,
    department: 'DF',
    userId: 'u1',
    ...settings,
  })
  assert.equal(users.get('u1')!.notes, 'Extern')

  await updateSupervisorSettings({
    store,
    department: 'DF',
    userId: 'u1',
    ...settings,
    notes: '   ',
  })
  assert.equal(users.get('u1')!.notes, null)
})

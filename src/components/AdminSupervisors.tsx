import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import SupervisorListAccess from 'src/components/SupervisorListAccess'
import SupervisorSettingsFields, {
  type SupervisorSettingsDraft,
} from 'src/components/SupervisorSettingsFields'
import { trpc } from 'src/lib/trpc'

const INPUT_CLASSES =
  'w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

const TH_CLASSES =
  'px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'

const EMPTY_SETTINGS: SupervisorSettingsDraft = {
  topicAreaSlugs: [],
  submissionNotifications: false,
}

// Rendered only for users who may see the supervisor list (see
// canViewSupervisorList); the endpoints enforce the same rule.
export default function AdminSupervisors({
  canManageAccess,
}: Readonly<{ canManageAccess: boolean }>) {
  const { data: session } = useSession()
  const selfUserId = session?.user?.sub

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newSettings, setNewSettings] = useState(EMPTY_SETTINGS)
  const [newNotes, setNewNotes] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState(EMPTY_SETTINGS)
  const [editNotes, setEditNotes] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const { data, isLoading, refetch } = trpc.adminGetSupervisors.useQuery()
  const topicAreas = useMemo(() => data?.topicAreas ?? [], [data])
  const areaName = useMemo(
    () => new Map(topicAreas.map((area) => [area.slug, area.name])),
    [topicAreas]
  )

  const addSupervisor = trpc.adminAddSupervisor.useMutation({
    onSuccess: async () => {
      setShowAdd(false)
      setNewName('')
      setNewEmail('')
      setNewSettings(EMPTY_SETTINGS)
      setNewNotes('')
      setAddError(null)
      await refetch()
    },
    onError: (error) => setAddError(error.message),
  })

  const updateSettings = trpc.adminUpdateSupervisorSettings.useMutation({
    onSuccess: async () => {
      setEditingId(null)
      setEditError(null)
      await refetch()
    },
    onError: (error) => setEditError(error.message),
  })

  const removeRole = trpc.adminRemoveSupervisorRole.useMutation({
    onSuccess: async () => {
      await refetch()
    },
    onError: (error) => alert(`Error: ${error.message}`),
  })

  const filteredSupervisors = useMemo(() => {
    const list = data?.supervisors ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
    )
  }, [data, search])

  const handleAdd = () => {
    setAddError(null)
    if (!newName.trim() || !newEmail.trim()) return
    addSupervisor.mutate({
      name: newName.trim(),
      email: newEmail.trim(),
      ...newSettings,
      notes: newNotes,
    })
  }

  const handleRemove = (supervisor: { id: string; name: string }) => {
    if (
      confirm(
        `Remove the supervisor role from "${supervisor.name}"? The user and their proposals stay; their topic areas and notification setting are cleared.`
      )
    ) {
      removeRole.mutate({ userId: supervisor.id })
    }
  }

  const formatAreas = (slugs: string[]) =>
    slugs.length === 0
      ? '–'
      : slugs.map((slug) => areaName.get(slug) ?? slug).join(', ')

  let emptyMessage: string | null = null
  if (isLoading) {
    emptyMessage = 'Loading supervisors...'
  } else if (!data || data.supervisors.length === 0) {
    emptyMessage = 'No supervisors found.'
  } else if (filteredSupervisors.length === 0) {
    emptyMessage = 'No results for the current search.'
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Supervisors</h2>
          <p className="mt-1 text-sm text-gray-600">
            Supervisors of the{' '}
            <span className="font-medium">
              {process.env.NEXT_PUBLIC_DEPARTMENT_NAME}
            </span>{' '}
            department. Supervisors with notifications enabled are emailed about
            new student proposals in their topic areas.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="w-full md:w-80">
            <label
              htmlFor="supervisor-search"
              className="block text-xs font-medium text-gray-700 mb-0.5"
            >
              Search
            </label>
            <input
              id="supervisor-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or notes..."
              className={INPUT_CLASSES}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAdd((prev) => !prev)
              setAddError(null)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Supervisor
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="mt-3 flex flex-col gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-gray-800">
            Add a supervisor. An existing user with this email becomes a
            supervisor and gets this name.
          </p>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              type="text"
              aria-label="Name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setAddError(null)
              }}
              placeholder="Full name"
              className={`${INPUT_CLASSES} md:w-64`}
            />
            <input
              type="email"
              aria-label="Email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value)
                setAddError(null)
              }}
              placeholder="firstname.lastname@uzh.ch"
              className={`${INPUT_CLASSES} md:flex-1`}
            />
          </div>
          <SupervisorSettingsFields
            idPrefix="new-supervisor"
            topicAreas={topicAreas}
            value={newSettings}
            onChange={setNewSettings}
          />
          <NotesField
            id="new-supervisor-notes"
            value={newNotes}
            onChange={setNewNotes}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={
                !newName.trim() || !newEmail.trim() || addSupervisor.isPending
              }
              className={{ root: 'text-sm' }}
            >
              {addSupervisor.isPending ? 'Adding...' : 'Add'}
            </Button>
            <Button
              onClick={() => {
                setShowAdd(false)
                setAddError(null)
              }}
              className={{ root: 'text-sm' }}
            >
              Cancel
            </Button>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
        </div>
      )}

      {canManageAccess && <SupervisorListAccess />}

      <div className="mt-3">
        {emptyMessage ? (
          <p className="text-gray-600">{emptyMessage}</p>
        ) : (
          <div className="max-h-[calc(100vh-25rem)] min-h-[18rem] overflow-auto border border-gray-400">
            <table className="min-w-[900px] w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className={`${TH_CLASSES} w-[16%]`}>Name</th>
                  <th className={`${TH_CLASSES} w-[20%]`}>Email</th>
                  <th className={`${TH_CLASSES} w-[22%]`}>Topic areas</th>
                  <th className={`${TH_CLASSES} w-[9%]`}>Notifications</th>
                  <th className={`${TH_CLASSES} w-[19%]`}>Notes</th>
                  <th className={`${TH_CLASSES} w-[14%]`}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSupervisors.map((supervisor) => {
                  const isEditing = editingId === supervisor.id
                  return (
                    <tr
                      key={supervisor.id}
                      className="hover:bg-gray-50 align-top"
                    >
                      <td className="px-2 py-1 text-sm text-gray-900">
                        {supervisor.name}
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-700 break-words">
                        {supervisor.email}
                      </td>
                      <td
                        colSpan={isEditing ? 3 : 1}
                        className="px-2 py-1 text-sm text-gray-700"
                      >
                        {isEditing ? (
                          <>
                            <SupervisorSettingsFields
                              idPrefix={`supervisor-${supervisor.id}`}
                              topicAreas={topicAreas}
                              value={editDraft}
                              onChange={setEditDraft}
                              disabled={updateSettings.isPending}
                            />
                            <div className="mt-2">
                              <NotesField
                                id={`supervisor-${supervisor.id}-notes`}
                                value={editNotes}
                                onChange={setEditNotes}
                                disabled={updateSettings.isPending}
                              />
                            </div>
                            {editError && (
                              <p className="mt-1 text-xs text-red-600">
                                {editError}
                              </p>
                            )}
                          </>
                        ) : (
                          formatAreas(supervisor.topicAreaSlugs)
                        )}
                      </td>
                      {!isEditing && (
                        <td className="px-2 py-1 text-sm text-gray-700">
                          {supervisor.submissionNotifications ? 'Yes' : 'No'}
                        </td>
                      )}
                      {!isEditing && (
                        <td className="px-2 py-1 text-sm text-gray-700 whitespace-pre-line break-words">
                          {supervisor.notes ?? '–'}
                        </td>
                      )}
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                onClick={() =>
                                  updateSettings.mutate({
                                    userId: supervisor.id,
                                    ...editDraft,
                                    notes: editNotes,
                                  })
                                }
                                disabled={updateSettings.isPending}
                                className={{ root: 'text-xs' }}
                              >
                                {updateSettings.isPending ? 'Saving…' : 'Save'}
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingId(null)
                                  setEditError(null)
                                }}
                                disabled={updateSettings.isPending}
                                className={{ root: 'text-xs' }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => {
                                  setEditingId(supervisor.id)
                                  setEditDraft({
                                    topicAreaSlugs: supervisor.topicAreaSlugs,
                                    submissionNotifications:
                                      supervisor.submissionNotifications,
                                  })
                                  setEditNotes(supervisor.notes ?? '')
                                  setEditError(null)
                                }}
                                disabled={editingId !== null}
                                className={{ root: 'text-xs' }}
                              >
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleRemove(supervisor)}
                                disabled={
                                  editingId !== null ||
                                  removeRole.isPending ||
                                  supervisor.id === selfUserId
                                }
                                className={{
                                  root: 'text-xs text-red-700 border-red-300',
                                }}
                              >
                                Remove role
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function NotesField({
  id,
  value,
  onChange,
  disabled,
}: Readonly<{
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-gray-700 mb-0.5"
      >
        Notes (admins only)
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        maxLength={2000}
        placeholder="e.g. external, on leave until 08/2026, prefers no emails"
        className={INPUT_CLASSES}
      />
    </div>
  )
}

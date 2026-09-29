import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { useEffect, useMemo, useRef, useState } from 'react'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'

type ProfessorDraft = {
  name: string
  email: string
}

const INPUT_CLASSES =
  'w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

export default function AdminProfessors() {
  const { isDeveloper } = useUserRole()

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ProfessorDraft>({
    name: '',
    email: '',
  })
  const [editError, setEditError] = useState<string | null>(null)
  const addNameRef = useRef<HTMLInputElement>(null)

  const {
    data: professors,
    isLoading,
    refetch,
  } = trpc.developerGetProfessors.useQuery(undefined, {
    enabled: isDeveloper,
  })

  const createProfessor = trpc.developerCreateProfessor.useMutation({
    onSuccess: async () => {
      setNewName('')
      setNewEmail('')
      setShowAdd(false)
      setAddError(null)
      await refetch()
    },
    onError: (error) => {
      setAddError(error.message)
    },
  })

  const updateProfessor = trpc.developerUpdateProfessor.useMutation({
    onSuccess: async () => {
      setEditingId(null)
      setEditError(null)
      await refetch()
    },
    onError: (error) => {
      setEditError(error.message)
    },
  })

  const deleteProfessor = trpc.developerDeleteProfessor.useMutation({
    onSuccess: async () => {
      await refetch()
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  useEffect(() => {
    if (showAdd) {
      addNameRef.current?.focus()
    }
  }, [showAdd])

  const filteredProfessors = useMemo(() => {
    const list = professors ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )
  }, [professors, search])

  const handleAdd = () => {
    setAddError(null)
    if (!newName.trim() || !newEmail.trim()) return
    createProfessor.mutate({ name: newName.trim(), email: newEmail.trim() })
  }

  const startEdit = (professor: { id: string; name: string; email: string }) => {
    setEditingId(professor.id)
    setEditDraft({ name: professor.name, email: professor.email })
    setEditError(null)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editDraft.name.trim() || !editDraft.email.trim()) return
    updateProfessor.mutate({
      id: editingId,
      name: editDraft.name.trim(),
      email: editDraft.email.trim(),
    })
  }

  const handleDelete = (professor: { id: string; name: string }) => {
    if (
      confirm(
        `Delete professor "${professor.name}"? This cannot be undone.`
      )
    ) {
      deleteProfessor.mutate({ id: professor.id })
    }
  }

  if (!isDeveloper) return null

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Professors</h2>
          <p className="mt-1 text-sm text-gray-600">
            Professors (persons responsible) of the{' '}
            <span className="font-medium">
              {process.env.NEXT_PUBLIC_DEPARTMENT_NAME}
            </span>{' '}
            department. The name must match exactly what the Power Automate
            flow sends.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="w-full md:w-80">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className={INPUT_CLASSES}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAdd((prev) => !prev)
              setAddError(null)
              setNewName('')
              setNewEmail('')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Professor
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="mt-3 flex flex-col gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-gray-800">
            Add a new professor
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={addNameRef}
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setAddError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
              placeholder="Full name (without title)"
              className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value)
                setAddError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
              placeholder="firstname.lastname@uzh.ch"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              onClick={handleAdd}
              disabled={
                !newName.trim() || !newEmail.trim() || createProfessor.isPending
              }
              className={{ root: 'text-sm' }}
            >
              {createProfessor.isPending ? 'Adding...' : 'Add'}
            </Button>
            <Button
              onClick={() => {
                setShowAdd(false)
                setNewName('')
                setNewEmail('')
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

      <div className="mt-3">
        {isLoading ? (
          <p className="text-gray-600">Loading professors...</p>
        ) : !professors || professors.length === 0 ? (
          <p className="text-gray-600">No professors found.</p>
        ) : filteredProfessors.length === 0 ? (
          <p className="text-gray-600">No results for the current search.</p>
        ) : (
          <div className="max-h-[calc(100vh-25rem)] min-h-[18rem] overflow-auto border border-gray-400">
            <table className="min-w-[780px] w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[28%]">
                    Name
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[32%]">
                    Email
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                    Supervisions
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProfessors.map((professor) => {
                  const isEditing = editingId === professor.id
                  const supervisionCount = professor._count.supervisions

                  return (
                    <tr key={professor.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.name}
                            onChange={(e) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className={INPUT_CLASSES}
                          />
                        ) : (
                          professor.name
                        )}
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-700">
                        {isEditing ? (
                          <input
                            type="email"
                            value={editDraft.email}
                            onChange={(e) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            className={INPUT_CLASSES}
                          />
                        ) : (
                          professor.email
                        )}
                        {isEditing && editError && (
                          <p className="mt-1 text-xs text-red-600">
                            {editError}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-700">
                        {supervisionCount}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                onClick={handleSaveEdit}
                                disabled={
                                  !editDraft.name.trim() ||
                                  !editDraft.email.trim() ||
                                  updateProfessor.isPending
                                }
                                className={{ root: 'text-xs' }}
                              >
                                {updateProfessor.isPending
                                  ? 'Saving…'
                                  : 'Save'}
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingId(null)
                                  setEditError(null)
                                }}
                                disabled={updateProfessor.isPending}
                                className={{ root: 'text-xs' }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => startEdit(professor)}
                                disabled={editingId !== null}
                                className={{ root: 'text-xs' }}
                              >
                                Edit
                              </Button>
                              <div
                                title={
                                  supervisionCount > 0
                                    ? 'Professors linked to supervisions cannot be deleted.'
                                    : undefined
                                }
                              >
                                <Button
                                  onClick={() => handleDelete(professor)}
                                  disabled={
                                    supervisionCount > 0 ||
                                    editingId !== null ||
                                    deleteProfessor.isPending
                                  }
                                  className={{
                                    root: 'text-xs text-red-700 border-red-300',
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
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

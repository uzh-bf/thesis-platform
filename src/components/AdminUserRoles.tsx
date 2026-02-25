import {
  faChevronLeft,
  faChevronRight,
  faSort,
  faSortDown,
  faSortUp,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { UserRole } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'

const ROLE_OPTIONS = ['UNSET', UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.DEVELOPER] as const

type RoleOption = (typeof ROLE_OPTIONS)[number]
type PageSizeOption = 20 | 50 | 100 | 'all'
type SortColumn = 'name' | 'email' | 'role' | 'department'
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS: PageSizeOption[] = [20, 50, 100, 'all']

const normalizeRole = (value: unknown): RoleOption => {
  if (typeof value !== 'string') return 'UNSET'
  return (ROLE_OPTIONS as readonly string[]).includes(value) ? (value as RoleOption) : 'UNSET'
}

export default function AdminUserRoles() {
  const { data: session } = useSession()
  const selfUserId = session?.user?.sub

  const [search, setSearch] = useState('')
  const [draftByUserId, setDraftByUserId] = useState<Record<string, RoleOption>>({})
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [rowsPerPage, setRowsPerPage] = useState<PageSizeOption>(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const {
    data: users,
    isLoading,
    refetch,
  } = trpc.adminGetAllUsers.useQuery(undefined, {
    enabled: session?.user?.isAdmin === true,
  })

  const updateUserRoles = trpc.adminUpdateUserRoles.useMutation({
    onSuccess: async (_, variables) => {
      setDraftByUserId((prev) => {
        const { [variables.userId]: _, ...rest } = prev
        return rest
      })
      await refetch()
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
    onSettled: () => {
      setSavingUserId(null)
    },
  })

  const filteredUsers = useMemo(() => {
    const list = users ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((u) => {
      const name = (u.name ?? '').toLowerCase()
      const email = (u.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [users, search])

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let compareValue = 0

      switch (sortColumn) {
        case 'name':
          compareValue = (a.name ?? '').localeCompare(b.name ?? '', undefined, {
            sensitivity: 'base',
          })
          break
        case 'email':
          compareValue = (a.email ?? '').localeCompare(b.email ?? '', undefined, {
            sensitivity: 'base',
          })
          break
        case 'role': {
          const aRole = draftByUserId[a.id] ?? normalizeRole(a.role)
          const bRole = draftByUserId[b.id] ?? normalizeRole(b.role)
          compareValue = aRole.localeCompare(bRole, undefined, {
            sensitivity: 'base',
          })
          break
        }
        case 'department':
          compareValue = (a.department ?? '').localeCompare(b.department ?? '', undefined, {
            sensitivity: 'base',
          })
          break
      }

      return sortDirection === 'asc' ? compareValue : -compareValue
    })
  }, [filteredUsers, sortColumn, sortDirection, draftByUserId])

  const totalPages =
    rowsPerPage === 'all'
      ? 1
      : Math.max(1, Math.ceil(sortedUsers.length / rowsPerPage))

  const effectiveCurrentPage = Math.min(currentPage, totalPages)

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const paginatedUsers =
    rowsPerPage === 'all'
      ? sortedUsers
      : sortedUsers.slice(
          (effectiveCurrentPage - 1) * rowsPerPage,
          effectiveCurrentPage * rowsPerPage
        )

  const visibleStart =
    sortedUsers.length === 0
      ? 0
      : rowsPerPage === 'all'
        ? 1
        : (effectiveCurrentPage - 1) * rowsPerPage + 1

  const visibleEnd =
    rowsPerPage === 'all'
      ? sortedUsers.length
      : Math.min(effectiveCurrentPage * rowsPerPage, sortedUsers.length)

  const getDraftRole = (user: (typeof filteredUsers)[number]) =>
    draftByUserId[user.id] ?? normalizeRole(user.role)

  const setDraftRole = (userId: string, value: RoleOption) => {
    setDraftByUserId((prev) => {
      return {
        ...prev,
        [userId]: value,
      }
    })
  }

  const resetDraft = (userId: string) => {
    setDraftByUserId((prev) => {
      const { [userId]: _, ...rest } = prev
      return rest
    })
  }

  const handleSave = (user: (typeof filteredUsers)[number]) => {
    if (selfUserId && user.id === selfUserId) return
    const role = getDraftRole(user)
    const originalRole = normalizeRole(user.role)

    if (role === originalRole) return

    setSavingUserId(user.id)
    updateUserRoles.mutate({
      userId: user.id,
      role,
    })
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }

    setCurrentPage(1)
  }

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return faSort
    return sortDirection === 'asc' ? faSortUp : faSortDown
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">User Roles</h2>
          <p className="mt-1 text-sm text-gray-600">
            Modify <span className="font-medium">Role</span> for users (your own row is
            read-only).
          </p>
        </div>

        <div className="w-full md:w-80">
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <p className="text-gray-600">Loading users...</p>
        ) : !users || users.length === 0 ? (
          <p className="text-gray-600">No users found.</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-gray-600">No results for the current search.</p>
        ) : (
          <>
            <div
              className={`border border-gray-400 overflow-x-auto ${
                rowsPerPage === 20 ? '' : 'max-h-[65vh] overflow-y-auto'
              }`}
            >
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%] cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        Name
                        <FontAwesomeIcon icon={getSortIcon('name')} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('email')}
                      className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[30%] cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        Email
                        <FontAwesomeIcon icon={getSortIcon('email')} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('role')}
                      className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%] cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        Role
                        <FontAwesomeIcon icon={getSortIcon('role')} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('department')}
                      className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%] cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        Department
                        <FontAwesomeIcon
                          icon={getSortIcon('department')}
                          className="text-gray-400"
                        />
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[17%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUsers.map((user) => {
                    const isSelf = !!selfUserId && user.id === selfUserId
                    const role = getDraftRole(user)
                    const dirty = (user.role || 'UNSET') !== role

                    return (
                      <tr key={user.id} className={isSelf ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                        <td className="px-2 py-1 text-sm text-gray-900 whitespace-nowrap">
                          {user.name}
                          {isSelf && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                        </td>
                        <td className="px-2 py-1 text-sm text-gray-700 whitespace-nowrap">
                          {user.email}
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={role}
                            disabled={isSelf || updateUserRoles.isPending}
                            onChange={(e) => setDraftRole(user.id, e.target.value as RoleOption)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1 text-sm text-gray-700 whitespace-nowrap">
                          {user.department ?? '-'}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSave(user)}
                              disabled={
                                isSelf ||
                                !dirty ||
                                updateUserRoles.isPending ||
                                (savingUserId !== null && savingUserId !== user.id)
                              }
                              className={{ root: 'text-xs' }}
                            >
                              {updateUserRoles.isPending && savingUserId === user.id
                                ? 'Saving…'
                                : 'Save'}
                            </Button>
                            <Button
                              onClick={() => resetDraft(user.id)}
                              disabled={isSelf || !dirty || updateUserRoles.isPending}
                              className={{ root: 'text-xs' }}
                            >
                              Reset
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-600">
                Showing {visibleStart}-{visibleEnd} of {sortedUsers.length}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Rows</span>

                <div className="inline-flex items-center rounded-md border border-gray-300 bg-white p-0.5">
                  {PAGE_SIZE_OPTIONS.map((option) => {
                    const isActive = rowsPerPage === option

                    return (
                      <button
                        key={String(option)}
                        type="button"
                        onClick={() => {
                          setRowsPerPage(option)
                          setCurrentPage(1)
                        }}
                        className={`h-7 min-w-[34px] rounded px-2 text-xs font-medium ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        aria-label={`Show ${option === 'all' ? 'all' : option} rows`}
                      >
                        {option === 'all' ? 'All' : option}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, Math.min(prev, totalPages) - 1))
                  }
                  disabled={rowsPerPage === 'all' || effectiveCurrentPage === 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <span className="text-xs text-gray-600 min-w-[48px] text-center">
                  {rowsPerPage === 'all'
                    ? '1 / 1'
                    : `${effectiveCurrentPage} / ${totalPages}`}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(totalPages, Math.min(prev, totalPages) + 1)
                    )
                  }
                  disabled={rowsPerPage === 'all' || effectiveCurrentPage >= totalPages}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Next page"
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { Button } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { UserRole } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'

type DraftRoles = {
  role: RoleOption
  adminRole: AdminRoleOption
}

const ROLE_OPTIONS = ['UNSET', UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.DEVELOPER] as const
const ADMIN_ROLE_OPTIONS = ['UNSET', 'COORDINATOR', 'ADMIN'] as const

type RoleOption = (typeof ROLE_OPTIONS)[number]
type AdminRoleOption = (typeof ADMIN_ROLE_OPTIONS)[number]

const normalizeRole = (value: unknown): RoleOption => {
  if (typeof value !== 'string') return 'UNSET'
  return (ROLE_OPTIONS as readonly string[]).includes(value) ? (value as RoleOption) : 'UNSET'
}

const normalizeAdminRole = (value: unknown): AdminRoleOption => {
  if (typeof value !== 'string') return 'UNSET'
  return (ADMIN_ROLE_OPTIONS as readonly string[]).includes(value)
    ? (value as AdminRoleOption)
    : 'UNSET'
}

export default function AdminUserRoles() {
  const { data: session } = useSession()
  const selfUserId = session?.user?.sub

  const [search, setSearch] = useState('')
  const [draftByUserId, setDraftByUserId] = useState<Record<string, DraftRoles>>({})
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  const {
    data: users,
    isLoading,
    refetch,
  } = trpc.adminGetAllUsers.useQuery(undefined, {
    enabled: session?.user?.adminRole === 'ADMIN',
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

  const getDraft = (user: (typeof filteredUsers)[number]) => {
    const role = draftByUserId[user.id]?.role ?? normalizeRole(user.role)
    const adminRole = draftByUserId[user.id]?.adminRole ?? normalizeAdminRole(user.adminRole)
    return { role, adminRole }
  }

  const setDraftField = <K extends keyof DraftRoles>(
    userId: string,
    field: K,
    value: DraftRoles[K]
  ) => {
    setDraftByUserId((prev) => {
      const existing = prev[userId] ?? { role: 'UNSET', adminRole: 'UNSET' }
      return {
        ...prev,
        [userId]: {
          ...existing,
          [field]: value,
        },
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
    const { role, adminRole } = getDraft(user)
    const originalRole = normalizeRole(user.role)
    const originalAdminRole = normalizeAdminRole(user.adminRole)

    if (role === originalRole && adminRole === originalAdminRole) return

    setSavingUserId(user.id)
    updateUserRoles.mutate({
      userId: user.id,
      role,
      adminRole,
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Roles</h2>
          <p className="mt-1 text-sm text-gray-600">
            Modify <span className="font-medium">Role</span> and{' '}
            <span className="font-medium">AdminRole</span> for users (your own row is
            read-only).
          </p>
        </div>

        <div className="w-full md:w-80">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-gray-600">Loading users...</p>
        ) : !users || users.length === 0 ? (
          <p className="text-gray-600">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AdminRole
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const isSelf = !!selfUserId && user.id === selfUserId
                  const { role, adminRole } = getDraft(user)
                  const dirty =
                    (user.role || 'UNSET') !== role || (user.adminRole || 'UNSET') !== adminRole

                  return (
                    <tr key={user.id} className={isSelf ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-gray-500">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={role}
                          disabled={isSelf || updateUserRoles.isPending}
                          onChange={(e) =>
                            setDraftField(user.id, 'role', e.target.value as RoleOption)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={adminRole}
                          disabled={isSelf || updateUserRoles.isPending}
                          onChange={(e) =>
                            setDraftField(
                              user.id,
                              'adminRole',
                              e.target.value as AdminRoleOption
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                        >
                          {ADMIN_ROLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {user.department ?? '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
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
                            disabled={
                              isSelf || !dirty || updateUserRoles.isPending
                            }
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
        )}
      </div>
    </div>
  )
}

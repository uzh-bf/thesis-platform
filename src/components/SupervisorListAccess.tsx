import { Button } from '@uzh-bf/design-system'
import { useState } from 'react'
import { trpc } from 'src/lib/trpc'

// Developers choose which admins see the Supervisors list; everyone else
// without a grant does not see the tab.
export default function SupervisorListAccess() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: admins, refetch } =
    trpc.developerGetSupervisorListAccess.useQuery()

  const setAccess = trpc.developerSetSupervisorListAccess.useMutation({
    onSuccess: async () => {
      setError(null)
      await refetch()
    },
    onError: (e) => setError(e.message),
  })

  const granted = admins?.filter((a) => a.supervisorListAccess) ?? []

  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-800">
          <span className="font-medium">Access:</span> developers and{' '}
          {granted.length === 0
            ? 'no admins'
            : granted.map((a) => a.name).join(', ')}
        </p>
        <Button
          onClick={() => setOpen((prev) => !prev)}
          className={{ root: 'text-xs whitespace-nowrap' }}
        >
          {open ? 'Close' : 'Manage access'}
        </Button>
      </div>

      {open && (
        <div className="mt-2">
          {admins?.length === 0 ? (
            <p className="text-sm text-gray-600">
              No admins in this department. Give someone an admin role first.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {admins?.map((admin) => {
                const id = `supervisor-list-access-${admin.id}`
                return (
                  <li key={admin.id}>
                    <label
                      htmlFor={id}
                      className="flex items-center gap-2 text-sm text-gray-800"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={admin.supervisorListAccess}
                        onChange={(e) =>
                          setAccess.mutate({
                            userId: admin.id,
                            access: e.target.checked,
                          })
                        }
                        disabled={setAccess.isPending}
                      />
                      {admin.name}
                      <span className="text-gray-500">
                        {admin.email} · {admin.adminRole}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

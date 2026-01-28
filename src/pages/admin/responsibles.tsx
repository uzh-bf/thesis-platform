import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'

export default function AdminResponsiblesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { isAdmin } = useUserRole()

  const { data: responsiblesOverview, isLoading: responsiblesLoading } =
    trpc.adminGetResponsiblesOverview.useQuery()

  useEffect(() => {
    if (!session?.user) {
      router.push('/')
      return
    }
    
    if (!isAdmin) {
      router.push('/')
      alert('Admin access required')
    }
  }, [session, isAdmin, router])

  if (!session?.user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              onClick={() => router.push('/admin')}
              className={{ root: 'flex items-center gap-2' }}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Admin Panel
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Responsibles Overview</h1>
          <p className="mt-2 text-sm text-gray-600">
            Overview of persons responsible and their supervised theses
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {responsiblesLoading ? (
            <p className="text-gray-600">Loading responsibles...</p>
          ) : !responsiblesOverview || responsiblesOverview.length === 0 ? (
            <p className="text-gray-600">No responsibles found</p>
          ) : (
            <div className="space-y-3">
              {responsiblesOverview.map((responsible) => (
                <details
                  key={responsible.id}
                  className="border border-gray-200 rounded-md bg-white"
                >
                  <summary className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{responsible.name}</div>
                      <div className="text-xs text-gray-500">{responsible.email}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {responsible.supervisions.length} supervised
                    </div>
                  </summary>

                  <div className="p-4 border-t border-gray-200">
                    {responsible.supervisions.length === 0 ? (
                      <p className="text-sm text-gray-500">No supervised theses</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thesis
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Supervisor
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Admin Status
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Latest Submission
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Grade
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {responsible.supervisions.map((supervision) => (
                              <tr key={supervision.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2">
                                  <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                    {supervision.proposal.title}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {supervision.proposal.topicArea?.name}
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="text-sm text-gray-900">
                                    {supervision.studentEmail || supervision.proposal.ownedByStudent || '-'}
                                  </div>
                                  {supervision.studyLevel && (
                                    <div className="text-xs text-gray-500">{supervision.studyLevel}</div>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.supervisor?.email || supervision.supervisorEmail || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.status || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.latestSubmissionDate
                                    ? new Date(
                                        supervision.proposal.AdminInfo.latestSubmissionDate
                                      ).toLocaleDateString()
                                    : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.grade ?? '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { faArrowLeft, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState, useMemo } from 'react'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'

type SortColumn = 'thesis' | 'student' | 'supervisor' | 'status' | 'submission' | 'grade'
type SortDirection = 'asc' | 'desc' | null

export default function AdminResponsiblesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { isAdmin } = useUserRole()
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const { data: responsiblesOverview, isLoading: responsiblesLoading } =
    trpc.adminGetResponsiblesOverview.useQuery()

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortColumn(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return faSort
    }
    return sortDirection === 'asc' ? faSortUp : faSortDown
  }

  const sortedResponsibles = useMemo(() => {
    if (!responsiblesOverview) return []
    
    return responsiblesOverview.map((responsible) => {
      if (!sortColumn || !sortDirection) {
        return responsible
      }

      const sortedSupervisions = [...responsible.supervisions].sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortColumn) {
          case 'thesis':
            aValue = a.proposal.title?.toLowerCase() || ''
            bValue = b.proposal.title?.toLowerCase() || ''
            break
          case 'student':
            aValue = (a.studentEmail || a.proposal.ownedByStudent || '').toLowerCase()
            bValue = (b.studentEmail || b.proposal.ownedByStudent || '').toLowerCase()
            break
          case 'supervisor':
            aValue = (a.supervisor?.email || a.supervisorEmail || '').toLowerCase()
            bValue = (b.supervisor?.email || b.supervisorEmail || '').toLowerCase()
            break
          case 'status':
            aValue = a.proposal.AdminInfo?.status || ''
            bValue = b.proposal.AdminInfo?.status || ''
            break
          case 'submission':
            aValue = a.proposal.AdminInfo?.latestSubmissionDate 
              ? new Date(a.proposal.AdminInfo.latestSubmissionDate).getTime() 
              : 0
            bValue = b.proposal.AdminInfo?.latestSubmissionDate 
              ? new Date(b.proposal.AdminInfo.latestSubmissionDate).getTime() 
              : 0
            break
          case 'grade':
            aValue = a.proposal.AdminInfo?.grade ?? -1
            bValue = b.proposal.AdminInfo?.grade ?? -1
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })

      return {
        ...responsible,
        supervisions: sortedSupervisions,
      }
    })
  }, [responsiblesOverview, sortColumn, sortDirection])

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
              {sortedResponsibles.map((responsible) => (
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
                              <th 
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('thesis')}
                              >
                                <div className="flex items-center gap-2">
                                  Thesis
                                  <FontAwesomeIcon icon={getSortIcon('thesis')} className="text-gray-400" />
                                </div>
                              </th>
                              <th 
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('student')}
                              >
                                <div className="flex items-center gap-2">
                                  Student
                                  <FontAwesomeIcon icon={getSortIcon('student')} className="text-gray-400" />
                                </div>
                              </th>
                              <th 
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('supervisor')}
                              >
                                <div className="flex items-center gap-2">
                                  Supervisor
                                  <FontAwesomeIcon icon={getSortIcon('supervisor')} className="text-gray-400" />
                                </div>
                              </th>
                              <th 
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('status')}
                              >
                                <div className="flex items-center gap-2">
                                  Admin Status
                                  <FontAwesomeIcon icon={getSortIcon('status')} className="text-gray-400" />
                                </div>
                              </th>
                              <th 
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('submission')}
                              >
                                <div className="flex items-center gap-2">
                                  Latest Submission
                                  <FontAwesomeIcon icon={getSortIcon('submission')} className="text-gray-400" />
                                </div>
                              </th>
                              <th 
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('grade')}
                              >
                                <div className="flex items-center gap-2">
                                  Grade
                                  <FontAwesomeIcon icon={getSortIcon('grade')} className="text-gray-400" />
                                </div>
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

import {
  faArrowLeft,
  faPenToSquare,
  faSort,
  faSortDown,
  faSortUp,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal } from '@uzh-bf/design-system'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import { trpc } from 'src/lib/trpc'

type SortColumn = 'thesis' | 'student' | 'supervisor' | 'status' | 'submission' | 'grade'
type SortDirection = 'asc' | 'desc' | null

type AdminInfoEditState = {
  adminInfoId: string
  thesisTitle: string
  olatCapturedDate: string
  latestSubmissionDate: string
  submissionDate: string
  olatGradeDate: string
  grade: string
  capturedOnZora: '' | 'true' | 'false'
  comment: string
}

function toDateInputValue(value: unknown): string {
  if (!value) return ''
  const date = new Date(value as any)
  if (Number.isNaN(date.getTime())) return ''
  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function AdminResponsiblesPage() {
  const router = useRouter()
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [editState, setEditState] = useState<AdminInfoEditState | null>(null)

  const {
    data: responsiblesOverview,
    isLoading: responsiblesLoading,
    refetch,
  } = trpc.adminGetResponsiblesOverview.useQuery()

  const updateAdminInfo = trpc.adminUpdateAdminInfo.useMutation({
    onSuccess: () => {
      setEditState(null)
      refetch()
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  const handleSaveAdminInfo = () => {
    if (!editState) return

    const gradeValue = editState.grade.trim() === '' ? null : Number(editState.grade)
    if (gradeValue !== null && Number.isNaN(gradeValue)) {
      alert('Grade must be a number')
      return
    }

    updateAdminInfo.mutate({
      adminInfoId: editState.adminInfoId,
      olatCapturedDate: editState.olatCapturedDate || null,
      latestSubmissionDate: editState.latestSubmissionDate || null,
      submissionDate: editState.submissionDate || null,
      olatGradeDate: editState.olatGradeDate || null,
      grade: gradeValue,
      comment: editState.comment.trim() === '' ? null : editState.comment,
      capturedOnZora:
        editState.capturedOnZora === ''
          ? null
          : editState.capturedOnZora === 'true',
    })
  }

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

    const sortByFirstName = (responsibles: any[]) => {
      return [...responsibles].sort((a, b) => {
        const aFirstName = a.name.split(' ')[0]?.toLowerCase() || ''
        const bFirstName = b.name.split(' ')[0]?.toLowerCase() || ''
        return aFirstName.localeCompare(bFirstName)
      })
    }

    const sortedByName = sortByFirstName(responsiblesOverview)
    
    return sortedByName.map((responsible) => {
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
            aValue = (a.studentEmail || a.proposal.applications?.[0]?.email || a.proposal.ownedByStudent || '').toLowerCase()
            bValue = (b.studentEmail || b.proposal.applications?.[0]?.email || b.proposal.ownedByStudent || '').toLowerCase()
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
          <h1 className="text-3xl font-bold text-gray-900">AdminInfo Overview</h1>
          <p className="mt-2 text-sm text-gray-600">
            Overview of AdminInfo entries grouped by person responsible
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
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                OLAT Captured
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
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Submission Date
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                OLAT Grade Date
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
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Captured on Zora
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Comment
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
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
                                    {supervision.studentEmail || 
                                     supervision.proposal.applications?.[0]?.email || 
                                     supervision.proposal.ownedByStudent || 
                                     '-'}
                                  </div>
                                  {(supervision.studyLevel || supervision.proposal.applications?.[0]?.fullName) && (
                                    <div className="text-xs text-gray-500">
                                      {supervision.studyLevel || supervision.proposal.applications?.[0]?.fullName}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.supervisor?.email || supervision.supervisorEmail || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.status || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.olatCapturedDate
                                    ? new Date(
                                        supervision.proposal.AdminInfo.olatCapturedDate
                                      ).toLocaleDateString()
                                    : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.latestSubmissionDate
                                    ? new Date(
                                        supervision.proposal.AdminInfo.latestSubmissionDate
                                      ).toLocaleDateString()
                                    : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.submissionDate
                                    ? new Date(
                                        supervision.proposal.AdminInfo.submissionDate
                                      ).toLocaleDateString()
                                    : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.olatGradeDate
                                    ? new Date(
                                        supervision.proposal.AdminInfo.olatGradeDate
                                      ).toLocaleDateString()
                                    : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.grade ?? '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {supervision.proposal.AdminInfo?.capturedOnZora === true
                                    ? 'Yes'
                                    : supervision.proposal.AdminInfo?.capturedOnZora === false
                                      ? 'No'
                                      : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                                  {supervision.proposal.AdminInfo?.comment || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <Button
                                    onClick={() => {
                                      const adminInfo = supervision.proposal.AdminInfo
                                      if (!adminInfo) {
                                        alert('No AdminInfo entry exists for this proposal')
                                        return
                                      }

                                      setEditState({
                                        adminInfoId: adminInfo.id,
                                        thesisTitle: supervision.proposal.title,
                                        olatCapturedDate: toDateInputValue(
                                          adminInfo.olatCapturedDate
                                        ),
                                        latestSubmissionDate: toDateInputValue(
                                          adminInfo.latestSubmissionDate
                                        ),
                                        submissionDate: toDateInputValue(
                                          adminInfo.submissionDate
                                        ),
                                        olatGradeDate: toDateInputValue(
                                          adminInfo.olatGradeDate
                                        ),
                                        grade:
                                          adminInfo.grade === null || adminInfo.grade === undefined
                                            ? ''
                                            : String(adminInfo.grade),
                                        capturedOnZora:
                                          adminInfo.capturedOnZora === null ||
                                          adminInfo.capturedOnZora === undefined
                                            ? ''
                                            : adminInfo.capturedOnZora
                                              ? 'true'
                                              : 'false',
                                        comment: adminInfo.comment || '',
                                      })
                                    }}
                                    className={{ root: 'flex items-center gap-2 text-xs' }}
                                  >
                                    <FontAwesomeIcon icon={faPenToSquare} />
                                    Edit
                                  </Button>
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

        {editState && (
          <Modal
            open={true}
            onClose={() => setEditState(null)}
            className={{ content: 'max-w-2xl' }}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Edit AdminInfo</h2>
              <p className="mt-1 text-sm text-gray-600">{editState.thesisTitle}</p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OLAT Captured Date
                  </label>
                  <input
                    type="date"
                    value={editState.olatCapturedDate}
                    onChange={(e) =>
                      setEditState({ ...editState, olatCapturedDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latest Submission Date
                  </label>
                  <input
                    type="date"
                    value={editState.latestSubmissionDate}
                    onChange={(e) =>
                      setEditState({
                        ...editState,
                        latestSubmissionDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Submission Date
                  </label>
                  <input
                    type="date"
                    value={editState.submissionDate}
                    onChange={(e) =>
                      setEditState({ ...editState, submissionDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OLAT Grade Date
                  </label>
                  <input
                    type="date"
                    value={editState.olatGradeDate}
                    onChange={(e) =>
                      setEditState({ ...editState, olatGradeDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editState.grade}
                    onChange={(e) => setEditState({ ...editState, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Captured on Zora
                  </label>
                  <select
                    value={editState.capturedOnZora}
                    onChange={(e) =>
                      setEditState({
                        ...editState,
                        capturedOnZora: e.target.value as AdminInfoEditState['capturedOnZora'],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">-</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment
                </label>
                <textarea
                  value={editState.comment}
                  onChange={(e) => setEditState({ ...editState, comment: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  onClick={() => setEditState(null)}
                  className={{ root: 'text-sm' }}
                  disabled={updateAdminInfo.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAdminInfo}
                  className={{ root: 'text-sm' }}
                  disabled={updateAdminInfo.isPending}
                >
                  {updateAdminInfo.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}

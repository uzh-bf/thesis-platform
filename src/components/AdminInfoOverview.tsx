import {
  faArrowsLeftRight,
  faPenToSquare,
  faSort,
  faSortDown,
  faSortUp,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal } from '@uzh-bf/design-system'
import { useEffect, useMemo, useRef, useState } from 'react'
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

export default function AdminInfoOverview() {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [editState, setEditState] = useState<AdminInfoEditState | null>(null)
  const [selectedResponsibleIds, setSelectedResponsibleIds] = useState<null | string[]>(
    null
  )
  const [isProfessorDropdownOpen, setIsProfessorDropdownOpen] = useState(false)
  const professorDropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [entrySearch, setEntrySearch] = useState('')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        professorDropdownRef.current &&
        !professorDropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsProfessorDropdownOpen(false)
      }
    }

    if (isProfessorDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfessorDropdownOpen])

  const {
    data: professorsOverview,
    isLoading: professorsLoading,
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

  const isProfessorSelected = (professorId: string) =>
    selectedResponsibleIds === null ||
    selectedResponsibleIds.includes(professorId)

  const toggleProfessor = (professorId: string) => {
    setSelectedResponsibleIds((prev) => {
      const current =
        prev === null
          ? (professorsOverview?.map((r) => r.id) ?? [])
          : prev

      if (current.includes(professorId)) {
        return current.filter((id) => id !== professorId)
      }
      return [...current, professorId]
    })
  }

  const selectAllProfessors = () => {
    setSelectedResponsibleIds(null)
    setIsProfessorDropdownOpen(false)
  }

  const clearAllProfessors = () => {
    setSelectedResponsibleIds([])
    setIsProfessorDropdownOpen(false)
  }

  const sortedProfessors = useMemo(() => {
    if (!professorsOverview) return []

    return professorsOverview.map((professor) => {
      if (!sortColumn || !sortDirection) {
        return professor
      }

      const sortedSupervisions = [...professor.supervisions].sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortColumn) {
          case 'thesis':
            aValue = a.proposal.title?.toLowerCase() || ''
            bValue = b.proposal.title?.toLowerCase() || ''
            break
          case 'student':
            aValue = (
              a.studentEmail ||
              a.proposal.applications?.[0]?.email ||
              a.proposal.ownedByStudent ||
              ''
            ).toLowerCase()
            bValue = (
              b.studentEmail ||
              b.proposal.applications?.[0]?.email ||
              b.proposal.ownedByStudent ||
              ''
            ).toLowerCase()
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
        ...professor,
        supervisions: sortedSupervisions,
      }
    })
  }, [professorsOverview, sortColumn, sortDirection])

  const totalProfessors = professorsOverview?.length ?? 0
  const selectedCount =
    selectedResponsibleIds === null
      ? totalProfessors
      : selectedResponsibleIds.length
  const normalizedEntrySearch = entrySearch.trim().toLowerCase()

  const displayedProfessors = useMemo(() => {
    const base =
      selectedResponsibleIds === null
        ? sortedProfessors
        : sortedProfessors.filter((r: any) =>
            new Set(selectedResponsibleIds).has(r.id)
          )

    if (!normalizedEntrySearch) {
      return base.map((r: any) => ({ ...r, supervisionsForDisplay: r.supervisions }))
    }

    const matches = (supervision: any) => {
      const proposal = supervision?.proposal
      const studentName = proposal?.applications?.[0]?.fullName || ''
      const matrikelNumber = proposal?.applications?.[0]?.matriculationNumber || ''

      const haystack = `${studentName} ${matrikelNumber}`.toLowerCase()
      return haystack.includes(normalizedEntrySearch)
    }

    return base
      .map((r: any) => ({
        ...r,
        supervisionsForDisplay: r.supervisions.filter(matches),
      }))
      .filter((r: any) => r.supervisionsForDisplay.length > 0)
  }, [sortedProfessors, selectedResponsibleIds, normalizedEntrySearch])

  const totalDisplayedSupervisions = useMemo(() => {
    return displayedProfessors.reduce(
      (acc: number, r: any) => acc + (r.supervisionsForDisplay?.length ?? 0),
      0
    )
  }, [displayedProfessors])

  return (
    <>
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">AdminInfo Overview</h2>
            <p className="mt-1 text-sm text-gray-600">
              Overview of AdminInfo entries grouped by professor
            </p>
          </div>
          <div className="text-sm text-gray-600">
            {professorsLoading
              ? 'Loading…'
              : `${totalDisplayedSupervisions} theses • ${displayedProfessors.length} professors`}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-visible">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search entries
            </label>
            <input
              type="text"
              value={entrySearch}
              onChange={(e) => setEntrySearch(e.target.value)}
              placeholder="Search by student name or matrikel number…"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select professors
            </label>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setIsProfessorDropdownOpen(!isProfessorDropdownOpen)}
              className="w-full px-4 py-2 text-left border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
            >
              <span className="text-sm text-gray-700">
                {selectedResponsibleIds === null
                  ? 'All professors'
                  : selectedResponsibleIds.length === 0
                    ? 'None selected'
                    : `${selectedResponsibleIds.length} professor${selectedResponsibleIds.length === 1 ? '' : 's'} selected`}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isProfessorDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isProfessorDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto" ref={professorDropdownRef}>
                <div className="sticky top-0 bg-white border-b border-gray-200 p-2 flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllProfessors}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllProfessors}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear
                  </button>
                </div>

                {professorsLoading ? (
                  <p className="p-3 text-sm text-gray-600">Loading professors...</p>
                ) : !professorsOverview || professorsOverview.length === 0 ? (
                  <p className="p-3 text-sm text-gray-600">No professors found</p>
                ) : (
                  professorsOverview.map((professor: any) => (
                    <label
                      key={professor.id}
                      className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isProfessorSelected(professor.id)}
                        onChange={() => toggleProfessor(professor.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {professor.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {professor.email}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {professorsLoading ? (
          <p className="text-gray-600">Loading professors...</p>
        ) : displayedProfessors.length === 0 ? (
          <p className="text-gray-600">No results for the current filters</p>
        ) : (
          <div className="space-y-3">
                {displayedProfessors.map((professor: any) => {
                  const supervisionsToShow =
                    professor.supervisionsForDisplay ?? professor.supervisions
                  const total = professor.supervisions.length
                  const countText = normalizedEntrySearch
                    ? `${supervisionsToShow.length}/${total} theses`
                    : `${total} theses`

                  return (
                    <details
                      key={professor.id}
                      className="border border-gray-200 rounded-md bg-white"
                    >
                      <summary className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-50">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {professor.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {professor.email}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 whitespace-nowrap">
                          {countText}
                        </div>
                      </summary>

                      <div className="p-4 border-t border-gray-200">
                        {supervisionsToShow.length === 0 ? (
                          <p className="text-sm text-gray-500">No supervised theses</p>
                        ) : (
                          <div className="border border-gray-200 rounded-md">
                            <div className="flex items-center justify-end gap-2 px-3 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
                              <FontAwesomeIcon icon={faArrowsLeftRight} className="text-gray-400" />
                              <span>Scroll horizontally for more columns</span>
                            </div>
                            <div className="overflow-auto max-h-[65vh]">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('thesis')}
                            >
                              <div className="flex items-center gap-2">
                                Thesis
                                <FontAwesomeIcon
                                  icon={getSortIcon('thesis')}
                                  className="text-gray-400"
                                />
                              </div>
                            </th>
                            <th
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('student')}
                            >
                              <div className="flex items-center gap-2">
                                Student
                                <FontAwesomeIcon
                                  icon={getSortIcon('student')}
                                  className="text-gray-400"
                                />
                              </div>
                            </th>
                            <th
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('supervisor')}
                            >
                              <div className="flex items-center gap-2">
                                Supervisor
                                <FontAwesomeIcon
                                  icon={getSortIcon('supervisor')}
                                  className="text-gray-400"
                                />
                              </div>
                            </th>
                            <th
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center gap-2">
                                Admin Status
                                <FontAwesomeIcon
                                  icon={getSortIcon('status')}
                                  className="text-gray-400"
                                />
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
                                <FontAwesomeIcon
                                  icon={getSortIcon('submission')}
                                  className="text-gray-400"
                                />
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
                                <FontAwesomeIcon
                                  icon={getSortIcon('grade')}
                                  className="text-gray-400"
                                />
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
                          {supervisionsToShow.map((supervision: any) => (
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
                                {(supervision.studyLevel ||
                                  supervision.proposal.applications?.[0]?.fullName) && (
                                  <div className="text-xs text-gray-500">
                                    {supervision.studyLevel ||
                                      supervision.proposal.applications?.[0]?.fullName}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {supervision.supervisor?.email ||
                                  supervision.supervisorEmail ||
                                  '-'}
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
                                {supervision.proposal.AdminInfo?.capturedOnZora ===
                                true
                                  ? 'Yes'
                                  : supervision.proposal.AdminInfo?.capturedOnZora ===
                                      false
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
                                      alert(
                                        'No AdminInfo entry exists for this proposal'
                                      )
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
                                        adminInfo.grade === null ||
                                        adminInfo.grade === undefined
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
                                  className={{
                                    root: 'flex items-center gap-2 text-xs',
                                  }}
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
                          </div>
                        )}
                      </div>
                    </details>
                  )
                })}
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
                    setEditState({
                      ...editState,
                      olatCapturedDate: e.target.value,
                    })
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
                    setEditState({
                      ...editState,
                      submissionDate: e.target.value,
                    })
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
                    setEditState({
                      ...editState,
                      olatGradeDate: e.target.value,
                    })
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
                  onChange={(e) =>
                    setEditState({ ...editState, grade: e.target.value })
                  }
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
                      capturedOnZora: e.target
                        .value as AdminInfoEditState['capturedOnZora'],
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
                onChange={(e) =>
                  setEditState({ ...editState, comment: e.target.value })
                }
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
    </>
  )
}

import {
  faArrowsLeftRight,
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

type PresenceFilter = 'all' | 'yes' | 'no'

type ColumnFilters = {
  student: string
  title: string
  supervisor: string
  olatCaptured: PresenceFilter
  latestSubmissionFrom: string
  latestSubmissionTo: string
  submissionFrom: string
  submissionTo: string
  gradeMin: string
  gradeMax: string
  capturedOnZora: PresenceFilter
}

const DEFAULT_COLUMN_FILTERS: ColumnFilters = {
  student: '',
  title: '',
  supervisor: '',
  olatCaptured: 'all',
  latestSubmissionFrom: '',
  latestSubmissionTo: '',
  submissionFrom: '',
  submissionTo: '',
  gradeMin: '',
  gradeMax: '',
  capturedOnZora: 'all',
}

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

type DetailsModalState = {
  professorName: string
  professorEmail: string
  supervision: any
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

function parseDateInput(value: string, endOfDay = false): number | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map((part) => Number(part))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  const date = endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0)
  const time = date.getTime()
  return Number.isNaN(time) ? null : time
}

export default function AdminInfoOverview() {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [editState, setEditState] = useState<AdminInfoEditState | null>(null)
  const [detailsState, setDetailsState] = useState<DetailsModalState | null>(null)
  const [selectedResponsibleIds, setSelectedResponsibleIds] = useState<null | string[]>(
    null
  )
  const [isProfessorDropdownOpen, setIsProfessorDropdownOpen] = useState(false)
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const professorDropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false)
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(
    DEFAULT_COLUMN_FILTERS
  )
  
  // Create entry form state
  const [createForm, setCreateForm] = useState({
    responsibleId: '',
    supervisorEmail: '',
    studentEmail: '',
    studentName: '',
    matriculationNumber: '',
    title: '',
    language: '',
    studyLevel: '',
    topicAreaSlug: '',
    allowPublication: 'Nein',
    allowUsage: 'Ja',
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node

      if (
        isProfessorDropdownOpen &&
        professorDropdownRef.current &&
        !professorDropdownRef.current.contains(targetNode) &&
        buttonRef.current &&
        !buttonRef.current.contains(targetNode)
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

  const {
    data: createEntryProfessors,
    isLoading: createEntryProfessorsLoading,
  } = trpc.getAllPersonsResponsible.useQuery()

  const { data: supervisors } = trpc.getAllSupervisors.useQuery()

  const { data: topicAreas } = trpc.getTopicAreas.useQuery()

  const updateAdminInfo = trpc.adminUpdateAdminInfo.useMutation({
    onSuccess: () => {
      setEditState(null)
      setDetailsState(null)
      refetch()
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  const createAdminInfoEntry = trpc.adminCreateAdminInfoEntry.useMutation({
    onSuccess: () => {
      setIsCreateModalOpen(false)
      setCreateForm({
        responsibleId: '',
        supervisorEmail: '',
        studentEmail: '',
        studentName: '',
        matriculationNumber: '',
        title: '',
        language: '',
        studyLevel: '',
        topicAreaSlug: '',
        allowPublication: 'Nein',
        allowUsage: 'Ja',
      })
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

  const handleCreateEntry = () => {
    if (createAdminInfoEntry.isPending) return

    const missingFields: string[] = []
    if (!createForm.responsibleId) missingFields.push('Professor Email')
    if (!createForm.supervisorEmail) missingFields.push('Supervisor Email')
    if (!createForm.studentEmail) missingFields.push('Student Email')
    if (!createForm.studentName) missingFields.push('Student Name')
    if (!createForm.matriculationNumber) missingFields.push('Matriculation Number')
    if (!createForm.title) missingFields.push('Title')
    if (!createForm.language) missingFields.push('Language')
    if (!createForm.studyLevel) missingFields.push('Study Level')
    if (!createForm.topicAreaSlug) missingFields.push('Topic Area')

    if (missingFields.length > 0) {
      alert(`Please fill in: ${missingFields.join(', ')}`)
      return
    }

    createAdminInfoEntry.mutate({
      responsibleId: createForm.responsibleId,
      supervisorEmail: createForm.supervisorEmail,
      studentEmail: createForm.studentEmail,
      studentName: createForm.studentName,
      matriculationNumber: createForm.matriculationNumber,
      title: createForm.title,
      language: createForm.language as 'English' | 'German',
      studyLevel: createForm.studyLevel,
      topicAreaSlug: createForm.topicAreaSlug,
      allowPublication: createForm.allowPublication === 'Ja',
      allowUsage: createForm.allowUsage === 'Ja',
    })
  }

  const handleCreateFormSelectKeyDown = (
    event: React.KeyboardEvent<HTMLSelectElement>
  ) => {
    if (event.key !== 'Enter') return

    event.preventDefault()

    const selectElement = event.currentTarget as HTMLSelectElement & {
      showPicker?: () => void
    }

    if (typeof selectElement.showPicker === 'function') {
      try {
        selectElement.showPicker()
        return
      } catch {
        selectElement.click()
        return
      }
    }

    selectElement.click()
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

  const closeDetailsModal = () => {
    setDetailsState(null)
    setEditState(null)
  }

  const openDetailsModal = (professor: any, supervision: any) => {
    setDetailsState({
      professorName: professor.name,
      professorEmail: professor.email,
      supervision,
    })

    const adminInfo = supervision?.proposal?.AdminInfo
    if (!adminInfo) {
      setEditState(null)
      return
    }

    setEditState({
      adminInfoId: adminInfo.id,
      thesisTitle: supervision.proposal.title,
      olatCapturedDate: toDateInputValue(adminInfo.olatCapturedDate),
      latestSubmissionDate: toDateInputValue(adminInfo.latestSubmissionDate),
      submissionDate: toDateInputValue(adminInfo.submissionDate),
      olatGradeDate: toDateInputValue(adminInfo.olatGradeDate),
      grade:
        adminInfo.grade === null || adminInfo.grade === undefined
          ? ''
          : String(adminInfo.grade),
      capturedOnZora:
        adminInfo.capturedOnZora === null || adminInfo.capturedOnZora === undefined
          ? ''
          : adminInfo.capturedOnZora
            ? 'true'
            : 'false',
      comment: adminInfo.comment || '',
    })
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

    const sortedByName = [...professorsOverview].sort((a, b) => {
      const aName = String(a.name ?? '')
      const bName = String(b.name ?? '')
      return aName.localeCompare(bName, undefined, { sensitivity: 'base' })
    })

    return sortedByName.map((professor) => ({
      ...professor,
      supervisions: professor.supervisions.filter(
        (supervision: any) => supervision.proposal.statusKey !== 'WITHDRAWN'
      ),
    }))
  }, [professorsOverview])

  const createEntryProfessorOptions = useMemo(() => {
    const source =
      createEntryProfessors && createEntryProfessors.length > 0
        ? createEntryProfessors
        : sortedProfessors

    return [...source].sort((a, b) => {
      const aEmail = String(a.email ?? '')
      const bEmail = String(b.email ?? '')
      const emailOrder = aEmail.localeCompare(bEmail, undefined, { sensitivity: 'base' })
      if (emailOrder !== 0) return emailOrder

      const aName = String(a.name ?? '')
      const bName = String(b.name ?? '')
      return aName.localeCompare(bName, undefined, { sensitivity: 'base' })
    })
  }, [createEntryProfessors, sortedProfessors])

  const displayedSupervisions = useMemo(() => {
    const normalizedStudentFilter = columnFilters.student.trim().toLowerCase()
    const normalizedSupervisorFilter = columnFilters.supervisor.trim().toLowerCase()
    const normalizedTitleFilter = columnFilters.title.trim().toLowerCase()

    const latestSubmissionFrom = parseDateInput(columnFilters.latestSubmissionFrom)
    const latestSubmissionTo = parseDateInput(columnFilters.latestSubmissionTo, true)
    const submissionFrom = parseDateInput(columnFilters.submissionFrom)
    const submissionTo = parseDateInput(columnFilters.submissionTo, true)

    const gradeMinRaw = columnFilters.gradeMin.trim()
    const gradeMaxRaw = columnFilters.gradeMax.trim()
    const gradeMin = gradeMinRaw === '' ? null : Number(gradeMinRaw)
    const gradeMax = gradeMaxRaw === '' ? null : Number(gradeMaxRaw)
    const gradeMinValue = gradeMin === null || Number.isNaN(gradeMin) ? null : gradeMin
    const gradeMaxValue = gradeMax === null || Number.isNaN(gradeMax) ? null : gradeMax

    const selectedProfessorIds =
      selectedResponsibleIds === null ? null : new Set(selectedResponsibleIds)

    const base =
      selectedProfessorIds === null
        ? sortedProfessors
        : sortedProfessors.filter((r: any) => selectedProfessorIds.has(r.id))

    const matches = (supervision: any) => {
      const proposal = supervision?.proposal
      const adminInfo = proposal?.AdminInfo
      
      // Check status filter
      if (selectedStatuses.length > 0) {
        const proposalStatus = adminInfo?.status
        if (!selectedStatuses.includes(proposalStatus)) {
          return false
        }
      }
      
      // Check student filter
      if (normalizedStudentFilter) {
        const acceptedApp = proposal?.applications?.find(
          (app: any) => app.statusKey === 'ACCEPTED'
        )
        const studentName = acceptedApp?.fullName || ''
        const matrikelNumber = acceptedApp?.matriculationNumber || ''
        const studentEmail =
          acceptedApp?.email ||
          supervision?.studentEmail ||
          proposal?.ownedByStudent ||
          ''

        const haystack = `${studentName} ${matrikelNumber} ${studentEmail}`.toLowerCase()
        if (!haystack.includes(normalizedStudentFilter)) return false
      }

      if (normalizedSupervisorFilter) {
        const supervisorEmail = (
          supervision?.supervisor?.email || supervision?.supervisorEmail || ''
        ).toLowerCase()
        if (!supervisorEmail.includes(normalizedSupervisorFilter)) return false
      }

      if (normalizedTitleFilter) {
        const titleHaystack = `${proposal?.title || ''} ${proposal?.topicArea?.name || ''}`
          .toLowerCase()
          .trim()
        if (!titleHaystack.includes(normalizedTitleFilter)) return false
      }

      if (columnFilters.olatCaptured === 'yes' && !adminInfo?.olatCapturedDate) {
        return false
      }
      if (columnFilters.olatCaptured === 'no' && adminInfo?.olatCapturedDate) {
        return false
      }

      if (columnFilters.capturedOnZora === 'yes' && adminInfo?.capturedOnZora !== true) {
        return false
      }
      if (columnFilters.capturedOnZora === 'no' && adminInfo?.capturedOnZora !== false) {
        return false
      }

      if (latestSubmissionFrom !== null || latestSubmissionTo !== null) {
        const latestTime = adminInfo?.latestSubmissionDate
          ? new Date(adminInfo.latestSubmissionDate).getTime()
          : null
        if (latestTime === null || Number.isNaN(latestTime)) return false
        if (latestSubmissionFrom !== null && latestTime < latestSubmissionFrom) return false
        if (latestSubmissionTo !== null && latestTime > latestSubmissionTo) return false
      }

      if (submissionFrom !== null || submissionTo !== null) {
        const submissionTime = adminInfo?.submissionDate
          ? new Date(adminInfo.submissionDate).getTime()
          : null
        if (submissionTime === null || Number.isNaN(submissionTime)) return false
        if (submissionFrom !== null && submissionTime < submissionFrom) return false
        if (submissionTo !== null && submissionTime > submissionTo) return false
      }

      if (gradeMinValue !== null || gradeMaxValue !== null) {
        const grade = adminInfo?.grade
        if (grade === null || grade === undefined) return false
        const gradeValue = Number(grade)
        if (Number.isNaN(gradeValue)) return false
        if (gradeMinValue !== null && gradeValue < gradeMinValue) return false
        if (gradeMaxValue !== null && gradeValue > gradeMaxValue) return false
      }

      return true
    }

    const rows = base.flatMap((professor: any) =>
      professor.supervisions
        .filter(matches)
        .map((supervision: any) => ({ professor, supervision }))
    )

    if (!sortColumn || !sortDirection) {
      return rows
    }

    return [...rows].sort((a: any, b: any) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'thesis':
          aValue = a.supervision.proposal.title?.toLowerCase() || ''
          bValue = b.supervision.proposal.title?.toLowerCase() || ''
          break
        case 'student': {
          const aAcceptedApp = a.supervision.proposal.applications?.find(
            (app: any) => app.statusKey === 'ACCEPTED'
          )
          const bAcceptedApp = b.supervision.proposal.applications?.find(
            (app: any) => app.statusKey === 'ACCEPTED'
          )

          aValue = (
            aAcceptedApp?.email ||
            a.supervision.studentEmail ||
            a.supervision.proposal.ownedByStudent ||
            ''
          ).toLowerCase()
          bValue = (
            bAcceptedApp?.email ||
            b.supervision.studentEmail ||
            b.supervision.proposal.ownedByStudent ||
            ''
          ).toLowerCase()
          break
        }
        case 'supervisor':
          aValue = (
            a.supervision.supervisor?.email ||
            a.supervision.supervisorEmail ||
            ''
          ).toLowerCase()
          bValue = (
            b.supervision.supervisor?.email ||
            b.supervision.supervisorEmail ||
            ''
          ).toLowerCase()
          break
        case 'status':
          aValue = a.supervision.proposal.AdminInfo?.status || ''
          bValue = b.supervision.proposal.AdminInfo?.status || ''
          break
        case 'submission':
          aValue = a.supervision.proposal.AdminInfo?.latestSubmissionDate
            ? new Date(a.supervision.proposal.AdminInfo.latestSubmissionDate).getTime()
            : 0
          bValue = b.supervision.proposal.AdminInfo?.latestSubmissionDate
            ? new Date(b.supervision.proposal.AdminInfo.latestSubmissionDate).getTime()
            : 0
          break
        case 'grade':
          aValue = a.supervision.proposal.AdminInfo?.grade ?? -1
          bValue = b.supervision.proposal.AdminInfo?.grade ?? -1
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [
    sortedProfessors,
    selectedResponsibleIds,
    selectedStatuses,
    columnFilters,
    sortColumn,
    sortDirection,
  ])

  const totalDisplayedSupervisions = useMemo(() => {
    return displayedSupervisions.length
  }, [displayedSupervisions])

  const totalDisplayedProfessors = useMemo(() => {
    return new Set(
      displayedSupervisions.map((row: any) => row.professor.id)
    )
      .size
  }, [displayedSupervisions])

  return (
    <>
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">AdminInfo Overview</h2>
            <p className="mt-1 text-sm text-gray-600">
              Overview of AdminInfo entries in one table
            </p>
          </div>
          <div className="text-sm text-gray-600">
            {professorsLoading
              ? 'Loading…'
              : `${totalDisplayedSupervisions} theses • ${totalDisplayedProfessors} professors`}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Professors
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
                ) : sortedProfessors.length === 0 ? (
                  <p className="p-3 text-sm text-gray-600">No professors found</p>
                ) : (
                  sortedProfessors.map((professor: any) => (
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

          <div>
            <button
              type="button"
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isStatusFilterOpen ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Show Theses by Status
            </button>
            
            {isStatusFilterOpen && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="text-xs text-gray-500 mb-2">
                  ({selectedStatuses.length === 0 ? 'All' : selectedStatuses.length}) Offen (OPEN), In Bearbeitung (IN_PROGRESS), Überfällig (OVERDUE), In Benotung (GRADING), Abgeschlossen (COMPLETED), Archiviert (ARCHIVED)
                </div>
                <div className="flex flex-wrap gap-2">
                  {['OPEN', 'IN_PROGRESS', 'OVERDUE', 'GRADING', 'COMPLETED', 'ARCHIVED'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setSelectedStatuses((prev) =>
                          prev.includes(status)
                            ? prev.filter((s) => s !== status)
                            : [...prev, status]
                        )
                      }}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedStatuses.includes(status)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {status === 'OPEN' && 'Offen (OPEN)'}
                      {status === 'IN_PROGRESS' && 'In Bearbeitung (IN_PROGRESS)'}
                      {status === 'OVERDUE' && 'Überfällig (OVERDUE)'}
                      {status === 'GRADING' && 'In Benotung (GRADING)'}
                      {status === 'COMPLETED' && 'Abgeschlossen (COMPLETED)'}
                      {status === 'ARCHIVED' && 'Archiviert (ARCHIVED)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsColumnFiltersOpen(!isColumnFiltersOpen)}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isColumnFiltersOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Column filters
            </button>

            {isColumnFiltersOpen && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Student
                    </label>
                    <input
                      type="text"
                      value={columnFilters.student}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          student: e.target.value,
                        }))
                      }
                      placeholder="Filter by student name, email or matriculation number…"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Supervisor
                    </label>
                    <input
                      type="text"
                      value={columnFilters.supervisor}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          supervisor: e.target.value,
                        }))
                      }
                      placeholder="Email contains…"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={columnFilters.title}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Title contains…"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      OLAT Captured
                    </label>
                    <select
                      value={columnFilters.olatCaptured}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          olatCaptured: e.target.value as PresenceFilter,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
                    >
                      <option value="all">All</option>
                      <option value="yes">Captured</option>
                      <option value="no">Not captured</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Latest Submission
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={columnFilters.latestSubmissionFrom}
                        onChange={(e) =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            latestSubmissionFrom: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      />
                      <input
                        type="date"
                        value={columnFilters.latestSubmissionTo}
                        onChange={(e) =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            latestSubmissionTo: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Submission Date
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={columnFilters.submissionFrom}
                        onChange={(e) =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            submissionFrom: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      />
                      <input
                        type="date"
                        value={columnFilters.submissionTo}
                        onChange={(e) =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            submissionTo: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Grade
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={columnFilters.gradeMin}
                        onChange={(e) =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            gradeMin: e.target.value,
                          }))
                        }
                        placeholder="Min"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={columnFilters.gradeMax}
                        onChange={(e) =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            gradeMax: e.target.value,
                          }))
                        }
                        placeholder="Max"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Captured on Zora
                    </label>
                    <select
                      value={columnFilters.capturedOnZora}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          capturedOnZora: e.target.value as PresenceFilter,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
                    >
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setColumnFilters(DEFAULT_COLUMN_FILTERS)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Reset column filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className={{ root: 'text-sm bg-blue-600 hover:bg-blue-700 text-white' }}
            >
              Create New Entry
            </Button>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {professorsLoading ? (
          <p className="text-gray-600">Loading professors...</p>
        ) : displayedSupervisions.length === 0 ? (
          <p className="text-gray-600">No results for the current filters</p>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Professor
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
                      onClick={() => handleSort('thesis')}
                    >
                      <div className="flex items-center gap-2">
                        Title
                        <FontAwesomeIcon
                          icon={getSortIcon('thesis')}
                          className="text-gray-400"
                        />
                      </div>
                    </th>

                    <th
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Status
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedSupervisions.map(({ professor, supervision }: any) => {
                    const acceptedApp = supervision.proposal.applications?.find(
                      (app: any) => app.statusKey === 'ACCEPTED'
                    )
                    const studentEmail =
                      acceptedApp?.email ||
                      supervision.studentEmail ||
                      supervision.proposal.ownedByStudent ||
                      '-'

                    const studentSub = [
                      acceptedApp?.fullName,
                      acceptedApp?.matriculationNumber,
                    ]
                      .filter(Boolean)
                      .join(' • ')

                    return (
                      <tr
                        key={`${professor.id}-${supervision.id}`}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openDetailsModal(professor, supervision)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openDetailsModal(professor, supervision)
                          }
                        }}
                      >
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {professor.name}
                          </div>
                          <div className="text-xs text-gray-500 max-w-xs truncate">
                            {professor.email}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {supervision.supervisor?.email ||
                            supervision.supervisorEmail ||
                            '-'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {studentEmail}
                          </div>
                          {studentSub && (
                            <div className="text-xs text-gray-500 max-w-xs truncate">
                              {studentSub}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {supervision.proposal.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {supervision.proposal.topicArea?.name}
                          </div>
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
                          {supervision.proposal.AdminInfo?.grade ?? '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
            )}
      </div>

      {detailsState && (
        <Modal
          open={true}
          onClose={() => {
            if (!updateAdminInfo.isPending) closeDetailsModal()
          }}
          className={{ content: 'max-w-3xl max-h-[90vh] overflow-auto' }}
        >
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">Entry Details</h2>
            <p className="mt-1 text-sm text-gray-600">
              {detailsState.supervision?.proposal?.title}
            </p>

            {(() => {
              const supervision = detailsState.supervision
              const proposal = supervision?.proposal
              const adminInfo = proposal?.AdminInfo
              const acceptedApp = proposal?.applications?.find(
                (app: any) => app.statusKey === 'ACCEPTED'
              )

              const studentEmail =
                acceptedApp?.email ||
                supervision?.studentEmail ||
                proposal?.ownedByStudent ||
                '-'
              const supervisorEmail =
                supervision?.supervisor?.email || supervision?.supervisorEmail || '-'
              const allowPublication =
                acceptedApp?.allowPublication === true
                  ? 'Yes'
                  : acceptedApp?.allowPublication === false
                    ? 'No'
                    : '-'
              const allowUsage =
                acceptedApp?.allowUsage === true
                  ? 'Yes'
                  : acceptedApp?.allowUsage === false
                    ? 'No'
                    : '-'

              return (
                <>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Professor
                      </div>
                      <div className="text-sm text-gray-900">
                        {detailsState.professorEmail}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Supervisor
                      </div>
                      <div className="text-sm text-gray-900">{supervisorEmail}</div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Student Email
                      </div>
                      <div className="text-sm text-gray-900">{studentEmail}</div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Student Name
                      </div>
                      <div className="text-sm text-gray-900">
                        {acceptedApp?.fullName || '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Matriculation Number
                      </div>
                      <div className="text-sm text-gray-900">
                        {acceptedApp?.matriculationNumber || '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Topic Area
                      </div>
                      <div className="text-sm text-gray-900">
                        {proposal?.topicArea?.name || '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Allow Publication
                      </div>
                      <div className="text-sm text-gray-900">{allowPublication}</div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Allow Usage
                      </div>
                      <div className="text-sm text-gray-900">{allowUsage}</div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Proposal StatusKey
                      </div>
                      <div className="text-sm text-gray-900">
                        {proposal?.statusKey || '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Thesis Status
                      </div>
                      <div className="text-sm text-gray-900">
                        {adminInfo?.status || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900">Admin Information</h3>

                    {editState ? (
                      <>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                setEditState({
                                  ...editState,
                                  grade: e.target.value,
                                })
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
                              setEditState({
                                ...editState,
                                comment: e.target.value,
                              })
                            }
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">
                        No AdminInfo entry exists for this proposal.
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <Button
                      onClick={closeDetailsModal}
                      className={{ root: 'text-sm' }}
                      disabled={updateAdminInfo.isPending}
                    >
                      Close
                    </Button>
                    {editState && (
                      <Button
                        onClick={handleSaveAdminInfo}
                        className={{ root: 'text-sm' }}
                        disabled={updateAdminInfo.isPending}
                      >
                        {updateAdminInfo.isPending ? 'Saving…' : 'Save'}
                      </Button>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </Modal>
      )}

      {isCreateModalOpen && (
        <Modal
          open={true}
          onClose={() => {
            if (!createAdminInfoEntry.isPending) setIsCreateModalOpen(false)
          }}
          className={{ content: 'max-w-2xl max-h-[90vh] overflow-auto' }}
        >
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">Create New Entry</h2>
            <p className="mt-1 text-sm text-gray-600">Fill in all fields and save.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professor Email
                </label>
                <select
                  value={createForm.responsibleId}
                  onChange={(e) => setCreateForm({ ...createForm, responsibleId: e.target.value })}
                  onKeyDown={handleCreateFormSelectKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">
                    {createEntryProfessorsLoading && createEntryProfessorOptions.length === 0
                      ? 'Loading options...'
                      : 'Choose an option'}
                  </option>
                  {createEntryProfessorOptions.map((prof: any) => (
                    <option key={prof.id} value={prof.id}>{prof.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supervisor Email
                </label>
                <select
                  value={createForm.supervisorEmail}
                  onChange={(e) => setCreateForm({ ...createForm, supervisorEmail: e.target.value })}
                  onKeyDown={handleCreateFormSelectKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose an option</option>
                  {supervisors?.map((supervisor: any) => (
                    <option key={supervisor.email} value={supervisor.email}>{supervisor.email}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  If you cannot find your supervisor here, ask the IT team for help.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Email
                </label>
                <input
                  type="email"
                  value={createForm.studentEmail}
                  onChange={(e) => setCreateForm({ ...createForm, studentEmail: e.target.value })}
                  placeholder="e.g. max.mustermann@uzh.ch"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  value={createForm.studentName}
                  onChange={(e) => setCreateForm({ ...createForm, studentName: e.target.value })}
                  placeholder="e.g. Max Mustermann"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Matriculation Number
                </label>
                <input
                  type="text"
                  value={createForm.matriculationNumber}
                  onChange={(e) => setCreateForm({ ...createForm, matriculationNumber: e.target.value })}
                  placeholder="e.g. 24-230-230 or 'No information'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <textarea
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={createForm.language}
                  onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })}
                  onKeyDown={handleCreateFormSelectKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose an option</option>
                  <option value="German">German</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Study Level
                </label>
                <select
                  value={createForm.studyLevel}
                  onChange={(e) => setCreateForm({ ...createForm, studyLevel: e.target.value })}
                  onKeyDown={handleCreateFormSelectKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose an option</option>
                  <option value="Bachelor Thesis (18 ECTS)">BA (Bachelor)</option>
                  <option value="Master Thesis (30 ECTS)">MA (Master)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic Area
                </label>
                <select
                  value={createForm.topicAreaSlug}
                  onChange={(e) => setCreateForm({ ...createForm, topicAreaSlug: e.target.value })}
                  onKeyDown={handleCreateFormSelectKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose an option</option>
                  {topicAreas?.map((area: any) => (
                    <option key={area.id} value={area.slug}>{area.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allow Publication
                </label>
                <select
                  value={createForm.allowPublication}
                  onChange={(e) => setCreateForm({ ...createForm, allowPublication: e.target.value })}
                  onKeyDown={handleCreateFormSelectKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Nein">No</option>
                  <option value="Ja">Yes</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 flex items-start gap-1">
                  <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  The student agrees to allow the Department of Finance to publish their work in its entirety or in part on the Internet and distribute printed versions to interested parties.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allow Usage
                </label>
                <select
                  value={createForm.allowUsage}
                  onChange={(e) => setCreateForm({ ...createForm, allowUsage: e.target.value })}
                  onKeyDown={handleCreateFormSelectKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Ja">Yes</option>
                  <option value="Nein">No</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                onClick={() => setIsCreateModalOpen(false)}
                className={{ root: 'text-sm' }}
                disabled={createAdminInfoEntry.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEntry}
                className={{ root: 'text-sm bg-blue-600 hover:bg-blue-700 text-white' }}
                disabled={createAdminInfoEntry.isPending}
              >
                {createAdminInfoEntry.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

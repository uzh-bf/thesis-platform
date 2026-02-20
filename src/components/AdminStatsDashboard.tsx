import {
  faChevronLeft,
  faChevronRight,
  faSort,
  faSortDown,
  faSortUp,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Select, TabContent, Tabs } from '@uzh-bf/design-system'
import { useEffect, useMemo, useState } from 'react'
import { trpc } from 'src/lib/trpc'

type StatsView = 'supervisors' | 'responsibles'

type StatsRow = {
  key: string
  label: string
  subLabel?: string
  count: number
}

type PageSizeOption = 20 | 50 | 100 | 'all'
type SortColumn = 'label' | 'count'
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS: PageSizeOption[] = [20, 50, 100, 'all']

function CountBar({ count, max }: { count: number; max: number }) {
  const width = max > 0 ? Math.round((count / max) * 100) : 0

  return (
    <div className="flex items-center gap-2">
      <div className="w-32 bg-gray-100 rounded h-1.5 overflow-hidden">
        <div
          className="bg-blue-600 h-1.5"
          style={{ width: `${width}%` }}
          aria-hidden={true}
        />
      </div>
      <div className="text-xs font-mono tabular-nums text-gray-900">{count}</div>
    </div>
  )
}

export default function AdminStatsDashboard() {
  const [view, setView] = useState<StatsView>('supervisors')
  const [year, setYear] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState<PageSizeOption>(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<SortColumn>('count')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { data, isLoading, error } = trpc.adminGetSupervisionStats.useQuery(
    year ? { year } : undefined
  )

  const selectedYear = year ?? data?.year ?? new Date().getFullYear()

  const yearItems = useMemo(() => {
    const years = data?.years?.length ? data.years : [selectedYear]
    return years.map((y) => ({ value: String(y), label: String(y) }))
  }, [data?.years, selectedYear])

  const normalizedSearch = search.trim().toLowerCase()

  const supervisorRows = useMemo(() => {
    const supervisions = data?.supervisions ?? []
    const supervisors = data?.supervisors ?? []

    const counts = new Map<string, number>()
    for (const s of supervisions) {
      if (!s.supervisorEmail) continue
      counts.set(s.supervisorEmail, (counts.get(s.supervisorEmail) ?? 0) + 1)
    }

    const rows: StatsRow[] = supervisors.map((s) => ({
      key: s.email,
      label: s.name ?? s.email,
      subLabel: s.email,
      count: counts.get(s.email) ?? 0,
    }))

    const filtered = normalizedSearch
      ? rows.filter((r) =>
          `${r.label} ${r.subLabel ?? ''}`.toLowerCase().includes(normalizedSearch)
        )
      : rows

    return filtered
  }, [data?.supervisions, data?.supervisors, normalizedSearch])

  const responsibleRows = useMemo(() => {
    const supervisions = data?.supervisions ?? []
    const responsibles = data?.responsibles ?? []

    const counts = new Map<string, number>()
    for (const s of supervisions) {
      if (!s.responsibleId) continue
      counts.set(s.responsibleId, (counts.get(s.responsibleId) ?? 0) + 1)
    }

    const rows: StatsRow[] = responsibles.map((r) => ({
      key: r.id,
      label: r.name,
      subLabel: r.email,
      count: counts.get(r.id) ?? 0,
    }))

    const filtered = normalizedSearch
      ? rows.filter((r) =>
          `${r.label} ${r.subLabel ?? ''}`.toLowerCase().includes(normalizedSearch)
        )
      : rows

    return filtered
  }, [data?.supervisions, data?.responsibles, normalizedSearch])

  const rows = view === 'supervisors' ? supervisorRows : responsibleRows

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let compareValue = 0

      switch (sortColumn) {
        case 'label':
          compareValue = a.label.localeCompare(b.label, undefined, {
            sensitivity: 'base',
          })
          break
        case 'count':
          compareValue = a.count - b.count
          if (compareValue === 0) {
            compareValue = a.label.localeCompare(b.label, undefined, {
              sensitivity: 'base',
            })
          }
          break
      }

      return sortDirection === 'asc' ? compareValue : -compareValue
    })
  }, [rows, sortColumn, sortDirection])

  const maxCount = sortedRows.reduce((acc, r) => Math.max(acc, r.count), 0)

  const totalPages =
    rowsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(sortedRows.length / rowsPerPage))

  const effectiveCurrentPage = Math.min(currentPage, totalPages)

  useEffect(() => {
    setCurrentPage(1)
  }, [view, search, year])

  const paginatedRows =
    rowsPerPage === 'all'
      ? sortedRows
      : sortedRows.slice(
          (effectiveCurrentPage - 1) * rowsPerPage,
          effectiveCurrentPage * rowsPerPage
        )

  const visibleStart =
    sortedRows.length === 0
      ? 0
      : rowsPerPage === 'all'
        ? 1
        : (effectiveCurrentPage - 1) * rowsPerPage + 1

  const visibleEnd =
    rowsPerPage === 'all'
      ? sortedRows.length
      : Math.min(effectiveCurrentPage * rowsPerPage, sortedRows.length)

  const paginatedSupervisorRows =
    view === 'supervisors' ? paginatedRows : supervisorRows
  const paginatedResponsibleRows =
    view === 'responsibles' ? paginatedRows : responsibleRows

  const viewTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.count, 0),
    [rows]
  )

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection(column === 'count' ? 'desc' : 'asc')
    }

    setCurrentPage(1)
  }

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return faSort
    return sortDirection === 'asc' ? faSortUp : faSortDown
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Statistics</h2>
            <p className="mt-1 text-sm text-gray-600">
              Supervised proposals per year (grouped by supervisor or responsible)
            </p>
          </div>
          <div className="text-xs text-gray-600">
            {isLoading ? 'Loading…' : `${viewTotal} supervised in ${selectedYear}`}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Year
            </label>
            <Select
              value={String(selectedYear)}
              onChange={(value) => setYear(Number(value))}
              items={yearItems}
              className={{ root: 'w-full' }}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        {error ? (
          <p className="text-sm text-red-600">{error.message}</p>
        ) : isLoading ? (
          <p className="text-gray-600">Loading statistics...</p>
        ) : !data || (data.supervisors.length === 0 && data.responsibles.length === 0) ? (
          <p className="text-gray-600">No data available</p>
        ) : (
          <Tabs
            defaultValue="supervisors"
            value={view}
            onValueChange={(value) => setView(value as StatsView)}
            tabs={[
              {
                id: 'admin-stats-supervisors',
                value: 'supervisors',
                label: 'By supervisor',
              },
              {
                id: 'admin-stats-responsibles',
                value: 'responsibles',
                label: 'By responsible',
              },
            ]}
          >
            <TabContent value="supervisors" className={{ root: 'pt-3' }}>
              <div
                className={`border border-gray-400 overflow-x-auto ${
                  rowsPerPage === 20 ? '' : 'max-h-[65vh] overflow-y-auto'
                }`}
              >
                <table className="w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th
                        onClick={() => handleSort('label')}
                        className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[65%] cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          Supervisor
                          <FontAwesomeIcon icon={getSortIcon('label')} className="text-gray-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('count')}
                        className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%] cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          Supervisions
                          <FontAwesomeIcon icon={getSortIcon('count')} className="text-gray-400" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedSupervisorRows.map((r) => (
                      <tr key={r.key} className="hover:bg-gray-50">
                        <td className="px-2 py-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {r.label}
                          </div>
                          {r.subLabel && (
                            <div className="text-xs text-gray-500 truncate">
                              {r.subLabel}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <CountBar count={r.count} max={maxCount} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-gray-600">
                  Showing {visibleStart}-{visibleEnd} of {sortedRows.length}
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
                      setCurrentPage((prev) =>
                        Math.max(1, Math.min(prev, totalPages) - 1)
                      )
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
            </TabContent>

            <TabContent value="responsibles" className={{ root: 'pt-3' }}>
              <div
                className={`border border-gray-400 overflow-x-auto ${
                  rowsPerPage === 20 ? '' : 'max-h-[65vh] overflow-y-auto'
                }`}
              >
                <table className="w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th
                        onClick={() => handleSort('label')}
                        className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[65%] cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          Responsible
                          <FontAwesomeIcon icon={getSortIcon('label')} className="text-gray-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('count')}
                        className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%] cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          Supervisions
                          <FontAwesomeIcon icon={getSortIcon('count')} className="text-gray-400" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedResponsibleRows.map((r) => (
                      <tr key={r.key} className="hover:bg-gray-50">
                        <td className="px-2 py-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {r.label}
                          </div>
                          {r.subLabel && (
                            <div className="text-xs text-gray-500 truncate">
                              {r.subLabel}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <CountBar count={r.count} max={maxCount} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-gray-600">
                  Showing {visibleStart}-{visibleEnd} of {sortedRows.length}
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
                      setCurrentPage((prev) =>
                        Math.max(1, Math.min(prev, totalPages) - 1)
                      )
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
            </TabContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

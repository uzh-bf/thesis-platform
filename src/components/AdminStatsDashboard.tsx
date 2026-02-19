import { Button, Select, TabContent, Tabs } from '@uzh-bf/design-system'
import { useMemo, useState } from 'react'
import { trpc } from 'src/lib/trpc'

type StatsView = 'supervisors' | 'responsibles'

type StatsRow = {
  key: string
  label: string
  subLabel?: string
  count: number
}

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
  const [responsibleFilterId, setResponsibleFilterId] = useState('ALL')
  const [supervisorFilterEmail, setSupervisorFilterEmail] = useState('ALL')

  const { data, isLoading, error } = trpc.adminGetSupervisionStats.useQuery(
    year ? { year } : undefined
  )

  const selectedYear = year ?? data?.year ?? new Date().getFullYear()

  const yearItems = useMemo(() => {
    const years = data?.years?.length ? data.years : [selectedYear]
    return years.map((y) => ({ value: String(y), label: String(y) }))
  }, [data?.years, selectedYear])

  const responsibleItems = useMemo(() => {
    const list = data?.responsibles ?? []
    return [
      { value: 'ALL', label: 'All responsibles' },
      ...list.map((r) => ({
        value: r.id,
        label: `${r.name} (${r.email})`,
      })),
    ]
  }, [data?.responsibles])

  const supervisorItems = useMemo(() => {
    const list = data?.supervisors ?? []
    return [
      { value: 'ALL', label: 'All supervisors' },
      ...list.map((s) => ({
        value: s.email,
        label: `${s.name ?? s.email} (${s.email})`,
      })),
    ]
  }, [data?.supervisors])

  const normalizedSearch = search.trim().toLowerCase()

  const supervisorRows = useMemo(() => {
    const supervisions = data?.supervisions ?? []
    const supervisors = data?.supervisors ?? []

    const counts = new Map<string, number>()
    for (const s of supervisions) {
      if (responsibleFilterId !== 'ALL' && s.responsibleId !== responsibleFilterId) {
        continue
      }
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

    filtered.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.label.localeCompare(b.label)
    })

    return filtered
  }, [data?.supervisions, data?.supervisors, responsibleFilterId, normalizedSearch])

  const responsibleRows = useMemo(() => {
    const supervisions = data?.supervisions ?? []
    const responsibles = data?.responsibles ?? []

    const counts = new Map<string, number>()
    for (const s of supervisions) {
      if (
        supervisorFilterEmail !== 'ALL' &&
        s.supervisorEmail !== supervisorFilterEmail
      ) {
        continue
      }
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

    filtered.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.label.localeCompare(b.label)
    })

    return filtered
  }, [data?.supervisions, data?.responsibles, supervisorFilterEmail, normalizedSearch])

  const rows = view === 'supervisors' ? supervisorRows : responsibleRows
  const maxCount = rows.reduce((acc, r) => Math.max(acc, r.count), 0)

  const viewTotal = useMemo(() => {
    if (!data?.supervisions) return 0

    if (view === 'supervisors') {
      return data.supervisions.filter((s) => {
        if (responsibleFilterId !== 'ALL' && s.responsibleId !== responsibleFilterId) {
          return false
        }
        return Boolean(s.supervisorEmail)
      }).length
    }

    return data.supervisions.filter((s) => {
      if (supervisorFilterEmail !== 'ALL' && s.supervisorEmail !== supervisorFilterEmail) {
        return false
      }
      return Boolean(s.responsibleId)
    }).length
  }, [data?.supervisions, view, responsibleFilterId, supervisorFilterEmail])

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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              {view === 'supervisors' ? 'Responsible filter' : 'Supervisor filter'}
            </label>
            {view === 'supervisors' ? (
              <Select
                value={responsibleFilterId}
                onChange={(value) => setResponsibleFilterId(value as string)}
                items={responsibleItems}
                className={{ root: 'w-full' }}
              />
            ) : (
              <Select
                value={supervisorFilterEmail}
                onChange={(value) => setSupervisorFilterEmail(value as string)}
                items={supervisorItems}
                className={{ root: 'w-full' }}
              />
            )}
          </div>

          <div className="md:col-span-2">
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

        <div className="mt-3">
          <Button
            onClick={() => {
              setSearch('')
              setResponsibleFilterId('ALL')
              setSupervisorFilterEmail('ALL')
            }}
            className={{ root: 'text-xs' }}
          >
            Reset filters
          </Button>
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
              <div className="overflow-auto max-h-[65vh] border border-gray-400">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[65%]">
                        Supervisor
                      </th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%]">
                        Supervisions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supervisorRows.map((r) => (
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
            </TabContent>

            <TabContent value="responsibles" className={{ root: 'pt-3' }}>
              <div className="overflow-auto max-h-[65vh] border border-gray-400">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[65%]">
                        Responsible
                      </th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%]">
                        Supervisions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {responsibleRows.map((r) => (
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
            </TabContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

export type SupervisorCsvRow = {
  name: string
  email: string
  topicAreas: string[]
  submissionNotifications: boolean
  notes: string | null
}

const CSV_HEADERS = ['Name', 'Email', 'Topic Areas', 'Notifications', 'Notes']

function escapeCsvValue(value: string) {
  // Prevent CSV/Excel formula injection (e.g. values starting with =, +, -, @)
  const source = /^\s*[=+\-@]/.test(value) ? `'${value}` : value

  return `"${source.replace(/\r\n?/g, '\n').replace(/"/g, '""')}"`
}

// German-locale Excel expects ';' as the list separator, as in the
// applications export.
export function getCsvDelimiter(language: string | undefined) {
  const lang = (language ?? '').toLowerCase()
  return lang === 'de' || lang.startsWith('de-') ? ';' : ','
}

export function buildSupervisorCsv(
  rows: SupervisorCsvRow[],
  delimiter: ',' | ';'
) {
  const lines = [
    CSV_HEADERS,
    ...rows.map((row) => [
      row.name,
      row.email,
      row.topicAreas.join(', '),
      row.submissionNotifications ? 'Yes' : 'No',
      row.notes ?? '',
    ]),
  ].map((cells) => cells.map(escapeCsvValue).join(delimiter))

  // BOM so Excel opens the file as UTF-8 (umlauts in names).
  return `﻿${lines.join('\n')}\n`
}

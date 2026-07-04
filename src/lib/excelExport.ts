type CellValue = string | number | boolean | Date | null | undefined

export type ExcelColumn<T> = {
  header: string
  value: (row: T) => CellValue
}

const headerCell = (value: string) => ({
  value,
  fontWeight: 'bold' as const,
})

export async function writeRowsToXlsx<T>({
  rows,
  columns,
  sheet,
  fileName,
}: {
  rows: T[]
  columns: ExcelColumn<T>[]
  sheet: string
  fileName: string
}) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const sheetData = [
    columns.map((column) => headerCell(column.header)),
    ...rows.map((row) => columns.map((column) => column.value(row) ?? '-')),
  ]

  await writeExcelFile(sheetData, { sheet }).toFile(fileName)
}

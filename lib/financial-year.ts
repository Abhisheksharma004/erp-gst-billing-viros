/**
 * Financial Year Utility Functions for Indian Financial Year (April 1 to March 31).
 */

export interface FinancialYearRange {
  fyLabel: string // e.g. "FY 2026-27"
  startYear: number // e.g. 2026
  endYear: number // e.g. 2027
  startDate: string // "2026-04-01"
  endDate: string // "2027-03-31"
  startDateTime: string // "2026-04-01 00:00:00"
  endDateTime: string // "2027-03-31 23:59:59"
}

/**
 * Gets default Financial Year based on current date.
 * Indian FY starts on April 1 and ends on March 31.
 */
export function getCurrentFinancialYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed (0 = Jan, 3 = April)
  const startYear = month >= 3 ? year : year - 1
  const nextYearShort = String((startYear + 1) % 100).padStart(2, '0')
  return `FY ${startYear}-${nextYearShort}`
}

/**
 * Parse an FY string like "FY 2026-27", "2026-27", or "FY 2026" into exact date ranges.
 */
export function parseFinancialYear(fyString?: string | null): FinancialYearRange {
  let startYear: number | null = null

  if (fyString && typeof fyString === 'string') {
    const cleaned = fyString.trim().replace(/^FY\s*/i, '')
    const match = cleaned.match(/^(\d{4})(?:-(\d{2,4}))?$/)
    if (match) {
      startYear = parseInt(match[1], 10)
    }
  }

  if (!startYear || isNaN(startYear)) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const month = now.getMonth()
    startYear = month >= 3 ? currentYear : currentYear - 1
  }

  const endYear = startYear + 1
  const nextYearShort = String(endYear % 100).padStart(2, '0')
  const fyLabel = `FY ${startYear}-${nextYearShort}`

  return {
    fyLabel,
    startYear,
    endYear,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
    startDateTime: `${startYear}-04-01 00:00:00`,
    endDateTime: `${endYear}-03-31 23:59:59`,
  }
}

/**
 * Appends Financial Year date range filter (dateColumn >= startDate AND dateColumn <= endDate)
 * to SQL query conditions and params if financialYear is provided and explicit fromDate/toDate are not set.
 */
export function appendFyFilter(
  conditions: string[],
  params: any[],
  financialYear?: string | null,
  dateColumn: string = 'date',
  explicitFromDate?: string | null,
  explicitToDate?: string | null
): void {
  // If explicit dates are provided by the user (e.g. custom date filter in UI), respect them first
  if (explicitFromDate && explicitToDate) {
    return
  }

  if (explicitFromDate) {
    return
  }

  if (explicitToDate) {
    return
  }

  if (financialYear) {
    const range = parseFinancialYear(financialYear)
    conditions.push(`DATE(${dateColumn}) >= ? AND DATE(${dateColumn}) <= ?`)
    params.push(range.startDate, range.endDate)
  }
}

/**
 * Returns all 12 month keys in "YYYY-MM" format for the given Financial Year (April to March).
 * Useful for monthly aggregation charts and tables.
 */
export function getMonthsForFinancialYear(fyString?: string | null): { key: string; label: string; year: number; month: number }[] {
  const range = parseFinancialYear(fyString)
  const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  const months: { key: string; label: string; year: number; month: number }[] = []

  for (let i = 0; i < 12; i++) {
    const monthNum = i < 9 ? i + 4 : i - 8 // 4..12, then 1..3
    const yr = i < 9 ? range.startYear : range.endYear
    const monthKey = `${yr}-${String(monthNum).padStart(2, '0')}`
    months.push({
      key: monthKey,
      label: `${monthNames[i]} ${String(yr).slice(-2)}`,
      year: yr,
      month: monthNum,
    })
  }

  return months
}

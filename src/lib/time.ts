const pad = (n: number, w = 2) => String(Math.trunc(Math.abs(n))).padStart(w, '0')

/** ISO string in local time with the local UTC offset, e.g. 2026-10-19T21:30:00.000+01:00 */
export function toLocalIso(d: Date = new Date()): string {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}` +
    `${sign}${pad(off / 60)}:${pad(off % 60)}`
  )
}

export const nowIso = () => toLocalIso(new Date())

/** Local calendar date YYYY-MM-DD of a Date. */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayKey = () => dateKey(new Date())

/** Calendar date of a stored timestamp, in the offset it was recorded with. */
export function dateKeyOf(ts: string): string {
  return ts.slice(0, 10)
}

/** Parses YYYY-MM-DD as local midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86400000)
}

/** Inclusive list of date keys from start to end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = []
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k)
  return out
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(key: string): number {
  const wd = parseDateKey(key).getDay()
  return wd === 0 ? 7 : wd
}

/** Monday of the week containing key. */
export function weekStart(key: string): string {
  return addDays(key, 1 - isoWeekday(key))
}

/** Value for <input type="datetime-local"> from a stored timestamp. */
export function toInputDateTime(ts: string): string {
  return toLocalIso(new Date(ts)).slice(0, 16)
}

export function fromInputDateTime(v: string): string {
  return toLocalIso(new Date(v))
}

export function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(key: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return parseDateKey(key).toLocaleDateString(undefined, opts)
}

export function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

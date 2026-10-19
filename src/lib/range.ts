import type { AllData } from '../db/types'
import { addDays, dateKeyOf, todayKey } from './time'

export type RangeKey = '14' | '30' | '90' | 'all'

export function earliestDate(d: AllData): string {
  const keys = [
    ...d.bowelMovements.map((b) => dateKeyOf(b.timestamp)),
    ...d.checkIns.map((c) => c.date),
    ...d.ibsSss.map((s) => s.date),
    ...d.weights.map((w) => w.date),
    ...d.triggers.map((t) => dateKeyOf(t.timestamp)),
  ]
  return keys.length ? keys.reduce((a, b) => (a < b ? a : b)) : todayKey()
}

export function rangeStart(range: RangeKey, d: AllData, today = todayKey()): string {
  return range === 'all' ? earliestDate(d) : addDays(today, -(Number(range) - 1))
}

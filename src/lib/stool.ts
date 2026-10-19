import type { BowelMovement } from '../db/types'
import { dateKeyOf } from './time'

export const isHard = (b: number) => b <= 2
export const isLoose = (b: number) => b >= 6
export const isNormal = (b: number) => b >= 3 && b <= 5

export type SubtypePattern = 'IBS-C' | 'IBS-D' | 'IBS-M' | 'unclassified'

export interface StoolStats {
  count: number
  daysWithBM: number
  pctHard: number
  pctNormal: number
  pctLoose: number
  pctUrgency: number
  meanPerDay: number
  /** Share of days-with-BM that had at least one hard / loose stool (basis of the subtype indicator). */
  pctHardDays: number
  pctLooseDays: number
  subtype: SubtypePattern
}

/**
 * Derived subtype indicator (Rome IV-style). Based on days with at least one bowel movement:
 * a day counts as "hard" if it had any Bristol 1–2 and "loose" if it had any Bristol 6–7.
 */
export function subtypeIndicator(bms: Pick<BowelMovement, 'timestamp' | 'bristol'>[]): {
  subtype: SubtypePattern
  pctHardDays: number
  pctLooseDays: number
  daysWithBM: number
} {
  const days = new Map<string, { hard: boolean; loose: boolean }>()
  for (const b of bms) {
    const k = dateKeyOf(b.timestamp)
    const d = days.get(k) ?? { hard: false, loose: false }
    if (isHard(b.bristol)) d.hard = true
    if (isLoose(b.bristol)) d.loose = true
    days.set(k, d)
  }
  const n = days.size
  if (n === 0) return { subtype: 'unclassified', pctHardDays: 0, pctLooseDays: 0, daysWithBM: 0 }
  let hard = 0
  let loose = 0
  for (const d of days.values()) {
    if (d.hard) hard++
    if (d.loose) loose++
  }
  const pctHardDays = (hard / n) * 100
  const pctLooseDays = (loose / n) * 100
  const h = pctHardDays >= 25
  const l = pctLooseDays >= 25
  const subtype: SubtypePattern = h && l ? 'IBS-M' : h ? 'IBS-C' : l ? 'IBS-D' : 'unclassified'
  return { subtype, pctHardDays, pctLooseDays, daysWithBM: n }
}

/** @param totalDays number of calendar days in the range (for mean BMs per day). */
export function stoolStats(bms: BowelMovement[], totalDays: number): StoolStats {
  const count = bms.length
  const pct = (f: (b: BowelMovement) => boolean) => (count ? (bms.filter(f).length / count) * 100 : 0)
  const sub = subtypeIndicator(bms)
  return {
    count,
    daysWithBM: sub.daysWithBM,
    pctHard: pct((b) => isHard(b.bristol)),
    pctNormal: pct((b) => isNormal(b.bristol)),
    pctLoose: pct((b) => isLoose(b.bristol)),
    pctUrgency: pct((b) => b.urgency),
    meanPerDay: totalDays > 0 ? count / totalDays : 0,
    pctHardDays: sub.pctHardDays,
    pctLooseDays: sub.pctLooseDays,
    subtype: sub.subtype,
  }
}

export const BRISTOL_INFO: Record<number, { short: string; desc: string }> = {
  1: { short: 'Hard lumps', desc: 'Separate hard lumps' },
  2: { short: 'Lumpy', desc: 'Sausage-shaped but lumpy' },
  3: { short: 'Cracked', desc: 'Sausage with cracks on surface' },
  4: { short: 'Smooth', desc: 'Smooth, soft sausage' },
  5: { short: 'Soft blobs', desc: 'Soft blobs, clear edges' },
  6: { short: 'Mushy', desc: 'Fluffy, mushy, ragged edges' },
  7: { short: 'Liquid', desc: 'Watery, no solid pieces' },
}

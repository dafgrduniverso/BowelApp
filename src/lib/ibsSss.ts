import { IBS_SSS_BANDS } from './config'
import type { DailyCheckIn, IbsSss } from '../db/types'
import { addDays } from './time'

export type IbsSssItems = Pick<
  IbsSss,
  'hasPain' | 'painSeverity' | 'painDaysOutOf10' | 'hasDistension' | 'distensionSeverity' | 'bowelDissatisfaction' | 'lifeInterference'
>

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0))

export function scoreIbsSss(i: IbsSssItems): number {
  const pain = i.hasPain ? clamp(i.painSeverity, 0, 100) + clamp(i.painDaysOutOf10, 0, 10) * 10 : 0
  const distension = i.hasDistension ? clamp(i.distensionSeverity, 0, 100) : 0
  return Math.round(pain + distension + clamp(i.bowelDissatisfaction, 0, 100) + clamp(i.lifeInterference, 0, 100))
}

export function ibsSssBand(total: number) {
  return IBS_SSS_BANDS.find((b) => total <= b.max) ?? IBS_SSS_BANDS[IBS_SSS_BANDS.length - 1]
}

/** The questionnaire's recall period: "days with pain out of the last 10". */
export const IBS_SSS_RECALL_DAYS = 10

export interface IbsSssSuggestion {
  items: Pick<IbsSssItems, 'hasPain' | 'painSeverity' | 'painDaysOutOf10' | 'hasDistension' | 'distensionSeverity'>
  /** Number of check-ins found in the recall window (the window is 10 days long). */
  checkIns: number
}

/**
 * Pre-fills the three IBS-SSS items that daily check-ins cover, from the 10 days ending on `date`:
 * days with pain > 0, and mean pain / bloating on the days they were present (0–10 → 0–100).
 */
export function suggestIbsSss(checkIns: Pick<DailyCheckIn, 'date' | 'painMax' | 'bloating'>[], date: string): IbsSssSuggestion | undefined {
  const from = addDays(date, -(IBS_SSS_RECALL_DAYS - 1))
  const window = checkIns.filter((c) => c.date >= from && c.date <= date)
  if (!window.length) return undefined
  const painDays = window.filter((c) => c.painMax > 0)
  const bloatDays = window.filter((c) => c.bloating > 0)
  const meanX10 = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) : 0)
  return {
    checkIns: window.length,
    items: {
      hasPain: painDays.length > 0,
      painSeverity: meanX10(painDays.map((c) => c.painMax)),
      painDaysOutOf10: painDays.length,
      hasDistension: bloatDays.length > 0,
      distensionSeverity: meanX10(bloatDays.map((c) => c.bloating)),
    },
  }
}

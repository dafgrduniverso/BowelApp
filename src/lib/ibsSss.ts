import { IBS_SSS_BANDS } from './config'
import type { IbsSss } from '../db/types'

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

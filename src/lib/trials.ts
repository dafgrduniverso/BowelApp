import type { BowelMovement, DailyCheckIn, IbsSss, Intervention } from '../db/types'
import { TRIAL_CONFIG as C } from './config'
import { isLoose } from './stool'
import { addDays, dateKeyOf, todayKey } from './time'

export interface WindowStats {
  start: string
  end: string
  ibsSssMean?: number
  ibsSssCount: number
  painMean?: number
  painCount: number
  pctLoose?: number
  bmCount: number
}

export interface TrialComparison {
  intervention: Intervention
  baseline: WindowStats
  trial: WindowStats
  insufficientData: boolean
  ibsSssChange?: number
  clinicallyMeaningful: boolean
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined)

export function windowStats(
  start: string,
  end: string,
  data: { ibsSss: IbsSss[]; checkIns: DailyCheckIn[]; bowelMovements: BowelMovement[] },
): WindowStats {
  const inRange = (k: string) => k >= start && k <= end
  const sss = data.ibsSss.filter((s) => inRange(s.date)).map((s) => s.total)
  const pain = data.checkIns.filter((c) => inRange(c.date)).map((c) => c.painMax)
  const bms = data.bowelMovements.filter((b) => inRange(dateKeyOf(b.timestamp)))
  return {
    start,
    end,
    ibsSssMean: mean(sss),
    ibsSssCount: sss.length,
    painMean: mean(pain),
    painCount: pain.length,
    pctLoose: bms.length ? (bms.filter((b) => isLoose(b.bristol)).length / bms.length) * 100 : undefined,
    bmCount: bms.length,
  }
}

/** End date of a trial's evaluation window: actual end, else today (capped at the planned end if passed). */
export function trialEnd(i: Intervention, today = todayKey()): string {
  if (i.actualEndDate) return i.actualEndDate
  if (i.plannedEndDate && i.plannedEndDate < today) return i.plannedEndDate
  return today
}

/**
 * Baseline = the N days before the trial start. Trial window = the trial's last N days
 * (never before the start date).
 */
export function compareTrial(
  i: Intervention,
  data: { ibsSss: IbsSss[]; checkIns: DailyCheckIn[]; bowelMovements: BowelMovement[] },
  today = todayKey(),
): TrialComparison | undefined {
  if (i.mode !== 'trial' || !i.startDate) return undefined
  const n = C.windowDays
  const baseline = windowStats(addDays(i.startDate, -n), addDays(i.startDate, -1), data)
  const end = trialEnd(i, today)
  const trialStart = addDays(end, -(n - 1)) < i.startDate ? i.startDate : addDays(end, -(n - 1))
  const trial = windowStats(trialStart, end, data)
  const insufficientData = baseline.ibsSssCount < C.minIbsSssEntries || trial.ibsSssCount < C.minIbsSssEntries
  const ibsSssChange =
    !insufficientData && baseline.ibsSssMean !== undefined && trial.ibsSssMean !== undefined
      ? trial.ibsSssMean - baseline.ibsSssMean
      : undefined
  return {
    intervention: i,
    baseline,
    trial,
    insufficientData,
    ibsSssChange,
    clinicallyMeaningful: ibsSssChange !== undefined && -ibsSssChange >= C.clinicallyMeaningfulDrop,
  }
}

export function isTrialActive(i: Intervention, today = todayKey()): boolean {
  return i.mode === 'trial' && !!i.startDate && i.startDate <= today && !i.actualEndDate
}

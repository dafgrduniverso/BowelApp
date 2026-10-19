import type { AllData, LabResult } from '../db/types'
import { RED_FLAG_CONFIG as C, RED_FLAG_MESSAGES as M } from './config'
import { LAB_TESTS, numericValue, sameTest } from './labs'
import { addDays } from './time'

export interface RuleHit {
  ruleId: string
  eventKey: string
  message: string
}

export type RuleInput = Pick<AllData, 'bowelMovements' | 'checkIns' | 'eyeEpisodes' | 'labs' | 'weights'>

const hit = (ruleId: string, eventId: string): RuleHit => ({ ruleId, eventKey: `${ruleId}:${eventId}`, message: M[ruleId] })

const byDate = <T extends { date: string; createdAt: string }>(a: T, b: T) =>
  a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)

function labSeries(labs: LabResult[], test: string) {
  return labs.filter((l) => sameTest(l.test, test) && numericValue(l.value) !== undefined).sort(byDate)
}

/** Haemoglobin normalised to g/dL (accepts g/L and mmol/L). */
function hbGdl(l: LabResult): number {
  const v = numericValue(l.value)!
  const u = (l.unit ?? '').toLowerCase().replace(/\s/g, '')
  if (u === 'g/l') return v / 10
  if (u === 'mmol/l') return v * 1.611
  return v
}
function hbRefLowGdl(l: LabResult): number {
  if (l.refLow === undefined) return C.haemoglobin.refLowFallbackGdl
  return hbGdl({ ...l, value: l.refLow })
}

/** Returns every rule hit in the data. Each hit is keyed by its triggering event. */
export function evaluateRules(d: RuleInput): RuleHit[] {
  const out: RuleHit[] = []

  // blood
  for (const b of d.bowelMovements) if (b.blood) out.push(hit('blood', b.id))

  // nocturnal: ≥ N woke-me-up BMs within a 7-day window; keyed by the BM that completes the count
  const woke = d.bowelMovements.filter((b) => b.wokeMeUp).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const windowMs = C.nocturnal.windowDays * 86400000
  for (let i = 0; i < woke.length; i++) {
    const t = new Date(woke[i].timestamp).getTime()
    const inWindow = woke.filter((w, j) => j <= i && t - new Date(w.timestamp).getTime() < windowMs).length
    if (inWindow >= C.nocturnal.minCount) out.push(hit('nocturnal', woke[i].id))
  }

  // weight loss vs max of previous N days
  const weights = [...d.weights].sort(byDate)
  for (const w of weights) {
    const from = addDays(w.date, -C.weightLoss.lookbackDays)
    const prior = weights.filter((p) => p !== w && p.date >= from && (p.date < w.date || (p.date === w.date && p.createdAt < w.createdAt)))
    if (!prior.length) continue
    const max = Math.max(...prior.map((p) => p.kg))
    if (max > 0 && ((max - w.kg) / max) * 100 >= C.weightLoss.minPercentDrop) out.push(hit('weight_loss', w.id))
  }

  // calprotectin
  const calp = labSeries(d.labs, LAB_TESTS.calprotectin)
  calp.forEach((l, i) => {
    const v = numericValue(l.value)!
    if (v >= C.calprotectin.high) out.push(hit('calprotectin_high', l.id))
    if (i > 0) {
      const prev = numericValue(calp[i - 1].value)!
      if (v >= C.calprotectin.risingMin && v >= prev * (1 + C.calprotectin.risingPercent / 100) && v > prev)
        out.push(hit('calprotectin_rising', l.id))
    }
  })

  // haemoglobin
  const hb = labSeries(d.labs, LAB_TESTS.haemoglobin)
  hb.forEach((l, i) => {
    const v = hbGdl(l)
    const low = v < hbRefLowGdl(l)
    const drop = i > 0 && hbGdl(hb[i - 1]) - v >= C.haemoglobin.minDropGdl - 1e-9
    if (low || drop) out.push(hit('hb_drop', l.id))
  })

  // ferritin
  for (const l of labSeries(d.labs, LAB_TESTS.ferritin)) {
    if (numericValue(l.value)! < (l.refLow ?? C.ferritin.refLowFallback)) out.push(hit('ferritin_low', l.id))
  }

  // eye
  for (const e of d.eyeEpisodes) if (e.photophobia || e.blurredVision || e.pain === 'deep_aching') out.push(hit('eye_urgent', e.id))

  // fever with flare
  for (const c of d.checkIns) {
    if (c.flareDay && (c.notes ?? '').toLowerCase().includes(C.feverKeyword)) out.push(hit('fever_flare', c.id))
  }

  return out
}

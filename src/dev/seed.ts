import type { AllData, Bristol, Intervention } from '../db/types'
import { PAIN_LOCATIONS } from '../db/types'
import { scoreIbsSss } from '../lib/ibsSss'
import { addDays, dateKey, toLocalIso } from '../lib/time'

/** Small deterministic PRNG (mulberry32) so seeded data is reproducible. */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generates `days` days of realistic fake data ending on `end`: an IBS-D-leaning pattern,
 * coffee/high-FODMAP triggers that worsen the next day, a 4-week peppermint oil trial that
 * starts on day 22 and helps, on-demand loperamide on flare days, weekly IBS-SSS, labs, weight.
 */
export function generateSeed(days = 60, end = new Date()): Omit<AllData, 'alerts'> & { alerts: [] } {
  const r = rng(42)
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
  const endKey = dateKey(end)
  const startKey = addDays(endKey, -(days - 1))
  let n = 0
  const meta = () => {
    const t = toLocalIso(new Date())
    return { id: `seed-${++n}`, createdAt: t, updatedAt: t }
  }
  const at = (key: string, h: number, m = 0) => {
    const [y, mo, d] = key.split('-').map(Number)
    return toLocalIso(new Date(y, mo - 1, d, h, m))
  }

  const trialStart = addDays(startKey, 21)
  const trialEnd = addDays(trialStart, 27)
  const peppermint: Intervention = {
    ...meta(),
    name: 'Peppermint oil',
    category: 'supplement',
    mode: 'trial',
    dose: '182 mg 3×/day',
    startDate: trialStart,
    plannedEndDate: trialEnd,
    ...(trialEnd < endKey ? { actualEndDate: trialEnd, outcome: 'helped' as const, outcomeNotes: 'Less cramping.' } : {}),
  }
  const loperamide: Intervention = { ...meta(), name: 'Loperamide', category: 'drug', mode: 'on_demand', dose: '2 mg' }

  const data: Omit<AllData, 'alerts'> & { alerts: [] } = {
    bowelMovements: [],
    checkIns: [],
    triggers: [],
    eyeEpisodes: [],
    interventions: [peppermint, loperamide],
    doses: [],
    ibsSss: [],
    labs: [],
    weights: [],
    alerts: [],
  }

  let prevTriggered = false
  for (let i = 0; i < days; i++) {
    const key = addDays(startKey, i)
    const onTrial = key >= trialStart && key <= trialEnd
    const severity = (onTrial ? 0.6 : 1) * (prevTriggered ? 1.4 : 1)

    const tags: string[] = []
    if (r() < 0.55) tags.push('coffee')
    if (r() < 0.25) tags.push('high-FODMAP')
    if (r() < 0.15) tags.push('alcohol')
    if (r() < 0.2) tags.push('high stress')
    if (r() < 0.1) tags.push('eating out')
    if (tags.length) data.triggers.push({ ...meta(), timestamp: at(key, 8 + Math.floor(r() * 6), 15), tags })
    prevTriggered = tags.includes('coffee') || tags.includes('high-FODMAP')

    const flare = r() < 0.12 * severity
    const count = Math.max(1, Math.round(1 + r() * 2 * severity + (flare ? 2 : 0)))
    for (let k = 0; k < count; k++) {
      const base = flare ? 5.5 : 3.6 + severity * 0.8
      const bristol = Math.min(7, Math.max(1, Math.round(base + (r() - 0.5) * 3))) as Bristol
      const night = flare && k === 0 && r() < 0.3
      data.bowelMovements.push({
        ...meta(),
        timestamp: at(key, night ? 3 : 7 + Math.floor((k / count) * 14), Math.floor(r() * 60)),
        bristol,
        urgency: bristol >= 6 ? r() < 0.8 : r() < 0.15,
        blood: false,
        wokeMeUp: night,
        incomplete: r() < 0.2,
      })
    }

    const pain = Math.min(10, Math.round((flare ? 6 : 2.5) * severity + r() * 2))
    data.checkIns.push({
      ...meta(),
      date: key,
      painMax: pain,
      painLocations: pain > 0 ? [pick(PAIN_LOCATIONS), ...(r() < 0.4 ? ['LLQ' as const] : [])].filter((v, j, a) => a.indexOf(v) === j) : [],
      painRelievedByBM: pain === 0 ? 'na' : pick(['yes', 'partly', 'no'] as const),
      bloating: Math.min(10, Math.round((flare ? 6 : 3) * severity + r() * 2)),
      stress: Math.round(2 + r() * 5 + (tags.includes('high stress') ? 3 : 0)),
      sleepHours: Math.round((6 + r() * 2.5) * 2) / 2,
      sleepQuality: Math.round(4 + r() * 5),
      alcoholUnits: tags.includes('alcohol') ? 2 + Math.floor(r() * 3) : 0,
      exerciseMinutes: r() < 0.5 ? 20 + Math.floor(r() * 40) : 0,
      flareDay: flare,
    })
    if (flare) data.doses.push({ ...meta(), interventionId: loperamide.id, timestamp: at(key, 10), reason: 'flare' })
    if (onTrial) data.doses.push({ ...meta(), interventionId: peppermint.id, timestamp: at(key, 8), reason: 'preventive' })

    if (i % 7 === 3) {
      const s = onTrial ? 0.55 : 1
      const items = {
        hasPain: true,
        painSeverity: Math.round((45 + r() * 20) * s),
        painDaysOutOf10: Math.round((5 + r() * 3) * s),
        hasDistension: true,
        distensionSeverity: Math.round((40 + r() * 20) * s),
        bowelDissatisfaction: Math.round((60 + r() * 20) * s),
        lifeInterference: Math.round((45 + r() * 20) * s),
      }
      data.ibsSss.push({ ...meta(), date: key, ...items, total: scoreIbsSss(items) })
    }
    if (i % 7 === 0) data.weights.push({ ...meta(), date: key, kg: Math.round((72 - i * 0.03 + (r() - 0.5)) * 10) / 10 })
  }

  const labDay = addDays(startKey, 5)
  const L = (test: string, value: number | string, unit?: string, refLow?: number, refHigh?: number, date = labDay) =>
    data.labs.push({ ...meta(), date, test, value, unit, refLow, refHigh, lab: 'Demo lab' })
  L('Faecal calprotectin', 45, 'µg/g', undefined, 50)
  L('Faecal calprotectin', 62, 'µg/g', undefined, 50, addDays(endKey, -10))
  L('CRP', 2.1, 'mg/L', 0, 5)
  L('Haemoglobin', 14.1, 'g/dL', 13, 17)
  L('Haemoglobin', 13.8, 'g/dL', 13, 17, addDays(endKey, -10))
  L('Ferritin', 24, 'ng/mL', 30, 400)
  L('tTG-IgA', 'negative', undefined)
  L('Total IgA', 2.1, 'g/L', 0.7, 4)
  L('TSH', 1.8, 'mU/L', 0.4, 4)

  data.eyeEpisodes.push({
    ...meta(),
    startTimestamp: at(addDays(startKey, 30), 9),
    endTimestamp: at(addDays(startKey, 32), 9),
    eye: 'right',
    pain: 'gritty',
    photophobia: false,
    blurredVision: false,
    photos: [],
    notes: 'Mild redness.',
  })
  return data
}

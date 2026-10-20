import type { AllData } from '../db/types'
import { ibsSssBand } from './ibsSss'
import { refRangeText } from './labs'
import { stoolStats } from './stool'
import { dateKeyOf, dateRange } from './time'
import { compareTrial } from './trials'

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined)
const r1 = (n: number | undefined) => (n === undefined ? '' : String(Math.round(n * 10) / 10))

export interface DailyAggregate {
  date: string
  bms: number
  bristolMean?: number
  hard: number
  loose: number
  urgency: number
  blood: number
  nocturnal: number
  pain?: number
  bloating?: number
  stress?: number
  sleepQuality?: number
  sleepHours?: number
  alcohol?: number
  flare?: boolean
  triggers: string[]
  doses: string[]
}

export function dailyAggregates(d: AllData, start: string, end: string): DailyAggregate[] {
  const names = new Map(d.interventions.map((i) => [i.id, i.name]))
  return dateRange(start, end).map((date) => {
    const bms = d.bowelMovements.filter((b) => dateKeyOf(b.timestamp) === date)
    const c = d.checkIns.find((x) => x.date === date)
    return {
      date,
      bms: bms.length,
      bristolMean: mean(bms.map((b) => b.bristol)),
      hard: bms.filter((b) => b.bristol <= 2).length,
      loose: bms.filter((b) => b.bristol >= 6).length,
      urgency: bms.filter((b) => b.urgency).length,
      blood: bms.filter((b) => b.blood).length,
      nocturnal: bms.filter((b) => b.wokeMeUp).length,
      pain: c?.painMax,
      bloating: c?.bloating,
      stress: c?.stress,
      sleepQuality: c?.sleepQuality,
      sleepHours: c?.sleepHours,
      alcohol: c?.alcoholUnits,
      flare: c?.flareDay,
      triggers: [...new Set(d.triggers.filter((t) => dateKeyOf(t.timestamp) === date).flatMap((t) => t.tags))],
      doses: d.doses.filter((x) => dateKeyOf(x.timestamp) === date).map((x) => names.get(x.interventionId) ?? '?'),
    }
  })
}

function periodStats(d: AllData, start: string, end: string) {
  const inRange = (k: string) => k >= start && k <= end
  const bms = d.bowelMovements.filter((b) => inRange(dateKeyOf(b.timestamp)))
  const checkIns = d.checkIns.filter((c) => inRange(c.date))
  const days = dateRange(start, end).length
  return {
    days,
    stool: stoolStats(bms, days),
    nocturnalCount: bms.filter((b) => b.wokeMeUp).length,
    bloodCount: bms.filter((b) => b.blood).length,
    painMean: mean(checkIns.map((c) => c.painMax)),
    bloatingMean: mean(checkIns.map((c) => c.bloating)),
    flareDays: checkIns.filter((c) => c.flareDay).length,
    ibsSss: d.ibsSss.filter((s) => inRange(s.date)).sort((a, b) => a.date.localeCompare(b.date)),
    interventions: [...d.interventions].sort((a, b) => (a.startDate ?? a.createdAt).localeCompare(b.startDate ?? b.createdAt)),
    comparisons: d.interventions.map((i) => compareTrial(i, d)).filter((c) => !!c),
    labs: [...d.labs].sort((a, b) => a.test.localeCompare(b.test) || b.date.localeCompare(a.date)),
    dosesPerIntervention: d.interventions.map((i) => ({ i, count: d.doses.filter((x) => x.interventionId === i.id && inRange(dateKeyOf(x.timestamp))).length })),
  }
}

/** Compact Markdown for pasting into an AI assistant. Free-text notes only when includeNotes is set. */
export function aiSummaryMarkdown(d: AllData, start: string, end: string, includeNotes: boolean): string {
  const s = periodStats(d, start, end)
  const L: string[] = []
  L.push(`# Gut tracker summary ${start} → ${end} (${s.days} days)`)
  L.push('')
  L.push('Self-logged data from a personal symptom tracker. Bristol stool scale 1–7; daily scores 0–10; IBS-SSS 0–500.')
  L.push('')
  L.push('## Overview')
  L.push(
    `- BMs: ${s.stool.count} (${r1(s.stool.meanPerDay)}/day), hard ${r1(s.stool.pctHard)}%, normal ${r1(s.stool.pctNormal)}%, loose ${r1(s.stool.pctLoose)}%, urgency ${r1(s.stool.pctUrgency)}%`,
  )
  L.push(`- Pattern indicator (not a diagnosis): ${s.stool.subtype} (hard days ${r1(s.stool.pctHardDays)}%, loose days ${r1(s.stool.pctLooseDays)}%)`)
  L.push(`- Mean pain ${r1(s.painMean)}, bloating ${r1(s.bloatingMean)}; flare days ${s.flareDays}; nocturnal BMs ${s.nocturnalCount}; blood ${s.bloodCount}`)
  L.push('')
  L.push('## Daily aggregates')
  L.push('| date | BMs | bristol avg | hard | loose | urg | noct | blood | pain | bloat | stress | sleepQ | sleepH | alc | flare | triggers | doses |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const a of dailyAggregates(d, start, end)) {
    L.push(
      `| ${a.date} | ${a.bms} | ${r1(a.bristolMean)} | ${a.hard} | ${a.loose} | ${a.urgency} | ${a.nocturnal} | ${a.blood} | ${a.pain ?? ''} | ${a.bloating ?? ''} | ${a.stress ?? ''} | ${a.sleepQuality ?? ''} | ${a.sleepHours ?? ''} | ${a.alcohol ?? ''} | ${a.flare ? 'Y' : ''} | ${a.triggers.join(', ')} | ${a.doses.join(', ')} |`,
    )
  }
  L.push('')
  L.push('## IBS-SSS')
  if (!s.ibsSss.length) L.push('_none_')
  for (const x of s.ibsSss) L.push(`- ${x.date}: ${x.total} (${ibsSssBand(x.total).label})`)
  L.push('')
  L.push('## Interventions')
  if (!s.interventions.length) L.push('_none_')
  for (const i of s.interventions) {
    const c = s.comparisons.find((c) => c.intervention.id === i.id)
    const parts = [
      `${i.name} [${i.category}, ${i.mode === 'trial' ? 'trial' : 'on demand'}]`,
      i.dose,
      i.startDate && `${i.startDate} → ${i.actualEndDate ?? (i.plannedEndDate ? `planned ${i.plannedEndDate}` : 'ongoing')}`,
      i.outcome && `outcome: ${i.outcome}`,
      i.concurrentTrialOverride && 'started during another trial',
      c && (c.insufficientData ? 'IBS-SSS comparison: insufficient data' : `IBS-SSS baseline ${r1(c.baseline.ibsSssMean)} → trial ${r1(c.trial.ibsSssMean)}`),
      i.mode === 'on_demand' && `${s.dosesPerIntervention.find((x) => x.i.id === i.id)?.count ?? 0} doses in range`,
      includeNotes && i.outcomeNotes && `notes: ${i.outcomeNotes}`,
    ].filter(Boolean)
    L.push(`- ${parts.join('; ')}`)
  }
  L.push('')
  L.push('## Labs')
  if (!s.labs.length) L.push('_none_')
  for (const l of s.labs) {
    const ref = refRangeText(l) ? ` (ref ${refRangeText(l)})` : ''
    L.push(`- ${l.date} ${l.test}: ${l.value}${l.unit ? ` ${l.unit}` : ''}${ref}${includeNotes && l.notes ? ` — ${l.notes}` : ''}`)
  }
  if (includeNotes) {
    const notes = [
      ...d.checkIns.filter((c) => c.notes && c.date >= start && c.date <= end).map((c) => `- ${c.date} check-in: ${c.notes}`),
      ...d.bowelMovements.filter((b) => b.notes && dateKeyOf(b.timestamp) >= start && dateKeyOf(b.timestamp) <= end).map((b) => `- ${dateKeyOf(b.timestamp)} BM: ${b.notes}`),
      ...d.triggers.filter((t) => t.meal && dateKeyOf(t.timestamp) >= start && dateKeyOf(t.timestamp) <= end).map((t) => `- ${dateKeyOf(t.timestamp)} meal: ${t.meal}`),
      ...d.triggers.filter((t) => t.notes && dateKeyOf(t.timestamp) >= start && dateKeyOf(t.timestamp) <= end).map((t) => `- ${dateKeyOf(t.timestamp)} trigger: ${t.notes}`),
    ]
    if (notes.length) {
      L.push('')
      L.push('## Notes and meals')
      L.push(...notes.sort())
    }
  }
  return L.join('\n') + '\n'
}

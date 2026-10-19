import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BRISTOL_COLORS, ChartBox, Legend, SERIES, Stat, axisProps, fmt, gridProps, shortDate } from '../components/charts'
import { Card, Empty, Segmented } from '../components/ui'
import type { AllData } from '../db/types'
import { LB_PER_KG } from '../forms/WeightForm'
import { useAllData, useSettings } from '../lib/hooks'
import { IBS_SSS_BANDS, TRIAL_CONFIG } from '../lib/config'
import { stoolStats } from '../lib/stool'
import { dateKeyOf, dateRange, parseDateKey, todayKey } from '../lib/time'
import { rangeStart, type RangeKey } from '../lib/range'
import { compareTrial, trialEnd } from '../lib/trials'
import { TRIGGER_CAVEAT, triggerAssociations } from '../lib/triggers'

const ms = (k: string) => parseDateKey(k).getTime()
const DAY = 86400000
const timeAxis = (start: string, end: string) => ({
  ...axisProps,
  type: 'number' as const,
  dataKey: 'x',
  domain: [ms(start) - DAY / 2, ms(end) + DAY / 2] as [number, number],
  scale: 'time' as const,
  tickFormatter: (v: number) => shortDate(dateFromMs(v)),
  minTickGap: 24,
})
const dateFromMs = (v: number) => {
  const d = new Date(v + DAY / 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const tooltipDate = (v: unknown) => shortDate(dateFromMs(Number(v)))

export function TrendsScreen() {
  const data = useAllData()
  const [range, setRange] = useState<RangeKey>('30')
  if (!data) return null
  return (
    <div className="space-y-4">
      <Segmented
        label="Date range"
        value={range}
        onChange={setRange}
        options={[
          { value: '14', label: '14 d' },
          { value: '30', label: '30 d' },
          { value: '90', label: '90 d' },
          { value: 'all', label: 'All' },
        ]}
      />
      <Trends data={data} range={range} />
    </div>
  )
}

function Trends({ data, range }: { data: AllData; range: RangeKey }) {
  const { weightUnit } = useSettings()
  const today = todayKey()
  const start = rangeStart(range, data, today)
  const days = dateRange(start, today)
  const inRange = (k: string) => k >= start && k <= today

  const m = useMemo(() => {
    const bms = data.bowelMovements.filter((b) => inRange(dateKeyOf(b.timestamp)))
    const checkIns = data.checkIns.filter((c) => inRange(c.date)).sort((a, b) => a.date.localeCompare(b.date))
    const stats = stoolStats(bms, days.length)
    const perDay = days.map((k) => {
      const row: Record<string, number | string> = { date: k }
      for (let t = 1; t <= 7; t++) row[`b${t}`] = 0
      for (const b of bms) if (dateKeyOf(b.timestamp) === k) (row[`b${b.bristol}`] as number)++
      return row
    })
    const scores = checkIns.map((c) => ({ x: ms(c.date), pain: c.painMax, bloating: c.bloating, stress: c.stress, sleep: c.sleepQuality }))
    const flares = checkIns.filter((c) => c.flareDay).map((c) => c.date)
    const sss = data.ibsSss.filter((s) => inRange(s.date)).sort((a, b) => a.date.localeCompare(b.date)).map((s) => ({ x: ms(s.date), total: s.total }))
    const trials = data.interventions.filter((i) => i.mode === 'trial' && i.startDate)
    const weights = data.weights.filter((w) => inRange(w.date)).sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({ x: ms(w.date), w: weightUnit === 'lb' ? Math.round(w.kg * LB_PER_KG * 10) / 10 : w.kg }))
    const onDemand = data.interventions.filter((i) => i.mode === 'on_demand')
    const doseRows = [
      ...flares.map((f) => ({ x: ms(f), y: 'Flare day' })),
      ...data.doses
        .filter((d) => inRange(dateKeyOf(d.timestamp)) && onDemand.some((i) => i.id === d.interventionId))
        .map((d) => {
          const t = new Date(d.timestamp)
          return { x: ms(dateKeyOf(d.timestamp)) + (t.getHours() * 60 + t.getMinutes()) * 60000 - DAY / 2, y: onDemand.find((i) => i.id === d.interventionId)!.name }
        }),
    ]
    const assoc = triggerAssociations(
      data.triggers.filter((t) => inRange(dateKeyOf(t.timestamp))),
      checkIns,
      bms,
    )
    return { bms, stats, perDay, scores, flares, sss, trials, weights, doseRows, assoc, onDemand }
  }, [data, start, today, weightUnit])

  const comparisons = m.trials.map((t) => compareTrial(t, data, today)!).filter(Boolean)

  return (
    <>
      <Card title="Stool pattern">
        {m.bms.length === 0 ? (
          <Empty>No bowel movements in this range.</Empty>
        ) : (
          <>
            <Legend items={[1, 2, 3, 4, 5, 6, 7].map((t) => ({ label: `Type ${t}`, color: BRISTOL_COLORS[t - 1] }))} />
            <ChartBox height={180}>
              <ResponsiveContainer>
                <BarChart data={m.perDay} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={24} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => shortDate(String(v))} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
                  {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                    <Bar key={t} dataKey={`b${t}`} name={`Type ${t}`} stackId="s" fill={BRISTOL_COLORS[t - 1]} stroke="var(--surface, transparent)" maxBarSize={18} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Hard (1–2)" value={fmt(m.stats.pctHard, 0, '%')} />
              <Stat label="Normal (3–5)" value={fmt(m.stats.pctNormal, 0, '%')} />
              <Stat label="Loose (6–7)" value={fmt(m.stats.pctLoose, 0, '%')} />
              <Stat label="Per day" value={fmt(m.stats.meanPerDay, 1)} />
              <Stat label="With urgency" value={fmt(m.stats.pctUrgency, 0, '%')} />
              <Stat label="Total" value={m.stats.count} />
            </div>
            <div className="mt-3 rounded-xl bg-teal-50 p-3 dark:bg-teal-950/60">
              <p className="text-xs text-slate-600 dark:text-slate-300">Pattern indicator, not a diagnosis</p>
              <p className="text-2xl font-semibold">{m.stats.subtype === 'unclassified' ? 'Unclassified' : `${m.stats.subtype} pattern`}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Of {m.stats.daysWithBM} days with a bowel movement: {fmt(m.stats.pctHardDays, 0, '%')} had hard stools, {fmt(m.stats.pctLooseDays, 0, '%')} loose (threshold 25%).
              </p>
            </div>
          </>
        )}
      </Card>

      <Card title="Daily scores">
        {m.scores.length === 0 ? (
          <Empty>No check-ins in this range.</Empty>
        ) : (
          <>
            <Legend
              items={[
                { label: 'Pain', color: SERIES[0], shape: 'line' },
                { label: 'Bloating', color: SERIES[1], shape: 'line' },
                { label: 'Stress', color: SERIES[2], shape: 'line' },
                { label: 'Sleep quality', color: SERIES[3], shape: 'line' },
                { label: 'Flare day', color: 'var(--band-severe)' },
              ]}
            />
            <ChartBox>
              <ResponsiveContainer>
                <LineChart data={m.scores} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid {...gridProps} />
                  {m.flares.map((f) => (
                    <ReferenceArea key={f} x1={ms(f) - DAY / 2} x2={ms(f) + DAY / 2} fill="var(--band-severe)" fillOpacity={1} ifOverflow="hidden" />
                  ))}
                  <XAxis {...timeAxis(start, today)} />
                  <YAxis {...axisProps} domain={[0, 10]} ticks={[0, 5, 10]} />
                  <Tooltip labelFormatter={tooltipDate} />
                  <Line dataKey="pain" name="Pain" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="bloating" name="Bloating" stroke={SERIES[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="stress" name="Stress" stroke={SERIES[2]} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="sleep" name="Sleep quality" stroke={SERIES[3]} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBox>
          </>
        )}
      </Card>

      <Card title="IBS-SSS over time">
        {m.sss.length === 0 ? (
          <Empty>No weekly scores in this range.</Empty>
        ) : (
          <>
            <Legend
              items={[
                { label: 'Remission', color: 'var(--band-remission)' },
                { label: 'Mild', color: 'var(--band-mild)' },
                { label: 'Moderate', color: 'var(--band-moderate)' },
                { label: 'Severe', color: 'var(--band-severe)' },
                { label: 'Trial', color: 'color-mix(in srgb, var(--series-1) 18%, transparent)' },
              ]}
            />
            <ChartBox>
              <ResponsiveContainer>
                <LineChart data={m.sss} margin={{ top: 16, right: 8, bottom: 0, left: -18 }}>
                  {IBS_SSS_BANDS.map((b, i) => (
                    <ReferenceArea key={b.key} y1={i === 0 ? 0 : IBS_SSS_BANDS[i - 1].max + 1} y2={b.max} fill={`var(--band-${b.key})`} fillOpacity={1} ifOverflow="hidden" />
                  ))}
                  {m.trials
                    .filter((t) => t.startDate! <= today && trialEnd(t, today) >= start)
                    .map((t) => (
                      <ReferenceArea
                        key={t.id}
                        x1={Math.max(ms(t.startDate!), ms(start)) - DAY / 2}
                        x2={ms(trialEnd(t, today)) + DAY / 2}
                        fill="var(--series-1)"
                        fillOpacity={0.12}
                        ifOverflow="hidden"
                        label={{ value: t.name, position: 'insideTopLeft', fontSize: 11, fill: 'currentColor' }}
                      />
                    ))}
                  <CartesianGrid {...gridProps} />
                  <XAxis {...timeAxis(start, today)} />
                  <YAxis {...axisProps} domain={[0, 500]} ticks={[0, 75, 175, 300, 500]} />
                  <Tooltip labelFormatter={tooltipDate} />
                  <Line dataKey="total" name="IBS-SSS" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: 'var(--series-1)', stroke: 'white' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBox>
          </>
        )}
      </Card>

      <Card title="Trial comparison">
        {comparisons.length === 0 ? (
          <Empty>No trials yet. Add one under More → Interventions.</Empty>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Baseline = {TRIAL_CONFIG.windowDays} days before start · Trial = its last {TRIAL_CONFIG.windowDays} days. Uses all data, regardless of the range above.
            </p>
            {comparisons.map((c) => (
              <div key={c.intervention.id} className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
                  <p className="font-semibold">{c.intervention.name}</p>
                  {c.insufficientData ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700">Insufficient data</span>
                  ) : c.clinicallyMeaningful ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">✓ Clinically meaningful</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700">Below 50-point drop</span>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="p-2 text-left font-medium"></th>
                      <th className="p-2 text-right font-medium">Baseline</th>
                      <th className="p-2 text-right font-medium">Trial</th>
                      <th className="p-2 text-right font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    <CompareRow label={`IBS-SSS (n=${c.baseline.ibsSssCount}/${c.trial.ibsSssCount})`} a={c.baseline.ibsSssMean} b={c.trial.ibsSssMean} />
                    <CompareRow label="Daily pain" a={c.baseline.painMean} b={c.trial.painMean} digits={1} />
                    <CompareRow label="% loose stools" a={c.baseline.pctLoose} b={c.trial.pctLoose} suffix="%" />
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Trigger association (exploratory)">
        <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">{TRIGGER_CAVEAT}</p>
        {m.assoc.length === 0 ? (
          <Empty>No tag has 5 or more occurrences in this range yet.</Empty>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-xs text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-2 text-left font-medium">Tag (n)</th>
                  <th className="p-2 text-right font-medium">Pain after / without</th>
                  <th className="p-2 text-right font-medium">Bloating</th>
                  <th className="p-2 text-right font-medium">% loose</th>
                </tr>
              </thead>
              <tbody>
                {m.assoc.map((a) => (
                  <tr key={a.tag} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="p-2">
                      {a.tag} <span className="text-slate-500">({a.occurrences})</span>
                    </td>
                    <td className="p-2 text-right">
                      {fmt(a.painAfter, 1)} / {fmt(a.painWithout, 1)}
                    </td>
                    <td className="p-2 text-right">
                      {fmt(a.bloatingAfter, 1)} / {fmt(a.bloatingWithout, 1)}
                    </td>
                    <td className="p-2 text-right">
                      {fmt(a.pctLooseAfter)} / {fmt(a.pctLooseWithout, 0, '%')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="On-demand doses vs flare days">
        {m.doseRows.length === 0 ? (
          <Empty>No doses or flare days in this range.</Empty>
        ) : (
          <ChartBox height={Math.max(120, 50 + 36 * (m.onDemand.length + 1))}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid {...gridProps} />
                <XAxis {...timeAxis(start, today)} />
                <YAxis {...axisProps} type="category" dataKey="y" width={90} allowDuplicatedCategory={false} />
                <Tooltip labelFormatter={() => ''} formatter={(v, n) => (n === 'x' ? tooltipDate(v) : v)} />
                <Scatter data={m.doseRows} fill="var(--series-2)" shape="circle" isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartBox>
        )}
      </Card>

      <Card title={`Weight (${weightUnit})`}>
        {m.weights.length === 0 ? (
          <Empty>No weights in this range.</Empty>
        ) : (
          <ChartBox height={180}>
            <ResponsiveContainer>
              <LineChart data={m.weights} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid {...gridProps} />
                <XAxis {...timeAxis(start, today)} />
                <YAxis {...axisProps} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v: number) => String(Math.round(v * 10) / 10)} allowDecimals />
                <Tooltip labelFormatter={tooltipDate} />
                <Line dataKey="w" name="Weight" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, fill: 'var(--series-1)' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        )}
      </Card>
    </>
  )
}

function CompareRow({ label, a, b, digits = 0, suffix = '' }: { label: string; a?: number; b?: number; digits?: number; suffix?: string }) {
  const diff = a !== undefined && b !== undefined ? b - a : undefined
  return (
    <tr className="border-t border-slate-200 dark:border-slate-800">
      <td className="p-2">{label}</td>
      <td className="p-2 text-right">{fmt(a, digits, suffix)}</td>
      <td className="p-2 text-right">{fmt(b, digits, suffix)}</td>
      <td className="p-2 text-right font-medium">{diff === undefined ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff).toFixed(digits)}${suffix}`}</td>
    </tr>
  )
}

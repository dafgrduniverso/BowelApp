import { useLiveQuery } from 'dexie-react-hooks'
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartBox, axisProps, gridProps, shortDate } from '../components/charts'
import { Button, Card, Empty, SheetLayout, cx, useSheet } from '../components/ui'
import { db } from '../db/db'
import type { LabResult } from '../db/types'
import { LabForm } from '../forms/LabForm'
import { LAB_PRESETS, labFlag, numericValue, refRangeText, sameTest } from '../lib/labs'
import { formatDate, parseDateKey } from '../lib/time'

function FlagBadge({ l }: { l: LabResult }) {
  const f = labFlag(l)
  if (!f) return null
  return <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/60 dark:text-red-100">{f === 'high' ? '▲ High' : '▼ Low'}</span>
}

function groupByTest(labs: LabResult[]) {
  const groups = new Map<string, LabResult[]>()
  for (const l of labs) {
    const key = [...groups.keys()].find((k) => sameTest(k, l.test)) ?? l.test
    groups.set(key, [...(groups.get(key) ?? []), l])
  }
  for (const v of groups.values()) v.sort((a, b) => b.date.localeCompare(a.date))
  return groups
}

export function LabsScreen() {
  const labs = useLiveQuery(() => db.labs.toArray(), [])
  const { open } = useSheet()
  if (!labs) return null
  const groups = groupByTest(labs)
  const notDone = LAB_PRESETS.filter((p) => ![...groups.keys()].some((k) => sameTest(k, p.test)))
  const ordered = [...groups.entries()].sort((a, b) => b[1][0].date.localeCompare(a[1][0].date))
  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => open(<LabForm />)}>
        + Add lab result
      </Button>
      <Card title="Results">
        {ordered.length === 0 && <Empty>No lab results yet.</Empty>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {ordered.map(([test, results]) => (
            <li key={test}>
              <button type="button" className="flex min-h-14 w-full items-center justify-between gap-2 py-2 text-left" onClick={() => open(<LabTestSheet test={test} />)}>
                <span>
                  <span className="block font-medium">{test}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {results.length} result{results.length > 1 ? 's' : ''} · latest {formatDate(results[0].date)}
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  {results[0].value} <span className="text-xs text-slate-500">{results[0].unit}</span>
                  <FlagBadge l={results[0]} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {notDone.length > 0 && (
        <Card title="Not yet done">
          <div className="flex flex-wrap gap-2">
            {notDone.map((p) => (
              <button
                key={p.test}
                type="button"
                className="min-h-11 rounded-full px-4 text-sm ring-1 ring-dashed ring-slate-300 dark:ring-slate-700"
                onClick={() => open(<LabForm test={p.test} />)}
              >
                {p.test}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function LabTestSheet({ test }: { test: string }) {
  const labs = useLiveQuery(() => db.labs.toArray(), [])
  const { open } = useSheet()
  const results = (labs ?? []).filter((l) => sameTest(l.test, test)).sort((a, b) => b.date.localeCompare(a.date))
  const numeric = results
    .map((l) => ({ x: parseDateKey(l.date).getTime(), date: l.date, v: numericValue(l.value) }))
    .filter((r) => r.v !== undefined)
    .reverse()
  const latest = results[0]
  const refLow = latest?.refLow
  const refHigh = latest?.refHigh
  const values = numeric.map((n) => n.v!)
  const lo = Math.min(...values, refLow ?? Infinity)
  const hi = Math.max(...values, refHigh ?? -Infinity)
  const pad = (hi - lo) * 0.15 || 1
  return (
    <SheetLayout title={test}>
      <Button className="w-full" onClick={() => open(<LabForm test={test} />)}>
        + Add result
      </Button>
      {numeric.length > 0 && (
        <Card>
          {(refLow !== undefined || refHigh !== undefined) && (
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Shaded: reference range {refRangeText(latest)} {latest.unit} (from latest result)
            </p>
          )}
          <ChartBox>
            <ResponsiveContainer>
              <LineChart data={numeric} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                {(refLow !== undefined || refHigh !== undefined) && (
                  <ReferenceArea y1={refLow ?? lo - pad} y2={refHigh ?? hi + pad} fill="var(--band-remission)" fillOpacity={1} ifOverflow="hidden" />
                )}
                <CartesianGrid {...gridProps} />
                <XAxis
                  {...axisProps}
                  dataKey="x"
                  type="number"
                  scale="time"
                  domain={numeric.length === 1 ? [numeric[0].x - 30 * 86400000, numeric[0].x + 30 * 86400000] : ['dataMin', 'dataMax']}
                  tickFormatter={(v: number) => new Date(v).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                  minTickGap={24}
                />
                <YAxis {...axisProps} domain={[Math.max(0, lo - pad), hi + pad]} tickFormatter={(v: number) => String(+v.toFixed(1))} />
                <Tooltip labelFormatter={(v) => shortDate(new Date(Number(v)).toLocaleDateString('sv'))} />
                <Line dataKey="v" name={test} stroke="var(--series-1)" strokeWidth={2} dot={{ r: 5, fill: 'var(--series-1)' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>
      )}
      <Card title="Results">
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {results.map((l) => (
            <li key={l.id}>
              <button type="button" className="flex min-h-12 w-full items-center justify-between py-2 text-left" onClick={() => open(<LabForm initial={l} />)}>
                <span>
                  <span className="block">{formatDate(l.date)}</span>
                  {(l.lab || l.notes) && <span className="block text-xs text-slate-500">{[l.lab, l.notes].filter(Boolean).join(' · ')}</span>}
                </span>
                <span className={cx('tabular-nums', labFlag(l) && 'font-semibold')}>
                  {l.value} {l.unit}
                  <FlagBadge l={l} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </SheetLayout>
  )
}

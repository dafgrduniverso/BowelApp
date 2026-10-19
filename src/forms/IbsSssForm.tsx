import { useState } from 'react'
import { Button, Field, SheetLayout, Slider, Stepper, Toggle, inputCls, useSheet } from '../components/ui'
import { deleteRecord, saveRecord } from '../db/repo'
import type { IbsSss } from '../db/types'
import { ibsSssBand, scoreIbsSss, type IbsSssItems } from '../lib/ibsSss'
import { todayKey } from '../lib/time'

export const BAND_COLORS: Record<string, string> = {
  remission: 'text-emerald-700 dark:text-emerald-400',
  mild: 'text-lime-700 dark:text-lime-400',
  moderate: 'text-amber-700 dark:text-amber-400',
  severe: 'text-red-700 dark:text-red-400',
}

export function IbsSssForm({ initial }: { initial?: IbsSss }) {
  const [date, setDate] = useState(initial?.date ?? todayKey())
  const [items, setItems] = useState<IbsSssItems>({
    hasPain: initial?.hasPain ?? false,
    painSeverity: initial?.painSeverity ?? 0,
    painDaysOutOf10: initial?.painDaysOutOf10 ?? 0,
    hasDistension: initial?.hasDistension ?? false,
    distensionSeverity: initial?.distensionSeverity ?? 0,
    bowelDissatisfaction: initial?.bowelDissatisfaction ?? 0,
    lifeInterference: initial?.lifeInterference ?? 0,
  })
  const [saved, setSaved] = useState<number | null>(null)
  const { close } = useSheet()
  const set = <K extends keyof IbsSssItems>(k: K, v: IbsSssItems[K]) => setItems((p) => ({ ...p, [k]: v }))

  if (saved !== null) {
    const band = ibsSssBand(saved)
    return (
      <SheetLayout title="IBS-SSS saved">
        <div className="py-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total score</p>
          <p className="text-6xl font-bold tabular-nums">{saved}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">out of 500</p>
          <p className={`mt-4 text-2xl font-semibold ${BAND_COLORS[band.key]}`}>{band.label}</p>
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">Bands: &lt;75 remission · 75–174 mild · 175–299 moderate · ≥300 severe</p>
        </div>
        <Button className="w-full" onClick={() => close()}>
          Done
        </Button>
      </SheetLayout>
    )
  }

  return (
    <SheetLayout
      title="Weekly symptom score"
      onSave={async () => {
        const total = scoreIbsSss(items)
        await saveRecord('ibsSss', { ...initial, date, ...items, total })
        setSaved(total)
      }}
      onDelete={
        initial
          ? async () => {
              await deleteRecord('ibsSss', initial.id)
              close()
            }
          : undefined
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">Think about the past 10 days. Live score: {scoreIbsSss(items)} / 500</p>
      <Field label="Date">
        <input type="date" className={inputCls} value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      <section className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <Toggle label="Have you had tummy pain recently?" checked={items.hasPain} onChange={(v) => set('hasPain', v)} />
        <Slider label="How bad has the pain been?" value={items.painSeverity} max={100} onChange={(v) => set('painSeverity', v)} lowLabel="Not at all" highLabel="Very severe" disabled={!items.hasPain} />
        {items.hasPain && <Stepper label="Days with pain, out of the last 10" value={items.painDaysOutOf10} onChange={(v) => set('painDaysOutOf10', v)} min={0} max={10} />}
      </section>
      <section className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <Toggle label="Have you had a swollen or tight belly?" checked={items.hasDistension} onChange={(v) => set('hasDistension', v)} />
        <Slider label="How bad has the swelling been?" value={items.distensionSeverity} max={100} onChange={(v) => set('distensionSeverity', v)} lowLabel="Not at all" highLabel="Very severe" disabled={!items.hasDistension} />
      </section>
      <section className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <Slider label="How unhappy are you with your bowel habits?" value={items.bowelDissatisfaction} max={100} onChange={(v) => set('bowelDissatisfaction', v)} lowLabel="Not at all" highLabel="Very unhappy" />
        <Slider label="How much are symptoms getting in the way of daily life?" value={items.lifeInterference} max={100} onChange={(v) => set('lifeInterference', v)} lowLabel="Not at all" highLabel="Completely" />
      </section>
    </SheetLayout>
  )
}

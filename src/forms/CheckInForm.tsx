import { useEffect, useState } from 'react'
import { PainMap } from '../components/PainMap'
import { Field, SheetLayout, Segmented, Slider, Stepper, Toggle, inputCls, useSheet, useToast } from '../components/ui'
import { db } from '../db/db'
import { deleteRecord, saveRecord, type Draft } from '../db/repo'
import type { DailyCheckIn } from '../db/types'
import { formatDate, todayKey } from '../lib/time'

const blank = (date: string): Draft<'checkIns'> => ({
  date,
  painMax: 0,
  painLocations: [],
  painRelievedByBM: 'na',
  bloating: 0,
  stress: 0,
  sleepHours: undefined,
  sleepQuality: 5,
  alcoholUnits: 0,
  exerciseMinutes: undefined,
  flareDay: false,
  notes: '',
})

/** One check-in per date: opening the form for a date that already has one edits it. */
export function CheckInForm({ date: initialDate = todayKey() }: { date?: string }) {
  const [date, setDate] = useState(initialDate)
  const [form, setForm] = useState<Draft<'checkIns'> | null>(null)
  const [existing, setExisting] = useState<DailyCheckIn | undefined>()
  const { close } = useSheet()
  const toast = useToast()

  useEffect(() => {
    db.checkIns
      .where('date')
      .equals(date)
      .first()
      .then((c) => {
        setExisting(c)
        setForm(c ? { ...c } : blank(date))
      })
  }, [date])

  if (!form) return null
  const set = <K extends keyof DailyCheckIn>(k: K, v: DailyCheckIn[K]) => setForm({ ...form, [k]: v })

  return (
    <SheetLayout
      title={existing ? 'Edit check-in' : 'Daily check-in'}
      onSave={async () => {
        await saveRecord('checkIns', { ...form, date, notes: form.notes?.trim() || undefined })
        toast('Check-in saved')
        close()
      }}
      onDelete={
        existing
          ? async () => {
              await deleteRecord('checkIns', existing.id)
              close()
            }
          : undefined
      }
    >
      <Field label="Date">
        <input type="date" className={inputCls} value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      {existing && <p className="text-sm text-slate-500 dark:text-slate-400">Editing the check-in for {formatDate(date)}.</p>}

      <section className="space-y-1">
        <Slider label="Worst abdominal pain today" value={form.painMax} onChange={(v) => set('painMax', v)} lowLabel="None" highLabel="Worst imaginable" />
        {form.painMax > 0 && (
          <>
            <p className="pt-2 text-sm font-medium">Where?</p>
            <PainMap value={form.painLocations} onChange={(v) => set('painLocations', v)} />
            <p className="pt-3 text-sm font-medium">Did a bowel movement relieve the pain?</p>
            <Segmented
              label="Pain relieved by bowel movement"
              value={form.painRelievedByBM}
              onChange={(v) => set('painRelievedByBM', v)}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'partly', label: 'Partly' },
                { value: 'no', label: 'No' },
                { value: 'na', label: 'N/A' },
              ]}
            />
          </>
        )}
      </section>

      <Slider label="Bloating" value={form.bloating} onChange={(v) => set('bloating', v)} lowLabel="None" highLabel="Severe" />
      <Slider label="Stress" value={form.stress} onChange={(v) => set('stress', v)} lowLabel="Calm" highLabel="Extreme" />
      <Slider label="Sleep quality (last night)" value={form.sleepQuality} onChange={(v) => set('sleepQuality', v)} lowLabel="Terrible" highLabel="Excellent" />
      <Stepper label="Sleep hours" value={form.sleepHours ?? 7} onChange={(v) => set('sleepHours', v)} min={0} max={16} step={0.5} suffix="h" />
      <Stepper label="Alcohol units" value={form.alcoholUnits} onChange={(v) => set('alcoholUnits', v)} min={0} max={30} />
      <Stepper label="Exercise" value={form.exerciseMinutes ?? 0} onChange={(v) => set('exerciseMinutes', v)} min={0} max={600} step={10} suffix=" min" />
      <Toggle label="Flare day" description="A clearly worse day than usual" checked={form.flareDay} onChange={(v) => set('flareDay', v)} />
      <Field label="Notes">
        <textarea className={inputCls} rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. fever, travel, period, new food…" />
      </Field>
    </SheetLayout>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Field, SheetLayout, Segmented, inputCls, useSheet, useToast } from '../components/ui'
import { db } from '../db/db'
import { deleteRecord, saveRecord } from '../db/repo'
import type { Intervention, InterventionCategory, TrialOutcome } from '../db/types'
import { addDays, nowIso, todayKey } from '../lib/time'
import { isTrialActive } from '../lib/trials'

export const CATEGORY_LABELS: Record<InterventionCategory, string> = {
  drug: 'Drug',
  supplement: 'Supplement',
  diet: 'Diet',
  psych: 'Psych',
  other: 'Other',
}

export const OUTCOME_LABELS: Record<TrialOutcome, string> = {
  helped: 'Helped',
  no_effect: 'No effect',
  worse: 'Made it worse',
  stopped_early: 'Stopped early',
  inconclusive: 'Inconclusive',
}

export function InterventionForm({ initial, defaultMode = 'trial' }: { initial?: Intervention; defaultMode?: Intervention['mode'] }) {
  const all = useLiveQuery(() => db.interventions.toArray(), [])
  const [f, setF] = useState({
    name: initial?.name ?? '',
    category: initial?.category ?? ('supplement' as InterventionCategory),
    mode: initial?.mode ?? defaultMode,
    dose: initial?.dose ?? '',
    startDate: initial?.startDate ?? todayKey(),
    plannedEndDate: initial?.plannedEndDate ?? addDays(todayKey(), 27),
    actualEndDate: initial?.actualEndDate,
  })
  const [warning, setWarning] = useState<Intervention[] | null>(null)
  const { close, open } = useSheet()
  const toast = useToast()
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const otherActive = (all ?? []).filter(
    (i) => i.id !== initial?.id && i.mode === 'trial' && i.startDate && !i.actualEndDate && (isTrialActive(i) || i.startDate > todayKey()),
  )

  const persist = async (override: boolean) => {
    const trial = f.mode === 'trial'
    const rec = await saveRecord('interventions', {
      ...initial,
      name: f.name.trim(),
      category: f.category,
      mode: f.mode,
      dose: f.dose.trim() || undefined,
      startDate: trial ? f.startDate : undefined,
      plannedEndDate: trial ? f.plannedEndDate || undefined : undefined,
      actualEndDate: f.actualEndDate,
      concurrentTrialOverride: override ? { at: nowIso(), otherTrialIds: otherActive.map((o) => o.id) } : initial?.concurrentTrialOverride,
    })
    toast(`${rec.name} saved`)
    close()
  }

  if (warning)
    return (
      <SheetLayout title="Another trial is active" onSave={() => persist(true)} saveLabel="Start anyway">
        <div className="rounded-2xl bg-amber-100 p-4 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100" role="alert">
          <p className="text-lg font-semibold">Another trial is active — results won't be attributable.</p>
          <p className="mt-2 text-sm">Active: {warning.map((w) => w.name).join(', ')}. Changing one thing at a time is what makes a trial result meaningful.</p>
          <p className="mt-2 text-sm">If you start anyway, the override is recorded on this intervention.</p>
        </div>
        <button className="min-h-11 w-full text-center font-medium text-accent dark:text-teal-400" onClick={() => setWarning(null)}>
          Go back
        </button>
      </SheetLayout>
    )

  return (
    <SheetLayout
      title={initial ? 'Edit intervention' : 'New intervention'}
      saveDisabled={!f.name.trim()}
      onSave={async () => {
        const startingTrial = f.mode === 'trial' && (!initial || initial.mode !== 'trial')
        if (startingTrial && otherActive.length) return setWarning(otherActive)
        await persist(false)
      }}
      onDelete={
        initial
          ? async () => {
              await deleteRecord('interventions', initial.id)
              close()
            }
          : undefined
      }
    >
      <Field label="Name">
        <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Peppermint oil" />
      </Field>
      <Field label="Dose">
        <input className={inputCls} value={f.dose} onChange={(e) => set('dose', e.target.value)} placeholder="e.g. 182 mg 3×/day" />
      </Field>
      <p className="text-sm font-medium">Category</p>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CATEGORY_LABELS) as InterventionCategory[]).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={f.category === c}
            onClick={() => set('category', c)}
            className={`min-h-11 rounded-xl text-sm font-medium ring-1 ${f.category === c ? 'bg-accent text-white ring-accent' : 'ring-slate-300 dark:ring-slate-700'}`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      <p className="text-sm font-medium">Type</p>
      <Segmented
        label="Mode"
        value={f.mode}
        onChange={(v) => set('mode', v)}
        options={[
          { value: 'trial', label: 'Trial (daily, timed)' },
          { value: 'on_demand', label: 'On demand' },
        ]}
      />
      {f.mode === 'trial' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input type="date" className={inputCls} value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="Planned end">
            <input type="date" className={inputCls} value={f.plannedEndDate} min={f.startDate} onChange={(e) => set('plannedEndDate', e.target.value)} />
          </Field>
        </div>
      )}
      {initial?.concurrentTrialOverride && (
        <p className="text-sm text-amber-700 dark:text-amber-400">Started while another trial was active (override recorded).</p>
      )}
      {initial && initial.mode === 'trial' && !initial.actualEndDate && (
        <button className="min-h-11 w-full rounded-xl font-medium ring-1 ring-slate-300 dark:ring-slate-700" onClick={() => open(<EndTrialForm intervention={initial} closeCount={2} />)}>
          End trial…
        </button>
      )}
      {initial && initial.mode === 'on_demand' && (
        <button
          className="min-h-11 w-full rounded-xl font-medium ring-1 ring-slate-300 dark:ring-slate-700"
          onClick={async () => {
            await saveRecord('interventions', { ...initial, actualEndDate: initial.actualEndDate ? undefined : todayKey() })
            close()
          }}
        >
          {initial.actualEndDate ? 'Reactivate' : 'Stop using (archive)'}
        </button>
      )}
    </SheetLayout>
  )
}

/** Shown when a trial ends: records the end date and outcome. */
export function EndTrialForm({ intervention, closeCount = 1 }: { intervention: Intervention; closeCount?: number }) {
  const [endDate, setEndDate] = useState(intervention.actualEndDate ?? (intervention.plannedEndDate && intervention.plannedEndDate < todayKey() ? intervention.plannedEndDate : todayKey()))
  const [outcome, setOutcome] = useState<TrialOutcome | undefined>(intervention.outcome)
  const [notes, setNotes] = useState(intervention.outcomeNotes ?? '')
  const { close } = useSheet()
  return (
    <SheetLayout
      title={`End trial · ${intervention.name}`}
      saveDisabled={!outcome}
      onSave={async () => {
        await saveRecord('interventions', { ...intervention, actualEndDate: endDate, outcome, outcomeNotes: notes.trim() || undefined })
        close(closeCount)
      }}
    >
      <Field label="End date">
        <input type="date" className={inputCls} value={endDate} min={intervention.startDate} onChange={(e) => setEndDate(e.target.value)} />
      </Field>
      <p className="text-sm font-medium">How did it go?</p>
      <div className="grid gap-2">
        {(Object.keys(OUTCOME_LABELS) as TrialOutcome[]).map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={outcome === o}
            onClick={() => setOutcome(o)}
            className={`min-h-12 rounded-xl px-4 text-left font-medium ring-1 ${outcome === o ? 'bg-accent text-white ring-accent' : 'ring-slate-300 dark:ring-slate-700'}`}
          >
            {OUTCOME_LABELS[o]}
          </button>
        ))}
      </div>
      <Field label="Notes">
        <textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </SheetLayout>
  )
}

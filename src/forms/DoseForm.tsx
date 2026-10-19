import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { TimeField } from '../components/TimeField'
import { Button, Empty, Field, SheetLayout, Segmented, inputCls, useSheet, useToast } from '../components/ui'
import { db } from '../db/db'
import { deleteRecord, saveRecord } from '../db/repo'
import type { InterventionDose } from '../db/types'
import { nowIso, todayKey } from '../lib/time'
import { isTrialActive } from '../lib/trials'
import { InterventionForm } from './InterventionForm'

/** "Took something": one tap logs a dose now with reason "flare". */
export function TookSomethingSheet() {
  const interventions = useLiveQuery(() => db.interventions.toArray(), [])
  const { close, open } = useSheet()
  const toast = useToast()
  const today = todayKey()
  const onDemand = (interventions ?? []).filter((i) => i.mode === 'on_demand' && !i.actualEndDate)
  const trials = (interventions ?? []).filter((i) => isTrialActive(i, today))
  const log = async (interventionId: string, name: string, reason: InterventionDose['reason']) => {
    const rec = await saveRecord('doses', { interventionId, timestamp: nowIso(), reason })
    toast(`Logged ${name}`, { label: 'Undo', run: () => deleteRecord('doses', rec.id) })
    close()
  }
  return (
    <SheetLayout title="Took something">
      {interventions && !onDemand.length && !trials.length && <Empty>No active on-demand interventions yet.</Empty>}
      <div className="grid gap-2">
        {onDemand.map((i) => (
          <Button key={i.id} variant="secondary" className="py-4 text-left text-lg" onClick={() => log(i.id, i.name, 'flare')}>
            {i.name}
            {i.dose && <span className="ml-2 text-sm text-slate-500">{i.dose}</span>}
          </Button>
        ))}
      </div>
      {trials.length > 0 && (
        <>
          <h2 className="pt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Trial doses</h2>
          <div className="grid gap-2">
            {trials.map((i) => (
              <Button key={i.id} variant="secondary" className="py-3 text-left" onClick={() => log(i.id, i.name, 'preventive')}>
                {i.name}
              </Button>
            ))}
          </div>
        </>
      )}
      <Button variant="ghost" className="w-full" onClick={() => open(<InterventionForm defaultMode="on_demand" />)}>
        + Add an on-demand intervention
      </Button>
    </SheetLayout>
  )
}

export function DoseForm({ initial }: { initial: InterventionDose }) {
  const intervention = useLiveQuery(() => db.interventions.get(initial.interventionId), [initial.interventionId])
  const [timestamp, setTimestamp] = useState(initial.timestamp)
  const [reason, setReason] = useState(initial.reason ?? 'other')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const { close } = useSheet()
  return (
    <SheetLayout
      title={`Edit dose${intervention ? ` · ${intervention.name}` : ''}`}
      onSave={async () => {
        await saveRecord('doses', { ...initial, timestamp, reason, notes: notes.trim() || undefined })
        close()
      }}
      onDelete={async () => {
        await deleteRecord('doses', initial.id)
        close()
      }}
    >
      <TimeField value={timestamp} onChange={setTimestamp} />
      <Segmented
        label="Reason"
        value={reason}
        onChange={setReason}
        options={[
          { value: 'flare', label: 'Flare' },
          { value: 'preventive', label: 'Preventive' },
          { value: 'other', label: 'Other' },
        ]}
      />
      <Field label="Notes">
        <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </SheetLayout>
  )
}

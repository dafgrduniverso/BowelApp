import { useState } from 'react'
import { BristolPicker } from '../components/Bristol'
import { TimeField } from '../components/TimeField'
import { Button, Chip, SheetLayout, inputCls, useSheet, useToast } from '../components/ui'
import { deleteRecord, saveRecord } from '../db/repo'
import type { BowelMovement, Bristol } from '../db/types'
import { nowIso } from '../lib/time'

type Flags = Pick<BowelMovement, 'urgency' | 'blood' | 'wokeMeUp' | 'incomplete'>
const FLAG_LABELS: [keyof Flags, string][] = [
  ['urgency', 'Urgency'],
  ['blood', 'Blood'],
  ['wokeMeUp', 'Woke me up'],
  ['incomplete', 'Incomplete'],
]

function useBmState(initial?: BowelMovement) {
  const [bristol, setBristol] = useState<Bristol | undefined>(initial?.bristol)
  const [flags, setFlags] = useState<Flags>({
    urgency: initial?.urgency ?? false,
    blood: initial?.blood ?? false,
    wokeMeUp: initial?.wokeMeUp ?? false,
    incomplete: initial?.incomplete ?? false,
  })
  const [timestamp, setTimestamp] = useState<string | undefined>(initial?.timestamp)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  return { bristol, setBristol, flags, setFlags, timestamp, setTimestamp, notes, setNotes }
}

function FlagChips({ flags, setFlags }: { flags: Flags; setFlags: (f: Flags) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FLAG_LABELS.map(([k, label]) => (
        <Chip key={k} active={flags[k]} onClick={() => setFlags({ ...flags, [k]: !flags[k] })} className={k === 'blood' && flags.blood ? 'bg-red-700! ring-red-700!' : ''}>
          {label}
        </Chip>
      ))}
    </div>
  )
}

/** Inline quick-log card on the Log tab: choose type → (chips) → Save. */
export function QuickBowelLog() {
  const s = useBmState()
  const [showMore, setShowMore] = useState(false)
  const toast = useToast()
  const save = async () => {
    if (!s.bristol) return
    const rec = await saveRecord('bowelMovements', { timestamp: s.timestamp ?? nowIso(), bristol: s.bristol, ...s.flags, notes: s.notes || undefined })
    toast(`Logged Bristol ${rec.bristol}`, { label: 'Undo', run: () => deleteRecord('bowelMovements', rec.id) })
    s.setBristol(undefined)
    s.setFlags({ urgency: false, blood: false, wokeMeUp: false, incomplete: false })
    s.setTimestamp(undefined)
    s.setNotes('')
    setShowMore(false)
  }
  return (
    <div className="space-y-3">
      <BristolPicker value={s.bristol} onChange={s.setBristol} />
      <FlagChips flags={s.flags} setFlags={s.setFlags} />
      {showMore ? (
        <div className="space-y-2">
          <TimeField value={s.timestamp ?? nowIso()} onChange={s.setTimestamp} isNow={!s.timestamp} />
          <textarea className={inputCls} rows={2} placeholder="Notes (optional)" value={s.notes} onChange={(e) => s.setNotes(e.target.value)} aria-label="Notes" />
        </div>
      ) : (
        <button type="button" className="min-h-11 text-sm text-slate-600 underline dark:text-slate-400" onClick={() => setShowMore(true)}>
          Now · change time / add note
        </button>
      )}
      <Button className="w-full py-3 text-lg" disabled={!s.bristol} onClick={save}>
        {s.bristol ? `Save Bristol ${s.bristol}` : 'Choose a type to save'}
      </Button>
    </div>
  )
}

export function BowelForm({ initial }: { initial?: BowelMovement }) {
  const s = useBmState(initial)
  const { close } = useSheet()
  return (
    <SheetLayout
      title={initial ? 'Edit bowel movement' : 'Bowel movement'}
      saveDisabled={!s.bristol}
      onSave={async () => {
        await saveRecord('bowelMovements', { ...initial, timestamp: s.timestamp ?? nowIso(), bristol: s.bristol!, ...s.flags, notes: s.notes || undefined })
        close()
      }}
      onDelete={
        initial
          ? async () => {
              await deleteRecord('bowelMovements', initial.id)
              close()
            }
          : undefined
      }
    >
      <TimeField value={s.timestamp ?? nowIso()} onChange={s.setTimestamp} isNow={!s.timestamp} />
      <BristolPicker value={s.bristol} onChange={s.setBristol} />
      <FlagChips flags={s.flags} setFlags={s.setFlags} />
      <textarea className={inputCls} rows={3} placeholder="Notes (optional)" value={s.notes} onChange={(e) => s.setNotes(e.target.value)} aria-label="Notes" />
    </SheetLayout>
  )
}

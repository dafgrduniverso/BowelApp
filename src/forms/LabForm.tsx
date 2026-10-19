import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Field, SheetLayout, inputCls, useSheet, useToast } from '../components/ui'
import { db } from '../db/db'
import { deleteRecord, saveRecord } from '../db/repo'
import type { LabResult } from '../db/types'
import { LAB_PRESETS, numericValue, sameTest } from '../lib/labs'
import { todayKey } from '../lib/time'

const optNum = (s: string) => (s.trim() === '' ? undefined : numericValue(s))

export function LabForm({ initial, test: presetTest }: { initial?: LabResult; test?: string }) {
  const labs = useLiveQuery(() => db.labs.toArray(), [])
  const [test, setTest] = useState(initial?.test ?? presetTest ?? '')
  const [date, setDate] = useState(initial?.date ?? todayKey())
  const [value, setValue] = useState(initial ? String(initial.value) : '')
  const [unit, setUnit] = useState(initial?.unit ?? LAB_PRESETS.find((p) => p.test === presetTest)?.unit ?? '')
  const [refLow, setRefLow] = useState(initial?.refLow?.toString() ?? '')
  const [refHigh, setRefHigh] = useState(initial?.refHigh?.toString() ?? '')
  const [lab, setLab] = useState(initial?.lab ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const { close } = useSheet()
  const toast = useToast()

  const knownTests = [...new Set([...LAB_PRESETS.map((p) => p.test), ...(labs ?? []).map((l) => l.test)])]

  /** Autofill unit/reference range from the last result of the same test, else the preset. */
  const chooseTest = (t: string) => {
    setTest(t)
    if (initial) return
    const prev = (labs ?? []).filter((l) => sameTest(l.test, t)).sort((a, b) => b.date.localeCompare(a.date))[0]
    const preset = LAB_PRESETS.find((p) => sameTest(p.test, t))
    setUnit(prev?.unit ?? preset?.unit ?? '')
    setRefLow(prev?.refLow?.toString() ?? '')
    setRefHigh(prev?.refHigh?.toString() ?? '')
    if (prev?.lab) setLab(prev.lab)
  }

  const num = numericValue(value)
  return (
    <SheetLayout
      title={initial ? 'Edit lab result' : 'Lab result'}
      saveDisabled={!test.trim() || !value.trim()}
      onSave={async () => {
        await saveRecord('labs', {
          ...initial,
          test: test.trim(),
          date,
          value: num !== undefined && /^[\d.,\s]+$/.test(value.trim()) ? num : value.trim(),
          unit: unit.trim() || undefined,
          refLow: optNum(refLow),
          refHigh: optNum(refHigh),
          lab: lab.trim() || undefined,
          notes: notes.trim() || undefined,
        })
        toast('Lab result saved')
        close()
      }}
      onDelete={
        initial
          ? async () => {
              await deleteRecord('labs', initial.id)
              close()
            }
          : undefined
      }
    >
      <Field label="Test" hint="Pick from the list or type a custom test name">
        <input className={inputCls} list="lab-tests" value={test} onChange={(e) => chooseTest(e.target.value)} placeholder="e.g. Faecal calprotectin" />
        <datalist id="lab-tests">
          {knownTests.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>
      <Field label="Date">
        <input type="date" className={inputCls} value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Value" hint="Number, or text like “negative”">
          <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Unit">
          <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Field label="Reference low">
          <input className={inputCls} inputMode="decimal" value={refLow} onChange={(e) => setRefLow(e.target.value)} />
        </Field>
        <Field label="Reference high">
          <input className={inputCls} inputMode="decimal" value={refHigh} onChange={(e) => setRefHigh(e.target.value)} />
        </Field>
      </div>
      <Field label="Lab">
        <input className={inputCls} value={lab} onChange={(e) => setLab(e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </SheetLayout>
  )
}

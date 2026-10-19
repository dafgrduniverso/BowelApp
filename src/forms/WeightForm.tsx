import { useState } from 'react'
import { Field, SheetLayout, inputCls, useSheet, useToast } from '../components/ui'
import { deleteRecord, saveRecord } from '../db/repo'
import type { Weight } from '../db/types'
import { useSettings } from '../lib/hooks'
import { todayKey } from '../lib/time'

export const LB_PER_KG = 2.20462

export function WeightForm({ initial }: { initial?: Weight }) {
  const { weightUnit } = useSettings()
  const toUnit = (kg: number) => (weightUnit === 'lb' ? Math.round(kg * LB_PER_KG * 10) / 10 : kg)
  const [date, setDate] = useState(initial?.date ?? todayKey())
  const [value, setValue] = useState(initial ? String(toUnit(initial.kg)) : '')
  const { close } = useSheet()
  const toast = useToast()
  const num = Number(value.replace(',', '.'))
  const valid = value !== '' && Number.isFinite(num) && num > 0
  return (
    <SheetLayout
      title={initial ? 'Edit weight' : 'Weight'}
      saveDisabled={!valid}
      onSave={async () => {
        const kg = weightUnit === 'lb' ? num / LB_PER_KG : num
        await saveRecord('weights', { ...initial, date, kg: Math.round(kg * 100) / 100 })
        toast('Weight saved')
        close()
      }}
      onDelete={
        initial
          ? async () => {
              await deleteRecord('weights', initial.id)
              close()
            }
          : undefined
      }
    >
      <Field label="Date">
        <input type="date" className={inputCls} value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      <Field label={`Weight (${weightUnit})`}>
        <input autoFocus inputMode="decimal" className={`${inputCls} text-2xl`} value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.0" />
      </Field>
    </SheetLayout>
  )
}

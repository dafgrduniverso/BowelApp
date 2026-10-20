import { useMemo, useState } from 'react'
import { TimeField } from '../components/TimeField'
import { Chip, SheetLayout, inputCls, useSheet, useToast } from '../components/ui'
import { deleteRecord, saveRecord } from '../db/repo'
import type { TriggerEvent } from '../db/types'
import { analyzeMeal } from '../lib/foodTags'
import { useSettings } from '../lib/hooks'
import { nowIso } from '../lib/time'

/**
 * Meal recorder: describe the meal (typing or the keyboard's dictation mic); trigger tags are
 * suggested from the foods recognised and can be toggled before saving. Saved as a TriggerEvent.
 */
export function MealForm({ initial }: { initial?: TriggerEvent }) {
  const settings = useSettings()
  const [text, setText] = useState(initial?.meal ?? '')
  const [timestamp, setTimestamp] = useState<string | undefined>(initial?.timestamp)
  // Manual overrides of the automatic suggestion: tag → on/off.
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() =>
    initial ? Object.fromEntries(initial.tags.map((t) => [t, true])) : {},
  )
  const { close } = useSheet()
  const toast = useToast()

  const analysis = useMemo(() => analyzeMeal(text, settings.triggerTags), [text, settings.triggerTags])
  const isOn = (t: string) => overrides[t] ?? (!initial && analysis.tags.includes(t))
  const allTags = [...new Set([...settings.triggerTags, ...analysis.tags, ...Object.keys(overrides)])]
  const selected = allTags.filter(isOn)

  return (
    <SheetLayout
      title={initial ? 'Edit meal' : 'Meal'}
      saveDisabled={!text.trim() && !selected.length}
      onSave={async () => {
        await saveRecord('triggers', { ...initial, timestamp: timestamp ?? nowIso(), tags: selected, meal: text.trim() || undefined })
        toast(selected.length ? `Meal logged · ${selected.join(', ')}` : 'Meal logged')
        close()
      }}
      onDelete={
        initial
          ? async () => {
              await deleteRecord('triggers', initial.id)
              close()
            }
          : undefined
      }
    >
      <TimeField value={timestamp ?? nowIso()} onChange={setTimestamp} isNow={!timestamp} />
      <div>
        <label htmlFor="meal-text" className="mb-1 block text-sm font-medium">
          What did you eat and drink?
        </label>
        <textarea
          id="meal-text"
          autoFocus={!initial}
          className={`${inputCls} text-lg`}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Francesinha com batatas fritas e uma imperial"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tip: tap the 🎤 on the keyboard to dictate. English and Portuguese both work.</p>
      </div>

      {analysis.matches.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Recognised</p>
          <ul className="space-y-1 text-sm">
            {analysis.matches.map((m) => (
              <li key={m.term} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{m.term}</span>
                <span className="text-slate-500 dark:text-slate-400">→ {m.tags.join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Triggers {!initial && <span className="font-normal text-slate-500 dark:text-slate-400">(suggested automatically, tap to change)</span>}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Trigger tags">
          {allTags.map((t) => (
            <Chip key={t} active={isOn(t)} onClick={() => setOverrides((o) => ({ ...o, [t]: !isOn(t) }))}>
              {t}
            </Chip>
          ))}
        </div>
      </div>
    </SheetLayout>
  )
}

import { useState } from 'react'
import { TimeField } from '../components/TimeField'
import { Chip, Field, SheetLayout, inputCls, useSheet, useToast } from '../components/ui'
import { deleteRecord, saveRecord } from '../db/repo'
import type { TriggerEvent } from '../db/types'
import { useSettings } from '../lib/hooks'
import { nowIso } from '../lib/time'

export function TriggerForm({ initial }: { initial?: TriggerEvent }) {
  const settings = useSettings()
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [timestamp, setTimestamp] = useState<string | undefined>(initial?.timestamp)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const { close } = useSheet()
  const toast = useToast()
  const allTags = [...new Set([...settings.triggerTags, ...tags])]
  return (
    <SheetLayout
      title={initial ? 'Edit trigger' : 'Trigger'}
      saveDisabled={!tags.length}
      onSave={async () => {
        await saveRecord('triggers', { ...initial, timestamp: timestamp ?? nowIso(), tags, notes: notes.trim() || undefined })
        toast(`Logged ${tags.join(', ')}`)
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
      <div className="flex flex-wrap gap-2" role="group" aria-label="Trigger tags">
        {allTags.map((t) => (
          <Chip key={t} active={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>
            {t}
          </Chip>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Edit the tag list in More → Settings.</p>
      <Field label="Notes">
        <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </SheetLayout>
  )
}

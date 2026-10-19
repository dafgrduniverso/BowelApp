import { useEffect, useMemo, useState } from 'react'
import { TimeField } from '../components/TimeField'
import { Button, Field, SheetLayout, Segmented, Toggle, inputCls, useSheet, useToast } from '../components/ui'
import { deleteRecord, saveRecord } from '../db/repo'
import type { EyeEpisode } from '../db/types'
import { nowIso } from '../lib/time'

/** Downscale photos before storing so IndexedDB stays small. */
async function shrink(file: File, maxDim = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.85))
  } catch {
    return file
  }
}

function Thumb({ blob, onRemove }: { blob: Blob; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="relative">
      <img src={url} alt="Eye photo" className="h-24 w-24 rounded-xl object-cover" />
      <button type="button" aria-label="Remove photo" onClick={onRemove} className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-slate-900 text-white">
        ×
      </button>
    </div>
  )
}

export function EyeForm({ initial }: { initial?: EyeEpisode }) {
  const [f, setF] = useState<Omit<EyeEpisode, 'id' | 'createdAt' | 'updatedAt'>>({
    startTimestamp: initial?.startTimestamp ?? nowIso(),
    endTimestamp: initial?.endTimestamp,
    eye: initial?.eye ?? 'left',
    pain: initial?.pain ?? 'none',
    photophobia: initial?.photophobia ?? false,
    blurredVision: initial?.blurredVision ?? false,
    photos: initial?.photos ?? [],
    notes: initial?.notes ?? '',
  })
  const { close } = useSheet()
  const toast = useToast()
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  return (
    <SheetLayout
      title={initial ? 'Edit eye episode' : 'Eye episode'}
      onSave={async () => {
        await saveRecord('eyeEpisodes', { ...initial, ...f, notes: f.notes?.trim() || undefined })
        toast('Eye episode saved')
        close()
      }}
      onDelete={
        initial
          ? async () => {
              await deleteRecord('eyeEpisodes', initial.id)
              close()
            }
          : undefined
      }
    >
      <TimeField label="Started" value={f.startTimestamp} onChange={(v) => set('startTimestamp', v)} />
      {f.endTimestamp ? (
        <TimeField label="Ended" value={f.endTimestamp} onChange={(v) => set('endTimestamp', v)} />
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => set('endTimestamp', nowIso())}>
          Mark as ended now
        </Button>
      )}
      <p className="text-sm font-medium">Which eye?</p>
      <Segmented
        label="Eye"
        value={f.eye}
        onChange={(v) => set('eye', v)}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'both', label: 'Both' },
        ]}
      />
      <p className="text-sm font-medium">Pain</p>
      <Segmented
        label="Eye pain"
        value={f.pain}
        onChange={(v) => set('pain', v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'gritty', label: 'Gritty' },
          { value: 'deep_aching', label: 'Deep aching' },
        ]}
      />
      <Toggle label="Light sensitivity (photophobia)" checked={f.photophobia} onChange={(v) => set('photophobia', v)} />
      <Toggle label="Blurred vision" checked={f.blurredVision} onChange={(v) => set('blurredVision', v)} />
      <div>
        <p className="mb-2 text-sm font-medium">Photos (stay on this device)</p>
        <div className="flex flex-wrap gap-3">
          {f.photos.map((p, i) => (
            <Thumb key={i} blob={p} onRemove={() => set('photos', f.photos.filter((_, j) => j !== i))} />
          ))}
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-xl text-3xl ring-1 ring-slate-300 dark:ring-slate-700">
            +
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label="Add photo"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                const blob = await shrink(file)
                setF((p) => ({ ...p, photos: [...p.photos, blob] }))
              }}
            />
          </label>
        </div>
      </div>
      <Field label="Notes">
        <textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </SheetLayout>
  )
}

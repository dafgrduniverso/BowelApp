import { useState } from 'react'
import { formatDateTime, fromInputDateTime, toInputDateTime } from '../lib/time'
import { Button, inputCls } from './ui'

/** Shows "Now" (or the chosen time); tap to adjust. */
export function TimeField({ value, onChange, label = 'Time', isNow }: { value: string; onChange: (v: string) => void; label?: string; isNow?: boolean }) {
  const [editing, setEditing] = useState(false)
  if (!editing)
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button variant="ghost" onClick={() => setEditing(true)} aria-label={`${label}: ${isNow ? 'now' : formatDateTime(value)}. Change`}>
          {isNow ? 'Now' : formatDateTime(value)} ▾
        </Button>
      </div>
    )
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input type="datetime-local" className={inputCls} value={toInputDateTime(value)} onChange={(e) => e.target.value && onChange(fromInputDateTime(e.target.value))} />
    </label>
  )
}

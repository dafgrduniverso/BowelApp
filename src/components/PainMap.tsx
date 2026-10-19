import { PAIN_LOCATIONS, type PainLocation } from '../db/types'
import { cx } from './ui'

const LABELS: Record<PainLocation, string> = {
  RUQ: 'Right upper',
  epigastric: 'Epigastric',
  LUQ: 'Left upper',
  'R flank': 'Right flank',
  periumbilical: 'Around navel',
  'L flank': 'Left flank',
  RLQ: 'Right lower',
  suprapubic: 'Suprapubic',
  LLQ: 'Left lower',
}

/** 3×3 abdomen grid, viewed facing the person (their right is on the left of the screen). */
export function PainMap({ value, onChange }: { value: PainLocation[]; onChange: (v: PainLocation[]) => void }) {
  const toggle = (l: PainLocation) => onChange(value.includes(l) ? value.filter((x) => x !== l) : [...value, l])
  return (
    <div>
      <div className="relative mx-auto max-w-xs">
        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[2.5rem] bg-slate-200 p-1 dark:bg-slate-800" role="group" aria-label="Pain locations">
          {PAIN_LOCATIONS.map((l) => {
            const on = value.includes(l)
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(l)}
                className={cx(
                  'flex aspect-square flex-col items-center justify-center rounded-xl p-1 text-center text-xs font-medium leading-tight transition-colors',
                  on ? 'bg-red-600 text-white' : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200',
                )}
              >
                {l === 'periumbilical' && <span className="mb-1 block h-2 w-2 rounded-full bg-current opacity-60" aria-hidden />}
                {LABELS[l]}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">Facing you: your right side is on the left</p>
    </div>
  )
}

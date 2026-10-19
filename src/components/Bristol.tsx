import type { Bristol } from '../db/types'
import { BRISTOL_INFO } from '../lib/stool'
import { cx } from './ui'

/** Simple schematic icon per Bristol type. */
export function BristolIcon({ type, className }: { type: number; className?: string }) {
  const c = 'currentColor'
  const shapes: Record<number, React.ReactNode> = {
    1: [8, 20, 32, 44].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 10 : 14} r="4.5" fill={c} />),
    2: (
      <g fill={c}>
        {[10, 18, 26, 34, 42].map((x) => (
          <circle key={x} cx={x} cy="12" r="5.5" />
        ))}
      </g>
    ),
    3: (
      <g>
        <rect x="4" y="6" width="44" height="12" rx="6" fill={c} />
        {[14, 24, 34].map((x) => (
          <path key={x} d={`M${x} 6 l2 5 l-2 2`} stroke="var(--crack, #fff)" strokeWidth="1.5" fill="none" />
        ))}
      </g>
    ),
    4: <rect x="4" y="6" width="44" height="12" rx="6" fill={c} />,
    5: [10, 26, 42].map((x) => <ellipse key={x} cx={x} cy="12" rx="7" ry="5.5" fill={c} />),
    6: (
      <path
        d="M6 14 q3 -8 7 -2 q3 -7 7 -1 q4 -7 7 0 q4 -6 7 1 q4 -5 7 1 q4 2 0 5 q-3 4 -7 1 q-4 4 -7 0 q-4 4 -7 0 q-4 4 -7 0 q-4 3 -7 -1 q-3 -1 0 -4z"
        fill={c}
      />
    ),
    7: <path d="M4 12 q6 -6 11 0 t11 0 t11 0 t11 0" stroke={c} strokeWidth="3.5" fill="none" strokeLinecap="round" />,
  }
  return (
    <svg viewBox="0 0 52 24" className={className} aria-hidden>
      {shapes[type]}
    </svg>
  )
}

export function BristolPicker({ value, onChange }: { value?: Bristol; onChange: (v: Bristol) => void }) {
  return (
    <div role="radiogroup" aria-label="Bristol stool type" className="grid gap-1.5">
      {([1, 2, 3, 4, 5, 6, 7] as Bristol[]).map((t) => {
        const active = value === t
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Type ${t}: ${BRISTOL_INFO[t].desc}`}
            onClick={() => onChange(t)}
            className={cx(
              'flex min-h-12 items-center gap-3 rounded-xl px-3 py-1.5 text-left ring-1 transition-colors',
              active
                ? 'bg-accent text-white ring-accent [--crack:#0f766e]'
                : 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 [--crack:#fff] dark:[--crack:#1e293b]',
            )}
          >
            <span className="w-5 text-lg font-bold tabular-nums">{t}</span>
            <BristolIcon type={t} className={cx('h-6 w-14 shrink-0', active ? 'text-white' : 'text-amber-800 dark:text-amber-500')} />
            <span className="text-sm leading-tight">
              <span className="font-semibold">{BRISTOL_INFO[t].short}</span>
              <span className={cx('block text-xs', active ? 'text-teal-50' : 'text-slate-500 dark:text-slate-400')}>{BRISTOL_INFO[t].desc}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

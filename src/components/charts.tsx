import type { ReactNode } from 'react'
import { formatDate } from '../lib/time'

export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']
export const BRISTOL_COLORS = [1, 2, 3, 4, 5, 6, 7].map((n) => `var(--b${n})`)

export const axisProps = {
  stroke: 'var(--axis)',
  tick: { fontSize: 11, fill: 'var(--axis)' },
  tickLine: false,
} as const

export const gridProps = { stroke: 'var(--grid)', strokeDasharray: '0', vertical: false } as const

export const shortDate = (k: string) => formatDate(k, { day: 'numeric', month: 'short' })

export function ChartBox({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return (
    <div style={{ height }} className="-mx-2 text-slate-600 dark:text-slate-300">
      {children}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; shape?: 'line' | 'square' }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={i.shape === 'line' ? 'h-0.5 w-4 rounded' : 'h-3 w-3 rounded-sm'}
            style={{ background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

export const fmt = (n: number | undefined, digits = 0, suffix = '') => (n === undefined || Number.isNaN(n) ? '—' : `${n.toFixed(digits)}${suffix}`)

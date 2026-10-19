import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
const btnStyles: Record<BtnVariant, string> = {
  primary: 'bg-accent text-white active:bg-accent-strong disabled:opacity-40',
  secondary:
    'bg-white text-slate-900 ring-1 ring-slate-300 active:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:active:bg-slate-700 disabled:opacity-40',
  danger: 'bg-red-700 text-white active:bg-red-800 disabled:opacity-40',
  ghost: 'text-accent dark:text-teal-400 active:bg-slate-200/60 dark:active:bg-slate-800',
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      type="button"
      className={cx('min-h-11 rounded-xl px-4 py-2 font-medium transition-colors', btnStyles[variant], className)}
      {...props}
    />
  )
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Chip({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'min-h-11 rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors',
        active
          ? 'bg-accent text-white ring-accent'
          : 'bg-white text-slate-800 ring-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-10 flex-1 rounded-lg px-2 text-sm font-medium',
            value === o.value ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-600 dark:text-slate-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  lowLabel,
  highLabel,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  lowLabel?: string
  highLabel?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className={cx('py-1', disabled && 'opacity-40')}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="min-w-8 text-right text-lg font-semibold tabular-nums" aria-hidden>
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={`${value} of ${max}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {(lowLabel || highLabel) && (
        <div className="-mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  )
}

export function Stepper({ label, value, onChange, min = 0, max = 100, step = 1, suffix }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="w-11 px-0 text-xl" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step))}>
          −
        </Button>
        <span className="min-w-12 text-center text-lg font-semibold tabular-nums" aria-live="polite">
          {value}
          {suffix}
        </span>
        <Button variant="secondary" className="w-11 px-0 text-xl" aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step))}>
          +
        </Button>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block py-1">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'min-h-11 w-full rounded-xl bg-white px-3 py-2 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-accent dark:bg-slate-800 dark:ring-slate-700'

export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 py-1">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="h-6 w-6 shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

// ---------- Sheets (full-screen modal forms) ----------

interface SheetApi {
  open: (node: ReactNode) => void
  /** Closes the top `count` sheets. */
  close: (count?: number) => void
}
const SheetCtx = createContext<SheetApi>({ open: () => {}, close: () => {} })
export const useSheet = () => useContext(SheetCtx)

/**
 * Each open sheet adds a history entry, so the Android back button / back gesture
 * closes the sheet instead of leaving the app.
 */
export function SheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ReactNode[]>([])
  const depth = useRef(0)
  useEffect(() => {
    const onPop = () => {
      const target = typeof history.state?.sheetDepth === 'number' ? history.state.sheetDepth : 0
      depth.current = Math.min(depth.current, target)
      setStack((s) => s.slice(0, depth.current))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const api: SheetApi = {
    open: (n) => {
      depth.current += 1
      history.pushState({ sheetDepth: depth.current }, '')
      setStack((s) => [...s, n])
    },
    close: (count = 1) => {
      const n = Math.min(count, depth.current)
      if (n > 0) history.go(-n)
    },
  }
  useEffect(() => {
    document.body.style.overflow = stack.length ? 'hidden' : ''
  }, [stack.length])
  return (
    <SheetCtx.Provider value={api}>
      {children}
      {stack.map((node, i) => (
        <div key={i} className="fixed inset-0 z-40 overflow-y-auto bg-slate-50 dark:bg-slate-950" role="dialog" aria-modal="true">
          {node}
        </div>
      ))}
    </SheetCtx.Provider>
  )
}

export function SheetLayout({
  title,
  children,
  onSave,
  saveLabel = 'Save',
  saveDisabled,
  onDelete,
}: {
  title: string
  children: ReactNode
  onSave?: () => void | Promise<void>
  saveLabel?: string
  saveDisabled?: boolean
  onDelete?: () => void | Promise<void>
}) {
  const { close } = useSheet()
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => void | Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="pt-safe sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <Button variant="ghost" onClick={() => close()}>
            Cancel
          </Button>
          <h1 className="truncate text-base font-semibold">{title}</h1>
          {onSave ? (
            <Button variant="ghost" className="font-semibold" disabled={saveDisabled || busy} onClick={() => run(onSave)}>
              {saveLabel}
            </Button>
          ) : (
            <span className="w-16" />
          )}
        </div>
      </header>
      <div className="flex-1 space-y-4 p-4">{children}</div>
      {(onSave || onDelete) && (
        <div className="pb-safe space-y-2 p-4">
          {onSave && (
            <Button className="w-full text-lg" disabled={saveDisabled || busy} onClick={() => run(onSave)}>
              {saveLabel}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="secondary"
              className="w-full text-red-700 dark:text-red-400"
              disabled={busy}
              onClick={() => {
                if (confirm('Delete this entry?')) run(onDelete)
              }}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Toast ----------

interface ToastMsg {
  id: number
  text: string
  action?: { label: string; run: () => void }
}
const ToastCtx = createContext<(text: string, action?: ToastMsg['action']) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 4000)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <ToastCtx.Provider value={(text, action) => setMsg({ id: Date.now(), text, action })}>
      {children}
      {msg && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4" role="status" aria-live="polite">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
            <span>{msg.text}</span>
            {msg.action && (
              <button
                className="min-h-11 font-semibold text-teal-300 dark:text-teal-700"
                onClick={() => {
                  msg.action!.run()
                  setMsg(null)
                }}
              >
                {msg.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>
}

import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { AlertBanners, InfoBanners } from './components/Banners'
import { SheetProvider, ToastProvider, cx } from './components/ui'
import { LogScreen } from './screens/LogScreen'
import { MoreScreen } from './screens/MoreScreen'
import { TodayScreen } from './screens/TodayScreen'

// Chart-heavy screens load on demand so the Log screen starts fast.
const TrendsScreen = lazy(() => import('./screens/TrendsScreen').then((m) => ({ default: m.TrendsScreen })))
const LabsScreen = lazy(() => import('./screens/LabsScreen').then((m) => ({ default: m.LabsScreen })))

type Tab = 'log' | 'today' | 'trends' | 'labs' | 'more'

const I = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)
const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'log', label: 'Log', icon: <I d="M12 5v14M5 12h14" /> },
  { id: 'today', label: 'Today', icon: <I d="M4 6h16M4 12h16M4 18h10" /> },
  { id: 'trends', label: 'Trends', icon: <I d="M3 17l6-6 4 4 8-8M15 7h6v6" /> },
  { id: 'labs', label: 'Labs', icon: <I d="M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3" /> },
  { id: 'more', label: 'More', icon: <I d="M5 12h.01M12 12h.01M19 12h.01" /> },
]
const TITLES: Record<Tab, string> = { log: 'Log', today: 'Timeline', trends: 'Trends', labs: 'Labs', more: 'More' }

export default function App() {
  const [tab, setTab] = useState<Tab>('log')

  useEffect(() => window.scrollTo(0, 0), [tab])

  return (
    <ToastProvider>
      <SheetProvider>
        <div className="mx-auto flex min-h-full max-w-xl flex-col">
          <header className="pt-safe sticky top-0 z-20 bg-slate-50/95 backdrop-blur dark:bg-slate-950/95">
            <h1 className="px-4 py-3 text-xl font-bold">{TITLES[tab]}</h1>
          </header>
          <main className="flex-1 space-y-4 px-4 pb-28">
            <AlertBanners />
            {tab === 'log' && <InfoBanners />}
            {tab === 'log' && <LogScreen />}
            {tab === 'today' && <TodayScreen />}
            <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Loading…</p>}>
              {tab === 'trends' && <TrendsScreen />}
              {tab === 'labs' && <LabsScreen />}
            </Suspense>
            {tab === 'more' && <MoreScreen />}
          </main>
          <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" aria-label="Main">
            <ul className="mx-auto flex max-w-xl">
              {TABS.map((t) => (
                <li key={t.id} className="flex-1">
                  <button
                    type="button"
                    aria-current={tab === t.id ? 'page' : undefined}
                    onClick={() => setTab(t.id)}
                    className={cx(
                      'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium',
                      tab === t.id ? 'text-accent dark:text-teal-400' : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </SheetProvider>
    </ToastProvider>
  )
}

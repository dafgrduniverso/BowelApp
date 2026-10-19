import { Component, useEffect, useState, type ReactNode } from 'react'
import { db } from '../db/db'
import { IS_SINGLE_FILE } from '../lib/reminders'

function Problem({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return (
    <div className="pt-safe mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
      {detail && (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-200 p-3 text-xs dark:bg-slate-800" aria-label="Technical details">
          {detail}
        </pre>
      )}
      <button type="button" className="min-h-11 rounded-xl bg-accent px-4 font-medium text-white" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  )
}

const describe = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e))

/** Rejects if IndexedDB is blocked (sandboxed viewer, browser policy, some private modes) or hangs. */
async function checkStorage(timeoutMs = 4000) {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available in this browser.')
  await Promise.race([
    (async () => {
      await db.open()
      await db.settings.get('app')
    })(),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Opening the database timed out after ${timeoutMs / 1000} s.`)), timeoutMs)),
  ])
}

/** Renders the app only once local storage is confirmed to work; otherwise explains why it can't. */
export function StorageGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | { error: string }>('checking')
  useEffect(() => {
    checkStorage().then(
      () => setState('ok'),
      (e) => setState({ error: describe(e) }),
    )
  }, [])
  if (state === 'checking') return null
  if (state === 'ok') return <>{children}</>
  return (
    <Problem title="Gut Tracker can't save data here" detail={state.error}>
      <p>This browser window is blocking local storage, so nothing you log could be kept. Nothing has been saved.</p>
      <p className="font-semibold">Common causes and fixes:</p>
      <ul className="list-disc space-y-2 pl-5">
        {IS_SINGLE_FILE && (
          <li>
            The file is open inside a <strong>preview</strong> (Outlook, Teams, OneDrive/SharePoint, a chat app or a file viewer). Save it to a folder such as
            Documents first, then right-click it → <strong>Open with → Microsoft Edge</strong> or <strong>Google Chrome</strong>.
          </li>
        )}
        <li>
          It's a <strong>private / InPrivate / Incognito</strong> window. Use a normal window.
        </li>
        <li>
          Your organisation's browser policy blocks site data{IS_SINGLE_FILE ? ' for local files' : ''}. Check{' '}
          <code>{navigator.userAgent.includes('Edg/') ? 'edge://policy' : 'chrome://policy'}</code> for cookie or storage settings
          {IS_SINGLE_FILE ? ', or use the hosted web version of the app instead' : ''}.
        </li>
      </ul>
    </Problem>
  )
}

/** Shows the error instead of a blank screen if any screen crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: unknown }> {
  state: { error?: unknown } = {}
  static getDerivedStateFromError(error: unknown) {
    return { error }
  }
  render() {
    if (this.state.error === undefined) return this.props.children
    const e = this.state.error
    return (
      <Problem title="Something went wrong" detail={`${describe(e)}\n\n${e instanceof Error ? e.stack ?? '' : ''}\n\n${navigator.userAgent}`}>
        <p>The app hit an error. Your saved data is not affected. Reload to continue; if it keeps happening, send the details below.</p>
      </Problem>
    )
  }
}

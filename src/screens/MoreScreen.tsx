import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Button, Card, Empty, Field, SheetLayout, Segmented, Toggle, cx, inputCls, useSheet, useToast } from '../components/ui'
import { db } from '../db/db'
import { acknowledgeAlert, deleteAllData, updateSettings } from '../db/repo'
import type { Intervention } from '../db/types'
import { generateSeed } from '../dev/seed'
import { BAND_COLORS, IbsSssForm } from '../forms/IbsSssForm'
import { CATEGORY_LABELS, EndTrialForm, InterventionForm, OUTCOME_LABELS } from '../forms/InterventionForm'
import { RED_FLAG_CONFIG, RED_FLAG_MESSAGES } from '../lib/config'
import { copyText, saveFile } from '../lib/download'
import { buildCsvZip, importData, parseExport, summarize, type ExportFile } from '../lib/exportImport'
import { useAllData, useSettings } from '../lib/hooks'
import { ibsSssBand } from '../lib/ibsSss'
import { IS_SINGLE_FILE, notificationsSupported } from '../lib/reminders'
import { aiSummaryMarkdown } from '../lib/summary'
import { WEEKDAYS, addDays, daysBetween, formatDate, formatDateTime, nowIso, todayKey, weekStart } from '../lib/time'
import { isTrialActive } from '../lib/trials'
import { backupNow } from '../components/Banners'
import { earliestDate, rangeStart, type RangeKey } from '../lib/range'

function Row({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-between gap-2 py-2 text-left">
        <span>
          <span className="block font-medium">{label}</span>
          {sub && <span className="block text-xs text-slate-500 dark:text-slate-400">{sub}</span>}
        </span>
        <span className="text-slate-400" aria-hidden>
          ›
        </span>
      </button>
    </li>
  )
}

export function MoreScreen() {
  const { open } = useSheet()
  const counts = useLiveQuery(async () => ({
    interventions: await db.interventions.count(),
    sss: await db.ibsSss.count(),
    alerts: await db.alerts.count(),
  }))
  return (
    <div className="space-y-4">
      <TrialCards />
      <Card>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          <Row label="Interventions & trials" sub={`${counts?.interventions ?? 0} defined`} onClick={() => open(<InterventionsSheet />)} />
          <Row label="IBS-SSS history" sub={`${counts?.sss ?? 0} weekly scores`} onClick={() => open(<IbsSssHistory />)} />
          <Row label="Alerts" sub={`${counts?.alerts ?? 0} total`} onClick={() => open(<AlertsSheet />)} />
          <Row label="Export & import" sub="Backup, CSV, AI summary" onClick={() => open(<DataSheet />)} />
          <Row label="Settings" sub="Reminders, tags, units, delete data" onClick={() => open(<SettingsSheet />)} />
        </ul>
      </Card>
      <p className="px-2 text-xs text-slate-500 dark:text-slate-400">
        Gut Tracker is a tracking tool, not a diagnostic tool. All data stays on this device. Version {__APP_VERSION__}.
      </p>
    </div>
  )
}

// ---------- Trials ----------

export function TrialCard({ i }: { i: Intervention }) {
  const { open } = useSheet()
  const today = todayKey()
  const elapsed = daysBetween(i.startDate!, today) + 1
  const remaining = i.plannedEndDate ? daysBetween(today, i.plannedEndDate) : undefined
  const overdue = remaining !== undefined && remaining < 0
  return (
    <div className={cx('rounded-2xl p-4 ring-1', overdue ? 'bg-amber-50 ring-amber-400 dark:bg-amber-950/50' : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent dark:text-teal-400">Active trial</p>
          <p className="text-lg font-semibold">{i.name}</p>
          {i.dose && <p className="text-sm text-slate-500 dark:text-slate-400">{i.dose}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">Day {elapsed}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {remaining === undefined ? 'no end date' : overdue ? `planned end passed` : `${remaining} day${remaining === 1 ? '' : 's'} left`}
          </p>
        </div>
      </div>
      {i.plannedEndDate && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>
          <div className="h-full bg-accent" style={{ width: `${Math.min(100, (elapsed / (daysBetween(i.startDate!, i.plannedEndDate) + 1)) * 100)}%` }} />
        </div>
      )}
      {i.concurrentTrialOverride && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Started alongside another trial — results not attributable.</p>}
      <div className="mt-3 flex gap-2">
        <Button variant={overdue ? 'primary' : 'secondary'} className="flex-1" onClick={() => open(<EndTrialForm intervention={i} />)}>
          {overdue ? 'End trial & record outcome' : 'End trial'}
        </Button>
        <Button variant="secondary" onClick={() => open(<InterventionForm initial={i} />)}>
          Edit
        </Button>
      </div>
    </div>
  )
}

export function TrialCards() {
  const interventions = useLiveQuery(() => db.interventions.toArray(), [])
  const active = (interventions ?? []).filter((i) => isTrialActive(i))
  if (!active.length) return null
  return (
    <div className="space-y-3">
      {active.map((i) => (
        <TrialCard key={i.id} i={i} />
      ))}
    </div>
  )
}

function InterventionsSheet() {
  const interventions = useLiveQuery(() => db.interventions.toArray(), [])
  const doses = useLiveQuery(() => db.doses.toArray(), [])
  const { open } = useSheet()
  const today = todayKey()
  const thisWeek = weekStart(today)
  const lastWeek = addDays(thisWeek, -7)
  const trials = (interventions ?? []).filter((i) => i.mode === 'trial').sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
  const onDemand = (interventions ?? []).filter((i) => i.mode === 'on_demand')
  const weekCount = (id: string, from: string, to: string) =>
    (doses ?? []).filter((d) => d.interventionId === id && d.timestamp.slice(0, 10) >= from && d.timestamp.slice(0, 10) < to).length
  return (
    <SheetLayout title="Interventions">
      <Button className="w-full" onClick={() => open(<InterventionForm />)}>
        + New intervention
      </Button>
      <TrialCards />
      <Card title="Trials">
        {!trials.length && <Empty>No trials yet.</Empty>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {trials.map((i) => (
            <Row
              key={i.id}
              label={i.name}
              sub={[
                CATEGORY_LABELS[i.category],
                i.startDate && `${formatDate(i.startDate)} → ${i.actualEndDate ? formatDate(i.actualEndDate) : i.startDate > today ? 'not started' : 'ongoing'}`,
                i.outcome && OUTCOME_LABELS[i.outcome],
              ]
                .filter(Boolean)
                .join(' · ')}
              onClick={() => open(i.actualEndDate ? <EndTrialForm intervention={i} /> : <InterventionForm initial={i} />)}
            />
          ))}
        </ul>
      </Card>
      <Card title="On demand">
        {!onDemand.length && <Empty>No on-demand interventions yet.</Empty>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {onDemand.map((i) => (
            <Row
              key={i.id}
              label={`${i.name}${i.actualEndDate ? ' (archived)' : ''}`}
              sub={`This week: ${weekCount(i.id, thisWeek, addDays(thisWeek, 7))} · last week: ${weekCount(i.id, lastWeek, thisWeek)} doses`}
              onClick={() => open(<InterventionForm initial={i} />)}
            />
          ))}
        </ul>
      </Card>
    </SheetLayout>
  )
}

// ---------- IBS-SSS ----------

function IbsSssHistory() {
  const entries = useLiveQuery(() => db.ibsSss.orderBy('date').reverse().toArray(), [])
  const { open } = useSheet()
  return (
    <SheetLayout title="IBS-SSS history">
      <Button className="w-full" onClick={() => open(<IbsSssForm />)}>
        + New weekly score
      </Button>
      <Card>
        {entries && !entries.length && <Empty>No scores yet.</Empty>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {entries?.map((e) => {
            const band = ibsSssBand(e.total)
            return (
              <li key={e.id}>
                <button type="button" className="flex min-h-12 w-full items-center justify-between py-2 text-left" onClick={() => open(<IbsSssForm initial={e} />)}>
                  <span>{formatDate(e.date)}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{e.total}</span> <span className={BAND_COLORS[band.key]}>{band.label}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
      <p className="text-xs text-slate-500 dark:text-slate-400">Bands: &lt;75 remission · 75–174 mild · 175–299 moderate · ≥300 severe</p>
    </SheetLayout>
  )
}

// ---------- Alerts ----------

function AlertsSheet() {
  const alerts = useLiveQuery(() => db.alerts.orderBy('triggeredAt').reverse().toArray(), [])
  return (
    <SheetLayout title="Alerts">
      {alerts && !alerts.length && <Empty>No alerts.</Empty>}
      <ul className="space-y-2">
        {alerts?.map((a) => (
          <li key={a.id} className={cx('rounded-xl p-3 ring-1', a.acknowledgedAt ? 'ring-slate-200 dark:ring-slate-800' : 'bg-red-50 ring-red-300 dark:bg-red-950/50 dark:ring-red-800')}>
            <p className="text-sm">{a.message}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatDateTime(a.triggeredAt)} · {a.acknowledgedAt ? `acknowledged ${formatDateTime(a.acknowledgedAt)}` : 'not acknowledged'}
            </p>
            {!a.acknowledgedAt && (
              <Button variant="secondary" className="mt-2" onClick={() => acknowledgeAlert(a.id)}>
                Acknowledge
              </Button>
            )}
          </li>
        ))}
      </ul>
    </SheetLayout>
  )
}

// ---------- Data ----------

function DataSheet() {
  const data = useAllData()
  const settings = useSettings()
  const toast = useToast()
  const { open } = useSheet()
  const fileRef = useRef<HTMLInputElement>(null)
  const [range, setRange] = useState<RangeKey>('30')
  const stamp = () => todayKey()

  const exportJson = async () => {
    await backupNow()
    toast('Export ready')
  }
  const exportCsv = async () => {
    await saveFile(await buildCsvZip(), `gut-tracker-csv-${stamp()}.zip`, 'application/zip')
    toast('CSV zip ready')
  }
  const start = data ? rangeStart(range, data) : todayKey()
  return (
    <SheetLayout title="Export & import">
      <Card title="Backup">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          Your data lives only on this phone. Export regularly and keep the file somewhere safe (e.g. iCloud Drive, Google Drive, email to yourself).
          {settings.lastExportAt ? ` Last export: ${formatDateTime(settings.lastExportAt)}.` : ' Never exported.'}
        </p>
        <div className="grid gap-2">
          <Button onClick={() => exportJson().catch(() => {})}>Export everything (JSON)</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import from JSON…
          </Button>
          <Button variant="secondary" onClick={() => exportCsv().catch(() => {})}>
            Export CSV (zip)
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose export file"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try {
              open(<ImportConfirm file={parseExport(await f.text())} />)
            } catch (err) {
              alert((err as Error).message)
            }
          }}
        />
      </Card>
      <Card title="AI summary">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">Copies a compact Markdown summary (daily aggregates, IBS-SSS, interventions, labs) to paste into an AI assistant.</p>
        <p className="mb-2 text-sm font-medium">Period</p>
        <Segmented
          label="Summary period"
          value={range}
          onChange={setRange}
          options={[
            { value: '14', label: '14 d' },
            { value: '30', label: '30 d' },
            { value: '90', label: '90 d' },
            { value: 'all', label: 'All' },
          ]}
        />
        <div className="mt-3 grid gap-2">
          <Toggle label="Include free-text notes in AI summary" checked={settings.aiSummaryIncludeNotes} onChange={(v) => updateSettings({ aiSummaryIncludeNotes: v })} />
          <Button
            variant="secondary"
            disabled={!data}
            onClick={async () => {
              const ok = await copyText(aiSummaryMarkdown(data!, start, todayKey(), settings.aiSummaryIncludeNotes))
              toast(ok ? 'Summary copied to clipboard' : 'Copy failed')
            }}
          >
            Copy summary for AI analysis
          </Button>
        </div>
        {data && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Data available from {formatDate(earliestDate(data))}.</p>}
      </Card>
    </SheetLayout>
  )
}

const TABLE_LABELS: Record<string, string> = {
  bowelMovements: 'Bowel movements',
  checkIns: 'Check-ins',
  triggers: 'Triggers',
  eyeEpisodes: 'Eye episodes',
  interventions: 'Interventions',
  doses: 'Doses',
  ibsSss: 'IBS-SSS',
  labs: 'Labs',
  weights: 'Weights',
  alerts: 'Alerts',
}

function ImportConfirm({ file }: { file: ExportFile }) {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const { close } = useSheet()
  const toast = useToast()
  const { counts } = summarize(file)
  return (
    <SheetLayout
      title="Import"
      saveLabel={mode === 'replace' ? 'Replace all data' : 'Merge'}
      onSave={async () => {
        if (mode === 'replace' && !confirm('This deletes all current data on this device and replaces it with the file. Continue?')) return
        await importData(file, mode)
        toast('Import complete')
        close(2)
      }}
    >
      <p className="text-sm">Export from {formatDateTime(file.exportedAt)} contains:</p>
      <ul className="grid grid-cols-2 gap-1 text-sm">
        {Object.entries(counts).map(([t, n]) => (
          <li key={t} className="flex justify-between rounded-lg bg-slate-100 px-3 py-1 dark:bg-slate-800">
            <span>{TABLE_LABELS[t]}</span>
            <span className="tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
      <Segmented
        label="Import mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'merge', label: 'Merge' },
          { value: 'replace', label: 'Replace' },
        ]}
      />
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {mode === 'merge'
          ? 'Merge adds records from the file and keeps the most recently edited version of any record that exists in both.'
          : 'Replace deletes everything on this device first, then restores the file exactly.'}
      </p>
    </SheetLayout>
  )
}

// ---------- Settings ----------

function SettingsSheet() {
  const s = useSettings()
  const [newTag, setNewTag] = useState('')
  const [deleteText, setDeleteText] = useState('')
  const [perm, setPerm] = useState(notificationsSupported() ? Notification.permission : 'unsupported')
  const toast = useToast()
  const { close } = useSheet()
  return (
    <SheetLayout title="Settings">
      <Card title="Reminders">
        <Toggle label="Evening check-in reminder" checked={s.checkInReminderEnabled} onChange={(v) => updateSettings({ checkInReminderEnabled: v })} />
        <Field label="Reminder time">
          <input type="time" className={inputCls} value={s.checkInReminder} onChange={(e) => e.target.value && updateSettings({ checkInReminder: e.target.value })} />
        </Field>
        <Toggle label="Weekly IBS-SSS reminder" checked={s.ibsSssReminderEnabled} onChange={(v) => updateSettings({ ibsSssReminderEnabled: v })} />
        <Field label="IBS-SSS day">
          <select className={inputCls} value={s.ibsSssWeekday} onChange={(e) => updateSettings({ ibsSssWeekday: Number(e.target.value) })}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <div className="mt-2 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
          {perm === 'unsupported' ? (
            <p>
              {IS_SINGLE_FILE
                ? 'The single-file version can’t send notifications. Reminders show as a banner when you open it.'
                : 'Notifications aren’t available here. On iPhone, add the app to your Home Screen first (iOS 16.4+). Reminders show as a banner when you open the app.'}
            </p>
          ) : perm === 'granted' ? (
            <p>Notifications allowed. They fire while the app is open or in the background; otherwise you'll see a banner on next open.</p>
          ) : perm === 'denied' ? (
            <p>Notifications are blocked in your browser settings. Reminders will show as in-app banners.</p>
          ) : (
            <Button variant="secondary" className="w-full" onClick={async () => setPerm(await Notification.requestPermission())}>
              Allow notifications
            </Button>
          )}
        </div>
      </Card>

      <Card title="Trigger tags">
        <div className="flex flex-wrap gap-2">
          {s.triggerTags.map((t) => (
            <span key={t} className="flex min-h-11 items-center gap-1 rounded-full bg-slate-100 pl-4 pr-1 text-sm dark:bg-slate-800">
              {t}
              <button
                type="button"
                aria-label={`Remove tag ${t}`}
                className="h-9 w-9 rounded-full text-lg text-slate-500"
                onClick={() => updateSettings({ triggerTags: s.triggerTags.filter((x) => x !== t) })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const t = newTag.trim()
            if (t && !s.triggerTags.includes(t)) updateSettings({ triggerTags: [...s.triggerTags, t] })
            setNewTag('')
          }}
        >
          <input className={inputCls} value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag" aria-label="New tag" />
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <Card title="Units">
        <Segmented
          label="Weight unit"
          value={s.weightUnit}
          onChange={(v) => updateSettings({ weightUnit: v })}
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
        />
      </Card>

      <Card title="Alert thresholds">
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Read-only. Defined in src/lib/config.ts.</p>
        <ul className="space-y-1 text-sm">
          <li>Night-time BMs: ≥ {RED_FLAG_CONFIG.nocturnal.minCount} in {RED_FLAG_CONFIG.nocturnal.windowDays} days</li>
          <li>Weight loss: ≥ {RED_FLAG_CONFIG.weightLoss.minPercentDrop}% vs max of previous {RED_FLAG_CONFIG.weightLoss.lookbackDays} days</li>
          <li>Calprotectin high: ≥ {RED_FLAG_CONFIG.calprotectin.high} µg/g</li>
          <li>Calprotectin rising: ≥ {RED_FLAG_CONFIG.calprotectin.risingMin} and +{RED_FLAG_CONFIG.calprotectin.risingPercent}% vs previous</li>
          <li>Haemoglobin: below reference low (fallback {RED_FLAG_CONFIG.haemoglobin.refLowFallbackGdl} g/dL) or drop ≥ {RED_FLAG_CONFIG.haemoglobin.minDropGdl} g/dL</li>
          <li>Ferritin: below reference low (fallback {RED_FLAG_CONFIG.ferritin.refLowFallback})</li>
          <li>Eye: photophobia, blurred vision or deep aching pain</li>
          <li>Fever: “{RED_FLAG_CONFIG.feverKeyword}” in notes on a flare day</li>
        </ul>
        <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          <summary className="min-h-11 cursor-pointer py-3">Alert messages</summary>
          <ul className="space-y-1">
            {Object.entries(RED_FLAG_MESSAGES).map(([k, m]) => (
              <li key={k}>
                <code>{k}</code>: {m}
              </li>
            ))}
          </ul>
        </details>
      </Card>

      <Card title="Demo data">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">Replace everything with 60 days of generated fake data, to explore the charts.</p>
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            if (!confirm('Replace ALL data with 60 days of demo data?')) return
            await importData({ format: 'gut-tracker-export', version: 1, exportedAt: nowIso(), settings: s, data: generateSeed(60) as unknown as ExportFile['data'] }, 'replace')
            toast('Demo data loaded')
            close()
          }}
        >
          Load demo data
        </Button>
      </Card>

      <Card title="Delete all data">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">Permanently removes everything from this device. Type DELETE to confirm.</p>
        <input className={inputCls} value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" autoCapitalize="characters" />
        <Button
          variant="danger"
          className="mt-2 w-full"
          disabled={deleteText !== 'DELETE'}
          onClick={async () => {
            await deleteAllData()
            setDeleteText('')
            toast('All data deleted')
            close()
          }}
        >
          Delete all data
        </Button>
      </Card>
    </SheetLayout>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ReactNode } from 'react'
import { db } from '../db/db'
import { acknowledgeAlert, updateSettings } from '../db/repo'
import { CheckInForm } from '../forms/CheckInForm'
import { EndTrialForm } from '../forms/InterventionForm'
import { IbsSssForm } from '../forms/IbsSssForm'
import { BACKUP_REMINDER_DAYS } from '../lib/config'
import { useSettings } from '../lib/hooks'
import { checkInDue, ibsSssDue, isIos, isStandalone, scheduleToday, showNotification } from '../lib/reminders'
import { nowIso, todayKey } from '../lib/time'
import { buildExport } from '../lib/exportImport'
import { saveFile } from '../lib/download'

export async function backupNow() {
  const file = await buildExport()
  await saveFile(JSON.stringify(file), `gut-tracker-${todayKey()}.json`, 'application/json')
  await updateSettings({ lastExportAt: nowIso() })
}
import { cx, useSheet } from './ui'

function Banner({ tone, children, actions }: { tone: 'red' | 'amber' | 'teal' | 'slate'; children: ReactNode; actions?: ReactNode }) {
  const tones = {
    red: 'bg-red-700 text-white',
    amber: 'bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-50',
    teal: 'bg-teal-50 text-teal-950 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-50 dark:ring-teal-800',
    slate: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
  }
  return (
    <div className={cx('rounded-xl p-3 text-sm', tones[tone])} role={tone === 'red' ? 'alert' : 'status'}>
      <div>{children}</div>
      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const bannerBtn = 'min-h-11 rounded-lg px-3 font-semibold ring-1 ring-current/30'

/** Red-flag alerts: persistent across every tab until acknowledged. */
export function AlertBanners() {
  const alerts = useLiveQuery(() => db.alerts.filter((a) => !a.acknowledgedAt).toArray(), [])
  if (!alerts?.length) return null
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <Banner
          key={a.id}
          tone="red"
          actions={
            <button className={bannerBtn} onClick={() => acknowledgeAlert(a.id)}>
              Acknowledge
            </button>
          }
        >
          <span className="font-semibold">⚠ </span>
          {a.message}
        </Banner>
      ))}
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

/** Reminder, backup, trial-ending and install banners (Log tab). */
export function InfoBanners() {
  const settings = useSettings()
  const { open } = useSheet()
  const today = todayKey()
  const [now, setNow] = useState(new Date())
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => {
      clearInterval(t)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  const state = useLiveQuery(async () => {
    const [hasCheckIn, sss, firstBm, interventions] = await Promise.all([
      db.checkIns.where('date').equals(today).count(),
      db.ibsSss.toArray(),
      db.bowelMovements.orderBy('timestamp').first(),
      db.interventions.toArray(),
    ])
    const anyData = !!firstBm || sss.length > 0 || hasCheckIn > 0
    return { hasCheckIn: hasCheckIn > 0, sss, firstBmAt: firstBm?.createdAt, interventions, anyData }
  }, [today])

  // Notification while the app is open/backgrounded at reminder time.
  useEffect(() => {
    if (!state || !settings.checkInReminderEnabled || state.hasCheckIn) return
    return scheduleToday(settings.checkInReminder, () => showNotification('Gut Tracker', 'Time for your evening check-in.', 'checkin'))
  }, [state?.hasCheckIn, settings.checkInReminder, settings.checkInReminderEnabled])

  if (!state) return null
  const banners: ReactNode[] = []
  const dismiss = (k: string) => setDismissed((d) => ({ ...d, [k]: true }))

  for (const i of state.interventions) {
    if (i.mode === 'trial' && !i.actualEndDate && i.plannedEndDate && i.plannedEndDate < today && !dismissed[`trial-${i.id}`])
      banners.push(
        <Banner
          key={`trial-${i.id}`}
          tone="amber"
          actions={
            <>
              <button className={bannerBtn} onClick={() => open(<EndTrialForm intervention={i} />)}>
                Record outcome
              </button>
              <button className={bannerBtn} onClick={() => dismiss(`trial-${i.id}`)}>
                Later
              </button>
            </>
          }
        >
          The <strong>{i.name}</strong> trial reached its planned end date. How did it go?
        </Banner>,
      )
  }

  if (checkInDue(state.hasCheckIn, settings, now) && !dismissed.checkin)
    banners.push(
      <Banner
        key="checkin"
        tone="teal"
        actions={
          <>
            <button className={bannerBtn} onClick={() => open(<CheckInForm />)}>
              Do check-in
            </button>
            <button className={bannerBtn} onClick={() => dismiss('checkin')}>
              Later
            </button>
          </>
        }
      >
        Evening check-in not done yet today.
      </Banner>,
    )

  if (settings.ibsSssReminderEnabled && ibsSssDue(state.sss, settings.ibsSssWeekday, today) && !dismissed.sss)
    banners.push(
      <Banner
        key="sss"
        tone="teal"
        actions={
          <>
            <button className={bannerBtn} onClick={() => open(<IbsSssForm />)}>
              Fill in (1 min)
            </button>
            <button className={bannerBtn} onClick={() => dismiss('sss')}>
              Later
            </button>
          </>
        }
      >
        Weekly symptom score (IBS-SSS) is due.
      </Banner>,
    )

  const lastBackup = [settings.lastExportAt, settings.backupSnoozedAt, state.firstBmAt].filter(Boolean).sort().pop()
  if (state.anyData && lastBackup && Date.now() - new Date(lastBackup).getTime() > BACKUP_REMINDER_DAYS * 86400000 && !dismissed.backup)
    banners.push(
      <Banner
        key="backup"
        tone="amber"
        actions={
          <>
            <button className={bannerBtn} onClick={() => backupNow().catch(() => {})}>
              Back up now
            </button>
            <button
              className={bannerBtn}
              onClick={() => {
                dismiss('backup')
                updateSettings({ backupSnoozedAt: nowIso() })
              }}
            >
              Not now
            </button>
          </>
        }
      >
        {settings.lastExportAt ? `No backup in over ${BACKUP_REMINDER_DAYS} days.` : 'You have never backed up.'} Your data lives only on this phone — losing it or clearing browser data loses everything.
      </Banner>,
    )

  if (!isStandalone() && !dismissed.install) {
    if (installEvt)
      banners.push(
        <Banner
          key="install"
          tone="slate"
          actions={
            <>
              <button className={bannerBtn} onClick={() => installEvt.prompt().then(() => setInstallEvt(null))}>
                Install
              </button>
              <button className={bannerBtn} onClick={() => dismiss('install')}>
                Dismiss
              </button>
            </>
          }
        >
          Install Gut Tracker on your home screen for offline use and reminders.
        </Banner>,
      )
    else if (isIos())
      banners.push(
        <Banner
          key="install"
          tone="slate"
          actions={
            <button className={bannerBtn} onClick={() => dismiss('install')}>
              Dismiss
            </button>
          }
        >
          To install: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>. Installing keeps your data safer from Safari's storage clean-up and enables notifications.
        </Banner>,
      )
  }

  if (!banners.length) return null
  return <div className="space-y-2">{banners}</div>
}

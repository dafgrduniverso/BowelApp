import { db, type GutDb } from './db'
import type { AllData, BaseRecord, DataTable, Settings } from './types'
import { DATA_TABLES } from './types'
import { evaluateRules } from '../lib/rules'
import { DEFAULT_TRIGGER_TAGS } from '../lib/config'
import { nowIso } from '../lib/time'

export const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

type RecordOf<T extends DataTable> = AllData[T][number]
export type Draft<T extends DataTable> = Omit<RecordOf<T>, keyof BaseRecord> & Partial<BaseRecord>

/** Insert or update a record, stamping id/createdAt/updatedAt, then re-evaluate red-flag rules. */
export async function saveRecord<T extends DataTable>(table: T, draft: Draft<T>, database: GutDb = db): Promise<RecordOf<T>> {
  const now = nowIso()
  const rec = {
    ...draft,
    id: draft.id ?? uuid(),
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  } as RecordOf<T>
  await (database[table] as any).put(rec)
  if (table !== 'alerts') await syncAlerts(database)
  return rec
}

export async function deleteRecord(table: DataTable, id: string, database: GutDb = db) {
  await database[table].delete(id)
  if (table === 'interventions') await database.doses.where('interventionId').equals(id).delete()
  if (table !== 'alerts') await syncAlerts(database)
}

/**
 * Adds an Alert for every new rule hit (once per triggering event) and removes
 * unacknowledged alerts whose triggering event no longer qualifies (e.g. after an edit).
 */
export async function syncAlerts(database: GutDb = db) {
  const [bowelMovements, checkIns, eyeEpisodes, labs, weights] = await Promise.all([
    database.bowelMovements.toArray(),
    database.checkIns.toArray(),
    database.eyeEpisodes.toArray(),
    database.labs.toArray(),
    database.weights.toArray(),
  ])
  const hits = evaluateRules({ bowelMovements, checkIns, eyeEpisodes, labs, weights })
  const keys = new Set(hits.map((h) => h.eventKey))
  await database.transaction('rw', database.alerts, async () => {
    const existing = await database.alerts.toArray()
    const existingKeys = new Set(existing.map((a) => a.eventKey))
    const stale = existing.filter((a) => !a.acknowledgedAt && !keys.has(a.eventKey)).map((a) => a.id)
    if (stale.length) await database.alerts.bulkDelete(stale)
    const now = nowIso()
    const fresh = hits
      .filter((h) => !existingKeys.has(h.eventKey))
      .map((h) => ({ id: uuid(), createdAt: now, updatedAt: now, triggeredAt: now, ...h }))
    if (fresh.length) await database.alerts.bulkAdd(fresh)
  })
}

export async function acknowledgeAlert(id: string, database: GutDb = db) {
  const now = nowIso()
  await database.alerts.update(id, { acknowledgedAt: now, updatedAt: now })
}

export const DEFAULT_SETTINGS: Settings = {
  checkInReminder: '21:30',
  checkInReminderEnabled: true,
  ibsSssWeekday: 7,
  ibsSssReminderEnabled: true,
  triggerTags: DEFAULT_TRIGGER_TAGS,
  weightUnit: 'kg',
  aiSummaryIncludeNotes: false,
}

export async function getSettings(database: GutDb = db): Promise<Settings> {
  const row = await database.settings.get('app')
  return { ...DEFAULT_SETTINGS, ...row?.value }
}

export async function updateSettings(patch: Partial<Settings>, database: GutDb = db) {
  const cur = await getSettings(database)
  await database.settings.put({ key: 'app', value: { ...cur, ...patch } })
}

export async function readAll(database: GutDb = db): Promise<AllData> {
  const entries = await Promise.all(DATA_TABLES.map(async (t) => [t, await database[t].toArray()] as const))
  return Object.fromEntries(entries) as unknown as AllData
}

export async function deleteAllData(database: GutDb = db) {
  await database.transaction('rw', [...DATA_TABLES.map((t) => database[t]), database.settings], async () => {
    for (const t of DATA_TABLES) await database[t].clear()
    await database.settings.clear()
  })
}

export async function hasAnyData(database: GutDb = db): Promise<boolean> {
  for (const t of DATA_TABLES) if ((await database[t].count()) > 0) return true
  return false
}

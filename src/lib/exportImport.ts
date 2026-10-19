import { zipSync, strToU8 } from 'fflate'
import { db, type GutDb } from '../db/db'
import type { AllData, DataTable, Settings } from '../db/types'
import { DATA_TABLES } from '../db/types'
import { getSettings, readAll, syncAlerts } from '../db/repo'

export const EXPORT_FORMAT = 'gut-tracker-export'
export const EXPORT_VERSION = 1

interface EncodedBlob {
  __blob: true
  type: string
  base64: string
}

export interface ExportFile {
  format: typeof EXPORT_FORMAT
  version: number
  exportedAt: string
  settings: Settings
  data: Record<DataTable, unknown[]>
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(s)
}
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function encodeBlob(b: Blob): Promise<EncodedBlob> {
  return { __blob: true, type: b.type, base64: bytesToBase64(new Uint8Array(await b.arrayBuffer())) }
}
const isEncodedBlob = (v: unknown): v is EncodedBlob => !!v && typeof v === 'object' && (v as EncodedBlob).__blob === true

export async function buildExport(database: GutDb = db): Promise<ExportFile> {
  const all = await readAll(database)
  const eyeEpisodes = await Promise.all(
    all.eyeEpisodes.map(async (e) => ({ ...e, photos: await Promise.all((e.photos ?? []).map(encodeBlob)) })),
  )
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: await getSettings(database),
    data: { ...all, eyeEpisodes },
  }
}

export function parseExport(text: string): ExportFile {
  let obj: any
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON.')
  }
  if (obj?.format !== EXPORT_FORMAT || typeof obj.data !== 'object') throw new Error('This is not a Gut Tracker export file.')
  if (obj.version > EXPORT_VERSION) throw new Error('Export was made by a newer app version.')
  return obj as ExportFile
}

function decode(data: ExportFile['data']): AllData {
  const out = {} as Record<DataTable, unknown[]>
  for (const t of DATA_TABLES) out[t] = Array.isArray(data[t]) ? data[t] : []
  out.eyeEpisodes = (out.eyeEpisodes as any[]).map((e) => ({
    ...e,
    photos: (e.photos ?? []).map((p: unknown) => (isEncodedBlob(p) ? new Blob([base64ToBytes(p.base64)], { type: p.type }) : p)),
  }))
  return out as unknown as AllData
}

export interface ImportSummary {
  counts: Record<DataTable, number>
}

export function summarize(file: ExportFile): ImportSummary {
  const counts = {} as Record<DataTable, number>
  for (const t of DATA_TABLES) counts[t] = Array.isArray(file.data[t]) ? file.data[t].length : 0
  return { counts }
}

/** Unique secondary keys that must not collide on merge. */
const UNIQUE: Partial<Record<DataTable, string>> = { checkIns: 'date', alerts: 'eventKey' }

export async function importData(file: ExportFile, mode: 'merge' | 'replace', database: GutDb = db) {
  const data = decode(file.data)
  const tables = [...DATA_TABLES.map((t) => database[t]), database.settings]
  await database.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      for (const t of DATA_TABLES) {
        await database[t].clear()
        await (database[t] as any).bulkAdd(data[t])
      }
      await database.settings.put({ key: 'app', value: file.settings })
      return
    }
    for (const t of DATA_TABLES) {
      const table = database[t] as any
      const uniq = UNIQUE[t]
      for (const rec of data[t] as any[]) {
        const same = await table.get(rec.id)
        const clash = uniq ? await table.where(uniq).equals(rec[uniq]).first() : undefined
        const existing = same ?? clash
        if (existing && existing.updatedAt >= rec.updatedAt) continue
        if (clash && clash.id !== rec.id) await table.delete(clash.id)
        await table.put(rec)
      }
    }
    const cur = await getSettings(database)
    await database.settings.put({
      key: 'app',
      value: { ...file.settings, ...cur, triggerTags: [...new Set([...cur.triggerTags, ...(file.settings?.triggerTags ?? [])])] },
    })
  })
  await syncAlerts(database)
}

// ---------- CSV ----------

function csvCell(v: unknown): string {
  if (v === undefined || v === null) return ''
  let s: string
  if (Array.isArray(v)) s = v.every((x) => typeof x !== 'object') ? v.join('; ') : `${v.length} item(s)`
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Record<string, unknown>[]): string {
  const cols: string[] = []
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k)
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n'
}

export async function buildCsvZip(database: GutDb = db): Promise<Uint8Array> {
  const all = await readAll(database)
  const files: Record<string, Uint8Array> = {}
  for (const t of DATA_TABLES) {
    const rows = (all[t] as unknown as Record<string, unknown>[]).map((r) =>
      t === 'eyeEpisodes' ? { ...r, photos: `${(r.photos as Blob[] | undefined)?.length ?? 0} photo(s)` } : r,
    )
    files[`${t}.csv`] = strToU8('﻿' + toCsv(rows))
  }
  return zipSync(files)
}

import { describe, expect, it } from 'vitest'
import { GutDb } from '../db/db'
import { deleteAllData, readAll, saveRecord, updateSettings, getSettings } from '../db/repo'
import { buildCsvZip, buildExport, importData, parseExport } from './exportImport'
import { generateSeed } from '../dev/seed'
import { unzipSync, strFromU8 } from 'fflate'

async function photoBytes(all: Awaited<ReturnType<typeof readAll>>) {
  return Promise.all(all.eyeEpisodes.flatMap((e) => e.photos.map(async (p) => [p.type, Array.from(new Uint8Array(await p.arrayBuffer()))])))
}
const stripPhotos = (all: Awaited<ReturnType<typeof readAll>>) => ({ ...all, eyeEpisodes: all.eyeEpisodes.map((e) => ({ ...e, photos: e.photos.length })) })

describe('export / import', () => {
  it('round trip: export → wipe → import yields identical data', async () => {
    const database = new GutDb(`rt-${Math.random()}`)
    await database.open()
    const seed = generateSeed(60, new Date(2026, 2, 31))
    await importData({ format: 'gut-tracker-export', version: 1, exportedAt: '', settings: await getSettings(database), data: seed as any }, 'replace', database)
    await saveRecord(
      'eyeEpisodes',
      {
        startTimestamp: '2026-03-01T10:00:00.000+00:00',
        eye: 'left',
        pain: 'gritty',
        photophobia: false,
        blurredVision: false,
        photos: [new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' })],
      },
      database,
    )
    await updateSettings({ triggerTags: ['coffee', 'custom'], weightUnit: 'lb' }, database)

    const before = await readAll(database)
    const settingsBefore = await getSettings(database)
    expect(before.bowelMovements.length).toBeGreaterThan(60)
    expect(before.alerts.length).toBeGreaterThan(0)

    const json = JSON.stringify(await buildExport(database))
    await deleteAllData(database)
    expect((await readAll(database)).bowelMovements).toHaveLength(0)

    await importData(parseExport(json), 'replace', database)
    const after = await readAll(database)
    expect(stripPhotos(after)).toEqual(stripPhotos(before))
    expect(await photoBytes(after)).toEqual(await photoBytes(before))
    expect(await getSettings(database)).toEqual(settingsBefore)
  })

  it('merge keeps the newer version of each record and does not duplicate', async () => {
    const database = new GutDb(`m-${Math.random()}`)
    await database.open()
    const rec = await saveRecord('weights', { date: '2026-03-01', kg: 70 }, database)
    const file = await buildExport(database)
    await saveRecord('weights', { ...rec, kg: 71 }, database) // newer local edit
    await saveRecord('weights', { date: '2026-03-02', kg: 72 }, database)
    await importData(file, 'merge', database)
    const w = await database.weights.orderBy('date').toArray()
    expect(w.map((x) => x.kg)).toEqual([71, 72])
  })

  it('rejects files that are not exports', () => {
    expect(() => parseExport('{"foo":1}')).toThrow()
    expect(() => parseExport('nope')).toThrow()
  })

  it('builds a CSV zip with one file per table', async () => {
    const database = new GutDb(`c-${Math.random()}`)
    await database.open()
    await saveRecord('triggers', { timestamp: '2026-03-01T08:00:00Z', tags: ['coffee', 'dairy'], notes: 'with "milk", lots' }, database)
    const files = unzipSync(await buildCsvZip(database))
    expect(Object.keys(files)).toContain('bowelMovements.csv')
    const csv = strFromU8(files['triggers.csv'])
    expect(csv).toContain('coffee; dairy')
    expect(csv).toContain('"with ""milk"", lots"')
  })
})

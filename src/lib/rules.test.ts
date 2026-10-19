import { describe, expect, it, beforeEach } from 'vitest'
import { evaluateRules, type RuleInput } from './rules'
import { bm, checkIn, eye, lab, weight } from '../test/factories'
import { GutDb } from '../db/db'
import { acknowledgeAlert, saveRecord } from '../db/repo'

const empty = (): RuleInput => ({ bowelMovements: [], checkIns: [], eyeEpisodes: [], labs: [], weights: [] })
const ids = (d: Partial<RuleInput>) => evaluateRules({ ...empty(), ...d }).map((h) => h.ruleId)

describe('red-flag rules', () => {
  it('blood', () => {
    expect(ids({ bowelMovements: [bm('2026-03-01T09:00:00Z', 4, { blood: true })] })).toEqual(['blood'])
    expect(ids({ bowelMovements: [bm('2026-03-01T09:00:00Z', 4)] })).toEqual([])
  })

  it('nocturnal: 2 woke-me-up BMs within 7 days', () => {
    const a = bm('2026-03-01T03:00:00Z', 5, { wokeMeUp: true })
    expect(ids({ bowelMovements: [a] })).toEqual([])
    expect(ids({ bowelMovements: [a, bm('2026-03-07T03:00:00Z', 5, { wokeMeUp: true })] })).toEqual(['nocturnal'])
    expect(ids({ bowelMovements: [a, bm('2026-03-09T03:00:00Z', 5, { wokeMeUp: true })] })).toEqual([])
  })

  it('weight loss ≥ 5% vs max of previous 180 days', () => {
    expect(ids({ weights: [weight('2026-01-01', 80), weight('2026-03-01', 76)] })).toEqual(['weight_loss'])
    expect(ids({ weights: [weight('2026-01-01', 80), weight('2026-03-01', 76.5)] })).toEqual([])
    // max outside the window is ignored
    expect(ids({ weights: [weight('2025-06-01', 90), weight('2026-03-01', 80)] })).toEqual([])
  })

  it('calprotectin high', () => {
    expect(ids({ labs: [lab('2026-03-01', 'Faecal calprotectin', 200)] })).toEqual(['calprotectin_high'])
    expect(ids({ labs: [lab('2026-03-01', 'Faecal calprotectin', 199)] })).toEqual([])
  })

  it('calprotectin rising: ≥100 and ≥50% above previous', () => {
    expect(ids({ labs: [lab('2026-01-01', 'Faecal calprotectin', 60), lab('2026-03-01', 'Faecal calprotectin', 120)] })).toEqual([
      'calprotectin_rising',
    ])
    expect(ids({ labs: [lab('2026-01-01', 'Faecal calprotectin', 90), lab('2026-03-01', 'Faecal calprotectin', 130)] })).toEqual([])
    expect(ids({ labs: [lab('2026-01-01', 'Faecal calprotectin', 40), lab('2026-03-01', 'Faecal calprotectin', 90)] })).toEqual([])
    // high and rising both fire
    expect(ids({ labs: [lab('2026-01-01', 'Faecal calprotectin', 100), lab('2026-03-01', 'Faecal calprotectin', 250)] }).sort()).toEqual([
      'calprotectin_high',
      'calprotectin_rising',
    ])
  })

  it('haemoglobin below ref low or dropping ≥ 1.0 g/dL', () => {
    expect(ids({ labs: [lab('2026-01-01', 'Haemoglobin', 12.5, { refLow: 13 })] })).toEqual(['hb_drop'])
    expect(ids({ labs: [lab('2026-01-01', 'Haemoglobin', 15, { refLow: 13 }), lab('2026-03-01', 'Haemoglobin', 14, { refLow: 13 })] })).toEqual(['hb_drop'])
    expect(ids({ labs: [lab('2026-01-01', 'Haemoglobin', 15, { refLow: 13 }), lab('2026-03-01', 'Haemoglobin', 14.2, { refLow: 13 })] })).toEqual([])
    // g/L is normalised
    expect(ids({ labs: [lab('2026-01-01', 'Haemoglobin', 150, { unit: 'g/L', refLow: 130 }), lab('2026-03-01', 'Haemoglobin', 138, { unit: 'g/L', refLow: 130 })] })).toEqual(['hb_drop'])
  })

  it('ferritin below ref low', () => {
    expect(ids({ labs: [lab('2026-01-01', 'Ferritin', 20, { refLow: 30 })] })).toEqual(['ferritin_low'])
    expect(ids({ labs: [lab('2026-01-01', 'Ferritin', 40, { refLow: 30 })] })).toEqual([])
    expect(ids({ labs: [lab('2026-01-01', 'Ferritin', 25)] })).toEqual(['ferritin_low']) // config fallback
  })

  it('eye urgent', () => {
    expect(ids({ eyeEpisodes: [eye({ photophobia: true })] })).toEqual(['eye_urgent'])
    expect(ids({ eyeEpisodes: [eye({ blurredVision: true })] })).toEqual(['eye_urgent'])
    expect(ids({ eyeEpisodes: [eye({ pain: 'deep_aching' })] })).toEqual(['eye_urgent'])
    expect(ids({ eyeEpisodes: [eye({ pain: 'gritty' })] })).toEqual([])
  })

  it('fever with flare', () => {
    expect(ids({ checkIns: [checkIn('2026-03-01', { flareDay: true, notes: 'Had a Fever tonight' })] })).toEqual(['fever_flare'])
    expect(ids({ checkIns: [checkIn('2026-03-01', { flareDay: false, notes: 'fever' })] })).toEqual([])
    expect(ids({ checkIns: [checkIn('2026-03-01', { flareDay: true, notes: 'tired' })] })).toEqual([])
  })
})

describe('alert syncing', () => {
  let database: GutDb
  beforeEach(async () => {
    database = new GutDb(`t-${Math.random()}`)
    await database.open()
  })

  it('fires once per event, survives acknowledgement, and clears when the event is corrected', async () => {
    const rec = await saveRecord('bowelMovements', { ...bm('2026-03-01T09:00:00Z', 4, { blood: true }), id: undefined } as any, database)
    expect(await database.alerts.count()).toBe(1)
    await saveRecord('bowelMovements', { ...rec, notes: 'edited' }, database)
    expect(await database.alerts.count()).toBe(1)

    const [a] = await database.alerts.toArray()
    await acknowledgeAlert(a.id, database)
    await saveRecord('bowelMovements', { ...rec, notes: 'again' }, database)
    expect(await database.alerts.count()).toBe(1)

    const other = await saveRecord('bowelMovements', { ...bm('2026-03-02T09:00:00Z', 4, { blood: true }), id: undefined } as any, database)
    expect(await database.alerts.count()).toBe(2)
    await saveRecord('bowelMovements', { ...other, blood: false }, database)
    expect(await database.alerts.count()).toBe(1)
  })
})

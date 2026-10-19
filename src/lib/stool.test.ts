import { describe, expect, it } from 'vitest'
import { stoolStats, subtypeIndicator } from './stool'
import { bm } from '../test/factories'

const day = (d: number) => `2026-03-${String(d).padStart(2, '0')}T09:00:00.000+00:00`

describe('subtype indicator', () => {
  it('is unclassified with no data', () => {
    expect(subtypeIndicator([]).subtype).toBe('unclassified')
  })
  it('IBS-C when ≥25% hard days and <25% loose days', () => {
    const bms = [bm(day(1), 1), bm(day(2), 4), bm(day(3), 4), bm(day(4), 2)]
    expect(subtypeIndicator(bms)).toMatchObject({ subtype: 'IBS-C', pctHardDays: 50, pctLooseDays: 0 })
  })
  it('IBS-D when ≥25% loose days and <25% hard days', () => {
    const bms = [bm(day(1), 6), bm(day(2), 4), bm(day(3), 4), bm(day(4), 4)]
    expect(subtypeIndicator(bms).subtype).toBe('IBS-D')
  })
  it('IBS-M when both ≥25%', () => {
    const bms = [bm(day(1), 1), bm(day(2), 7), bm(day(3), 4), bm(day(4), 4)]
    expect(subtypeIndicator(bms).subtype).toBe('IBS-M')
  })
  it('unclassified when both <25%', () => {
    const bms = [bm(day(1), 1), ...[2, 3, 4, 5, 6].map((d) => bm(day(d), 4))]
    expect(subtypeIndicator(bms).subtype).toBe('unclassified')
  })
  it('counts days, not individual movements', () => {
    // three loose BMs on one day out of five BM days = 20% → not IBS-D
    const bms = [bm(day(1), 7), bm('2026-03-01T12:00:00.000+00:00', 7), bm('2026-03-01T15:00:00.000+00:00', 6), ...[2, 3, 4, 5].map((d) => bm(day(d), 4))]
    expect(subtypeIndicator(bms)).toMatchObject({ subtype: 'unclassified', pctLooseDays: 20, daysWithBM: 5 })
  })
  it('exactly 25% counts', () => {
    const bms = [bm(day(1), 6), ...[2, 3, 4].map((d) => bm(day(d), 4))]
    expect(subtypeIndicator(bms).subtype).toBe('IBS-D')
  })
})

describe('stool stats', () => {
  it('computes percentages and means', () => {
    const bms = [bm(day(1), 1), bm(day(1), 4, { urgency: true }), bm(day(2), 6), bm(day(3), 7, { urgency: true })]
    const s = stoolStats(bms, 4)
    expect(s.pctHard).toBe(25)
    expect(s.pctNormal).toBe(25)
    expect(s.pctLoose).toBe(50)
    expect(s.pctUrgency).toBe(50)
    expect(s.meanPerDay).toBe(1)
  })
})

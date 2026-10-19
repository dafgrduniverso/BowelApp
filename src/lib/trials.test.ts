import { describe, expect, it } from 'vitest'
import { compareTrial } from './trials'
import type { Intervention } from '../db/types'
import { bm, checkIn, sss } from '../test/factories'

const trial: Intervention = {
  id: 't1',
  createdAt: '',
  updatedAt: '',
  name: 'Peppermint oil',
  category: 'supplement',
  mode: 'trial',
  startDate: '2026-03-15',
  actualEndDate: '2026-04-11', // 28 days
}

describe('trial comparison', () => {
  it('compares baseline (14 days before start) with the last 14 days of the trial', () => {
    const data = {
      ibsSss: [sss('2026-03-01', 999), sss('2026-03-03', 280), sss('2026-03-10', 260), sss('2026-03-20', 400), sss('2026-04-01', 200), sss('2026-04-08', 180)],
      checkIns: [checkIn('2026-03-05', { painMax: 6 }), checkIn('2026-03-12', { painMax: 4 }), checkIn('2026-04-05', { painMax: 2 })],
      bowelMovements: [bm('2026-03-05T09:00:00Z', 6), bm('2026-03-06T09:00:00Z', 4), bm('2026-04-05T09:00:00Z', 4)],
    }
    const c = compareTrial(trial, data, '2026-05-01')!
    expect(c.baseline).toMatchObject({ start: '2026-03-01', end: '2026-03-14', ibsSssCount: 3 })
    expect(c.trial).toMatchObject({ start: '2026-03-29', end: '2026-04-11', ibsSssCount: 2, ibsSssMean: 190 })
    expect(c.baseline.ibsSssMean).toBeCloseTo((999 + 280 + 260) / 3)
    expect(c.baseline.painMean).toBe(5)
    expect(c.trial.painMean).toBe(2)
    expect(c.baseline.pctLoose).toBe(50)
    expect(c.trial.pctLoose).toBe(0)
    expect(c.insufficientData).toBe(false)
    expect(c.clinicallyMeaningful).toBe(true)
  })

  it('flags clinically meaningful only for a drop ≥ 50', () => {
    const data = { ibsSss: [sss('2026-03-05', 250), sss('2026-03-10', 250), sss('2026-04-01', 201), sss('2026-04-08', 201)], checkIns: [], bowelMovements: [] }
    const c = compareTrial(trial, data)!
    expect(c.ibsSssChange).toBe(-49)
    expect(c.clinicallyMeaningful).toBe(false)
    const d = compareTrial(trial, { ...data, ibsSss: [...data.ibsSss.slice(0, 2), sss('2026-04-01', 200), sss('2026-04-08', 200)] })!
    expect(d.clinicallyMeaningful).toBe(true)
  })

  it('reports insufficient data when either window has fewer than 2 IBS-SSS entries', () => {
    const data = { ibsSss: [sss('2026-03-05', 250), sss('2026-04-01', 100), sss('2026-04-08', 100)], checkIns: [], bowelMovements: [] }
    const c = compareTrial(trial, data)!
    expect(c.insufficientData).toBe(true)
    expect(c.clinicallyMeaningful).toBe(false)
  })

  it('uses today for an ongoing trial and never starts the window before the start date', () => {
    const ongoing = { ...trial, actualEndDate: undefined }
    const c = compareTrial(ongoing, { ibsSss: [], checkIns: [], bowelMovements: [] }, '2026-03-20')!
    expect(c.trial).toMatchObject({ start: '2026-03-15', end: '2026-03-20' })
  })

  it('ignores on-demand interventions', () => {
    expect(compareTrial({ ...trial, mode: 'on_demand' }, { ibsSss: [], checkIns: [], bowelMovements: [] })).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { ibsSssBand, scoreIbsSss, suggestIbsSss } from './ibsSss'

const items = {
  hasPain: true,
  painSeverity: 60,
  painDaysOutOf10: 4,
  hasDistension: true,
  distensionSeverity: 50,
  bowelDissatisfaction: 70,
  lifeInterference: 30,
}

describe('IBS-SSS scoring', () => {
  it('sums the five items with pain days ×10', () => {
    expect(scoreIbsSss(items)).toBe(60 + 40 + 50 + 70 + 30)
  })
  it('zeroes both pain items when there is no pain', () => {
    expect(scoreIbsSss({ ...items, hasPain: false })).toBe(50 + 70 + 30)
  })
  it('zeroes distension when there is no distension', () => {
    expect(scoreIbsSss({ ...items, hasDistension: false })).toBe(60 + 40 + 70 + 30)
  })
  it('maxes at 500', () => {
    expect(
      scoreIbsSss({ hasPain: true, painSeverity: 100, painDaysOutOf10: 10, hasDistension: true, distensionSeverity: 100, bowelDissatisfaction: 100, lifeInterference: 100 }),
    ).toBe(500)
  })
  it('clamps out-of-range inputs', () => {
    expect(scoreIbsSss({ ...items, painSeverity: 150, painDaysOutOf10: 12 })).toBe(100 + 100 + 50 + 70 + 30)
  })
})

describe('IBS-SSS bands', () => {
  it.each([
    [0, 'remission'],
    [74, 'remission'],
    [75, 'mild'],
    [174, 'mild'],
    [175, 'moderate'],
    [299, 'moderate'],
    [300, 'severe'],
    [500, 'severe'],
  ])('%i → %s', (total, key) => {
    expect(ibsSssBand(total).key).toBe(key)
  })
})

describe('IBS-SSS pre-fill from daily check-ins', () => {
  const c = (date: string, painMax: number, bloating: number) => ({ date, painMax, bloating })
  it('uses the 10 days ending on the form date', () => {
    const checkIns = [
      c('2026-10-09', 9, 9), // 11 days before → outside the window
      c('2026-10-10', 4, 0),
      c('2026-10-12', 6, 3),
      c('2026-10-15', 0, 5),
      c('2026-10-19', 2, 0),
      c('2026-10-20', 9, 9), // after the form date → ignored
    ]
    expect(suggestIbsSss(checkIns, '2026-10-19')).toEqual({
      checkIns: 4,
      items: { hasPain: true, painDaysOutOf10: 3, painSeverity: 40, hasDistension: true, distensionSeverity: 40 },
    })
  })
  it('reports no pain / no distension when none was logged', () => {
    expect(suggestIbsSss([c('2026-10-19', 0, 0)], '2026-10-19')!.items).toEqual({
      hasPain: false,
      painDaysOutOf10: 0,
      painSeverity: 0,
      hasDistension: false,
      distensionSeverity: 0,
    })
  })
  it('returns nothing without check-ins in the window', () => {
    expect(suggestIbsSss([c('2026-09-01', 5, 5)], '2026-10-19')).toBeUndefined()
  })
})

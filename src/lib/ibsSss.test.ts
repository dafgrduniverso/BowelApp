import { describe, expect, it } from 'vitest'
import { ibsSssBand, scoreIbsSss } from './ibsSss'

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

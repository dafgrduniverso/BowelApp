import { describe, expect, it } from 'vitest'
import { ibsSssDue, lastScheduledIbsSss } from './reminders'

describe('IBS-SSS reminder', () => {
  // 2026-10-19 is a Monday
  it('finds the most recent scheduled weekday', () => {
    expect(lastScheduledIbsSss(7, '2026-10-19')).toBe('2026-10-18')
    expect(lastScheduledIbsSss(1, '2026-10-19')).toBe('2026-10-19')
    expect(lastScheduledIbsSss(3, '2026-10-19')).toBe('2026-10-14')
  })
  it('is due with no entries, or none since the scheduled day', () => {
    expect(ibsSssDue([], 7, '2026-10-19')).toBe(true)
    expect(ibsSssDue([{ date: '2026-10-11' }], 7, '2026-10-19')).toBe(true)
    expect(ibsSssDue([{ date: '2026-10-18' }], 7, '2026-10-19')).toBe(false)
    expect(ibsSssDue([{ date: '2026-10-17' }], 7, '2026-10-19')).toBe(false) // a day early counts
  })
})

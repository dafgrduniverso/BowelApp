import { describe, expect, it } from 'vitest'
import { triggerAssociations } from './triggers'
import type { TriggerEvent } from '../db/types'
import { bm, checkIn } from '../test/factories'

const trig = (timestamp: string, tags: string[]): TriggerEvent => ({ id: timestamp, createdAt: '', updatedAt: '', timestamp, tags })
const d = (n: number) => `2026-03-${String(n).padStart(2, '0')}`

describe('trigger association', () => {
  // coffee on days 1,3,5,7,9 at 08:00 → exposed days 1,2,3,…,10
  const coffee = [1, 3, 5, 7, 9].map((n) => trig(`${d(n)}T08:00:00`, ['coffee']))
  const checkIns = Array.from({ length: 20 }, (_, i) => checkIn(d(i + 1), { painMax: i < 10 ? 6 : 2, bloating: i < 10 ? 4 : 1 }))

  it('compares the 24 h after a tag with days without it', () => {
    const bms = [bm(`${d(1)}T12:00:00`, 7), bm(`${d(3)}T12:00:00`, 4), bm(`${d(15)}T12:00:00`, 4), bm(`${d(16)}T12:00:00`, 4)]
    const [a] = triggerAssociations(coffee, checkIns, bms)
    expect(a.tag).toBe('coffee')
    expect(a.occurrences).toBe(5)
    expect(a.daysAfter).toBe(10)
    expect(a.daysWithout).toBe(10)
    expect(a.painAfter).toBe(6)
    expect(a.painWithout).toBe(2)
    expect(a.bloatingAfter).toBe(4)
    expect(a.bloatingWithout).toBe(1)
    expect(a.pctLooseAfter).toBe(50)
    expect(a.pctLooseWithout).toBe(0)
  })

  it('only includes tags with ≥ 5 occurrences', () => {
    const few = [1, 2, 3, 4].map((n) => trig(`${d(n)}T08:00:00`, ['dairy']))
    expect(triggerAssociations([...coffee, ...few], checkIns, []).map((a) => a.tag)).toEqual(['coffee'])
  })

  it('counts an event with a duplicated tag once', () => {
    const dup = [1, 2, 3, 4].map((n) => trig(`${d(n)}T08:00:00`, ['spicy', 'spicy']))
    expect(triggerAssociations(dup, checkIns, [])).toEqual([])
  })
})

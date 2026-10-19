import type { BowelMovement, DailyCheckIn, TriggerEvent } from '../db/types'
import { TRIGGER_CONFIG as C } from './config'
import { isLoose } from './stool'
import { dateKey, dateKeyOf } from './time'

export interface TagAssociation {
  tag: string
  occurrences: number
  painAfter?: number
  painWithout?: number
  bloatingAfter?: number
  bloatingWithout?: number
  pctLooseAfter?: number
  pctLooseWithout?: number
  daysAfter: number
  daysWithout: number
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined)
const pctLoose = (bms: BowelMovement[]) =>
  bms.length ? (bms.filter((b) => isLoose(b.bristol)).length / bms.length) * 100 : undefined

/**
 * For each tag with enough occurrences: check-in days touched by the 24 h after a tagged event
 * ("after" days) vs all other check-in days; and BMs within 24 h after a tagged event vs all other BMs.
 */
export function triggerAssociations(
  triggers: TriggerEvent[],
  checkIns: DailyCheckIn[],
  bms: BowelMovement[],
  minOccurrences: number = C.minOccurrences,
): TagAssociation[] {
  const windowMs = C.windowHours * 3600000
  const tags = new Map<string, TriggerEvent[]>()
  for (const t of triggers) for (const tag of new Set(t.tags)) tags.set(tag, [...(tags.get(tag) ?? []), t])

  const out: TagAssociation[] = []
  for (const [tag, events] of tags) {
    if (events.length < minOccurrences) continue
    const windows = events.map((e) => {
      const s = new Date(e.timestamp).getTime()
      return [s, s + windowMs] as const
    })
    const exposedDays = new Set<string>()
    for (const e of events) {
      exposedDays.add(dateKeyOf(e.timestamp))
      exposedDays.add(dateKey(new Date(new Date(e.timestamp).getTime() + windowMs)))
    }
    const after = checkIns.filter((c) => exposedDays.has(c.date))
    const without = checkIns.filter((c) => !exposedDays.has(c.date))
    const inWindow = (b: BowelMovement) => {
      const t = new Date(b.timestamp).getTime()
      return windows.some(([s, e]) => t >= s && t <= e)
    }
    const bmAfter = bms.filter(inWindow)
    const bmWithout = bms.filter((b) => !inWindow(b))
    out.push({
      tag,
      occurrences: events.length,
      painAfter: mean(after.map((c) => c.painMax)),
      painWithout: mean(without.map((c) => c.painMax)),
      bloatingAfter: mean(after.map((c) => c.bloating)),
      bloatingWithout: mean(without.map((c) => c.bloating)),
      pctLooseAfter: pctLoose(bmAfter),
      pctLooseWithout: pctLoose(bmWithout),
      daysAfter: after.length,
      daysWithout: without.length,
    })
  }
  return out.sort((a, b) => b.occurrences - a.occurrences)
}

export const TRIGGER_CAVEAT = 'Correlation from self-logged data; confounded by timing and other factors.'

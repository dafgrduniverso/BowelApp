import { describe, expect, it } from 'vitest'
import { aiSummaryMarkdown } from './summary'
import { generateSeed } from '../dev/seed'
import { addDays, dateKey } from './time'

describe('AI summary', () => {
  const end = new Date(2026, 2, 31)
  const data = generateSeed(30, end)
  data.checkIns[0].notes = 'SECRET NOTE'
  const endKey = dateKey(end)
  const startKey = addDays(endKey, -29)
  it('omits free-text notes by default', () => {
    const md = aiSummaryMarkdown(data, startKey, endKey, false)
    expect(md).toContain('## Daily aggregates')
    expect(md).toContain('Peppermint oil')
    expect(md).not.toContain('SECRET NOTE')
  })
  it('includes notes when toggled on', () => {
    expect(aiSummaryMarkdown(data, startKey, endKey, true)).toContain('SECRET NOTE')
  })
})

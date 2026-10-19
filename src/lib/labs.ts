import type { LabResult } from '../db/types'

export interface LabPreset {
  test: string
  unit?: string
  qualitative?: boolean
}

export const LAB_PRESETS: LabPreset[] = [
  { test: 'Faecal calprotectin', unit: 'µg/g' },
  { test: 'CRP', unit: 'mg/L' },
  { test: 'Haemoglobin', unit: 'g/dL' },
  { test: 'MCV', unit: 'fL' },
  { test: 'Ferritin', unit: 'ng/mL' },
  { test: 'Platelets', unit: '×10⁹/L' },
  { test: 'WBC', unit: '×10⁹/L' },
  { test: 'B12', unit: 'pg/mL' },
  { test: 'Folate', unit: 'ng/mL' },
  { test: 'Vitamin D', unit: 'ng/mL' },
  { test: 'tTG-IgA', unit: 'U/mL' },
  { test: 'Total IgA', unit: 'g/L' },
  { test: 'Faecal elastase', unit: 'µg/g' },
  { test: 'FIT', unit: 'µg/g' },
  { test: 'HLA-B27', qualitative: true },
  { test: 'TSH', unit: 'mU/L' },
  { test: 'Albumin', unit: 'g/dL' },
  { test: 'ESR', unit: 'mm/h' },
]

export const LAB_TESTS = {
  calprotectin: 'Faecal calprotectin',
  haemoglobin: 'Haemoglobin',
  ferritin: 'Ferritin',
} as const

export const sameTest = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export const numericValue = (v: number | string): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  const n = Number(String(v).replace(',', '.').replace(/^[<>≤≥]\s*/, ''))
  return Number.isFinite(n) && String(v).trim() !== '' ? n : undefined
}

export function labFlag(l: LabResult): 'high' | 'low' | undefined {
  const v = numericValue(l.value)
  if (v === undefined) return undefined
  if (l.refHigh !== undefined && v > l.refHigh) return 'high'
  if (l.refLow !== undefined && v < l.refLow) return 'low'
  return undefined
}

export function refRangeText(l: Pick<LabResult, 'refLow' | 'refHigh'>): string {
  if (l.refLow !== undefined && l.refHigh !== undefined) return `${l.refLow}–${l.refHigh}`
  if (l.refHigh !== undefined) return `≤ ${l.refHigh}`
  if (l.refLow !== undefined) return `≥ ${l.refLow}`
  return ''
}

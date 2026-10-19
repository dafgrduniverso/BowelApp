import type { BowelMovement, DailyCheckIn, EyeEpisode, IbsSss, LabResult, Weight } from '../db/types'
import { uuid } from '../db/repo'

const base = () => ({ id: uuid(), createdAt: '2026-01-01T00:00:00.000+00:00', updatedAt: '2026-01-01T00:00:00.000+00:00' })

export const bm = (timestamp: string, bristol: BowelMovement['bristol'], extra: Partial<BowelMovement> = {}): BowelMovement => ({
  ...base(),
  timestamp,
  bristol,
  urgency: false,
  blood: false,
  wokeMeUp: false,
  incomplete: false,
  ...extra,
})

export const checkIn = (date: string, extra: Partial<DailyCheckIn> = {}): DailyCheckIn => ({
  ...base(),
  date,
  painMax: 0,
  painLocations: [],
  painRelievedByBM: 'na',
  bloating: 0,
  stress: 0,
  sleepQuality: 5,
  alcoholUnits: 0,
  flareDay: false,
  ...extra,
})

export const lab = (date: string, test: string, value: number | string, extra: Partial<LabResult> = {}): LabResult => ({
  ...base(),
  date,
  test,
  value,
  ...extra,
})

export const weight = (date: string, kg: number): Weight => ({ ...base(), date, kg })

export const eye = (extra: Partial<EyeEpisode> = {}): EyeEpisode => ({
  ...base(),
  startTimestamp: '2026-03-01T10:00:00.000+00:00',
  eye: 'left',
  pain: 'none',
  photophobia: false,
  blurredVision: false,
  photos: [],
  ...extra,
})

export const sss = (date: string, total: number): IbsSss => ({
  ...base(),
  date,
  total,
  hasPain: true,
  painSeverity: 0,
  painDaysOutOf10: 0,
  hasDistension: false,
  distensionSeverity: 0,
  bowelDissatisfaction: 0,
  lifeInterference: 0,
})

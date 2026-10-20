export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export type Bristol = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface BowelMovement extends BaseRecord {
  timestamp: string
  bristol: Bristol
  urgency: boolean
  blood: boolean
  wokeMeUp: boolean
  incomplete: boolean
  notes?: string
}

export const PAIN_LOCATIONS = [
  'RUQ',
  'epigastric',
  'LUQ',
  'R flank',
  'periumbilical',
  'L flank',
  'RLQ',
  'suprapubic',
  'LLQ',
] as const
export type PainLocation = (typeof PAIN_LOCATIONS)[number]

export interface DailyCheckIn extends BaseRecord {
  date: string
  painMax: number
  painLocations: PainLocation[]
  painRelievedByBM: 'yes' | 'no' | 'partly' | 'na'
  bloating: number
  stress: number
  sleepHours?: number
  sleepQuality: number
  alcoholUnits: number
  exerciseMinutes?: number
  flareDay: boolean
  notes?: string
}

export interface TriggerEvent extends BaseRecord {
  timestamp: string
  tags: string[]
  /** Set when logged through the Meal recorder: what was eaten, in the user's words. */
  meal?: string
  notes?: string
}

export interface EyeEpisode extends BaseRecord {
  startTimestamp: string
  endTimestamp?: string
  eye: 'left' | 'right' | 'both'
  pain: 'none' | 'gritty' | 'deep_aching'
  photophobia: boolean
  blurredVision: boolean
  photos: Blob[]
  notes?: string
}

export type InterventionCategory = 'drug' | 'supplement' | 'diet' | 'psych' | 'other'
export type TrialOutcome = 'helped' | 'no_effect' | 'worse' | 'stopped_early' | 'inconclusive'

export interface Intervention extends BaseRecord {
  name: string
  category: InterventionCategory
  mode: 'trial' | 'on_demand'
  dose?: string
  startDate?: string
  plannedEndDate?: string
  actualEndDate?: string
  outcome?: TrialOutcome
  outcomeNotes?: string
  /** Set when the trial was started despite another active trial (single-variable rule override). */
  concurrentTrialOverride?: { at: string; otherTrialIds: string[] }
}

export interface InterventionDose extends BaseRecord {
  interventionId: string
  timestamp: string
  reason?: 'flare' | 'preventive' | 'other'
  notes?: string
}

export interface IbsSss extends BaseRecord {
  date: string
  hasPain: boolean
  painSeverity: number
  painDaysOutOf10: number
  hasDistension: boolean
  distensionSeverity: number
  bowelDissatisfaction: number
  lifeInterference: number
  total: number
}

export interface LabResult extends BaseRecord {
  date: string
  test: string
  value: number | string
  unit?: string
  refLow?: number
  refHigh?: number
  lab?: string
  notes?: string
}

export interface Weight extends BaseRecord {
  date: string
  kg: number
}

export interface Alert extends BaseRecord {
  ruleId: string
  /** Identifies the triggering event so each event fires at most once. */
  eventKey: string
  triggeredAt: string
  message: string
  acknowledgedAt?: string
}

export interface Settings {
  checkInReminder: string // HH:mm
  checkInReminderEnabled: boolean
  ibsSssWeekday: number // 1 = Monday … 7 = Sunday
  ibsSssReminderEnabled: boolean
  triggerTags: string[]
  weightUnit: 'kg' | 'lb'
  lastExportAt?: string
  backupSnoozedAt?: string
  aiSummaryIncludeNotes: boolean
}

export interface SettingsRow {
  key: 'app'
  value: Settings
}

/** All data tables, keyed by their Dexie table name. */
export interface AllData {
  bowelMovements: BowelMovement[]
  checkIns: DailyCheckIn[]
  triggers: TriggerEvent[]
  eyeEpisodes: EyeEpisode[]
  interventions: Intervention[]
  doses: InterventionDose[]
  ibsSss: IbsSss[]
  labs: LabResult[]
  weights: Weight[]
  alerts: Alert[]
}

export const DATA_TABLES = [
  'bowelMovements',
  'checkIns',
  'triggers',
  'eyeEpisodes',
  'interventions',
  'doses',
  'ibsSss',
  'labs',
  'weights',
  'alerts',
] as const satisfies readonly (keyof AllData)[]
export type DataTable = (typeof DATA_TABLES)[number]

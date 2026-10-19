/**
 * Red-flag thresholds. Change values here; every rule reads from this module.
 */
export const RED_FLAG_CONFIG = {
  nocturnal: { minCount: 2, windowDays: 7 },
  weightLoss: { minPercentDrop: 5, lookbackDays: 180 },
  calprotectin: { high: 200, risingMin: 100, risingPercent: 50 },
  haemoglobin: { minDropGdl: 1.0, refLowFallbackGdl: 12.0 },
  ferritin: { refLowFallback: 30 },
  feverKeyword: 'fever',
} as const

export const RED_FLAG_MESSAGES: Record<string, string> = {
  blood: 'Blood in stool logged. Contact your doctor promptly; if heavy or with dizziness, go to urgência.',
  nocturnal: 'Repeated night-time bowel movements. This warrants a medical review soon.',
  weight_loss: 'Unintentional weight loss ≥ 5%. Book a medical review.',
  calprotectin_high: 'Calprotectin elevated. Book a gastroenterology review and bring this result.',
  calprotectin_rising: 'Calprotectin rising. Repeat the test and book a review.',
  hb_drop: 'Haemoglobin low or dropping. Book a medical review.',
  ferritin_low: 'Ferritin low. Mention this at your next review.',
  eye_urgent: 'Eye pain with light sensitivity or blurred vision: same-day ophthalmology urgência.',
  fever_flare: 'Fever with a flare. Seek medical review.',
}

export const IBS_SSS_BANDS = [
  { max: 74, label: 'Remission', key: 'remission' },
  { max: 174, label: 'Mild', key: 'mild' },
  { max: 299, label: 'Moderate', key: 'moderate' },
  { max: 500, label: 'Severe', key: 'severe' },
] as const

export const TRIAL_CONFIG = {
  windowDays: 14,
  minIbsSssEntries: 2,
  clinicallyMeaningfulDrop: 50,
} as const

export const TRIGGER_CONFIG = { minOccurrences: 5, windowHours: 24 } as const

export const BACKUP_REMINDER_DAYS = 14

export const DEFAULT_TRIGGER_TAGS = [
  'coffee',
  'alcohol',
  'high-fat meal',
  'gluten',
  'dairy',
  'high-FODMAP',
  'spicy',
  'large meal',
  'eating out',
  'poor sleep',
  'high stress',
]

import Dexie, { type EntityTable } from 'dexie'
import type {
  Alert,
  BowelMovement,
  DailyCheckIn,
  EyeEpisode,
  IbsSss,
  Intervention,
  InterventionDose,
  LabResult,
  SettingsRow,
  TriggerEvent,
  Weight,
} from './types'

export class GutDb extends Dexie {
  bowelMovements!: EntityTable<BowelMovement, 'id'>
  checkIns!: EntityTable<DailyCheckIn, 'id'>
  triggers!: EntityTable<TriggerEvent, 'id'>
  eyeEpisodes!: EntityTable<EyeEpisode, 'id'>
  interventions!: EntityTable<Intervention, 'id'>
  doses!: EntityTable<InterventionDose, 'id'>
  ibsSss!: EntityTable<IbsSss, 'id'>
  labs!: EntityTable<LabResult, 'id'>
  weights!: EntityTable<Weight, 'id'>
  alerts!: EntityTable<Alert, 'id'>
  settings!: EntityTable<SettingsRow, 'key'>

  constructor(name = 'gut-tracker') {
    super(name)
    this.version(1).stores({
      bowelMovements: 'id, timestamp',
      checkIns: 'id, &date',
      triggers: 'id, timestamp',
      eyeEpisodes: 'id, startTimestamp',
      interventions: 'id, mode, startDate',
      doses: 'id, interventionId, timestamp',
      ibsSss: 'id, date',
      labs: 'id, test, date',
      weights: 'id, date',
      alerts: 'id, &eventKey, ruleId, triggeredAt',
      settings: 'key',
    })
  }
}

export const db = new GutDb()

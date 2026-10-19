import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_SETTINGS, getSettings, readAll } from '../db/repo'
import type { AllData } from '../db/types'

export function useSettings() {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS)
}

export function useAllData(): AllData | undefined {
  return useLiveQuery(() => readAll(), [])
}

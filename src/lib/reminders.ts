import type { IbsSss, Settings } from '../db/types'
import { addDays, isoWeekday, todayKey } from './time'

/** Most recent date (≤ today) falling on the configured IBS-SSS weekday. */
export function lastScheduledIbsSss(weekday: number, today = todayKey()): string {
  return addDays(today, -((isoWeekday(today) - weekday + 7) % 7))
}

/** Due if nothing was entered since (the day before) the most recent scheduled day. */
export function ibsSssDue(entries: Pick<IbsSss, 'date'>[], weekday: number, today = todayKey()): boolean {
  if (!entries.length) return true
  const since = addDays(lastScheduledIbsSss(weekday, today), -1)
  return !entries.some((e) => e.date >= since)
}

export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function checkInDue(hasTodayCheckIn: boolean, s: Settings, now = new Date()): boolean {
  if (!s.checkInReminderEnabled || hasTodayCheckIn) return false
  return now.getHours() * 60 + now.getMinutes() >= minutesOfDay(s.checkInReminder)
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)

export const isIos = () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

export async function showNotification(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  await reg.showNotification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icon-192.png` })
  return true
}

/**
 * Schedules a notification for later today while the app is running (in the foreground or
 * recently backgrounded). Static PWAs have no server to push from, so reminders that fall
 * while the app is fully closed are shown as an in-app banner on next open instead.
 */
export function scheduleToday(hhmm: string, fire: () => void): () => void {
  const now = new Date()
  const target = new Date(now)
  target.setHours(Math.floor(minutesOfDay(hhmm) / 60), minutesOfDay(hhmm) % 60, 0, 0)
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return () => {}
  const t = setTimeout(fire, ms)
  return () => clearTimeout(t)
}

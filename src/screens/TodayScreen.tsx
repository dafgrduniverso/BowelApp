import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { BristolIcon } from '../components/Bristol'
import { Button, Card, Empty, useSheet } from '../components/ui'
import { db } from '../db/db'
import { BowelForm } from '../forms/BowelForm'
import { CheckInForm } from '../forms/CheckInForm'
import { DoseForm } from '../forms/DoseForm'
import { EyeForm } from '../forms/EyeForm'
import { IbsSssForm } from '../forms/IbsSssForm'
import { LabForm } from '../forms/LabForm'
import { TriggerForm } from '../forms/TriggerForm'
import { LB_PER_KG, WeightForm } from '../forms/WeightForm'
import { useSettings } from '../lib/hooks'
import { ibsSssBand } from '../lib/ibsSss'
import { BRISTOL_INFO } from '../lib/stool'
import { addDays, formatDate, formatTime, todayKey } from '../lib/time'

interface Entry {
  key: string
  sort: string
  time?: string
  title: ReactNode
  detail?: ReactNode
  icon?: ReactNode
  edit: () => void
}

const dot = (cls: string) => <span className={`block h-3 w-3 rounded-full ${cls}`} />

export function TodayScreen() {
  const [day, setDay] = useState(todayKey())
  const { open } = useSheet()
  const { weightUnit } = useSettings()
  const isToday = day === todayKey()

  const entries = useLiveQuery(async () => {
    const lo = day
    const hi = addDays(day, 1)
    const inDay = (ts: string) => ts.slice(0, 10) === day
    const [bms, triggers, doses, eyes, checkIn, weights, sss, labs, interventions] = await Promise.all([
      db.bowelMovements.where('timestamp').between(lo, hi, true, false).toArray(),
      db.triggers.where('timestamp').between(lo, hi, true, false).toArray(),
      db.doses.where('timestamp').between(lo, hi, true, false).toArray(),
      db.eyeEpisodes.where('startTimestamp').between(lo, hi, true, false).toArray(),
      db.checkIns.where('date').equals(day).first(),
      db.weights.where('date').equals(day).toArray(),
      db.ibsSss.where('date').equals(day).toArray(),
      db.labs.where('date').equals(day).toArray(),
      db.interventions.toArray(),
    ])
    const out: Entry[] = []
    for (const b of bms.filter((x) => inDay(x.timestamp)))
      out.push({
        key: b.id,
        sort: b.timestamp,
        time: formatTime(b.timestamp),
        icon: <BristolIcon type={b.bristol} className="h-5 w-10 text-amber-800 dark:text-amber-500" />,
        title: `Bristol ${b.bristol} · ${BRISTOL_INFO[b.bristol].short}`,
        detail: [b.urgency && 'urgency', b.blood && 'blood', b.wokeMeUp && 'woke me up', b.incomplete && 'incomplete', b.notes].filter(Boolean).join(' · '),
        edit: () => open(<BowelForm initial={b} />),
      })
    for (const t of triggers.filter((x) => inDay(x.timestamp)))
      out.push({ key: t.id, sort: t.timestamp, time: formatTime(t.timestamp), icon: dot('bg-orange-500'), title: t.tags.join(', '), detail: t.notes, edit: () => open(<TriggerForm initial={t} />) })
    for (const d of doses.filter((x) => inDay(x.timestamp))) {
      const i = interventions.find((x) => x.id === d.interventionId)
      out.push({ key: d.id, sort: d.timestamp, time: formatTime(d.timestamp), icon: dot('bg-violet-500'), title: `Took ${i?.name ?? '(deleted)'}`, detail: [d.reason, d.notes].filter(Boolean).join(' · '), edit: () => open(<DoseForm initial={d} />) })
    }
    for (const e of eyes.filter((x) => inDay(x.startTimestamp)))
      out.push({
        key: e.id,
        sort: e.startTimestamp,
        time: formatTime(e.startTimestamp),
        icon: dot('bg-sky-500'),
        title: `Eye episode (${e.eye})`,
        detail: [e.pain !== 'none' && e.pain.replace('_', ' '), e.photophobia && 'photophobia', e.blurredVision && 'blurred', e.photos.length && `${e.photos.length} photo(s)`].filter(Boolean).join(' · '),
        edit: () => open(<EyeForm initial={e} />),
      })
    if (checkIn)
      out.push({
        key: checkIn.id,
        sort: `${day}T99`,
        icon: dot('bg-teal-600'),
        title: `Check-in${checkIn.flareDay ? ' · flare day' : ''}`,
        detail: `Pain ${checkIn.painMax} · bloating ${checkIn.bloating} · stress ${checkIn.stress} · sleep ${checkIn.sleepQuality}/10`,
        edit: () => open(<CheckInForm date={day} />),
      })
    for (const w of weights)
      out.push({
        key: w.id,
        sort: `${day}T98`,
        icon: dot('bg-slate-500'),
        title: `Weight ${weightUnit === 'lb' ? (w.kg * LB_PER_KG).toFixed(1) : w.kg} ${weightUnit}`,
        edit: () => open(<WeightForm initial={w} />),
      })
    for (const s of sss) out.push({ key: s.id, sort: `${day}T97`, icon: dot('bg-pink-500'), title: `IBS-SSS ${s.total} · ${ibsSssBand(s.total).label}`, edit: () => open(<IbsSssForm initial={s} />) })
    for (const l of labs) out.push({ key: l.id, sort: `${day}T96`, icon: dot('bg-emerald-500'), title: `${l.test}: ${l.value} ${l.unit ?? ''}`, edit: () => open(<LabForm initial={l} />) })
    return out.sort((a, b) => a.sort.localeCompare(b.sort))
  }, [day, weightUnit])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="secondary" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))}>
          ‹
        </Button>
        <div className="text-center">
          <p className="font-semibold">{isToday ? 'Today' : formatDate(day, { weekday: 'long' })}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(day)}</p>
        </div>
        <Button variant="secondary" aria-label="Next day" disabled={isToday} onClick={() => setDay(addDays(day, 1))}>
          ›
        </Button>
      </div>
      <Card>
        {entries && !entries.length && <Empty>Nothing logged{isToday ? ' yet today' : ' on this day'}.</Empty>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {entries?.map((e) => (
            <li key={e.key}>
              <button type="button" onClick={e.edit} className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
                <span className="w-16 shrink-0 whitespace-nowrap text-sm tabular-nums text-slate-500 dark:text-slate-400">{e.time}</span>
                <span className="flex w-10 shrink-0 justify-center">{e.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{e.title}</span>
                  {e.detail && <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{e.detail}</span>}
                </span>
                <span className="text-slate-400" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {!isToday && (
        <Button variant="ghost" className="w-full" onClick={() => open(<CheckInForm date={day} />)}>
          Check-in for this day
        </Button>
      )}
    </div>
  )
}

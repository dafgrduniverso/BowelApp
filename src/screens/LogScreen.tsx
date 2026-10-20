import { useLiveQuery } from 'dexie-react-hooks'
import { Card, cx, useSheet } from '../components/ui'
import { db } from '../db/db'
import { CheckInForm } from '../forms/CheckInForm'
import { TookSomethingSheet } from '../forms/DoseForm'
import { EyeForm } from '../forms/EyeForm'
import { IbsSssForm } from '../forms/IbsSssForm'
import { MealForm } from '../forms/MealForm'
import { QuickBowelLog } from '../forms/BowelForm'
import { TriggerForm } from '../forms/TriggerForm'
import { WeightForm } from '../forms/WeightForm'
import { todayKey } from '../lib/time'

function ActionButton({ label, sub, onClick, highlight, className }: { label: string; sub?: string; onClick: () => void; highlight?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex min-h-20 flex-col items-start justify-center rounded-2xl p-4 text-left shadow-sm ring-1 active:scale-[0.98]',
        className,
        highlight
          ? 'bg-teal-50 ring-accent dark:bg-teal-950 dark:ring-teal-700'
          : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800',
      )}
    >
      <span className="text-base font-semibold">{label}</span>
      {sub && <span className="text-xs text-slate-500 dark:text-slate-400">{sub}</span>}
    </button>
  )
}

export function LogScreen() {
  const { open } = useSheet()
  const today = todayKey()
  const hasCheckIn = useLiveQuery(() => db.checkIns.where('date').equals(today).count(), [today])
  return (
    <div className="space-y-4">
      <Card title="Bowel movement">
        <QuickBowelLog />
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <ActionButton className="col-span-2" label="Meal" sub="Say or type what you ate · triggers detected automatically" onClick={() => open(<MealForm />)} />
        <ActionButton label="Daily check-in" sub={hasCheckIn ? 'Done today · edit' : 'Evening'} highlight={hasCheckIn === 0} onClick={() => open(<CheckInForm />)} />
        <ActionButton label="Trigger" sub="Food, stress, sleep…" onClick={() => open(<TriggerForm />)} />
        <ActionButton label="Took something" sub="On-demand dose" onClick={() => open(<TookSomethingSheet />)} />
        <ActionButton label="Eye episode" onClick={() => open(<EyeForm />)} />
        <ActionButton label="Weight" onClick={() => open(<WeightForm />)} />
        <ActionButton label="Weekly score" sub="IBS-SSS" onClick={() => open(<IbsSssForm />)} />
      </div>
    </div>
  )
}

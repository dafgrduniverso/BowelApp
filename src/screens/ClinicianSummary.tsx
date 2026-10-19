import { Button } from '../components/ui'
import { OUTCOME_LABELS } from '../forms/InterventionForm'
import { useAllData } from '../lib/hooks'
import { ibsSssBand } from '../lib/ibsSss'
import { clinicianSummary } from '../lib/summary'
import { formatDate, formatDateTime } from '../lib/time'
import { labFlag, refRangeText } from '../lib/labs'

const f = (n: number | undefined, d = 0) => (n === undefined ? '—' : n.toFixed(d))

/** Printable page; the user saves it as PDF from the browser's print dialog. */
export function ClinicianSummary({ start, end, onClose }: { start: string; end: string; onClose: () => void }) {
  const data = useAllData()
  if (!data) return null
  const s = clinicianSummary(data, start, end)
  const th = 'border-b border-slate-400 px-2 py-1 text-left font-semibold'
  const td = 'border-b border-slate-200 px-2 py-1 align-top dark:border-slate-700 print:border-slate-300'
  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-slate-900 print:p-0 dark:bg-slate-950 dark:text-slate-100 print:bg-white print:text-black">
      <div className="no-print pt-safe mb-6 flex gap-2">
        <Button variant="secondary" onClick={onClose}>
          ‹ Back
        </Button>
        <Button className="flex-1" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>
      <h1 className="text-2xl font-bold">Gastrointestinal symptom summary</h1>
      <p className="text-sm">
        Period: {formatDate(start)} – {formatDate(end)} ({s.days} days) · generated {formatDateTime(new Date().toISOString())}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 print:text-slate-600">Self-reported data from a personal tracking app. Not a diagnostic tool.</p>

      <h2 className="mt-6 text-lg font-semibold">Stool pattern</h2>
      <table className="mt-1 w-full text-sm">
        <tbody>
          <tr><td className={td}>Bowel movements</td><td className={td}>{s.stool.count} ({f(s.stool.meanPerDay, 1)}/day)</td></tr>
          <tr><td className={td}>Bristol 1–2 / 3–5 / 6–7</td><td className={td}>{f(s.stool.pctHard)}% / {f(s.stool.pctNormal)}% / {f(s.stool.pctLoose)}%</td></tr>
          <tr><td className={td}>With urgency</td><td className={td}>{f(s.stool.pctUrgency)}%</td></tr>
          <tr><td className={td}>Nocturnal (woke from sleep)</td><td className={td}>{s.nocturnalCount}</td></tr>
          <tr><td className={td}>Blood reported</td><td className={td}>{s.bloodCount}</td></tr>
          <tr>
            <td className={td}>Pattern indicator (not a diagnosis)</td>
            <td className={td}>
              <strong>{s.stool.subtype}</strong> — of {s.stool.daysWithBM} days with a BM, {f(s.stool.pctHardDays)}% had hard and {f(s.stool.pctLooseDays)}% loose stools
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-6 text-lg font-semibold">Symptoms (daily check-ins, 0–10)</h2>
      <p className="text-sm">
        {s.checkInCount} check-ins · mean worst pain <strong>{f(s.painMean, 1)}</strong> · mean bloating <strong>{f(s.bloatingMean, 1)}</strong> · flare days {s.flareDays}
      </p>

      <h2 className="mt-6 text-lg font-semibold">IBS-SSS (0–500)</h2>
      {s.ibsSss.length ? (
        <table className="mt-1 w-full text-sm">
          <thead><tr><th className={th}>Date</th><th className={th}>Total</th><th className={th}>Severity</th></tr></thead>
          <tbody>
            {s.ibsSss.map((x) => (
              <tr key={x.id}><td className={td}>{formatDate(x.date)}</td><td className={td}>{x.total}</td><td className={td}>{ibsSssBand(x.total).label}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm">None recorded in this period.</p>
      )}

      <h2 className="mt-6 text-lg font-semibold">Interventions tried</h2>
      {s.interventions.length ? (
        <table className="mt-1 w-full text-sm">
          <thead><tr><th className={th}>Intervention</th><th className={th}>Period</th><th className={th}>Outcome</th><th className={th}>IBS-SSS baseline → trial</th></tr></thead>
          <tbody>
            {s.interventions.map((i) => {
              const c = s.comparisons.find((c) => c.intervention.id === i.id)
              const doses = s.dosesPerIntervention.find((x) => x.i.id === i.id)?.count ?? 0
              return (
                <tr key={i.id}>
                  <td className={td}>
                    {i.name}
                    {i.dose && <span className="block text-xs">{i.dose}</span>}
                    {i.concurrentTrialOverride && <span className="block text-xs">(overlapped another trial)</span>}
                  </td>
                  <td className={td}>
                    {i.mode === 'on_demand'
                      ? `On demand · ${doses} doses in period`
                      : `${i.startDate ? formatDate(i.startDate) : '?'} – ${i.actualEndDate ? formatDate(i.actualEndDate) : 'ongoing'}`}
                  </td>
                  <td className={td}>{i.outcome ? OUTCOME_LABELS[i.outcome] : '—'}{i.outcomeNotes && <span className="block text-xs">{i.outcomeNotes}</span>}</td>
                  <td className={td}>
                    {c ? (c.insufficientData ? 'Insufficient data' : `${f(c.baseline.ibsSssMean)} → ${f(c.trial.ibsSssMean)}${c.clinicallyMeaningful ? ' (≥50 drop)' : ''}`) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-sm">None.</p>
      )}

      <h2 className="mt-6 text-lg font-semibold">Laboratory results</h2>
      {s.labs.length ? (
        <table className="mt-1 w-full text-sm">
          <thead><tr><th className={th}>Test</th><th className={th}>Date</th><th className={th}>Result</th><th className={th}>Reference</th></tr></thead>
          <tbody>
            {s.labs.map((l) => (
              <tr key={l.id}>
                <td className={td}>{l.test}</td>
                <td className={td}>{formatDate(l.date)}</td>
                <td className={td}>
                  {l.value} {l.unit} {labFlag(l) && <strong>{labFlag(l) === 'high' ? 'H' : 'L'}</strong>}
                </td>
                <td className={td}>{refRangeText(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm">None recorded.</p>
      )}

      <h2 className="mt-6 text-lg font-semibold">Alerts raised by the app</h2>
      {s.alerts.length ? (
        <ul className="mt-1 list-disc pl-5 text-sm">
          {s.alerts.map((a) => (
            <li key={a.id}>
              {formatDateTime(a.triggeredAt)}: {a.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">None.</p>
      )}
    </div>
  )
}

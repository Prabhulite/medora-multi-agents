import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { api, getErrorMessage } from '../../lib/api'
import { hasPermission } from '../../lib/permissions'
import { useAuth } from '../auth/AuthContext'
import type { ApiResponse } from '../../types'
import type { Admission } from './inpatient.api'

type Entry = { id: number; kind: 'intake' | 'output'; category: string; amountMl: string; observedAt: string; notes: string | null; recordedBy: string | null }

export function IntakeOutputPanel({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const { user } = useAuth()
  const [rows, setRows] = useState<Entry[]>([])
  const [kind, setKind] = useState<'intake' | 'output'>('intake')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const canRecord = hasPermission(user, 'inpatient.update') && ['admitted', 'transferred'].includes(admission.status)

  const load = async () => {
    const { data } = await api.get<ApiResponse<Entry[]>>(`/intake-output/admissions/${admission.id}/intake-output`)
    setRows(data.data)
  }
  useEffect(() => { void load().catch((err) => setError(getErrorMessage(err, 'Unable to load intake and output'))); }, [admission.id])

  const totals = useMemo(() => rows.reduce((result, row) => {
    result[row.kind] += Number(row.amountMl)
    return result
  }, { intake: 0, output: 0 }), [rows])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post(`/intake-output/admissions/${admission.id}/intake-output`, { kind, category: category.trim(), amountMl: Number(amount), observedAt: new Date().toISOString(), notes: notes.trim() || null })
      setCategory('')
      setAmount('')
      setNotes('')
      await load()
    } catch (err) { setError(getErrorMessage(err, 'Unable to record intake or output')) }
    finally { setBusy(false) }
  }

  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="inpatient-modal" role="dialog" aria-modal="true" aria-label="Intake and output chart" onClick={(event) => event.stopPropagation()}>
      <div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">WARD CHART</span><h2>Intake and output</h2><p>{admission.patientName} · {admission.admissionNumber}</p></div><button type="button" onClick={onClose} aria-label="Close intake and output">×</button></div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {canRecord ? <form onSubmit={(event) => void save(event)}>
        <div className="inpatient-form-grid">
          <Select label="Type" value={kind} onChange={(event) => setKind(event.target.value as 'intake' | 'output')} options={[{ value: 'intake', label: 'Intake' }, { value: 'output', label: 'Output' }]} />
          <Input label="Source or type" required minLength={2} maxLength={60} value={category} onChange={(event) => setCategory(event.target.value)} placeholder={kind === 'intake' ? 'e.g. oral fluids' : 'e.g. urine'} />
          <Input label="Volume (mL)" required type="number" min="0.1" max="100000" step="0.1" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <Input label="Notes" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="inpatient-modal__footer"><Button type="submit" loading={busy}>Record volume</Button></div>
      </form> : null}
      <div className="inpatient-observations"><h3>Recorded entries</h3><p>Total intake {totals.intake.toFixed(1)} mL · Total output {totals.output.toFixed(1)} mL · Balance {(totals.intake - totals.output).toFixed(1)} mL</p><small>Totals cover the loaded chart entries, up to 500 most recent.</small>{rows.map((row) => <article key={row.id}><strong>{new Date(row.observedAt).toLocaleString()} · {row.kind}</strong><span>{row.category} · {row.amountMl} mL</span><p>{row.notes}</p><small>{row.recordedBy || 'Staff'}</small></article>)}</div>
    </section>
  </div>
}

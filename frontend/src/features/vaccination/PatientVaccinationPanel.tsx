import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { getErrorMessage } from '../../lib/api'
import { hasPermission } from '../../lib/permissions'
import { useAuth } from '../auth/AuthContext'
import { vaccinationApi, type Immunization } from './vaccination.api'

export function PatientVaccinationPanel({ patientId }: { patientId: number }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [records, setRecords] = useState<Immunization[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    vaccinationApi.patientRecords(patientId).then((rows) => { if (active) setRecords(rows) })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load vaccination history')) })
    return () => { active = false }
  }, [patientId])
  return <section className="pd-card pd-card--wide"><div className="pd-card__head"><h3>Vaccination history</h3>{hasPermission(user, 'vaccination.record') ? <Button size="sm" onClick={() => navigate('/vaccination')}>Record dose</Button> : null}</div>
    {error ? <Alert tone="error">{error}</Alert> : null}
    <div className="pd-card__body pd-visits">{records.length ? records.map((row) => <div className="pd-visit-row" key={row.id}><div><div className="ui-table__cell-title">{row.vaccineName} · Dose {row.doseNumber}</div><div className="ui-table__cell-sub">Administered {row.administeredOn}{row.nextDueOn ? ` · Next due ${row.nextDueOn}` : ''}{row.lotNumber ? ` · Lot ${row.lotNumber}` : ''}</div>{row.remarks ? <div className="ui-table__cell-sub">{row.remarks}</div> : null}</div></div>) : <p className="pd-empty">No vaccination records for this patient.</p>}</div>
  </section>
}

import { useEffect, useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { getErrorMessage } from '../../lib/api'
import { prescriptionsApi } from '../clinical/prescriptions.api'

type Pending = Awaited<ReturnType<typeof prescriptionsApi.pendingDispense>>[number]

export function PendingPrescriptions({ refreshKey, canDispense, onDispense }: { refreshKey: number; canDispense: boolean; onDispense: (row: Pending) => void }) {
  const [rows, setRows] = useState<Pending[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    prescriptionsApi.pendingDispense().then((result) => { if (active) { setRows(result); setError('') } })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load pending prescriptions')) })
    return () => { active = false }
  }, [refreshKey])

  return <section className="pharmacy-section pharmacy-prescription-queue" aria-label="Pending prescriptions">
    <div className="pharmacy-section__heading"><h2>Prescriptions to dispense</h2><p>Saved catalog prescriptions remain here until their quantities are fully dispensed.</p></div>
    {error ? <Alert tone="error">{error}</Alert> : null}
    {rows.length ? <div className="pharmacy-prescription-queue__rows">{rows.map((row) => <div key={row.id} className="pharmacy-prescription-queue__row"><div><strong>{row.patientName}</strong><span>{row.patientNumber} · {row.medicineName} · {row.remainingQuantity} of {row.quantityPrescribed} remaining</span></div>{canDispense ? <Button size="sm" onClick={() => onDispense(row)}>Dispense</Button> : null}</div>)}</div> : <p className="pharmacy-prescription-queue__empty">No catalog prescriptions are waiting for stock.</p>}
  </section>
}

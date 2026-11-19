import { useEffect, useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { getErrorMessage } from '../../lib/api'
import { clinicalApi } from './clinical.api'
import { prescriptionsApi } from './prescriptions.api'

type Medicine = { id: number; brandName: string; genericName: string; medicineCode: string }

export function PrescriptionComposer({ patientId, visitId, onSaved }: { patientId: number; visitId?: number; onSaved: (id: number) => void }) {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [medicineId, setMedicineId] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [duration, setDuration] = useState('')
  const [quantity, setQuantity] = useState('')
  const [route, setRoute] = useState('oral')
  const [instructions, setInstructions] = useState('')
  const [encounterId, setEncounterId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([prescriptionsApi.listMedications(), clinicalApi.listByPatient(patientId)])
      .then(([catalog, encounters]) => {
        if (!active) return
        setMedicines(catalog)
        const matching = visitId ? encounters.filter((row) => row.visitId === visitId) : []
        setEncounterId(matching.length === 1 ? matching[0].id : null)
      })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load prescription options')) })
    return () => { active = false }
  }, [patientId, visitId])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const medicine = medicines.find((row) => String(row.id) === medicineId)
    if (!medicine || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || !Number.isInteger(Number(duration)) || Number(duration) < 1) {
      setError('Select a catalog medicine and enter a valid duration and quantity.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved = await prescriptionsApi.create({ patientId, encounterId, medicationId: medicine.id, medicineName: medicine.brandName, dosage: dosage.trim(), frequency: frequency.trim(), durationDays: Number(duration), quantityPrescribed: Number(quantity), route, instructions: instructions.trim() })
      setMedicineId('')
      setDosage('')
      setFrequency('')
      setDuration('')
      setQuantity('')
      setInstructions('')
      onSaved(saved.id)
    } catch (err) { setError(getErrorMessage(err, 'Unable to save prescription')) }
    finally { setBusy(false) }
  }

  return <form className="rx-composer" onSubmit={(event) => void save(event)}>
    <h3>New prescription</h3>
    <p>Select a stocked catalog medicine so pharmacy can dispense against this prescription. Confirm allergies and clinical details before saving.</p>
    {error ? <Alert tone="error">{error}</Alert> : null}
    <div className="rx-composer__grid">
      <Select label="Medicine" required value={medicineId} onChange={(event) => setMedicineId(event.target.value)} options={[{ value: '', label: 'Select medicine' }, ...medicines.map((row) => ({ value: row.id, label: `${row.brandName} · ${row.genericName} · ${row.medicineCode}` }))]} />
      <Input label="Dose" required maxLength={80} value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="e.g. 1 tablet" />
      <Input label="Frequency" required maxLength={80} value={frequency} onChange={(event) => setFrequency(event.target.value)} placeholder="e.g. Twice daily" />
      <Input label="Duration in days" required type="number" min="1" max="3650" value={duration} onChange={(event) => setDuration(event.target.value)} />
      <Input label="Quantity to dispense" required type="number" min="1" max="1000000" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      <Select label="Route" value={route} onChange={(event) => setRoute(event.target.value)} options={['oral', 'topical', 'inhaled', 'injection', 'other'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
      <Input label="Patient instructions" maxLength={2000} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="e.g. Take after food" />
    </div>
    <Button type="submit" loading={busy} disabled={!medicines.length}>Save and preview prescription</Button>
  </form>
}

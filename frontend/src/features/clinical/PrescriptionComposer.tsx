import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { getErrorMessage } from '../../lib/api'
import { clinicalApi } from './clinical.api'
import { prescriptionsApi } from './prescriptions.api'
import { useAuth } from '../auth/AuthContext'
import './PrescriptionComposer.css'

type Medicine = { id: number; brandName: string; genericName: string; medicineCode: string }
type Row = { key: number; medicineId: string; query: string; dosage: string; frequency: string; duration: string; quantity: string; route: string; timing: string[]; instructions: string }
const timingOptions = ['Morning/Before Food', 'Morning/After Food', 'Afternoon/Before Food', 'Afternoon/After Food', 'Evening/Before Food', 'Evening/After Food']
let rowKey = 0
const emptyRow = (): Row => ({ key: ++rowKey, medicineId: '', query: '', dosage: '', frequency: '', duration: '', quantity: '', route: 'oral', timing: [], instructions: '' })

export function PrescriptionComposer({ patientId, patientName, visitId, onSaved }: { patientId: number; patientName?: string; visitId?: number; onSaved: (ids: number[]) => void }) {
  const { user } = useAuth()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [encounterId, setEncounterId] = useState<number | null>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const catalog = useMemo(() => medicines, [medicines])

  useEffect(() => {
    let active = true
    setLoaded(false)
    Promise.all([prescriptionsApi.listMedications(), clinicalApi.listByPatient(patientId)])
      .then(([medications, encounters]) => {
        if (!active) return
        setMedicines(medications)
        const matching = visitId ? encounters.filter((row) => row.visitId === visitId) : []
        setEncounterId(matching.length === 1 ? matching[0].id : null)
      })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load prescription options')) })
      .finally(() => { if (active) setLoaded(true) })
    return () => { active = false }
  }, [patientId, visitId])

  const updateRow = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row))
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!diagnosis.trim()) { setError('Enter the diagnosis before saving.'); return }
    for (const [index, row] of rows.entries()) {
      if (!catalog.some((medicine) => String(medicine.id) === row.medicineId) || !row.dosage.trim() || !row.frequency.trim() || !Number.isInteger(Number(row.duration)) || Number(row.duration) < 1 || !Number.isInteger(Number(row.quantity)) || Number(row.quantity) < 1) {
        setError(`Medicine ${index + 1}: select a catalog medicine and enter dose, frequency, days, and quantity.`)
        return
      }
    }
    setBusy(true)
    let savedCount = 0
    const savedIds: number[] = []
    try {
      for (const row of rows) {
        const medicine = catalog.find((item) => String(item.id) === row.medicineId)!
        const instructions = [diagnosis.trim() ? `Diagnosis: ${diagnosis.trim()}` : '', row.timing.join(', '), row.instructions.trim(), notes.trim() ? `Notes: ${notes.trim()}` : ''].filter(Boolean).join(' | ')
        const saved = await prescriptionsApi.create({ patientId, encounterId, medicationId: medicine.id, medicineName: medicine.brandName, dosage: row.dosage.trim(), frequency: row.frequency.trim(), durationDays: Number(row.duration), quantityPrescribed: Number(row.quantity), route: row.route, instructions })
        savedCount += 1
        savedIds.push(saved.id)
      }
      onSaved(savedIds)
      setRows([emptyRow()])
      setDiagnosis('')
      setNotes('')
    } catch (err) {
      setRows((current) => current.slice(savedCount))
      if (savedIds.length) onSaved(savedIds)
      setError(`${savedCount} medicine(s) saved. ${getErrorMessage(err, 'Unable to save remaining medicines')}`)
    } finally { setBusy(false) }
  }

  return <form className="rx-composer rx-sheet" onSubmit={(event) => void save(event)}>
    <header className="rx-sheet__head"><div><h3>New Prescription</h3><p>Review allergies and clinical history before prescribing.</p></div><span>Medora · Doctor Workspace</span></header>
    {error ? <Alert tone="error">{error}</Alert> : null}
    <div className="rx-sheet__identity"><div><span>Patient</span><strong>{patientName || `Patient ${patientId}`}</strong></div><div><span>Prescribing doctor</span><strong>{user?.fullName || 'Signed-in doctor'}</strong></div></div>
    <Input label="Diagnosis *" required maxLength={300} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="What is the diagnosis?" />
    <section className="rx-sheet__medicines"><h4>Medicines</h4><div className="rx-sheet__columns" aria-hidden="true"><span>Medicine name</span><span>Dosage</span><span>Timing</span><span>Days / Qty</span><span>Action</span></div>
    {rows.map((row, index) => {
      const matches = catalog.filter((medicine) => `${medicine.brandName} ${medicine.genericName} ${medicine.medicineCode}`.toLowerCase().includes(row.query.trim().toLowerCase()))
      return <fieldset className="rx-sheet__row" key={row.key} disabled={busy}>
        <legend className="rx-sheet__mobile-label">Medicine {index + 1}</legend>
        <div className="rx-sheet__medicine-name"><Input label="Medicine name" value={row.query} onChange={(event) => updateRow(row.key, { query: event.target.value, medicineId: '' })} placeholder="Search name or code" /><Select label="Catalog match *" required value={row.medicineId} onChange={(event) => updateRow(row.key, { medicineId: event.target.value })} options={[{ value: '', label: matches.length ? 'Select medicine' : 'No matching medicine' }, ...matches.map((medicine) => ({ value: medicine.id, label: `${medicine.brandName} · ${medicine.genericName} · ${medicine.medicineCode}` }))]} /></div>
        <div><Input label="Dosage *" required maxLength={80} value={row.dosage} onChange={(event) => updateRow(row.key, { dosage: event.target.value })} placeholder="e.g. 1 tablet" /><Select label="Route" value={row.route} onChange={(event) => updateRow(row.key, { route: event.target.value })} options={['oral', 'topical', 'inhaled', 'injection', 'other'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} /></div>
        <div className="rx-composer__timing"><strong>Timing</strong><div>{timingOptions.map((option) => <label key={option}><input type="checkbox" checked={row.timing.includes(option)} onChange={() => updateRow(row.key, { timing: row.timing.includes(option) ? row.timing.filter((selected) => selected !== option) : [...row.timing, option] })} />{option}</label>)}</div><Input label="Frequency *" required maxLength={80} value={row.frequency} onChange={(event) => updateRow(row.key, { frequency: event.target.value })} placeholder="e.g. Twice daily" /></div>
        <div><Input label="Days *" required type="number" min="1" max="3650" value={row.duration} onChange={(event) => updateRow(row.key, { duration: event.target.value })} /><Input label="Quantity *" required type="number" min="1" max="1000000" value={row.quantity} onChange={(event) => updateRow(row.key, { quantity: event.target.value })} /></div>
        <div className="rx-sheet__remove">{rows.length > 1 ? <Button type="button" variant="ghost" size="sm" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>Remove</Button> : null}</div>
        <div className="rx-sheet__row-note"><Input label="Other instructions (optional)" maxLength={500} value={row.instructions} onChange={(event) => updateRow(row.key, { instructions: event.target.value })} placeholder="Additional directions for this medicine" /></div>
      </fieldset>
    })}
    </section>
    <Button type="button" variant="secondary" onClick={() => setRows((current) => [...current, emptyRow()])} disabled={busy}>+ Add Another Medicine</Button>
    <label className="ui-field"><span className="ui-field__label">Additional instructions (optional)</span><textarea className="ui-field__input" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    <div className="rx-sheet__footer"><Button type="submit" loading={busy} disabled={!loaded || !medicines.length}>Save Prescription</Button></div>
  </form>
}

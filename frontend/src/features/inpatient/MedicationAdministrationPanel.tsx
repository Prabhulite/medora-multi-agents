import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { inpatientApi, type Admission, type MedicationAdministration, type MedicationOrder } from './inpatient.api';

export function MedicationAdministrationPanel({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [records, setRecords] = useState<MedicationAdministration[]>([]);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [outcome, setOutcome] = useState<MedicationAdministration['outcome']>('given');
  const [doseGiven, setDoseGiven] = useState('');
  const [route, setRoute] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([inpatientApi.medicationOrders(admission.id), inpatientApi.medicationAdministrations(admission.id)])
      .then(([orderRows, recordRows]) => { if (active) { setOrders(orderRows); setRecords(recordRows); } })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load medication record')); });
    return () => { active = false; };
  }, [admission.id]);
  const selectedOrder = orders.find((item) => String(item.id) === prescriptionId);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await inpatientApi.addMedicationAdministration(admission.id, { prescriptionId: Number(prescriptionId), outcome, doseGiven: outcome === 'given' ? doseGiven : undefined, route: outcome === 'given' ? route || selectedOrder?.route : undefined, notes: notes || undefined });
      setRecords(await inpatientApi.medicationAdministrations(admission.id));
      setDoseGiven(''); setRoute(''); setNotes('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to record medication')); }
    finally { setSaving(false); }
  };
  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}><section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="medication-record-title" onClick={(event) => event.stopPropagation()}><div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">MEDICATION ADMINISTRATION</span><h2 id="medication-record-title">{admission.patientName}</h2><p>{admission.admissionNumber}</p></div><button type="button" onClick={onClose} aria-label="Close medication record">×</button></div>{error && <Alert tone="error">{error}</Alert>}{admission.status === 'admitted' && <form onSubmit={(event) => void submit(event)}><div className="inpatient-form-grid"><Select label="Active prescription" required value={prescriptionId} onChange={(event) => { setPrescriptionId(event.target.value); setRoute(''); }} options={[{ value: '', label: 'Select prescription' }, ...orders.map((item) => ({ value: item.id, label: `${item.medicineName} · ${item.dosage || 'dose unspecified'} · ${item.frequency || 'frequency unspecified'}` }))]} /><Select label="Outcome" value={outcome} onChange={(event) => setOutcome(event.target.value as MedicationAdministration['outcome'])} options={[{ value: 'given', label: 'Given' }, { value: 'withheld', label: 'Withheld' }, { value: 'refused', label: 'Refused' }]} />{outcome === 'given' && <><Input label="Dose given" required maxLength={80} value={doseGiven} onChange={(event) => setDoseGiven(event.target.value)} placeholder={selectedOrder?.dosage || 'e.g. 500 mg'} /><Input label="Route" maxLength={40} value={route} onChange={(event) => setRoute(event.target.value)} placeholder={selectedOrder?.route || 'oral'} /></>}<label className="inpatient-textarea"><span>{outcome === 'given' ? 'Notes' : 'Reason *'}</span><textarea required={outcome !== 'given'} maxLength={1000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div><div className="inpatient-modal__footer"><Button type="submit" loading={saving} disabled={!orders.length || !prescriptionId}>Record outcome</Button></div></form>}<div className="inpatient-observations"><h3>Administration history</h3>{records.length ? records.map((item) => <article key={item.id}><strong>{new Date(item.recordedAt).toLocaleString()}</strong><span>{item.prescription.medicineName} · {item.outcome}{item.doseGiven ? ` · ${item.doseGiven}` : ''}{item.route ? ` · ${item.route}` : ''}</span><p>{item.notes}</p><small>{item.administeredBy?.fullName || 'Staff'}</small></article>) : <p>No medication outcomes recorded.</p>}</div></section></div>;
}

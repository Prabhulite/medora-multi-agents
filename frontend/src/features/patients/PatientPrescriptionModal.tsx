import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { hasPermission } from '../../lib/permissions';
import type { Patient } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { PrescriptionComposer } from '../clinical/PrescriptionComposer';
import { PatientRecordsTab } from './PatientRecordsTab';
import './PatientActionModal.css';

export function PatientPrescriptionModal({ patient, visitId, onClose }: { patient: Patient; visitId?: number; onClose: () => void }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [revision, setRevision] = useState(0);
  const [newIds, setNewIds] = useState<number[]>([]);
  const canCreate = hasPermission(user, 'clinical.view') && hasPermission(user, 'pharmacy.create');
  return <div className="patient-action-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="patient-action-modal patient-action-modal--wide" role="dialog" aria-modal="true" aria-label="Patient prescriptions"><header><div><h2>Patient Prescriptions</h2><p>{patient.fullName} · {patient.mrdNumber}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></header><div className="patient-action-modal__body">
    {canCreate && <Button type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Hide form' : '+ New prescription'}</Button>}
    {showForm && canCreate && <PrescriptionComposer patientId={patient.id} patientName={patient.fullName} visitId={visitId} onSaved={(ids) => { setNewIds(ids); setRevision((value) => value + 1); setShowForm(false); }} />}
    <PatientRecordsTab key={revision} patient={patient} mode="Rx" previewPrescriptionIds={newIds} />
  </div><footer><Button variant="secondary" onClick={onClose}>Close</Button></footer></section></div>;
}

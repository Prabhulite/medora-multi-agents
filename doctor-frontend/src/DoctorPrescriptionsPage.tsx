import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../frontend/src/components/ui/PageHeader';
import { PatientSearchField } from '../../frontend/src/components/ui/PatientSearchField';

export function DoctorPrescriptionsPage() {
  const navigate = useNavigate();
  return <div><PageHeader title="Prescriptions" subtitle="Choose a patient to review history, prescribe catalog medicines, and print." />
    <PatientSearchField label="Patient" onSelect={(patient) => navigate(`/doctor/patients/${patient.id}?tab=Rx`)} />
  </div>;
}

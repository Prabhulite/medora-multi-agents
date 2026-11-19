import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { PatientSearchField } from '../../components/ui/PatientSearchField';

export function PrescriptionsPage() {
  const navigate = useNavigate();
  return <div><PageHeader title="Prescriptions" subtitle="Find a patient to review, create, and print prescriptions." /><PatientSearchField label="Patient" onSelect={(patient) => navigate(`/patients/${patient.id}?tab=Rx`)} /></div>;
}

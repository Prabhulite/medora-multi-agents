import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { getErrorMessage } from '../../lib/api';
import { clinicalApi } from './clinical.api';

type Allergy = Awaited<ReturnType<typeof clinicalApi.listAllergies>>[number];

export function AllergyBanner({ patientId }: { patientId: number }) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    clinicalApi.listAllergies(patientId).then((rows) => { if (active) setAllergies(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Allergy status unavailable')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId]);
  if (loading) return <Alert tone="info">Checking recorded allergies…</Alert>;
  if (error) return <Alert tone="error">Allergy status unavailable. Open the clinical record before prescribing.</Alert>;
  if (!allergies.length) return <Alert tone="info">No allergies recorded. Confirm allergy status with the patient.</Alert>;
  return <Alert tone="error">Recorded allergies: {allergies.map((row) => `${row.allergen}${row.severity && row.severity !== 'unknown' ? ` (${row.severity})` : ''}${row.reaction ? ` — ${row.reaction}` : ''}`).join('; ')}</Alert>;
}

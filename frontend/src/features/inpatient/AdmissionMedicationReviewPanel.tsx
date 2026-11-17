import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { getErrorMessage } from '../../lib/api';
import { homeMedicationApi, type HomeMedication } from '../clinical/homeMedication.api';
import { inpatientApi, type Admission, type AdmissionHomeMedicationDecision, type AdmissionMedicationReview } from './inpatient.api';

const sourceLabels: Record<string, string> = { patient: 'Patient reported', caregiver: 'Caregiver reported', records: 'Prior records', other: 'Other source' };
type Choice = { decision: AdmissionHomeMedicationDecision | ''; reason: string };

export function AdmissionMedicationReviewPanel({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const [medications, setMedications] = useState<HomeMedication[]>([]);
  const [review, setReview] = useState<AdmissionMedicationReview | null>(null);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    closeRef.current?.focus();
    Promise.all([inpatientApi.admissionMedicationReview(admission.id), homeMedicationApi.list(admission.patientId)])
      .then(([saved, rows]) => { if (active) { setReview(saved); setMedications(rows.filter((row) => row.isCurrent)); } })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load admission medication review')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admission.id, admission.patientId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  const update = (id: number, patch: Partial<Choice>) => setChoices((current) => ({ ...current, [id]: { ...(current[id] || { decision: '', reason: '' }), ...patch } }));
  const complete = medications.every((row) => Boolean(choices[row.id]?.decision) && (choices[row.id]?.decision === 'continue' || Boolean(choices[row.id]?.reason.trim())));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!complete || review?.reviewedAt || saving) return;
    setSaving(true); setError('');
    try {
      const saved = await inpatientApi.saveAdmissionMedicationReview(admission.id, {
        homeMedicationsReviewed: true,
        homeMedicationReview: medications.map((row) => ({ homeMedicationId: row.id, decision: choices[row.id].decision as AdmissionHomeMedicationDecision, ...(choices[row.id].reason.trim() ? { reason: choices[row.id].reason.trim() } : {}) })),
      });
      setReview(saved);
    } catch (err) { setError(getErrorMessage(err, 'Unable to save admission medication review')); }
    finally { setSaving(false); }
  };

  const details = (row: { dosage: string | null; frequency: string | null; route: string | null; source: string; sourceDetail: string | null }) => <small>
    {[row.dosage, row.frequency, row.route].filter(Boolean).join(' · ') || 'Dose and schedule not recorded'} · {sourceLabels[row.source] || row.source}{row.sourceDetail ? ` (${row.sourceDetail})` : ''}
  </small>;

  return <div className="inpatient-modal-backdrop" role="presentation" onClick={() => { if (!saving) onClose(); }}>
    <section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="admission-medication-review-title" onClick={(event) => event.stopPropagation()}>
      <div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">ADMISSION MEDICATION HISTORY</span><h2 id="admission-medication-review-title">{admission.patientName}</h2><p>{admission.admissionNumber}</p></div><button ref={closeRef} type="button" disabled={saving} onClick={onClose} aria-label="Close admission medication review">×</button></div>
      <div className="inpatient-admission-review">
        <Alert tone="warning">This is an unverified reported medication history. Review each medicine with the patient or source. Decisions do not create prescriptions or medication orders.</Alert>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {loading ? <p>Loading medication history…</p> : review?.reviewedAt ? <>
          <p>Reviewed {new Date(review.reviewedAt).toLocaleString()} · Staff ID {review.reviewedById}</p>
          {review.items.length ? review.items.map((item) => <article className="inpatient-discharge-review__item" key={item.id}><strong>{item.medicineName}</strong>{details(item)}<span>Decision: {item.decision}</span>{item.reason ? <span>Reason: {item.reason}</span> : null}</article>) : <p>No current home medications were recorded at review.</p>}
        </> : <form onSubmit={(event) => void submit(event)}>
          {medications.length ? medications.map((row) => <article className="inpatient-discharge-review__item" key={row.id}>
            <strong>{row.medicineName}</strong>{details(row)}
            <label>Admission decision for {row.medicineName}<select required value={choices[row.id]?.decision || ''} onChange={(event) => update(row.id, { decision: event.target.value as AdmissionHomeMedicationDecision })}><option value="">Select decision</option><option value="continue">Continue</option><option value="hold">Hold</option><option value="stop">Stop</option></select></label>
            <label>Reason {choices[row.id]?.decision && choices[row.id].decision !== 'continue' ? '(required)' : '(optional)'}<textarea rows={2} required={Boolean(choices[row.id]?.decision && choices[row.id].decision !== 'continue')} value={choices[row.id]?.reason || ''} onChange={(event) => update(row.id, { reason: event.target.value })} /></label>
          </article>) : <p>No current reported home medications. Save the review to confirm the empty history.</p>}
          <div className="inpatient-modal__footer"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" loading={saving} disabled={!complete}>Save review</Button></div>
        </form>}
      </div>
    </section>
  </div>;
}

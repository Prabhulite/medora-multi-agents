import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/api';
import { inpatientApi, type Admission, type DischargePayload, type MedicationOrder } from './inpatient.api';

type Decision = { decision: '' | 'continue' | 'stop'; instructions: string; reason: string };

export function DischargeReviewForm({ admission, saving, submitError, onClose, onSubmit }: { admission: Admission; saving: boolean; submitError: string; onClose: () => void; onSubmit: (payload: DischargePayload) => void }) {
  const [form, setForm] = useState({ dischargeSummary: '', dischargeDiagnosis: admission.diagnosis || '', dischargeMedications: '', followUpInstructions: '' });
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    let active = true;
    inpatientApi.medicationOrders(admission.id).then((items) => {
      if (!active) return;
      setOrders(items);
      setDecisions(Object.fromEntries(items.map((item) => [item.id, { decision: '', instructions: '', reason: '' }])));
    }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load active prescriptions')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admission.id]);

  const updateForm = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateDecision = (id: number, change: Partial<Decision>) => setDecisions((current) => ({ ...current, [id]: { ...current[id], ...change } }));
  const ready = reviewed && !loading && !error && orders.every((order) => {
    const choice = decisions[order.id];
    return choice?.decision === 'continue' ? choice.instructions.trim().length >= 2 : choice?.decision === 'stop' && choice.reason.trim().length >= 5;
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    const medicationReview: DischargePayload['medicationReview'] = orders.map((order) => {
      const choice = decisions[order.id];
      return choice.decision === 'continue'
        ? { prescriptionId: order.id, decision: 'continue', instructions: choice.instructions.trim() }
        : { prescriptionId: order.id, decision: 'stop', reason: choice.reason.trim() };
    });
    onSubmit({ ...form, medicationsReviewed: true, medicationReview });
  };

  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="discharge-form-title" onClick={(event) => event.stopPropagation()}>
      <div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">DISCHARGE REVIEW</span><h2 id="discharge-form-title">Discharge {admission.patientName}</h2><p>{admission.admissionNumber} · Bed {admission.bedNumber}</p></div><button type="button" onClick={onClose} aria-label="Close discharge form">×</button></div>
      <form onSubmit={submit}>
        {submitError && <div className="inpatient-discharge-review__error"><Alert tone="error">{submitError}</Alert></div>}
        <div className="inpatient-form-grid">
          <label className="inpatient-textarea"><span>Clinical summary *</span><textarea required minLength={2} maxLength={10000} rows={4} value={form.dischargeSummary} onChange={(event) => updateForm('dischargeSummary', event.target.value)} /></label>
          <label className="inpatient-textarea"><span>Discharge diagnosis</span><textarea maxLength={5000} rows={2} value={form.dischargeDiagnosis} onChange={(event) => updateForm('dischargeDiagnosis', event.target.value)} /></label>
          <section className="inpatient-discharge-review">
            <h3>Review active prescriptions</h3>
            <p>Choose what happens to each current prescription. Stopped prescriptions are marked stopped in the chart. Continuing a prescription does not create a new take-home prescription.</p>
            {loading ? <p>Loading prescriptions…</p> : error ? <Alert tone="error">{error}</Alert> : orders.length ? orders.map((order) => {
              const choice = decisions[order.id];
              return <div className="inpatient-discharge-review__item" key={order.id}>
                <strong>{order.medicineName}</strong><small>{[order.dosage, order.frequency, order.route].filter(Boolean).join(' · ')}</small>
                <Select label="Discharge decision" value={choice?.decision || ''} onChange={(event) => updateDecision(order.id, { decision: event.target.value as Decision['decision'] })} options={[{ value: '', label: 'Choose a decision' }, { value: 'continue', label: 'Continue' }, { value: 'stop', label: 'Stop' }]} />
                {choice?.decision === 'continue' && <label className="inpatient-textarea"><span>Instructions on discharge *</span><textarea required minLength={2} maxLength={1000} rows={2} value={choice.instructions} onChange={(event) => updateDecision(order.id, { instructions: event.target.value })} /></label>}
                {choice?.decision === 'stop' && <label className="inpatient-textarea"><span>Reason for stopping *</span><textarea required minLength={5} maxLength={1000} rows={2} value={choice.reason} onChange={(event) => updateDecision(order.id, { reason: event.target.value })} /></label>}
              </div>;
            }) : <p>No active prescriptions were found. Confirm the medication list was reviewed.</p>}
            <label className="inpatient-discharge-review__attestation"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /> I reviewed the active medication list and the decisions above.</label>
          </section>
          <label className="inpatient-textarea"><span>Other medication instructions</span><textarea maxLength={5000} rows={2} value={form.dischargeMedications} onChange={(event) => updateForm('dischargeMedications', event.target.value)} /></label>
          <label className="inpatient-textarea"><span>Follow-up instructions</span><textarea maxLength={5000} rows={2} value={form.followUpInstructions} onChange={(event) => updateForm('followUpInstructions', event.target.value)} /></label>
        </div>
        <div className="inpatient-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={!ready || saving}>Confirm discharge</Button></div>
      </form>
    </section>
  </div>;
}

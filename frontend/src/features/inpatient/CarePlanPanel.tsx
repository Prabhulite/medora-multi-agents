import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getErrorMessage } from '../../lib/api';
import { inpatientApi, type Admission, type NursingCarePlan, type NursingCarePlanReview } from './inpatient.api';

export function CarePlanPanel({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const [plans, setPlans] = useState<NursingCarePlan[]>([]);
  const [form, setForm] = useState({ problem: '', goal: '', interventions: '', reviewAt: '' });
  const [closingId, setClosingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [nextReviewAt, setNextReviewAt] = useState('');
  const [reviews, setReviews] = useState<NursingCarePlanReview[]>([]);
  const [historyPlanId, setHistoryPlanId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    inpatientApi.listCarePlans(admission.id).then((rows) => { if (active) setPlans(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load care plans')); });
    return () => { active = false; };
  }, [admission.id]);
  const add = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await inpatientApi.addCarePlan(admission.id, { problem: form.problem, goal: form.goal, interventions: form.interventions, reviewAt: form.reviewAt ? new Date(form.reviewAt).toISOString() : null });
      setPlans(await inpatientApi.listCarePlans(admission.id));
      setForm({ problem: '', goal: '', interventions: '', reviewAt: '' });
    } catch (err) { setError(getErrorMessage(err, 'Unable to create care plan')); }
    finally { setBusy(false); }
  };
  const close = async (status: 'completed' | 'discontinued') => {
    if (closingId === null) return;
    setBusy(true); setError('');
    try {
      await inpatientApi.closeCarePlan(admission.id, closingId, status, reviewNote);
      setPlans(await inpatientApi.listCarePlans(admission.id));
      setClosingId(null); setReviewNote('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to close care plan')); }
    finally { setBusy(false); }
  };
  const selectPlan = async (planId: number) => {
    setClosingId(planId); setHistoryPlanId(planId); setReviewNote(''); setNextReviewAt(''); setReviews([]); setError('');
    try { setReviews(await inpatientApi.listCarePlanReviews(admission.id, planId)); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load review history')); }
  };
  const showHistory = async (planId: number) => {
    setHistoryPlanId(planId); setReviews([]); setError('');
    try { setReviews(await inpatientApi.listCarePlanReviews(admission.id, planId)); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load review history')); }
  };
  const continuePlan = async () => {
    if (closingId === null || !nextReviewAt) return;
    setBusy(true); setError('');
    try {
      await inpatientApi.continueCarePlan(admission.id, closingId, reviewNote, new Date(nextReviewAt).toISOString());
      setPlans(await inpatientApi.listCarePlans(admission.id));
      setReviews(await inpatientApi.listCarePlanReviews(admission.id, closingId));
      setReviewNote(''); setNextReviewAt('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to continue care plan')); }
    finally { setBusy(false); }
  };
  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}><section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="care-plan-title" onClick={(event) => event.stopPropagation()}>
    <div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">NURSING CARE PLANS</span><h2 id="care-plan-title">{admission.patientName}</h2><p>{admission.admissionNumber}</p></div><button type="button" onClick={onClose} aria-label="Close care plans">×</button></div>
    {error && <Alert tone="error">{error}</Alert>}
    {['admitted', 'transferred'].includes(admission.status) && <form onSubmit={(event) => void add(event)}><div className="inpatient-form-grid"><Input label="Problem" required minLength={2} maxLength={500} value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} /><Input label="Goal" required minLength={2} maxLength={1000} value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} /><Input label="Review time" type="datetime-local" value={form.reviewAt} onChange={(event) => setForm({ ...form, reviewAt: event.target.value })} /><label className="inpatient-textarea"><span>Interventions *</span><textarea required minLength={2} maxLength={10000} rows={3} value={form.interventions} onChange={(event) => setForm({ ...form, interventions: event.target.value })} /></label></div><div className="inpatient-modal__footer"><Button type="submit" loading={busy}>Create plan</Button></div></form>}
    <div className="inpatient-observations"><h3>Care plan history</h3>{plans.length ? plans.map((plan) => <article key={plan.id}><strong>{plan.problem} · {plan.status}</strong><span>Goal: {plan.goal}</span><p>{plan.interventions}</p><small>Created {new Date(plan.createdAt).toLocaleString()} by {plan.createdBy?.fullName || 'Staff'}{plan.reviewAt ? ` · Review ${new Date(plan.reviewAt).toLocaleString()}` : ''}</small>{plan.reviewNote && <p>Review: {plan.reviewNote} · {plan.closedBy?.fullName || 'Staff'}</p>}{plan.status === 'active' && ['admitted', 'transferred'].includes(admission.status) && (closingId === plan.id ? <div><Input label="Review note" required minLength={2} maxLength={2000} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /><Input label="Next review time" type="datetime-local" value={nextReviewAt} onChange={(event) => setNextReviewAt(event.target.value)} /><div className="inpatient-modal__footer"><Button size="sm" variant="secondary" onClick={() => setClosingId(null)}>Cancel</Button><Button size="sm" variant="secondary" disabled={busy || reviewNote.trim().length < 2 || !nextReviewAt || new Date(nextReviewAt).getTime() <= Date.now()} onClick={() => void continuePlan()}>Continue plan</Button><Button size="sm" variant="secondary" disabled={busy || reviewNote.trim().length < 2} onClick={() => void close('discontinued')}>Discontinue</Button><Button size="sm" disabled={busy || reviewNote.trim().length < 2} onClick={() => void close('completed')}>Complete</Button></div></div> : <Button size="sm" variant="secondary" onClick={() => void selectPlan(plan.id)}>Review plan</Button>)}<Button size="sm" variant="secondary" onClick={() => void showHistory(plan.id)}>History</Button>{historyPlanId === plan.id ? <div className="inpatient-review-history">{reviews.length ? reviews.map((review) => <p key={review.id}><strong>{new Date(review.createdAt).toLocaleString()} · {review.reviewedBy?.fullName || 'Staff'}</strong><br />{review.reviewNote}<br />Next review {new Date(review.nextReviewAt).toLocaleString()}</p>) : <p>No continuation reviews recorded.</p>}</div> : null}</article>) : <p>No care plans recorded.</p>}</div>
  </section></div>;
}

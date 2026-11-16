import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { getErrorMessage } from '../../lib/api';
import { clinicalApi } from './clinical.api';

type TimelineEvent = Awaited<ReturnType<typeof clinicalApi.timeline>>[number];

export function PatientTimeline({ patientId }: { patientId: number }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    clinicalApi.timeline(patientId).then((rows) => { if (active) setEvents(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load patient timeline')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId]);
  return <section className="pd-card pd-card--wide">
    <div className="pd-card__head"><h3>Patient timeline</h3><Badge tone="info">Latest 100 events</Badge></div>
    {error ? <Alert tone="error">{error}</Alert> : null}
    {loading ? <p className="pd-empty">Loading timeline…</p> : events.length ? <div className="pd-card__body pd-visits">
      {events.map((item) => <div className="pd-visit-row" key={item.key}>
        <div><div className="ui-table__cell-title">{item.title}</div><div className="ui-table__cell-sub">{[item.kind.replaceAll('-', ' '), item.detail, item.status].filter(Boolean).join(' · ')}</div></div>
        <strong>{new Date(item.at).toLocaleString()}</strong>
      </div>)}
    </div> : <p className="pd-empty">No timeline events found.</p>}
  </section>;
}

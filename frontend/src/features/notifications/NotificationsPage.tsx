import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { notificationsApi, type UserNotification } from './notifications.api';
import './NotificationsPage.css';

export function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = async (beforeId?: number) => {
    setLoading(true);
    try {
      const data = await notificationsApi.list(beforeId);
      setItems((current) => beforeId ? [...current, ...data.items] : data.items);
      setUnreadCount(data.unreadCount);
      setNextCursor(data.nextCursor);
      setError('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to load notifications')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const read = async (id: number) => {
    setBusyId(id); setError('');
    try {
      const updated = await notificationsApi.read(id);
      setItems((current) => current.map((item) => item.id === id ? updated : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      window.dispatchEvent(new Event('medora:notifications-updated'));
    } catch (err) { setError(getErrorMessage(err, 'Unable to acknowledge notification')); }
    finally { setBusyId(null); }
  };
  return <div className="notifications-page">
    <PageHeader title="Notifications" subtitle="Your in-app updates and assigned work." actions={<Button variant="secondary" onClick={() => void load()} loading={loading}>Refresh</Button>} />
    {error && <Alert tone="error">{error}</Alert>}
    <p className="notifications-count">{unreadCount} unread</p>
    {items.length === 0 && !loading && <p>No notifications yet.</p>}
    <div className="notifications-list">{items.map((item) => <article key={item.id} className={item.readAt ? 'notification-card' : 'notification-card notification-card--unread'}>
      <div><h2>{item.title}</h2><p>{item.message}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div>
      <div className="notification-card__actions">{item.route === '/roster' && hasPermission(user, 'roster.view') && <Link to={item.route}>View roster</Link>}{item.route === '/ambulance' && hasPermission(user, 'ambulance.view') && <Link to={item.route}>View dispatch</Link>}{item.route === '/laboratory' && hasPermission(user, 'laboratory.view') && <Link to={item.route}>View laboratory</Link>}{item.route === '/radiology' && hasPermission(user, 'radiology.view') && <Link to={item.route}>View radiology</Link>}{item.route === '/inpatient' && hasPermission(user, 'inpatient.view') && <Link to={`${item.route}?handoff=${item.sourceId}`}>View handoff</Link>}{!item.readAt && <Button size="sm" variant="secondary" loading={busyId === item.id} onClick={() => void read(item.id)}>Mark read</Button>}</div>
    </article>)}</div>
    {nextCursor && <Button variant="secondary" loading={loading} onClick={() => void load(nextCursor)}>Load older</Button>}
  </div>;
}

export default NotificationsPage;

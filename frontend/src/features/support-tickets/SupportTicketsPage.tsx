import { useEffect, useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { supportTicketsApi, type SupportTicket, type TicketDetail, type TicketPriority, type TicketStatus } from './support-tickets.api';
import './SupportTicketsPage.css';

export function SupportTicketsPage() {
  const { user } = useAuth();
  const manage = hasPermission(user, 'support-tickets.manage');
  const createAllowed = Boolean(user);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [form, setForm] = useState<{ issueTitle: string; description: string; priority: TicketPriority }>({ issueTitle: '', description: '', priority: 'Medium' });
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'All' | TicketStatus>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async (nextScope = scope) => { setLoading(true); setError(''); try { setTickets(await supportTicketsApi.list(nextScope)); } catch (err) { setError(getErrorMessage(err, 'Unable to load tickets')); } finally { setLoading(false); } };
  useEffect(() => { void load(scope); }, [scope]);
  const open = async (id: number) => { setError(''); try { setSelected(await supportTicketsApi.detail(id)); } catch (err) { setError(getErrorMessage(err, 'Unable to load ticket')); } };
  const create = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await supportTicketsApi.create(form); setForm({ issueTitle: '', description: '', priority: 'Medium' }); setNotice('Ticket created.'); await load(); } catch (err) { setError(getErrorMessage(err, 'Unable to create ticket')); } finally { setBusy(false); } };
  const update = async (status: Exclude<TicketStatus, 'Open'>) => { if (!selected) return; setBusy(true); setError(''); try { await supportTicketsApi.status(selected.id, status); await open(selected.id); await load(); setNotice('Ticket updated.'); } catch (err) { setError(getErrorMessage(err, 'Unable to update ticket')); } finally { setBusy(false); } };
  const respond = async (event: FormEvent) => { event.preventDefault(); if (!selected) return; setBusy(true); setError(''); try { await supportTicketsApi.respond(selected.id, message); setMessage(''); await open(selected.id); await load(); setNotice('Response recorded.'); } catch (err) { setError(getErrorMessage(err, 'Unable to respond')); } finally { setBusy(false); } };
  const visible = tickets.filter((ticket) => (filter === 'All' || ticket.status === filter) && `${ticket.issueTitle} ${ticket.description} ${ticket.createdBy?.fullName || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="tickets-page"><header className="tickets-header"><div><h1>Support tickets</h1><p>Raise an issue and track its progress.</p></div><button type="button" onClick={() => void load()}>Refresh</button></header>
    {error && <p className="tickets-error" role="alert">{error}</p>}{notice && <p className="tickets-notice" role="status">{notice}</p>}
    {createAllowed && <form className="tickets-card tickets-form" onSubmit={(event) => void create(event)}><h2>Raise a ticket</h2><label>Issue title<input required minLength={3} maxLength={180} value={form.issueTitle} onChange={(event) => setForm({ ...form, issueTitle: event.target.value })} /></label><label>Description<textarea required minLength={5} maxLength={10000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TicketPriority })}>{(['Low', 'Medium', 'High', 'Critical'] as const).map((p) => <option key={p}>{p}</option>)}</select></label><button disabled={busy} type="submit">Submit ticket</button></form>}
    <section className="tickets-card"><div className="tickets-tools">{manage && <label>Scope <select value={scope} onChange={(event) => setScope(event.target.value as 'mine' | 'all')}><option value="mine">My tickets</option><option value="all">All tickets</option></select></label>}<label>Status <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>{(['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const).map((s) => <option key={s}>{s}</option>)}</select></label><label>Search <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or description" /></label></div>{loading ? <p>Loading tickets…</p> : visible.length === 0 ? <p>No tickets found.</p> : <div className="tickets-list">{visible.map((ticket) => <button className="tickets-row" type="button" key={ticket.id} onClick={() => void open(ticket.id)}><strong>#{ticket.id} {ticket.issueTitle}</strong><span>{ticket.status} · {ticket.priority}</span><small>{ticket.createdBy?.fullName || 'You'} · {new Date(ticket.createdAt).toLocaleDateString()}</small></button>)}</div>}</section>
    {selected && <section className="tickets-card" aria-label="Ticket details"><div className="tickets-detail-head"><h2>#{selected.id} {selected.issueTitle}</h2><button type="button" onClick={() => setSelected(null)}>Close details</button></div><p>{selected.description}</p><p><strong>Status:</strong> {selected.status} · <strong>Priority:</strong> {selected.priority}</p>{manage && selected.status !== 'Closed' && <div className="tickets-actions"><button type="button" disabled={busy} onClick={() => void update('In Progress')}>In progress</button><button type="button" disabled={busy} onClick={() => void update('Resolved')}>Resolve</button><button type="button" disabled={busy} onClick={() => void update('Closed')}>Close ticket</button></div>}<h3>Responses</h3>{selected.responses.length === 0 ? <p>No responses yet.</p> : selected.responses.map((response) => <article className="tickets-response" key={response.id}><p>{response.message}</p><small>{response.respondedBy} · {new Date(response.respondedAt).toLocaleString()}</small></article>)}{manage && selected.status !== 'Closed' && <form className="tickets-form" onSubmit={(event) => void respond(event)}><label>Reply<textarea required maxLength={10000} value={message} onChange={(event) => setMessage(event.target.value)} /></label><button disabled={busy} type="submit">Send response and resolve</button></form>}</section>}
  </main>;
}
export default SupportTicketsPage;

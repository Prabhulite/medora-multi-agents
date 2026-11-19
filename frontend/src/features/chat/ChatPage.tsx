import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { chatApi, type ChatMessage, type ChatStaff } from './chat.api';
import './ChatPage.css';

export function ChatPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<ChatStaff[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const latestId = useRef(0);
  const selectedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    chatApi.staff().then((items) => { if (live) setStaff(items); }).catch((err) => { if (live) setError(getErrorMessage(err, 'Unable to load staff')); });
    return () => { live = false; };
  }, [user]);

  useEffect(() => {
    selectedRef.current = selected;
    latestId.current = 0;
    setMessages([]);
    setHasMore(false);
    if (selected === null) return;
    let live = true;
    const load = async (poll: boolean) => {
      try {
        const page = await chatApi.messages(selected, poll && latestId.current ? { afterId: latestId.current } : undefined);
        if (!live || selectedRef.current !== selected) return;
        setMessages((current) => poll ? merge(current, page.items) : page.items);
        if (!poll) setHasMore(page.hasMore);
        if (page.items.length) latestId.current = Math.max(latestId.current, page.items[page.items.length - 1].id);
        setError('');
      } catch (err) { if (live) setError(getErrorMessage(err, 'Unable to load messages')); }
    };
    void load(false);
    const timer = window.setInterval(() => { void load(true); }, 4000);
    return () => { live = false; window.clearInterval(timer); };
  }, [selected]);

  const older = async () => {
    if (selected === null || !messages.length) return;
    try {
      const page = await chatApi.messages(selected, { beforeId: messages[0].id });
      setMessages((current) => merge(page.items, current));
      setHasMore(page.hasMore);
    } catch (err) { setError(getErrorMessage(err, 'Unable to load history')); }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (selected === null || !draft.trim() || sending) return;
    setSending(true);
    try {
      const message = await chatApi.send(selected, draft.trim());
      setMessages((current) => merge(current, [message]));
      latestId.current = Math.max(latestId.current, message.id);
      setDraft(''); setError('');
    } catch (err) { setError(getErrorMessage(err, 'Unable to send message')); }
    finally { setSending(false); }
  };

  if (!user) return <p>Sign in to use staff chat.</p>;
  return <main className="staff-chat"><aside className="staff-chat__people"><h1>Staff chat</h1>{staff.map((person) => <button type="button" key={person.id} className={selected === person.id ? 'staff-chat__person active' : 'staff-chat__person'} onClick={() => setSelected(person.id)}><strong>{person.fullName}</strong><small>{person.designation || 'Staff'}</small></button>)}</aside><section className="staff-chat__thread">{selected === null ? <p>Select a staff member to start chatting.</p> : <><header><h2>{staff.find((person) => person.id === selected)?.fullName}</h2></header><div className="staff-chat__messages">{hasMore && <button type="button" onClick={() => void older()}>Load older messages</button>}{messages.map((message) => <article key={message.id} className={message.senderId === user?.id ? 'staff-chat__message mine' : 'staff-chat__message'}><p>{message.body}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></article>)}</div><form onSubmit={(event) => void send(event)}><label htmlFor="chat-message">Message</label><div><input id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} autoComplete="off" /><button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send'}</button></div></form></>}{error && <p role="alert" className="staff-chat__error">{error}</p>}</section></main>;
}

function merge(left: ChatMessage[], right: ChatMessage[]) {
  return [...new Map([...left, ...right].map((item) => [item.id, item])).values()].sort((a, b) => a.id - b.id);
}

export default ChatPage;

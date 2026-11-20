import { useEffect, useRef } from 'react';
import { ChatPage } from './ChatPage';
import './ChatSidebar.css';

export function ChatSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="chat-sidebar__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="chat-sidebar" role="dialog" aria-modal="true" aria-label="Staff chat">
      <header><strong>Staff chat</strong><button ref={closeButton} type="button" onClick={onClose} aria-label="Close chat">×</button></header>
      <ChatPage />
    </aside>
  </div>;
}

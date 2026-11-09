import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './ActionMenu.css';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  openUp: boolean;
}

export function ActionMenu({ items, label = 'Actions' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth || 180;
    const menuHeight = menuRef.current?.offsetHeight || items.length * 40 + 12;
    const gap = 6;
    const viewportPadding = 8;

    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;

    let left = rect.right - menuWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    const top = openUp
      ? Math.max(viewportPadding, rect.top - menuHeight - gap)
      : Math.min(window.innerHeight - menuHeight - viewportPadding, rect.bottom + gap);

    setPosition({ top, left, openUp });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, items.length]);

  return (
    <div className="ui-action-menu">
      <button
        ref={triggerRef}
        type="button"
        className={`ui-action-menu__trigger ${open ? 'is-open' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ui-action-menu__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              className={`ui-action-menu__dropdown ${position?.openUp ? 'is-up' : ''}`}
              role="menu"
              style={
                position
                  ? {
                      top: `${position.top}px`,
                      left: `${position.left}px`,
                      visibility: 'visible',
                    }
                  : { visibility: 'hidden', top: 0, left: 0 }
              }
            >
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={`ui-action-menu__item ${item.danger ? 'is-danger' : ''}`}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.icon ? (
                    <span className="ui-action-menu__item-icon">{item.icon}</span>
                  ) : null}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

import { useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../components/ui/Avatar';
import type { User } from '../types/domain';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  user: Pick<User, 'name' | 'email'>;
  onLogout: () => void;
}

/** Выпадающее меню аккаунта: кнопка-раскрытие, а не role="menu", — внутри обычные ссылки. */
export function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Фокус ушёл за пределы меню (Tab) — закрываем, чтобы панель не висела над страницей.
  const handleBlur = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !rootRef.current?.contains(next)) setOpen(false);
  };

  const close = () => setOpen(false);

  return (
    <div className={styles.root} ref={rootRef} onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={user.email}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={user.name} size={28} />
        <span className={styles.name}>{user.name}</span>
        <span className={styles.chevron} aria-hidden="true" data-open={open} />
      </button>

      {open && (
        <div id={panelId} className={styles.panel}>
          <Link to="/profile" className={styles.head} onClick={close}>
            <Avatar name={user.name} size={40} />
            <span className={styles.who}>
              <strong>{user.name}</strong>
              <span className={styles.email}>{user.email}</span>
            </span>
          </Link>
          <ul className={styles.list}>
            <li>
              <Link to="/profile" className={styles.item} onClick={close}>
                Профиль
              </Link>
            </li>
            <li>
              <Link to="/profile/engineer" className={styles.item} onClick={close}>
                Моя анкета
              </Link>
            </li>
            <li>
              <Link to="/settings" className={styles.item} onClick={close}>
                Настройки
              </Link>
            </li>
            <li>
              <Link to="/about" className={styles.item} onClick={close}>
                О проекте
              </Link>
            </li>
          </ul>
          <button
            type="button"
            className={styles.logout}
            onClick={() => {
              close();
              onLogout();
            }}
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

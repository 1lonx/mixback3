import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Field';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { isSerializedError, serializeError } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import { deleteAccountSchema, parseWith } from '../../lib/schemas';
import { setPreference, useThemePreference, type ThemePreference } from '../../lib/theme';
import { deleteAccount, logout } from '../auth/authSlice';
import styles from './sections.module.css';

const THEME_OPTIONS = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
] as const;

export function AppearanceCard() {
  const preference = useThemePreference();
  return (
    <Card aria-labelledby="appearance-title" className={styles.section}>
      <h2 id="appearance-title">Оформление</h2>
      <p className={styles.muted}>Тема запоминается в этом браузере.</p>
      <SegmentedControl
        label="Тема оформления"
        options={THEME_OPTIONS}
        value={preference}
        onChange={(value: ThemePreference) => {
          setPreference(value);
        }}
      />
    </Card>
  );
}

export function SessionCard({ createdAt, expiresAt }: { createdAt: string; expiresAt: string }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  return (
    <Card aria-labelledby="session-title" className={styles.section}>
      <h2 id="session-title">Безопасность</h2>
      <dl className={styles.facts}>
        <div>
          <dt>Вход выполнен</dt>
          <dd>{formatDate(createdAt)}</dd>
        </div>
        <div>
          <dt>Сессия действует до</dt>
          <dd>{formatDate(expiresAt)}</dd>
        </div>
      </dl>
      <p className={styles.muted}>
        После 5 неудачных попыток ввода пароля вход блокируется на минуту. Пароль хранится только в
        виде хеша.
      </p>
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            void dispatch(logout());
            void navigate('/login');
          }}
        >
          Выйти на этом устройстве
        </Button>
      </div>
    </Card>
  );
}

export function DangerZone({ email }: { email: string }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword('');
    setError(undefined);
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = parseWith(deleteAccountSchema, { password });
    if (!parsed.success) {
      setError(parsed.errors.password);
      return;
    }
    setDeleting(true);
    try {
      await dispatch(deleteAccount(parsed.data)).unwrap();
      void navigate('/login', { replace: true });
    } catch (failure) {
      const info = isSerializedError(failure) ? failure : serializeError(failure);
      setError(info.message);
      setDeleting(false);
    }
  };

  return (
    <Card aria-labelledby="danger-title" className={`${styles.section} ${styles.danger}`}>
      <h2 id="danger-title">Удаление аккаунта</h2>
      <p className={styles.muted}>
        Будут удалены ваши проекты со всеми версиями и правками, а также ваши правки в чужих
        проектах. Это действие нельзя отменить.
      </p>
      <div>
        <Button
          variant="danger"
          onClick={() => {
            setOpen(true);
          }}
        >
          Удалить аккаунт
        </Button>
      </div>

      <Dialog open={open} title="Удалить аккаунт?" onClose={close}>
        <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
          <p className={styles.muted}>
            Для подтверждения введите пароль от аккаунта <strong>{email}</strong>.
          </p>
          <Input
            label="Пароль"
            type="password"
            name="delete-password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(undefined);
            }}
            error={error}
          />
          <div className={styles.actions}>
            <Button variant="ghost" onClick={close} disabled={deleting}>
              Отмена
            </Button>
            <Button variant="danger" type="submit" loading={deleting}>
              Удалить навсегда
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

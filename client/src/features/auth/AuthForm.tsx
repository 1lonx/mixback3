import { useEffect, useState, type SyntheticEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { DEMO_ARTIST, DEMO_OWNER, DEMO_PASSWORD } from '../../lib/demoAccounts';
import type { FieldErrors } from '../../lib/errors';
import { loginSchema, parseWith, registerSchema } from '../../lib/schemas';
import { clearAuthError, login, register } from './authSlice';
import styles from './AuthForm.module.css';

type Mode = 'login' | 'register';

const MODES = [
  { value: 'login', label: 'Вход' },
  { value: 'register', label: 'Регистрация' },
] as const;

const DEMO_ACCOUNTS = [
  { label: 'Войти как звукорежиссёр', email: DEMO_OWNER.email },
  { label: 'Войти как артист', email: DEMO_ARTIST.email },
] as const;

export function AuthForm() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((state) => state.auth);
  const loading = status === 'loading';

  const [mode, setMode] = useState<Mode>('login');
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  // Уходя со страницы, не оставляем старую ошибку входа в общем состоянии.
  useEffect(() => () => void dispatch(clearAuthError()), [dispatch]);

  // Ошибки с сервера (например, «e-mail занят») показываем рядом с полями так же, как клиентские.
  const fieldErrors: FieldErrors = { ...error?.fieldErrors, ...clientErrors };
  const formError = error && !error.fieldErrors ? error.message : undefined;

  const change = (field: keyof typeof values) => (event: { target: { value: string } }) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setClientErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setClientErrors({});
    dispatch(clearAuthError());
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const schema = mode === 'login' ? loginSchema : registerSchema;
    const parsed = parseWith(schema, values);
    if (!parsed.success) {
      setClientErrors(parsed.errors);
      return;
    }
    setClientErrors({});
    void dispatch(mode === 'login' ? login(values) : register({ ...values }));
  };

  const loginAsDemo = (email: string) => {
    void dispatch(login({ email, password: DEMO_PASSWORD }));
  };

  return (
    <div className={styles.wrapper}>
      <SegmentedControl label="Режим" options={MODES} value={mode} onChange={switchMode} />

      <form
        onSubmit={submit}
        noValidate
        className={styles.form}
        aria-label={mode === 'login' ? 'Вход' : 'Регистрация'}
      >
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
        {mode === 'register' && (
          <Input
            label="Имя"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={change('name')}
            error={fieldErrors.name}
          />
        )}
        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={change('email')}
          error={fieldErrors.email}
        />
        <Input
          label="Пароль"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={values.password}
          onChange={change('password')}
          error={fieldErrors.password}
          hint={mode === 'register' ? 'Минимум 8 символов, буква и цифра' : undefined}
        />
        <Button type="submit" loading={loading}>
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </Button>
      </form>

      <div className={styles.demo}>
        <p className={styles.demoTitle}>Быстрый вход в демо</p>
        <div className={styles.demoButtons}>
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => loginAsDemo(account.email)}
            >
              {account.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, type SyntheticEvent } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { StrengthMeter } from '../../components/ui/StrengthMeter';
import { isSerializedError, serializeError, type FieldErrors } from '../../lib/errors';
import { changePasswordSchema, parseWith, updateProfileSchema } from '../../lib/schemas';
import { changePassword, updateProfile } from '../auth/authSlice';
import { pushToast } from '../toasts/toastsSlice';
import styles from './sections.module.css';

export function NameForm({ currentName }: { currentName: string }) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(currentName);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = parseWith(updateProfileSchema, { name });
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await dispatch(updateProfile(parsed.data)).unwrap();
      dispatch(pushToast('success', 'Имя обновлено'));
    } catch (error) {
      const failure = isSerializedError(error) ? error : serializeError(error);
      if (failure.fieldErrors) setErrors(failure.fieldErrors);
      else dispatch(pushToast('error', failure.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card aria-labelledby="name-title" className={styles.section}>
      <h2 id="name-title">Имя</h2>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        <Input
          label="Как вас показывать другим участникам"
          name="name"
          autoComplete="name"
          value={name}
          maxLength={40}
          onChange={(event) => {
            setName(event.target.value);
            setErrors({});
          }}
          error={errors.name}
        />
        <div className={styles.actions}>
          <Button type="submit" loading={saving} disabled={name.trim() === currentName}>
            Сохранить
          </Button>
        </div>
      </form>
    </Card>
  );
}

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function PasswordForm() {
  const dispatch = useAppDispatch();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const change = (field: keyof typeof EMPTY) => (event: { target: { value: string } }) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setFormError(undefined);
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = parseWith(changePasswordSchema, values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    setSaving(true);
    setErrors({});
    setFormError(undefined);
    try {
      await dispatch(
        changePassword({
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        }),
      ).unwrap();
      setValues(EMPTY);
      dispatch(pushToast('success', 'Пароль изменён'));
    } catch (error) {
      const failure = isSerializedError(error) ? error : serializeError(error);
      if (failure.code === 'BAD_CREDENTIALS') setErrors({ currentPassword: failure.message });
      else if (failure.fieldErrors) setErrors(failure.fieldErrors);
      else setFormError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card aria-labelledby="password-title" className={styles.section}>
      <h2 id="password-title">Смена пароля</h2>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
        <Input
          label="Текущий пароль"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={change('currentPassword')}
          error={errors.currentPassword}
        />
        <Input
          label="Новый пароль"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={change('newPassword')}
          error={errors.newPassword}
          hint="Минимум 8 символов, буква и цифра"
        />
        <StrengthMeter password={values.newPassword} />
        <Input
          label="Повторите новый пароль"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={change('confirmPassword')}
          error={errors.confirmPassword}
        />
        <div className={styles.actions}>
          <Button type="submit" loading={saving}>
            Изменить пароль
          </Button>
        </div>
      </form>
    </Card>
  );
}

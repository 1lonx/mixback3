import { useState, type SyntheticEvent } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { RoleBadge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Field';
import { isSerializedError, serializeError, type FieldErrors } from '../../lib/errors';
import { inviteSchema, parseWith } from '../../lib/schemas';
import type { Member, Role } from '../../types/domain';
import { pushToast } from '../toasts/toastsSlice';
import { inviteMember } from './projectSlice';
import styles from './MembersPanel.module.css';

interface MembersPanelProps {
  projectId: string;
  members: readonly Member[];
  role: Role;
}

export function MembersPanel({ projectId, members, role }: MembersPanelProps) {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = parseWith(inviteSchema, { email });
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await dispatch(inviteMember({ id: projectId, email: parsed.data.email })).unwrap();
      setEmail('');
      dispatch(pushToast('success', 'Артист добавлен в проект'));
    } catch (error) {
      const failure = isSerializedError(error) ? error : serializeError(error);
      if (failure.fieldErrors) setErrors(failure.fieldErrors);
      else dispatch(pushToast('error', failure.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card aria-labelledby="members-title" className={styles.panel}>
      <h2 id="members-title">Участники</h2>
      <ul className={styles.list}>
        {members.map((member) => (
          <li key={member.userId} className={styles.member}>
            <span className={styles.name}>{member.name}</span>
            <RoleBadge value={member.role} />
          </li>
        ))}
      </ul>

      {role === 'owner' && (
        <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
          <Input
            label="Пригласить артиста"
            type="email"
            name="invite-email"
            placeholder="artist@mixback.app"
            value={email}
            autoComplete="off"
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors({});
            }}
            error={errors.email}
            hint="Артист должен быть зарегистрирован в Mixback"
          />
          <Button type="submit" variant="secondary" loading={submitting}>
            Пригласить
          </Button>
        </form>
      )}
    </Card>
  );
}

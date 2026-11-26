import { useState, type SyntheticEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import type { FieldErrors } from '../../lib/errors';
import { STATUS_LABELS } from '../../lib/labels';
import { parseWith, projectSchema, type ProjectInput } from '../../lib/schemas';
import type { ProjectStatus } from '../../types/domain';
import styles from './ProjectForm.module.css';

interface ProjectFormProps {
  initial?: ProjectInput;
  /** В режиме создания статус не выбирается: новый проект всегда «в работе». */
  showStatus: boolean;
  submitLabel: string;
  onSubmit: (values: ProjectInput) => Promise<void>;
  onCancel: () => void;
  /** Ошибки сервера по полям — показываются рядом с полями. */
  serverErrors?: FieldErrors;
  /** Общая ошибка, не относящаяся к конкретному полю. */
  formError?: string;
}

const EMPTY: ProjectInput = { title: '', artist: '', description: '', status: 'active' };

export function ProjectForm({
  initial = EMPTY,
  showStatus,
  submitLabel,
  onSubmit,
  onCancel,
  serverErrors,
  formError,
}: ProjectFormProps) {
  const [values, setValues] = useState<ProjectInput>(initial);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const errors = { ...serverErrors, ...clientErrors };

  const change = (field: keyof ProjectInput) => (event: { target: { value: string } }) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setClientErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = parseWith(projectSchema, values);
    if (!parsed.success) {
      setClientErrors(parsed.errors);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}
      <Input
        label="Название трека"
        name="title"
        value={values.title}
        onChange={change('title')}
        error={errors.title}
        maxLength={120}
      />
      <Input
        label="Артист"
        name="artist"
        value={values.artist}
        onChange={change('artist')}
        error={errors.artist}
        hint="Кто будет оставлять правки"
      />
      <Textarea
        label="Описание"
        name="description"
        value={values.description}
        onChange={change('description')}
        error={errors.description}
        hint={`${values.description.length}/500 · необязательно: референсы, пожелания, жанр`}
      />
      {showStatus && (
        <Select
          label="Статус"
          name="status"
          value={values.status}
          onChange={change('status')}
          error={errors.status}
        >
          {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Отмена
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

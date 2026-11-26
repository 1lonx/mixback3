import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Field.module.css';

interface FieldChrome {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

interface ShellProps extends FieldChrome {
  id: string;
  children: ReactNode;
}

/** Подпись + подсказка + ошибка вокруг поля ввода. Связь через id нужна скринридерам. */
function Shell({ id, label, error, hint, children }: ShellProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, { error, hint }: FieldChrome): string | undefined {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

export type InputProps = ComponentProps<'input'> & FieldChrome;

export function Input({ label, error, hint, className, id: idProp, ...rest }: InputProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <input
        {...rest}
        id={id}
        className={cx(styles.control, error && styles.invalid, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { label, error, hint })}
      />
    </Shell>
  );
}

export type TextareaProps = ComponentProps<'textarea'> & FieldChrome;

export function Textarea({ label, error, hint, className, id: idProp, ...rest }: TextareaProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <textarea
        {...rest}
        id={id}
        className={cx(styles.control, styles.textarea, error && styles.invalid, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { label, error, hint })}
      />
    </Shell>
  );
}

export type SelectProps = ComponentProps<'select'> & FieldChrome;

export function Select({
  label,
  error,
  hint,
  className,
  id: idProp,
  children,
  ...rest
}: SelectProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <select
        {...rest}
        id={id}
        className={cx(styles.control, error && styles.invalid, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { label, error, hint })}
      >
        {children}
      </select>
    </Shell>
  );
}

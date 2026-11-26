import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';
import { buttonClassName, type ButtonStyleOptions } from './buttonClassName';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
  loading?: boolean;
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClassName({ variant, size, className })}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
    >
      {loading && <Spinner size={16} label="" />}
      {children}
    </button>
  );
}

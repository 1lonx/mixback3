import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { ORDER_STATUS_LABELS, ROLE_LABELS, STATUS_LABELS } from '../../lib/labels';
import type { OrderStatus, ProjectStatus, Role } from '../../types/domain';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={cx(styles.badge, styles[tone])}>{children}</span>;
}

const STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  active: 'warning',
  approved: 'success',
  archived: 'neutral',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function RoleBadge({ value }: { value: Role }) {
  return <Badge>{ROLE_LABELS[value]}</Badge>;
}

const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'warning',
  in_progress: 'warning',
  delivered: 'warning',
  completed: 'success',
  declined: 'danger',
  cancelled: 'neutral',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

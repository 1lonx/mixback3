import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { OrderStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/buttonClassName';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/Dialog';
import { ErrorState, Skeleton } from '../components/ui/States';
import { Stars } from '../components/ui/Stars';
import {
  actOnOrder,
  fetchOrder,
  selectOrderDetail,
  selectOrderError,
  selectOrderStatus,
} from '../features/orders/orderSlice';
import { ChatPanel } from '../features/chat/ChatPanel';
import { selectUser } from '../features/auth/authSlice';
import { ReviewForm } from '../features/orders/ReviewForm';
import { pushToast } from '../features/toasts/toastsSlice';
import { errorMessage } from '../lib/errors';
import { formatDate, pluralize } from '../lib/format';
import { formatPrice, SERVICE_LABELS } from '../lib/labels';
import { useReveal } from '../lib/motion';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { OrderAction, OrderDetail, OrderStatus } from '../types/domain';
import styles from './OrderPage.module.css';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Заказ отправлен' },
  { status: 'in_progress', label: 'В работе' },
  { status: 'delivered', label: 'Сдан на проверку' },
  { status: 'completed', label: 'Завершён' },
];

const stepIndex = (status: OrderStatus) => STEPS.findIndex((s) => s.status === status);

interface ActionSpec {
  action: OrderAction;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  confirm?: { title: string; description: string };
}

function actionsFor(order: OrderDetail): ActionSpec[] {
  const engineer = order.side === 'engineer';
  switch (order.status) {
    case 'pending':
      return engineer
        ? [
            { action: 'accept', label: 'Принять заказ' },
            {
              action: 'decline',
              label: 'Отклонить',
              variant: 'danger',
              confirm: {
                title: 'Отклонить заказ?',
                description: 'Заказчик получит отказ. Передумать после этого нельзя.',
              },
            },
          ]
        : [
            {
              action: 'cancel',
              label: 'Отменить заказ',
              variant: 'danger',
              confirm: {
                title: 'Отменить заказ?',
                description:
                  'Звукорежиссёр ещё не ответил. После отмены заказ придётся оформить заново.',
              },
            },
          ];
    case 'in_progress':
      return engineer
        ? [{ action: 'deliver', label: 'Сдать работу' }]
        : [
            {
              action: 'cancel',
              label: 'Отменить заказ',
              variant: 'danger',
              confirm: {
                title: 'Отменить заказ?',
                description: 'Работа уже идёт. Проект уйдёт в архив, а заказ закроется.',
              },
            },
          ];
    case 'delivered':
      return engineer
        ? []
        : [
            { action: 'complete', label: 'Принять работу' },
            { action: 'revise', label: 'Нужны правки', variant: 'secondary' },
          ];
    default:
      return [];
  }
}

function hint(order: OrderDetail): string | null {
  const engineer = order.side === 'engineer';
  switch (order.status) {
    case 'pending':
      return engineer
        ? 'Прочитайте описание задачи. Если берёте заказ — примите его: появится проект для версий и правок.'
        : 'Ждём ответа звукорежиссёра. Обычно он отвечает в течение суток.';
    case 'in_progress':
      return engineer
        ? 'Загрузите версию микса в проект. Когда заказчик перестанет оставлять правки — сдайте работу.'
        : 'Звукорежиссёр работает. Слушайте версии в проекте и оставляйте правки прямо на волне.';
    case 'delivered':
      return engineer
        ? 'Работа сдана. Ждём решения заказчика: он примет её или вернёт с правками.'
        : 'Прослушайте последнюю версию. Всё устраивает — примите работу, нет — вернём на доработку.';
    case 'declined':
      return 'Звукорежиссёр отклонил заказ.';
    case 'cancelled':
      return 'Заказ отменён заказчиком.';
    default:
      return null;
  }
}

export function OrderPage() {
  const { orderId = '' } = useParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const detail = useAppSelector(selectOrderDetail);
  const status = useAppSelector(selectOrderStatus);
  const error = useAppSelector(selectOrderError);
  const rootRef = useRef<HTMLDivElement>(null);

  const [busy, setBusy] = useState<OrderAction | null>(null);
  const [pending, setPending] = useState<ActionSpec | null>(null);

  useEffect(() => {
    void dispatch(fetchOrder(orderId));
  }, [dispatch, orderId]);

  const order = detail?.id === orderId ? detail : null;
  useDocumentTitle(order ? order.serviceTitle : 'Заказ');
  useReveal(rootRef, '[data-reveal]', [Boolean(order)]);

  if (status === 'failed' && error && !order) {
    return (
      <ErrorState
        title={error.status === 404 ? 'Заказ не найден' : 'Не удалось загрузить заказ'}
        message={error.message}
        onRetry={error.status === 404 ? undefined : () => void dispatch(fetchOrder(orderId))}
      />
    );
  }

  if (!order) {
    return (
      <div className={styles.page} aria-busy="true" role="status" aria-label="Загружаем заказ">
        <Skeleton height={110} />
        <Skeleton height={160} />
      </div>
    );
  }

  const run = async (spec: ActionSpec) => {
    setBusy(spec.action);
    try {
      await dispatch(actOnOrder({ id: order.id, action: spec.action })).unwrap();
    } catch (failure) {
      dispatch(pushToast('error', errorMessage(failure, 'Не удалось выполнить действие')));
      void dispatch(fetchOrder(order.id));
    } finally {
      setBusy(null);
      setPending(null);
    }
  };

  const actions = actionsFor(order);
  const current = stepIndex(order.status);
  const closed = order.status === 'declined' || order.status === 'cancelled';
  const counterpart =
    order.side === 'client'
      ? { label: 'Звукорежиссёр', name: order.engineerName, to: `/engineers/${order.engineerId}` }
      : { label: 'Заказчик', name: order.clientName, to: null };
  const text = hint(order);

  return (
    <div className={styles.page} ref={rootRef}>
      <Link to={`/orders?side=${order.side}`} className={styles.back}>
        ← Все заказы
      </Link>

      <header className={styles.head} data-reveal>
        <div className={styles.headText}>
          <h1>{order.serviceTitle}</h1>
          <p className={styles.muted}>
            {SERVICE_LABELS[order.serviceKind]} · срок{' '}
            {pluralize(order.days, ['день', 'дня', 'дней'])} · оформлен{' '}
            {formatDate(order.createdAt)}
          </p>
        </div>
        <div className={styles.headSide}>
          <OrderStatusBadge status={order.status} />
          <strong className={styles.price}>{formatPrice(order.priceRub)}</strong>
        </div>
      </header>

      {!closed && (
        <ol className={styles.steps} aria-label="Ход заказа" data-reveal>
          {STEPS.map((step, index) => (
            <li
              key={step.status}
              className={index <= current ? styles.stepDone : styles.step}
              aria-current={index === current ? 'step' : undefined}
            >
              {step.label}
            </li>
          ))}
        </ol>
      )}

      {text && (
        <p className={styles.hint} role="status" data-reveal>
          {text}
        </p>
      )}

      {(actions.length > 0 || order.projectId) && (
        <div className={styles.actions} data-reveal>
          {order.projectId && (
            <Link
              to={`/projects/${order.projectId}`}
              className={buttonClassName({ variant: actions.length ? 'secondary' : 'primary' })}
            >
              Открыть проект
            </Link>
          )}
          {actions.map((spec) => (
            <Button
              key={spec.action}
              variant={spec.variant}
              loading={busy === spec.action}
              disabled={busy !== null}
              onClick={() => (spec.confirm ? setPending(spec) : void run(spec))}
            >
              {spec.label}
            </Button>
          ))}
        </div>
      )}

      <div className={styles.columns}>
        <Card className={styles.panel} aria-labelledby="brief-title" data-reveal>
          <h2 id="brief-title">Задача</h2>
          <p className={styles.brief}>{order.brief}</p>
        </Card>
        <Card className={styles.panel} aria-labelledby="who-title" data-reveal>
          <h2 id="who-title">Участники</h2>
          <dl className={styles.facts}>
            <div>
              <dt>{counterpart.label}</dt>
              <dd>
                {counterpart.to ? (
                  <Link to={counterpart.to}>{counterpart.name}</Link>
                ) : (
                  counterpart.name
                )}
              </dd>
            </div>
            <div>
              <dt>Ваша роль</dt>
              <dd>{order.side === 'client' ? 'Заказчик' : 'Звукорежиссёр'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {user && (
        <Card className={styles.panel} aria-labelledby="chat-title" data-reveal>
          <h2 id="chat-title">Переписка</h2>
          <ChatPanel
            orderId={order.id}
            currentUserId={user.id}
            readOnly={order.status === 'declined' || order.status === 'cancelled'}
          />
        </Card>
      )}

      {order.status === 'completed' && (
        <Card className={styles.panel} aria-labelledby="review-title" data-reveal>
          <h2 id="review-title">Отзыв</h2>
          {order.review ? (
            <div className={styles.review}>
              <Stars value={order.review.rating} />
              <p>{order.review.text || 'Без комментария'}</p>
              <p className={styles.muted}>
                {order.review.authorName}, {formatDate(order.review.createdAt)}
              </p>
            </div>
          ) : order.side === 'client' ? (
            <ReviewForm orderId={order.id} />
          ) : (
            <p className={styles.muted}>Заказчик ещё не оставил отзыв.</p>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.confirm?.title ?? ''}
        description={pending?.confirm?.description ?? ''}
        confirmLabel={pending?.label ?? ''}
        loading={busy !== null}
        onConfirm={() => pending && void run(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

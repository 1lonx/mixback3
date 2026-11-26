import { useCallback, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { OrderStatusBadge } from '../components/ui/Badge';
import { buttonClassName } from '../components/ui/buttonClassName';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import {
  fetchOrders,
  selectAllOrders,
  selectOrdersError,
  selectOrdersStatus,
} from '../features/orders/ordersSlice';
import { formatDate } from '../lib/format';
import { formatPrice, ORDER_SIDE_LABELS, ORDER_STATUS_LABELS } from '../lib/labels';
import { useReveal } from '../lib/motion';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { OrderSide, OrderStatus } from '../types/domain';
import styles from './OrdersPage.module.css';

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
const SIDES = Object.keys(ORDER_SIDE_LABELS) as OrderSide[];

export function OrdersPage() {
  useDocumentTitle('Заказы');
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();

  const side: OrderSide = params.get('side') === 'engineer' ? 'engineer' : 'client';
  const statusParam = params.get('status');
  const status: OrderStatus | 'all' = STATUSES.find((s) => s === statusParam) ?? 'all';

  const orders = useAppSelector(selectAllOrders);
  const loadStatus = useAppSelector(selectOrdersStatus);
  const error = useAppSelector(selectOrdersError);

  const update = useCallback(
    (patch: { side?: OrderSide; status?: OrderStatus | 'all' }) => {
      const next = { side, status, ...patch };
      const search = new URLSearchParams();
      if (next.side !== 'client') search.set('side', next.side);
      if (next.status !== 'all') search.set('status', next.status);
      setParams(search, { replace: true });
    },
    [setParams, side, status],
  );

  const load = useCallback(() => {
    void dispatch(fetchOrders({ side, status }));
  }, [dispatch, side, status]);
  useEffect(load, [load]);

  const listRef = useRef<HTMLDivElement>(null);
  useReveal(listRef, 'li', [loadStatus === 'succeeded']);

  let content;
  if (loadStatus === 'failed' && error) {
    content = <ErrorState message={error.message} onRetry={load} />;
  } else if (loadStatus === 'idle' || (loadStatus === 'loading' && orders.length === 0)) {
    content = (
      <div aria-hidden="true" className={styles.list}>
        <Skeleton height={84} />
        <Skeleton height={84} />
      </div>
    );
  } else if (orders.length === 0) {
    const mineAsClient = side === 'client' && status === 'all';
    content = (
      <EmptyState
        title={status === 'all' ? 'Заказов пока нет' : 'Нет заказов с таким статусом'}
        description={
          side === 'client'
            ? 'Выберите звукорежиссёра в каталоге, послушайте его работы и оформите первый заказ.'
            : 'Когда кто-то закажет вашу услугу, заказ появится здесь.'
        }
        action={
          mineAsClient ? (
            <Link to="/engineers" className={buttonClassName()}>
              Открыть каталог
            </Link>
          ) : undefined
        }
      />
    );
  } else {
    content = (
      <ul className={styles.list} aria-busy={loadStatus === 'loading'}>
        {orders.map((order) => (
          <li key={order.id}>
            <Card interactive className={styles.card}>
              <div className={styles.main}>
                <h3 className={styles.title}>
                  <Link to={`/orders/${order.id}`} className={styles.link}>
                    {order.serviceTitle}
                  </Link>
                </h3>
                <p className={styles.who}>
                  {order.side === 'client'
                    ? `Звукорежиссёр: ${order.engineerName}`
                    : `Заказчик: ${order.clientName}`}
                </p>
                <p className={styles.date}>Обновлён {formatDate(order.updatedAt)}</p>
              </div>
              <div className={styles.side}>
                <OrderStatusBadge status={order.status} />
                <strong>{formatPrice(order.priceRub)}</strong>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>Заказы</h1>
        <Link to="/engineers" className={buttonClassName({ variant: 'secondary' })}>
          Найти звукорежиссёра
        </Link>
      </div>

      <div className={styles.controls}>
        <SegmentedControl
          label="Роль в заказе"
          value={side}
          options={SIDES.map((value) => ({ value, label: ORDER_SIDE_LABELS[value] }))}
          onChange={(value) => update({ side: value })}
        />
        <Select
          label="Статус"
          name="status"
          value={status}
          onChange={(event) => update({ status: event.target.value as OrderStatus | 'all' })}
        >
          <option value="all">Все</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <p className="visually-hidden" role="status">
        {loadStatus === 'succeeded' ? `Найдено заказов: ${orders.length}` : 'Загружаем заказы…'}
      </p>

      <div ref={listRef}>{content}</div>
    </div>
  );
}

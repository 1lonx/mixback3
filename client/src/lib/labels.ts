import type {
  EngineerSort,
  OrderSide,
  OrderStatus,
  ProjectStatus,
  Role,
  ServiceKind,
  SortKey,
} from '../types/domain';

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'В работе',
  approved: 'Утверждён',
  archived: 'В архиве',
};

export const ROLE_LABELS: Record<Role, string> = { owner: 'Звукорежиссёр', artist: 'Артист' };

export const SORT_LABELS: Record<SortKey, string> = {
  updated: 'Недавно обновлённые',
  title: 'По названию',
  comments: 'По числу правок',
};

export const SERVICE_LABELS: Record<ServiceKind, string> = {
  mixing: 'Сведение',
  mastering: 'Мастеринг',
  vocal: 'Обработка вокала',
  editing: 'Монтаж и чистка',
};

export const ENGINEER_SORT_LABELS: Record<EngineerSort, string> = {
  rating: 'По рейтингу',
  price: 'Сначала дешевле',
  orders: 'По числу заказов',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Ждёт ответа',
  in_progress: 'В работе',
  delivered: 'Сдан на проверку',
  completed: 'Завершён',
  declined: 'Отклонён',
  cancelled: 'Отменён',
};

export const ORDER_SIDE_LABELS: Record<OrderSide, string> = {
  client: 'Я заказываю',
  engineer: 'Мне заказывают',
};

/** Цена с пробелом-разделителем тысяч: 12 500 ₽. */
export const formatPrice = (rub: number): string =>
  `${new Intl.NumberFormat('ru-RU').format(rub).replace(/\s/g, '\u00a0')}\u00a0₽`;

import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Select, Textarea } from '../../components/ui/Field';
import { errorMessage, isSerializedError, type FieldErrors } from '../../lib/errors';
import { pluralize } from '../../lib/format';
import { formatPrice, SERVICE_LABELS } from '../../lib/labels';
import { orderSchema, parseWith } from '../../lib/schemas';
import type { EngineerDetail } from '../../types/domain';
import { createOrder } from '../orders/orderSlice';
import { pushToast } from '../toasts/toastsSlice';
import styles from './OrderDialog.module.css';

interface OrderDialogProps {
  engineer: EngineerDetail;
  open: boolean;
  /** Услуга, выбранная кнопкой «Заказать» в списке. */
  initialServiceId: string | null;
  onClose: () => void;
}

/** Оформление заказа: услуга + описание задачи. Цена и срок берутся из услуги и копируются в заказ. */
export function OrderDialog({ engineer, open, initialServiceId, onClose }: OrderDialogProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [serviceId, setServiceId] = useState(initialServiceId ?? engineer.services[0]?.id ?? '');
  const [brief, setBrief] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const service = engineer.services.find((s) => s.id === serviceId);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setFormError(undefined);
    const parsed = parseWith(orderSchema, { engineerId: engineer.userId, serviceId, brief });
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const order = await dispatch(createOrder(parsed.data)).unwrap();
      dispatch(pushToast('success', 'Заказ отправлен. Звукорежиссёр ответит в разделе «Заказы».'));
      onClose();
      void navigate(`/orders/${order.id}`);
    } catch (error) {
      if (isSerializedError(error) && error.fieldErrors) setErrors(error.fieldErrors);
      setFormError(errorMessage(error, 'Не удалось оформить заказ'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} title={`Заказ у ${engineer.name}`} onClose={onClose}>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
        <Select
          label="Услуга"
          name="serviceId"
          value={serviceId}
          error={errors.serviceId}
          onChange={(event) => {
            setServiceId(event.target.value);
            setErrors((prev) => ({ ...prev, serviceId: '' }));
          }}
        >
          {engineer.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} — {formatPrice(s.priceRub)}
            </option>
          ))}
        </Select>

        {service && (
          <p className={styles.summary}>
            {SERVICE_LABELS[service.kind]} · {formatPrice(service.priceRub)} · срок{' '}
            {pluralize(service.days, ['день', 'дня', 'дней'])}
          </p>
        )}

        <Textarea
          label="Что нужно сделать"
          name="brief"
          value={brief}
          error={errors.brief}
          hint={`${brief.length}/500 · жанр, референсы, пожелания по звучанию`}
          onChange={(event) => {
            setBrief(event.target.value);
            setErrors((prev) => ({ ...prev, brief: '' }));
          }}
        />

        <p className={styles.note}>
          Оплата пока не подключена: это учебная версия. Звукорежиссёр увидит заказ и сможет принять
          или отклонить его.
        </p>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button type="submit" loading={submitting}>
            Отправить заказ
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, OrderStatusBadge, RoleBadge, StatusBadge } from './Badge';

const meta = { title: 'UI/Badge', component: Badge } satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStatuses: Story = {
  args: { children: 'Бейдж' },
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <StatusBadge status="active" />
      <StatusBadge status="approved" />
      <StatusBadge status="archived" />
      <RoleBadge value="owner" />
      <RoleBadge value="artist" />
      <Badge tone="danger">Ошибка</Badge>
    </div>
  ),
};

export const OrderStatuses: Story = {
  args: { children: 'Бейдж' },
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 420 }}>
      <OrderStatusBadge status="pending" />
      <OrderStatusBadge status="in_progress" />
      <OrderStatusBadge status="delivered" />
      <OrderStatusBadge status="completed" />
      <OrderStatusBadge status="declined" />
      <OrderStatusBadge status="cancelled" />
    </div>
  ),
};

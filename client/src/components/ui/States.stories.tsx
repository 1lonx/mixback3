import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { EmptyState, ErrorState, LoadingState, Skeleton } from './States';

const meta = {
  title: 'UI/States',
  decorators: [
    (Story) => (
      <div style={{ width: 460 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <EmptyState
      title="Пока нет ни одного проекта"
      description="Создайте проект, загрузите первый микс и отправьте ссылку артисту."
      action={<Button>Создать проект</Button>}
    />
  ),
};

export const ErrorWithRetry: Story = {
  render: () => (
    <ErrorState
      message="Нет соединения с сервером. Проверьте интернет и повторите попытку."
      onRetry={() => undefined}
    />
  ),
};

export const Loading: Story = { render: () => <LoadingState label="Загружаем проекты…" /> };

export const Skeletons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton height={22} width="40%" />
      <Skeleton height={26} width="75%" />
      <Skeleton height={64} />
    </div>
  ),
};

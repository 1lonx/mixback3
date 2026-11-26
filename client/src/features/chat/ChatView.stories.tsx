import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Message } from '../../types/domain';
import { ChatView } from './ChatView';

const msg = (id: number, authorId: string, authorName: string, text: string): Message => ({
  id: `m${id}`,
  orderId: 'o',
  authorId,
  authorName,
  text,
  createdAt: '2026-11-20T10:15:00.000Z',
});

const conversation: Message[] = [
  msg(1, 'lera', 'Лера', 'Привет! Референс — второй трек из прошлого EP.'),
  msg(2, 'alex', 'Алекс', 'Привет, Лера! Послушал, понял задачу. Первую версию пришлю завтра.'),
  msg(
    3,
    'alex',
    'Алекс',
    'Версия 1 готова — оставляйте правки прямо на волне.\nЕсли что-то непонятно — пишите сюда.',
  ),
  msg(4, 'lera', 'Лера', 'Отлично, слушаю!'),
];

const meta = {
  title: 'Market/ChatView',
  component: ChatView,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ width: 460 }}>
        <Story />
      </div>
    ),
  ],
  args: { currentUserId: 'lera', onSend: () => Promise.resolve() },
} satisfies Meta<typeof ChatView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Conversation: Story = { args: { messages: conversation } };
export const Empty: Story = { args: { messages: [] } };
export const Loading: Story = { args: { messages: [], loading: true } };
export const LoadError: Story = {
  args: {
    messages: [],
    loadError: 'Нет соединения с сервером. Проверьте интернет.',
    onRetry: () => undefined,
  },
};
export const ReadOnly: Story = { args: { messages: conversation, readOnly: true } };

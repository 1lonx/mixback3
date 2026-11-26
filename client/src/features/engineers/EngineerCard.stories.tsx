import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import type { EngineerSummary } from '../../types/domain';
import { EngineerCard } from './EngineerCard';

const base: EngineerSummary = {
  userId: 'u_alex',
  name: 'Алекс',
  headline: 'Сведение синтпопа и инди — быстро и по делу',
  genres: ['Поп', 'Электроника', 'Инди'],
  kinds: ['mixing', 'mastering'],
  minPrice: 2200,
  rating: 4.8,
  reviewsCount: 12,
  coverUrl: null,
  completedOrders: 14,
};

const meta = {
  title: 'Market/EngineerCard',
  component: EngineerCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ width: 320 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof EngineerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rated: Story = { args: { engineer: base } };

export const NewcomerWithoutReviews: Story = {
  args: {
    engineer: { ...base, name: 'Кира Ветрова', rating: null, reviewsCount: 0, completedOrders: 0 },
  },
};

export const LongTexts: Story = {
  args: {
    engineer: {
      ...base,
      name: 'Александр Константинопольский-Иванов',
      headline:
        'Свожу и мастерю всё подряд: от рока и метала до джаза и фолка, работаю с живыми барабанами и домашними записями',
      genres: ['Рок', 'Метал', 'Джаз', 'Фолк'],
      minPrice: 125000,
    },
  },
};

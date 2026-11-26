import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stars } from './Stars';

const meta = { title: 'UI/Stars', component: Stars } satisfies Meta<typeof Stars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ratings: Story = {
  args: { value: 4.8, count: 12 },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Stars value={4.8} count={12} />
      <Stars value={5} count={1} />
      <Stars value={3.5} count={27} />
      <Stars value={null} count={0} />
      <Stars value={5} />
    </div>
  ),
};

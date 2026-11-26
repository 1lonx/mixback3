import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';
import { StrengthMeter } from './StrengthMeter';

const meta = { title: 'UI/Profile', component: Avatar } satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Avatars: Story = {
  args: { name: 'Алекс' },
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Алекс" size={28} />
      <Avatar name="Лера К." size={48} />
      <Avatar name="Мартин Дым" size={72} />
    </div>
  ),
};

export const PasswordStrength: Story = {
  args: { name: '' },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 280 }}>
      <StrengthMeter password="abc" />
      <StrengthMeter password="Abcdefg1" />
      <StrengthMeter password="Tr0ub4dor&3-Horse" />
    </div>
  ),
};

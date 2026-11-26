import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge } from './Badge';
import { Card } from './Card';

const meta = {
  title: 'UI/Card',
  component: Card,
  args: { 'aria-label': 'Ночной город' },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const content = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <StatusBadge status="active" />
    <h3>Ночной город</h3>
    <p style={{ color: 'var(--muted)' }}>Лера К.</p>
    <p>3 версии · 6 правок</p>
  </div>
);

export const Default: Story = { args: { children: content } };
export const Interactive: Story = { args: { interactive: true, children: content } };

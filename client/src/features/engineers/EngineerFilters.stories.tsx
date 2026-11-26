import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { EngineersQuery } from '../../types/domain';
import { EngineerFilters } from './EngineerFilters';
import { DEFAULT_ENGINEERS_QUERY } from './query';

const meta = {
  title: 'Market/EngineerFilters',
  component: EngineerFilters,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EngineerFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

function Stateful({ initial }: { initial: EngineersQuery }) {
  const [query, setQuery] = useState(initial);
  return <EngineerFilters query={query} onChange={(patch) => setQuery({ ...query, ...patch })} />;
}

export const Default: Story = {
  args: { query: DEFAULT_ENGINEERS_QUERY, onChange: () => undefined },
  render: () => <Stateful initial={DEFAULT_ENGINEERS_QUERY} />,
};

export const WithFilters: Story = {
  args: { query: DEFAULT_ENGINEERS_QUERY, onChange: () => undefined },
  render: () => (
    <Stateful
      initial={{ q: 'вокал', kind: 'vocal', genre: 'Поп', maxPrice: 5000, sort: 'price' }}
    />
  ),
};

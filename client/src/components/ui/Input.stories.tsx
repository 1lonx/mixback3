import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input, Select, Textarea } from './Field';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { label: 'E-mail', placeholder: 'name@mail.ru' },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: 'alex@mixback.app' } };
export const WithHint: Story = {
  args: { label: 'Пароль', type: 'password', hint: 'Минимум 8 символов, буква и цифра' },
};
export const WithError: Story = {
  args: { defaultValue: 'не-почта', error: 'Введите корректный e-mail, например name@mail.ru' },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: 'demo@mixback.app' } };

export const TextareaField: Story = {
  render: () => (
    <Textarea label="Описание" defaultValue="Синтвейв, референс — The Midnight" hint="0/500" />
  ),
};

export const SelectField: Story = {
  render: () => (
    <Select label="Статус" defaultValue="active">
      <option value="active">В работе</option>
      <option value="approved">Утверждён</option>
      <option value="archived">В архиве</option>
    </Select>
  ),
};

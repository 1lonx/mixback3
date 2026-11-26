import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Badge, RoleBadge, StatusBadge } from './Badge';
import { Button } from './Button';
import { ConfirmDialog } from './Dialog';
import { Input, Select, Textarea } from './Field';
import { SegmentedControl } from './SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from './States';

describe('Button', () => {
  it('вызывает onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Сохранить</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('по умолчанию type="button": не отправляет форму случайно', () => {
    render(<Button>Ок</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('в состоянии loading заблокирована и помечена aria-busy', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Отправить
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Отправить' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disabled блокирует нажатие', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Нельзя
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'вариант %s рендерится',
    (variant) => {
      render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole('button', { name: variant })).toBeInTheDocument();
    },
  );
});

describe('Input', () => {
  it('подпись связана с полем', () => {
    render(<Input label="E-mail" />);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('показывает подсказку', () => {
    render(<Input label="Пароль" hint="Минимум 8 символов" />);
    expect(screen.getByLabelText('Пароль')).toHaveAccessibleDescription('Минимум 8 символов');
  });

  it('ошибка: aria-invalid, role=alert и описание поля; подсказка скрывается', () => {
    render(<Input label="E-mail" hint="Подсказка" error="Укажите e-mail" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Укажите e-mail');
    expect(screen.getByRole('alert')).toHaveTextContent('Укажите e-mail');
    expect(screen.queryByText('Подсказка')).not.toBeInTheDocument();
  });

  it('без ошибки нет aria-invalid', () => {
    render(<Input label="Имя" />);
    expect(screen.getByLabelText('Имя')).not.toHaveAttribute('aria-invalid');
  });

  it('пробрасывает value/onChange', async () => {
    const onChange = vi.fn();
    render(<Input label="Имя" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Имя'), 'ab');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('у каждого поля свой id', () => {
    render(
      <>
        <Input label="Первое" />
        <Input label="Второе" />
      </>,
    );
    expect(screen.getByLabelText('Первое').id).not.toBe(screen.getByLabelText('Второе').id);
  });
});

describe('Textarea и Select', () => {
  it('Textarea: подпись и ошибка', () => {
    render(<Textarea label="Описание" error="Слишком длинное" />);
    expect(screen.getByLabelText('Описание')).toHaveAccessibleDescription('Слишком длинное');
  });

  it('Select: выбор значения', async () => {
    const onChange = vi.fn();
    render(
      <Select label="Статус" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    await userEvent.selectOptions(screen.getByLabelText('Статус'), 'b');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText('Статус')).toHaveValue('b');
  });
});

describe('Badge', () => {
  it('StatusBadge показывает русскую подпись статуса', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Утверждён')).toBeInTheDocument();
  });

  it('RoleBadge показывает роль', () => {
    render(<RoleBadge value="artist" />);
    expect(screen.getByText('Артист')).toBeInTheDocument();
  });

  it('Badge рендерит содержимое', () => {
    render(<Badge tone="danger">Ошибка</Badge>);
    expect(screen.getByText('Ошибка')).toBeInTheDocument();
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'all', label: 'Все' },
    { value: 'open', label: 'Открытые' },
  ] as const;

  function Controlled() {
    const [value, setValue] = useState<'all' | 'open'>('all');
    return <SegmentedControl label="Фильтр" options={options} value={value} onChange={setValue} />;
  }

  it('это группа радиокнопок с подписью', () => {
    render(<Controlled />);
    expect(screen.getByRole('group', { name: 'Фильтр' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Все' })).toBeChecked();
  });

  it('переключается кликом', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('radio', { name: 'Открытые' }));
    expect(screen.getByRole('radio', { name: 'Открытые' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Все' })).not.toBeChecked();
  });

  it('переключается стрелками с клавиатуры', async () => {
    render(<Controlled />);
    screen.getByRole('radio', { name: 'Все' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Открытые' })).toBeChecked();
  });
});

describe('состояния: пусто / ошибка / загрузка', () => {
  it('EmptyState: заголовок, описание и действие', () => {
    render(
      <EmptyState
        title="Пусто"
        description="Нечего показывать"
        action={<button>Создать</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Пусто' })).toBeInTheDocument();
    expect(screen.getByText('Нечего показывать')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument();
  });

  it('ErrorState: объявляется как alert и вызывает повтор', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Нет сети" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Нет сети');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorState без onRetry не показывает кнопку', () => {
    render(<ErrorState message="Нет доступа" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('LoadingState: role=status с подписью', () => {
    render(<LoadingState label="Грузим проекты" />);
    expect(screen.getByRole('status')).toHaveTextContent('Грузим проекты');
  });
});

describe('ConfirmDialog', () => {
  const setup = (open = true) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={open}
        title="Удалить проект?"
        description="Это нельзя отменить"
        confirmLabel="Удалить"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel };
  };

  it('открытый диалог содержит заголовок и описание и подписан заголовком', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Удалить проект?' })).toBeInTheDocument();
    expect(screen.getByText('Это нельзя отменить')).toBeInTheDocument();
  });

  it('закрытый диалог не показывает содержимое', () => {
    setup(false);
    expect(screen.queryByText('Это нельзя отменить')).not.toBeInTheDocument();
  });

  it('подтверждение и отмена вызывают свои обработчики', async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('при loading обе кнопки заблокированы', () => {
    render(
      <ConfirmDialog
        open
        title="Удалить?"
        description="…"
        confirmLabel="Удалить"
        loading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();
  });
});

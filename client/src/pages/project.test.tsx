import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MockWaveSurfer from '../test/wavesurferMock';
import { renderApp } from '../test/utils';

const openProject = async (as: 'owner' | 'artist' = 'owner', route = '/projects/p_night') => {
  const view = await renderApp({ route, as });
  await screen.findByRole('heading', { name: 'Ночной город', level: 1 });
  await screen.findByText('Бочка бубнит, подрезать низ?');
  return view;
};

const commentsList = () => screen.getByRole('region', { name: 'Правки' });
const player = () => {
  const instance = MockWaveSurfer.instances.at(-1);
  if (!instance) throw new Error('плеер не создан');
  return instance;
};

describe('ProjectPage — владелец', () => {
  it('показывает проект, версию по умолчанию (последнюю) и её правки', async () => {
    await openProject();
    expect(screen.getByText('Лера К. · обновлён', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'v3' })).toBeChecked();
    expect(screen.getByText(/Правки по комментариям v2/)).toBeInTheDocument();
    expect(within(commentsList()).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('Открыто: 6 из 7')).toBeInTheDocument();
  });

  it('показывает громкость и пик версии', async () => {
    await openProject();
    expect(screen.getByText('−10.6 LUFS')).toBeInTheDocument();
    expect(screen.getByText('−0.3 dB')).toBeInTheDocument();
  });

  it('владельцу доступны управление проектом, чек-лист, участники и загрузка версии', async () => {
    await openProject();
    expect(screen.getByRole('link', { name: 'Редактировать' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI-чек-лист' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Участники' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Новая версия' })).toBeInTheDocument();
  });

  it('несуществующий проект — сообщение «не найден» без кнопки повтора', async () => {
    await renderApp({ route: '/projects/p_nope', as: 'owner' });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Проект не найден');
    expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument();
  });

  it('чужой проект (владелец другого проекта) недоступен — 404', async () => {
    await renderApp({ route: '/projects/p_summer', as: 'artist' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Проект не найден');
  });

  it('сетевая ошибка при загрузке — кнопка «Повторить» загружает проект', async () => {
    const { appApi } = await renderApp({ route: '/projects', as: 'owner' });
    await screen.findByRole('link', { name: 'Ночной город' });
    appApi.controls.set({ failNetwork: true });
    await userEvent.click(screen.getByRole('link', { name: 'Ночной город' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Нет соединения');
    appApi.controls.set({ failNetwork: false });
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(
      await screen.findByRole('heading', { name: 'Ночной город', level: 1 }),
    ).toBeInTheDocument();
  });

  describe('версии и плеер', () => {
    it('переключение версии показывает её правки и сохраняет версию в адресе', async () => {
      const { router } = await openProject();
      await userEvent.click(screen.getByRole('radio', { name: 'v2' }));
      expect(await screen.findByText('Вокал всё ещё тихий')).toBeInTheDocument();
      expect(screen.queryByText('Бочка бубнит, подрезать низ?')).not.toBeInTheDocument();
      expect(router.state.location.search).toBe('?v=2');
    });

    it('версия из адреса открывается сразу (ссылкой можно поделиться)', async () => {
      await renderApp({ route: '/projects/p_night?v=1', as: 'owner' });
      await screen.findByRole('heading', { name: 'Ночной город', level: 1 });
      expect(await screen.findByRole('radio', { name: 'v1' })).toBeChecked();
      expect(await screen.findByText('Правок пока нет')).toBeInTheDocument();
    });

    it('некорректный номер версии в адресе → последняя версия', async () => {
      await renderApp({ route: '/projects/p_night?v=99', as: 'owner' });
      expect(await screen.findByRole('radio', { name: 'v3' })).toBeChecked();
    });

    it('плеер создаётся один раз и загружает демо-трек', async () => {
      await openProject();
      await waitFor(() => expect(player().loadedUrl).toBe('/demo/track.mp3'));
      expect(MockWaveSurfer.instances).toHaveLength(1);
    });

    it('A/B: при смене версии плеер НЕ пересоздаётся, позиция и воспроизведение сохраняются', async () => {
      await openProject();
      await waitFor(() => expect(player().loadedUrl).toBe('/demo/track.mp3'));
      const ws = player();

      await act(async () => {
        await ws.play();
        ws.setTime(50);
      });
      await userEvent.click(screen.getByRole('radio', { name: 'v2' }));

      await screen.findByText('Вокал всё ещё тихий');
      await waitFor(() => expect(ws.time).toBe(50));
      expect(MockWaveSurfer.instances).toHaveLength(1);
      expect(ws.playing).toBe(true);
    });

    it('выравнивание по громкости: громкая версия притихает до самой тихой, переключатель возвращает 100 %', async () => {
      await openProject();
      await waitFor(() => expect(player().loadedUrl).not.toBeNull());
      const ws = player();

      expect(screen.getByLabelText(/Выровнять громкость версий/)).toBeChecked();
      expect(screen.getByText(/до −18.4 LUFS/)).toBeInTheDocument();
      await waitFor(() => expect(ws.volume).toBeCloseTo(0.407, 2));

      await userEvent.click(screen.getByLabelText(/Выровнять громкость версий/));
      expect(ws.volume).toBe(1);

      await userEvent.click(screen.getByLabelText(/Выровнять громкость версий/));
      await userEvent.click(screen.getByRole('radio', { name: 'v1' }));
      await waitFor(() => expect(ws.loadedUrl).not.toBeNull());
      expect(ws.volume).toBe(1);
    });

    it('кнопка «Играть/Пауза» управляет воспроизведением после загрузки волны', async () => {
      await openProject();
      const play = screen.getByRole('button', { name: 'Играть' });
      await waitFor(() => expect(play).toBeEnabled());
      await userEvent.click(play);
      expect(player().playing).toBe(true);
      expect(await screen.findByRole('button', { name: 'Пауза' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await userEvent.click(screen.getByRole('button', { name: 'Пауза' }));
      expect(player().playing).toBe(false);
    });

    it('перемотка ±5 с', async () => {
      await openProject();
      await waitFor(() => expect(player().duration).toBe(273));
      await userEvent.click(screen.getByRole('button', { name: '+5 с вперёд' }));
      expect(player().time).toBe(5);
      await userEvent.click(screen.getByRole('button', { name: '+5 с вперёд' }));
      await userEvent.click(screen.getByRole('button', { name: '−5 с назад' }));
      expect(player().time).toBe(5);
    });

    it('волна — slider с клавиатурным управлением', async () => {
      await openProject();
      await waitFor(() => expect(player().duration).toBe(273));
      const slider = screen.getByRole('slider', { name: 'Позиция воспроизведения' });
      expect(slider).toHaveAttribute('aria-valuemax', '273');
      expect(slider).toHaveAttribute('aria-valuetext', '0:00 из 4:33');

      slider.focus();
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      expect(player().time).toBe(10);
      await userEvent.keyboard('{ArrowLeft}');
      expect(player().time).toBe(5);
      await userEvent.keyboard('{End}');
      expect(player().time).toBe(273);
      await userEvent.keyboard('{Home}');
      expect(player().time).toBe(0);
      await userEvent.keyboard(' ');
      expect(player().playing).toBe(true);
    });

    it('флажки правок над волной перематывают к нужной секунде', async () => {
      await openProject();
      await waitFor(() => expect(player().duration).toBe(273));
      const markers = screen.getByRole('list', { name: 'Правки на таймкодах' });
      expect(within(markers).getAllByRole('button')).toHaveLength(7);
      await userEvent.click(within(markers).getByRole('button', { name: /Правка на 0:41/ }));
      expect(player().time).toBe(41);
    });

    it('решённая правка помечена на флажке', async () => {
      await openProject();
      expect(screen.getByRole('button', { name: /Правка на 2:30 \(решена\)/ })).toBeInTheDocument();
    });

    it('ошибка загрузки аудио показывается пользователю', async () => {
      await openProject();
      await waitFor(() => expect(player().loadedUrl).not.toBeNull());
      act(() => player().emit('error', new Error('Файл повреждён')));
      expect(
        await screen.findByText(/Не удалось загрузить аудио: Файл повреждён/),
      ).toBeInTheDocument();
    });
  });

  describe('правки', () => {
    it('клик по таймкоду в списке перематывает плеер', async () => {
      await openProject();
      await waitFor(() => expect(player().duration).toBe(273));
      await userEvent.click(within(commentsList()).getByRole('button', { name: 'Перейти к 0:34' }));
      expect(player().time).toBe(34);
    });

    it('добавление правки: таймкод берётся из плеера и фиксируется при наборе', async () => {
      await openProject();
      await waitFor(() => expect(player().duration).toBe(273));
      act(() => player().setTime(75));

      const time = screen.getByLabelText('Таймкод');
      await waitFor(() => expect(time).toHaveValue('1:15'));
      await userEvent.type(screen.getByLabelText('Что поправить'), 'Гитара слишком громкая');

      act(() => player().setTime(120));
      expect(time).toHaveValue('1:15');

      await userEvent.click(screen.getByRole('button', { name: 'Добавить правку' }));
      expect(await screen.findByText('Правка на 1:15 добавлена')).toBeInTheDocument();
      expect(await within(commentsList()).findByText('Гитара слишком громкая')).toBeInTheDocument();
      expect(screen.getByLabelText('Что поправить')).toHaveValue('');
      expect(screen.getByText('Открыто: 7 из 8')).toBeInTheDocument();
    });

    it('новая правка встаёт в список по порядку времени', async () => {
      await openProject();
      const time = screen.getByLabelText('Таймкод');
      await userEvent.clear(time);
      await userEvent.type(time, '0:20');
      await userEvent.type(screen.getByLabelText('Что поправить'), 'Ранняя правка');
      await userEvent.click(screen.getByRole('button', { name: 'Добавить правку' }));
      await within(commentsList()).findByText('Ранняя правка');
      const texts = within(commentsList())
        .getAllByRole('listitem')
        .map((li) => li.textContent);
      expect(texts[1]).toContain('Ранняя правка');
    });

    it('неверный формат таймкода и короткий текст — ошибки без запроса', async () => {
      await openProject();
      const time = screen.getByLabelText('Таймкод');
      await userEvent.clear(time);
      await userEvent.type(time, 'abc');
      await userEvent.type(screen.getByLabelText('Что поправить'), 'а');
      await userEvent.click(screen.getByRole('button', { name: 'Добавить правку' }));
      expect(await screen.findByText('Формат времени — м:сс, например 1:22')).toBeInTheDocument();

      await userEvent.clear(time);
      await userEvent.type(time, '1:00');
      await userEvent.click(screen.getByRole('button', { name: 'Добавить правку' }));
      expect(await screen.findByText('Комментарий — минимум 2 символа')).toBeInTheDocument();
    });

    it('таймкод больше длины трека отклоняется', async () => {
      await openProject();
      const time = screen.getByLabelText('Таймкод');
      await userEvent.clear(time);
      await userEvent.type(time, '59:00');
      await userEvent.type(screen.getByLabelText('Что поправить'), 'Слишком далеко');
      await userEvent.click(screen.getByRole('button', { name: 'Добавить правку' }));
      expect(await screen.findByText('Трек длится 4:33')).toBeInTheDocument();
    });

    it('«Решено» отмечает правку и обновляет счётчик', async () => {
      await openProject();
      const item = screen.getByText('Бочка бубнит, подрезать низ?').closest('li')!;
      await userEvent.click(within(item).getByRole('button', { name: 'Решено' }));
      expect(await within(item).findByRole('button', { name: 'Вернуть' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByText('Открыто: 5 из 7')).toBeInTheDocument();
    });

    it('фильтры «Открытые» и «Решённые»', async () => {
      await openProject();
      await userEvent.click(screen.getByRole('radio', { name: 'Решённые' }));
      expect(within(commentsList()).getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByText('Расширить стерео на гитарах')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('radio', { name: 'Открытые' }));
      expect(within(commentsList()).getAllByRole('listitem')).toHaveLength(6);
      expect(screen.queryByText('Расширить стерео на гитарах')).not.toBeInTheDocument();
    });

    it('удаление правки требует подтверждения', async () => {
      await openProject();
      const item = screen.getByText('Хэты слишком яркие, убрать немного верха').closest('li')!;
      await userEvent.click(within(item).getByRole('button', { name: 'Удалить правку на 1:23' }));

      const dialog = await screen.findByRole('dialog', { name: 'Удалить правку?' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
      expect(screen.getByText('Хэты слишком яркие, убрать немного верха')).toBeInTheDocument();

      await userEvent.click(within(item).getByRole('button', { name: 'Удалить правку на 1:23' }));
      await userEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Удалить' }),
      );
      await waitFor(() =>
        expect(
          screen.queryByText('Хэты слишком яркие, убрать немного верха'),
        ).not.toBeInTheDocument(),
      );
      expect(await screen.findByText('Правка удалена')).toBeInTheDocument();
    });

    it('при сетевой ошибке отметка «решено» откатывается и показывается уведомление', async () => {
      const { appApi } = await openProject();
      const item = screen.getByText('Бочка бубнит, подрезать низ?').closest('li')!;
      appApi.controls.set({ failNetwork: true });
      await userEvent.click(within(item).getByRole('button', { name: 'Решено' }));
      expect(await screen.findByText(/Нет соединения с сервером/)).toBeInTheDocument();
      expect(within(item).getByRole('button', { name: 'Решено' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(screen.getByText('Открыто: 6 из 7')).toBeInTheDocument();
    });

    it('сетевая ошибка при добавлении правки: текст сохраняется в поле', async () => {
      const { appApi } = await openProject();
      await userEvent.type(screen.getByLabelText('Что поправить'), 'Не потеряется');
      appApi.controls.set({ failNetwork: true });
      await userEvent.click(screen.getByRole('button', { name: 'Добавить правку' }));
      expect(await screen.findByText(/Нет соединения с сервером/)).toBeInTheDocument();
      expect(screen.getByLabelText('Что поправить')).toHaveValue('Не потеряется');
    });

    it('в пустой версии показывается подсказка, а не пустой экран', async () => {
      await renderApp({ route: '/projects/p_night?v=1', as: 'owner' });
      expect(await screen.findByText('Правок пока нет')).toBeInTheDocument();
    });
  });

  describe('AI-чек-лист', () => {
    it('до генерации — пояснение и кнопка', async () => {
      await openProject();
      expect(await screen.findByText(/превратит открытые правки/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Собрать из правок' })).toBeInTheDocument();
    });

    it('генерация группирует правки по категориям, пункты можно отмечать', async () => {
      await openProject();
      await userEvent.click(screen.getByRole('button', { name: 'Собрать из правок' }));

      const lowGroup = await screen.findByRole('region', { name: 'Низ и бас' });
      expect(within(lowGroup).getByText('Бочка бубнит, подрезать низ?')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Вокал' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Верха' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Пространство' })).not.toBeInTheDocument();
      expect(screen.getByText(/Выполнено 0 из/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Пересобрать' })).toBeInTheDocument();

      await userEvent.click(within(lowGroup).getByRole('checkbox'));
      expect(await screen.findByText(/Выполнено 1 из/)).toBeInTheDocument();
    });

    it('таймкод пункта перематывает плеер', async () => {
      await openProject();
      await waitFor(() => expect(player().duration).toBe(273));
      await userEvent.click(screen.getByRole('button', { name: 'Собрать из правок' }));
      const lowGroup = await screen.findByRole('region', { name: 'Низ и бас' });
      await userEvent.click(within(lowGroup).getByRole('button', { name: 'Перейти к 0:34' }));
      expect(player().time).toBe(34);
    });

    it('если открытых правок нет — понятное пустое состояние', async () => {
      await openProject();
      for (const button of screen.getAllByRole('button', { name: 'Решено' }))
        await userEvent.click(button);
      await waitFor(() => expect(screen.getByText('Открыто: 0 из 7')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: 'Собрать из правок' }));
      expect(await screen.findByText(/Открытых правок нет — чек-лист пуст/)).toBeInTheDocument();
    });

    it('ошибка генерации — сообщение и повтор', async () => {
      const { appApi } = await openProject();
      appApi.controls.set({ failNetwork: true });
      await userEvent.click(screen.getByRole('button', { name: 'Собрать из правок' }));
      const alert = await screen.findByText('Не удалось собрать чек-лист');
      expect(alert).toBeInTheDocument();

      appApi.controls.set({ failNetwork: false });
      await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
      expect(await screen.findByRole('region', { name: 'Низ и бас' })).toBeInTheDocument();
    });

    it('сохранённый чек-лист подгружается при открытии проекта', async () => {
      const { appApi } = await openProject();
      await userEvent.click(screen.getByRole('button', { name: 'Собрать из правок' }));
      await screen.findByRole('region', { name: 'Низ и бас' });
      await appApi.api.checklist.get('v_p_night_3').then((c) => expect(c).not.toBeNull());
    });
  });

  describe('участники и приглашения', () => {
    it('показывает участников с ролями', async () => {
      await openProject();
      const panel = screen.getByRole('heading', { name: 'Участники' }).closest('section')!;
      expect(within(panel).getByText('Алекс')).toBeInTheDocument();
      expect(within(panel).getByText('Лера')).toBeInTheDocument();
      expect(within(panel).getByText('Звукорежиссёр')).toBeInTheDocument();
      expect(within(panel).getByText('Артист')).toBeInTheDocument();
    });

    it('приглашение незарегистрированного e-mail — ошибка у поля', async () => {
      await openProject();
      await userEvent.type(screen.getByLabelText('Пригласить артиста'), 'ghost@mail.ru');
      await userEvent.click(screen.getByRole('button', { name: 'Пригласить' }));
      expect(await screen.findByText(/ещё не зарегистрирован в Mixback/)).toBeInTheDocument();
    });

    it('повторное приглашение и некорректный e-mail', async () => {
      await openProject();
      const input = screen.getByLabelText('Пригласить артиста');
      await userEvent.type(input, 'artist@mixback.app');
      await userEvent.click(screen.getByRole('button', { name: 'Пригласить' }));
      expect(
        await screen.findByText('Этот пользователь уже участвует в проекте'),
      ).toBeInTheDocument();

      await userEvent.clear(input);
      await userEvent.type(input, 'не-почта');
      await userEvent.click(screen.getByRole('button', { name: 'Пригласить' }));
      expect(await screen.findByText(/Введите корректный e-mail/)).toBeInTheDocument();
    });

    it('успешное приглашение добавляет участника в список', async () => {
      const { appApi } = await openProject();
      await appApi.api.auth.register({ name: 'Дым', email: 'dym@mail.ru', password: 'secret123' });
      await appApi.api.auth.login({ email: 'demo@mixback.app', password: 'demo1234' });

      await userEvent.type(screen.getByLabelText('Пригласить артиста'), 'dym@mail.ru');
      await userEvent.click(screen.getByRole('button', { name: 'Пригласить' }));
      expect(await screen.findByText('Артист добавлен в проект')).toBeInTheDocument();
      const panel = screen.getByRole('heading', { name: 'Участники' }).closest('section')!;
      expect(await within(panel).findByText('Дым')).toBeInTheDocument();
    });
  });

  describe('удаление проекта', () => {
    it('отмена оставляет проект', async () => {
      await openProject();
      await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
      const dialog = await screen.findByRole('dialog', { name: 'Удалить проект?' });
      expect(dialog).toHaveTextContent('«Ночной город» будет удалён вместе со всеми версиями');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
      expect(screen.getByRole('heading', { name: 'Ночной город', level: 1 })).toBeInTheDocument();
    });

    it('подтверждение удаляет проект и возвращает к списку', async () => {
      const { router } = await openProject();
      await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
      await userEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Удалить проект' }),
      );

      expect(await screen.findByText('Проект «Ночной город» удалён')).toBeInTheDocument();
      await waitFor(() => expect(router.state.location.pathname).toBe('/projects'));
      expect(await screen.findByRole('link', { name: 'Летний EP — Intro' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Ночной город' })).not.toBeInTheDocument();
    });

    it('ошибка удаления: проект остаётся, диалог закрывается, есть уведомление', async () => {
      const { appApi } = await openProject();
      await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
      const dialog = await screen.findByRole('dialog');
      appApi.controls.set({ failNetwork: true });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Удалить проект' }));
      expect(await screen.findByText(/Нет соединения с сервером/)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Ночной город', level: 1 })).toBeInTheDocument();
    });
  });
});

describe('ProjectPage — артист', () => {
  it('видит проект и правки, но не видит управление проектом, чек-лист и загрузку', async () => {
    await openProject('artist');
    expect(screen.getAllByText('Артист').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Редактировать' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'AI-чек-лист' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Новая версия' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Пригласить артиста')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Участники' })).toBeInTheDocument();
  });

  it('может оставить правку', async () => {
    await openProject('artist');
    await userEvent.type(screen.getByLabelText('Что поправить'), 'Мне нравится, но чуть тише бас');
    await userEvent.click(screen.getByRole('button', { name: 'Добавить правку' }));
    const item = (
      await within(commentsList()).findByText('Мне нравится, но чуть тише бас')
    ).closest('li')!;
    expect(item).toHaveTextContent('Лера (вы)');
  });

  it('может отметить решённой и удалить только свою правку, чужую — нет', async () => {
    await openProject('artist');
    const own = screen.getByText('Бочка бубнит, подрезать низ?').closest('li')!;
    expect(within(own).getByRole('button', { name: 'Решено' })).toBeInTheDocument();
    expect(within(own).getByRole('button', { name: /Удалить правку/ })).toBeInTheDocument();

    const foreign = screen.getByText(/Ревер на вокале слишком длинный/).closest('li')!;
    expect(within(foreign).queryByRole('button')).toHaveProperty('tagName', 'BUTTON');
    expect(within(foreign).queryByRole('button', { name: 'Решено' })).not.toBeInTheDocument();
    expect(
      within(foreign).queryByRole('button', { name: /Удалить правку/ }),
    ).not.toBeInTheDocument();
  });

  it('на пустом проекте без версий — понятное сообщение', async () => {
    const { appApi } = await renderApp({ route: '/projects', as: 'owner' });
    const created = await appApi.api.projects.create({
      title: 'Пустой',
      artist: 'Дым',
      description: '',
    });
    await appApi.api.auth.register({
      name: 'Гость',
      email: 'guest@mail.ru',
      password: 'secret123',
    });
    await appApi.api.auth.login({ email: 'demo@mixback.app', password: 'demo1234' });
    await appApi.api.projects.invite(created.id, 'guest@mail.ru');
    await appApi.api.auth.login({ email: 'guest@mail.ru', password: 'secret123' });
    const view = await renderApp({ appApi, route: `/projects/${created.id}` });
    expect(await view.findByText('Версий пока нет')).toBeInTheDocument();
    expect(screen.getByText(/ещё не загрузил ни одной версии/)).toBeInTheDocument();
  });
});

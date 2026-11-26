import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_ENGINEERS, DEMO_PASSWORD } from '../../lib/demoAccounts';
import { MAX_COVER_BYTES } from '../../lib/schemas';
import { createTestApi, renderApp } from '../../test/utils';

// В jsdom нет canvas и createImageBitmap — сжатие подменяем, остальной путь настоящий.
const compressImage = vi.hoisted(() => vi.fn());
vi.mock('../../lib/image', () => ({ compressImage }));

const jpeg = (size = 10) => new Blob([new Uint8Array(size)], { type: 'image/jpeg' });
const login = (api: ReturnType<typeof createTestApi>['api'], email: string) =>
  api.auth.login({ email, password: DEMO_PASSWORD });

beforeEach(() => {
  compressImage.mockReset();
  compressImage.mockResolvedValue(jpeg());
});

describe('API: счётчик опубликованных и обложка', () => {
  it('count считает только опубликованные анкеты и растёт после публикации', async () => {
    const { api } = createTestApi();
    const before = await api.engineers.count();
    expect(before).toBe(5);

    await login(api, DEMO_ENGINEERS[0].email);
    const mine = (await api.engineers.mine())!.profile;
    await api.engineers.save({ ...mine, published: false });
    expect(await api.engineers.count()).toBe(before - 1);
    await api.engineers.save({ ...mine, published: true });
    expect(await api.engineers.count()).toBe(before);
  });

  it('обложка сохраняется, видна в каталоге, переживает правку анкеты и удаляется', async () => {
    const { api } = createTestApi();
    await login(api, DEMO_ENGINEERS[0].email);
    expect((await api.engineers.get(DEMO_ENGINEERS[0].id)).coverUrl).toBeNull();

    await api.engineers.setCover(jpeg());
    const query = { q: '', kind: 'all', genre: 'all', maxPrice: null, sort: 'rating' } as const;
    const card = (await api.engineers.list(query)).find((e) => e.userId === DEMO_ENGINEERS[0].id);
    expect(card?.coverUrl).toMatch(/^data:image\/jpeg;base64,/);

    const mine = (await api.engineers.mine())!.profile;
    await api.engineers.save({ ...mine, headline: 'Новый заголовок для проверки' });
    expect((await api.engineers.get(DEMO_ENGINEERS[0].id)).coverUrl).not.toBeNull();

    await api.engineers.setCover(null);
    expect((await api.engineers.get(DEMO_ENGINEERS[0].id)).coverUrl).toBeNull();
  });

  it('отклоняет не-картинку и слишком тяжёлый файл; без анкеты — 409; без входа — 401', async () => {
    const { api } = createTestApi();
    await expect(api.engineers.setCover(jpeg())).rejects.toMatchObject({ status: 401 });

    await login(api, DEMO_ENGINEERS[0].email);
    await expect(
      api.engineers.setCover(new Blob(['x'], { type: 'text/html' })),
    ).rejects.toMatchObject({ status: 400 });
    await expect(api.engineers.setCover(jpeg(MAX_COVER_BYTES + 1))).rejects.toMatchObject({
      status: 413,
    });

    const fresh = createTestApi().api;
    await fresh.auth.register({ name: 'Новый', email: 'new@mail.ru', password: 'password1' });
    await expect(fresh.engineers.setCover(jpeg())).rejects.toMatchObject({
      status: 409,
      code: 'NO_PROFILE',
    });
  });
});

describe('страница каталога', () => {
  it('показывает общее число опубликованных анкет и число под фильтром', async () => {
    await renderApp({ route: '/engineers' });
    expect(await screen.findByText(/Опубликовано анкет/)).toHaveTextContent(
      'Опубликовано анкет: 5',
    );

    await userEvent.type(screen.getByRole('searchbox'), 'Илья');
    await waitFor(() =>
      expect(screen.getByText(/Опубликовано анкет/)).toHaveTextContent(
        'Опубликовано анкет: 5 · подходит под фильтры: 1',
      ),
    );
  });
});

describe('загрузка обложки в анкете', () => {
  it('выбранная картинка сжимается, сохраняется и показывается; её можно удалить', async () => {
    await renderApp({ route: '/profile/engineer', as: 'owner' });
    const panel = (await screen.findByRole('heading', { name: 'Обложка' })).closest('section')!;
    expect(within(panel).queryByRole('img')).not.toBeInTheDocument();

    await userEvent.upload(
      within(panel).getByLabelText('Картинка'),
      new File(['x'], 'cover.jpg', { type: 'image/jpeg' }),
    );
    expect(compressImage).toHaveBeenCalledOnce();
    expect(await within(panel).findByRole('img', { name: /Текущая обложка/ })).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('button', { name: 'Удалить обложку' }));
    await waitFor(() => expect(within(panel).queryByRole('img')).not.toBeInTheDocument());
  });

  it('файл не картинка — понятная ошибка, сжатие не запускается', async () => {
    await renderApp({ route: '/profile/engineer', as: 'owner' });
    const panel = (await screen.findByRole('heading', { name: 'Обложка' })).closest('section')!;
    await userEvent.upload(
      within(panel).getByLabelText('Картинка'),
      new File(['x'], 'a.gif', { type: 'image/gif' }),
      { applyAccept: false },
    );
    expect(await within(panel).findByText(/JPEG, PNG или WebP/)).toBeInTheDocument();
    expect(compressImage).not.toHaveBeenCalled();
  });

  it('ошибка сжатия показывается в поле', async () => {
    compressImage.mockRejectedValue(new Error('Не удалось открыть картинку.'));
    await renderApp({ route: '/profile/engineer', as: 'owner' });
    const panel = (await screen.findByRole('heading', { name: 'Обложка' })).closest('section')!;
    await userEvent.upload(
      within(panel).getByLabelText('Картинка'),
      new File(['x'], 'broken.jpg', { type: 'image/jpeg' }),
    );
    expect(await within(panel).findByText('Не удалось открыть картинку.')).toBeInTheDocument();
  });
});

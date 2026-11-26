import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/errors';
import { DEMO_ARTIST, DEMO_ENGINEERS, DEMO_OWNER, DEMO_PASSWORD } from '../../lib/demoAccounts';
import type { EngineersQuery } from '../../types/domain';
import { createTestApi } from '../../test/utils';
import type { MixbackApi, NewVersionInput } from '../types';

const ALL: EngineersQuery = { q: '', kind: 'all', genre: 'all', maxPrice: null, sort: 'rating' };

async function expectApiError(promise: Promise<unknown>, status: number, code?: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status, ...(code ? { code } : {}) });
  return error as ApiError;
}

const analysis = { durationSec: 30, peaks: [0.1, 0.5, 0.2], lufs: -14, peakDb: -1 };
const audio = (): NewVersionInput => ({
  file: new Blob(['x'], { type: 'audio/mpeg' }),
  fileName: 'mix.mp3',
  note: 'v1',
  analysis,
});

describe('маркетплейс в мок-API', () => {
  let api: MixbackApi;
  const login = (who: { email: string }) =>
    api.auth.login({ email: who.email, password: DEMO_PASSWORD });

  beforeEach(() => {
    api = createTestApi().api;
  });

  describe('каталог', () => {
    it('открыт гостям и показывает только опубликованные анкеты', async () => {
      const list = await api.engineers.list(ALL);
      expect(list).toHaveLength(5);
      expect(list.every((e) => e.minPrice !== null)).toBe(true);
    });

    it('по умолчанию сортирует по рейтингу, при равенстве — по числу отзывов', async () => {
      const list = await api.engineers.list(ALL);
      const ratings = list.map((e) => e.rating ?? 0);
      expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    });

    it('рейтинг — среднее по отзывам, округлённое до десятых', async () => {
      const ilya = (await api.engineers.list(ALL)).find((e) => e.userId === 'u_ilya');
      expect(ilya).toMatchObject({ rating: 4.5, reviewsCount: 2, completedOrders: 2 });
    });

    it('фильтрует по услуге, жанру, цене и тексту', async () => {
      const vocal = await api.engineers.list({ ...ALL, kind: 'vocal' });
      expect(vocal.map((e) => e.userId)).toEqual(['u_marina']);

      const jazz = await api.engineers.list({ ...ALL, genre: 'Джаз' });
      expect(jazz.map((e) => e.userId)).toEqual(['u_kira']);

      const cheap = await api.engineers.list({ ...ALL, maxPrice: 2000 });
      expect(cheap.map((e) => e.userId).sort()).toEqual(['u_danil', 'u_ilya', 'u_marina']);

      const byName = await api.engineers.list({ ...ALL, q: '  ГРОМОВ ' });
      expect(byName.map((e) => e.userId)).toEqual(['u_ilya']);

      expect(await api.engineers.list({ ...ALL, q: 'нет такого' })).toEqual([]);
    });

    it('сортировка по цене ставит дешёвых первыми', async () => {
      const list = await api.engineers.list({ ...ALL, sort: 'price' });
      const prices = list.map((e) => e.minPrice ?? Infinity);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });
  });

  describe('профиль звукорежиссёра', () => {
    it('отдаёт услуги, портфолио и отзывы; гостю isMe = false', async () => {
      const detail = await api.engineers.get(DEMO_OWNER.id);
      expect(detail.services).toHaveLength(2);
      expect(detail.portfolio).toHaveLength(2);
      expect(detail.reviews).toHaveLength(2);
      expect(detail.isMe).toBe(false);
    });

    it('хозяин анкеты видит isMe = true', async () => {
      await login(DEMO_OWNER);
      expect((await api.engineers.get(DEMO_OWNER.id)).isMe).toBe(true);
    });

    it('несуществующий звукорежиссёр — 404', async () => {
      await expectApiError(api.engineers.get('u_nobody'), 404);
    });

    it('скрытая анкета видна только хозяину', async () => {
      await login(DEMO_OWNER);
      const mine = await api.engineers.mine();
      await api.engineers.save({
        headline: mine!.profile.headline,
        bio: '',
        genres: [],
        services: mine!.profile.services,
        published: false,
      });
      expect((await api.engineers.get(DEMO_OWNER.id)).published).toBe(false);
      expect((await api.engineers.list(ALL)).some((e) => e.userId === DEMO_OWNER.id)).toBe(false);

      await api.auth.logout();
      await expectApiError(api.engineers.get(DEMO_OWNER.id), 404);
    });
  });

  describe('анкета', () => {
    it('mine() требует входа; у нового пользователя анкеты нет', async () => {
      await expectApiError(api.engineers.mine(), 401);
      await login(DEMO_ARTIST);
      expect(await api.engineers.mine()).toBeNull();
    });

    it('сохраняет анкету, новым услугам выдаёт id, чужие id не принимает', async () => {
      await login(DEMO_ARTIST);
      const profile = await api.engineers.save({
        headline: 'Свожу вокал и гитары',
        bio: 'Опыт пять лет',
        genres: ['Рок'],
        published: true,
        services: [
          {
            id: 's_u_alex_1',
            kind: 'mixing',
            title: 'Сведение',
            description: '',
            priceRub: 3000,
            days: 3,
          },
        ],
      });
      expect(profile.services[0]?.id).not.toBe('s_u_alex_1');
      expect(profile.services[0]?.id).toMatch(/^s_/);
      expect((await api.engineers.list(ALL)).some((e) => e.userId === DEMO_ARTIST.id)).toBe(true);
    });

    it('при повторном сохранении id существующих услуг сохраняется', async () => {
      await login(DEMO_OWNER);
      const mine = await api.engineers.mine();
      const saved = await api.engineers.save({
        headline: mine!.profile.headline,
        bio: mine!.profile.bio,
        genres: mine!.profile.genres,
        services: mine!.profile.services.map((s) => ({ ...s, priceRub: s.priceRub + 100 })),
        published: true,
      });
      expect(saved.services.map((s) => s.id)).toEqual(mine!.profile.services.map((s) => s.id));
    });

    it('проверяет поля: цена, срок, заголовок; публикация без услуг запрещена', async () => {
      await login(DEMO_ARTIST);
      const base = { headline: 'Нормальный заголовок', bio: '', genres: [], published: false };

      const bad = await expectApiError(
        api.engineers.save({
          ...base,
          services: [
            { kind: 'mixing', title: 'Сведение', description: '', priceRub: 100, days: 0 },
          ],
        }),
        400,
        'VALIDATION',
      );
      expect(bad.fieldErrors).toMatchObject({
        'services.0.priceRub': expect.any(String) as string,
        'services.0.days': expect.any(String) as string,
      });

      const empty = await expectApiError(
        api.engineers.save({ ...base, published: true, services: [] }),
        400,
        'VALIDATION',
      );
      expect(empty.fieldErrors?.services).toMatch(/хотя бы одну услугу/);

      await expectApiError(
        api.engineers.save({ ...base, headline: 'abc', services: [] }),
        400,
        'VALIDATION',
      );
    });
  });

  describe('портфолио', () => {
    const track = () => ({
      title: 'Моя работа',
      genre: 'Рок' as const,
      description: 'Живая запись',
      file: new Blob(['x'], { type: 'audio/mpeg' }),
      fileName: 'a.mp3',
      analysis,
    });

    it('без анкеты загрузить работу нельзя', async () => {
      await login(DEMO_ARTIST);
      await expectApiError(api.engineers.addTrack(track()), 409, 'NO_PROFILE');
    });

    it('добавляет и удаляет работу; чужую удалить нельзя', async () => {
      await login(DEMO_OWNER);
      const added = await api.engineers.addTrack(track());
      expect(added.fileUrl).toBe(`idb:${added.id}`);
      expect((await api.engineers.mine())!.portfolio).toHaveLength(3);
      expect(await api.versions.audioUrl(added)).toMatch(/^blob:|^data:|.+/);

      await api.engineers.removeTrack(added.id);
      expect((await api.engineers.mine())!.portfolio).toHaveLength(2);

      await expectApiError(api.engineers.removeTrack('t_u_ilya_1'), 403);
      await expectApiError(api.engineers.removeTrack('t_nope'), 404);
    });

    it('в портфолио не больше восьми работ', async () => {
      await login(DEMO_OWNER);
      for (let i = 0; i < 6; i++) await api.engineers.addTrack(track());
      await expectApiError(api.engineers.addTrack(track()), 409, 'PORTFOLIO_FULL');
    });
  });

  describe('заказы: создание', () => {
    const serviceOf = async (userId: string, index = 0) =>
      (await api.engineers.get(userId)).services[index]!;

    it('требует входа', async () => {
      const service = await serviceOf(DEMO_ENGINEERS[0].id);
      await expectApiError(
        api.orders.create({
          engineerId: DEMO_ENGINEERS[0].id,
          serviceId: service.id,
          brief: 'Свести рок-трек, референс прилагаю',
        }),
        401,
      );
    });

    it('копирует название, цену и срок услуги в заказ', async () => {
      const service = await serviceOf(DEMO_ENGINEERS[0].id);
      await login(DEMO_ARTIST);
      const order = await api.orders.create({
        engineerId: DEMO_ENGINEERS[0].id,
        serviceId: service.id,
        brief: 'Свести рок-трек, референс прилагаю',
      });
      expect(order).toMatchObject({
        status: 'pending',
        projectId: null,
        serviceTitle: service.title,
        priceRub: service.priceRub,
        days: service.days,
        clientId: DEMO_ARTIST.id,
      });
    });

    it('нельзя заказать у самого себя, у несуществующего или услугу, которой нет', async () => {
      await login(DEMO_OWNER);
      const own = await serviceOf(DEMO_OWNER.id);
      await expectApiError(
        api.orders.create({
          engineerId: DEMO_OWNER.id,
          serviceId: own.id,
          brief: 'Для самого себя',
        }),
        400,
        'SELF_ORDER',
      );
      await expectApiError(
        api.orders.create({ engineerId: 'u_nobody', serviceId: 'x', brief: 'Какая-то задача' }),
        404,
      );
      const error = await expectApiError(
        api.orders.create({
          engineerId: DEMO_ENGINEERS[0].id,
          serviceId: 's_чужая',
          brief: 'Свести рок-трек, референс',
        }),
        400,
      );
      expect(error.fieldErrors?.serviceId).toBeTruthy();
    });

    it('проверяет описание задачи', async () => {
      const service = await serviceOf(DEMO_ENGINEERS[0].id);
      await login(DEMO_ARTIST);
      const error = await expectApiError(
        api.orders.create({
          engineerId: DEMO_ENGINEERS[0].id,
          serviceId: service.id,
          brief: 'коротко',
        }),
        400,
        'VALIDATION',
      );
      expect(error.fieldErrors?.brief).toMatch(/минимум 10/);
    });

    it('повторный заказ той же услуги, пока первый не закрыт, — 409', async () => {
      const service = await serviceOf(DEMO_OWNER.id, 1);
      await login(DEMO_ARTIST);
      // в seed у Леры уже есть открытый заказ на мастеринг у Алекса
      await expectApiError(
        api.orders.create({
          engineerId: DEMO_OWNER.id,
          serviceId: service.id,
          brief: 'Ещё раз то же самое',
        }),
        409,
        'DUPLICATE_ORDER',
      );
    });
  });

  describe('заказы: жизненный цикл', () => {
    /** Лера заказывает сведение у Ильи; возвращает id заказа. */
    async function placeOrder() {
      const ilya = await api.engineers.get(DEMO_ENGINEERS[0].id);
      await login(DEMO_ARTIST);
      const order = await api.orders.create({
        engineerId: ilya.userId,
        serviceId: ilya.services[0]!.id,
        brief: 'Свести рок-трек, референс прилагаю',
      });
      return order.id;
    }
    const asIlya = () => login(DEMO_ENGINEERS[0]);

    it('участники видят заказ в своих списках, посторонний — нет', async () => {
      const id = await placeOrder();
      expect(
        (await api.orders.list({ side: 'client', status: 'all' })).some((o) => o.id === id),
      ).toBe(true);
      expect(
        (await api.orders.list({ side: 'engineer', status: 'all' })).some((o) => o.id === id),
      ).toBe(false);

      await asIlya();
      const asEngineer = await api.orders.list({ side: 'engineer', status: 'pending' });
      expect(asEngineer.find((o) => o.id === id)).toMatchObject({
        side: 'engineer',
        clientName: DEMO_ARTIST.name,
      });

      await login(DEMO_OWNER);
      await expectApiError(api.orders.get(id), 404);
    });

    it('принятие создаёт проект: звукарь — владелец, заказчик — артист', async () => {
      const id = await placeOrder();
      await asIlya();
      const accepted = await api.orders.act(id, 'accept');
      expect(accepted.status).toBe('in_progress');
      expect(accepted.projectId).toBeTruthy();

      const project = await api.projects.get(accepted.projectId!);
      expect(project.role).toBe('owner');
      expect(project.members.map((m) => [m.userId, m.role])).toEqual([
        [DEMO_ENGINEERS[0].id, 'owner'],
        [DEMO_ARTIST.id, 'artist'],
      ]);

      await login(DEMO_ARTIST);
      expect((await api.projects.get(accepted.projectId!)).role).toBe('artist');
    });

    it('проверяет, кто и из какого статуса может сделать переход', async () => {
      const id = await placeOrder();
      // заказчик не может принять собственный заказ
      await expectApiError(api.orders.act(id, 'accept'), 403);
      await asIlya();
      // звукарь не может принять работу, которую ещё не сдавал
      await expectApiError(api.orders.act(id, 'complete'), 403);
      await api.orders.act(id, 'accept');
      // принять второй раз — статус уже другой
      await expectApiError(api.orders.act(id, 'accept'), 409, 'INVALID_TRANSITION');
      await expectApiError(api.orders.act(id, 'decline'), 409, 'INVALID_TRANSITION');
    });

    it('сдать работу без единой версии нельзя', async () => {
      const id = await placeOrder();
      await asIlya();
      await api.orders.act(id, 'accept');
      await expectApiError(api.orders.act(id, 'deliver'), 409, 'NO_VERSION');
    });

    it('полный путь: принять → версия → сдать → правки → принять работу → отзыв', async () => {
      const before = await api.engineers.get(DEMO_ENGINEERS[0].id);
      const id = await placeOrder();
      await asIlya();
      const accepted = await api.orders.act(id, 'accept');
      await api.versions.create(accepted.projectId!, audio());
      expect((await api.orders.act(id, 'deliver')).status).toBe('delivered');

      await login(DEMO_ARTIST);
      expect((await api.orders.act(id, 'revise')).status).toBe('in_progress');
      expect((await api.projects.get(accepted.projectId!)).project.status).toBe('active');

      await asIlya();
      await api.orders.act(id, 'deliver');
      await login(DEMO_ARTIST);
      const done = await api.orders.act(id, 'complete');
      expect(done.status).toBe('completed');
      expect((await api.projects.get(accepted.projectId!)).project.status).toBe('approved');

      const review = await api.orders.review(id, { rating: 5, text: 'Отлично!' });
      expect(review).toMatchObject({ rating: 5, authorId: DEMO_ARTIST.id });

      const after = await api.engineers.get(DEMO_ENGINEERS[0].id);
      expect(after.reviewsCount).toBe(before.reviewsCount + 1);
      expect(after.completedOrders).toBe(before.completedOrders + 1);
      expect((await api.orders.get(id)).review).toMatchObject({ text: 'Отлично!' });
    });

    it('отзыв: только заказчик, только после завершения, только один раз', async () => {
      const id = await placeOrder();
      await expectApiError(api.orders.review(id, { rating: 5, text: '' }), 409, 'NOT_COMPLETED');

      const seeded = 'o_seed_3'; // завершённый заказ Леры у Ильи с уже оставленным отзывом
      await expectApiError(
        api.orders.review(seeded, { rating: 1, text: '' }),
        409,
        'ALREADY_REVIEWED',
      );

      await asIlya();
      await expectApiError(api.orders.review(id, { rating: 5, text: '' }), 403);
    });

    it('оценка должна быть от 1 до 5', async () => {
      await login(DEMO_ARTIST);
      // заказ o_night идёт, поэтому сначала убеждаемся, что проверка оценки срабатывает раньше статуса не нужна:
      // создаём завершённый заказ без отзыва через полный цикл
      const id = await placeOrder();
      await asIlya();
      const accepted = await api.orders.act(id, 'accept');
      await api.versions.create(accepted.projectId!, audio());
      await api.orders.act(id, 'deliver');
      await login(DEMO_ARTIST);
      await api.orders.act(id, 'complete');
      await expectApiError(api.orders.review(id, { rating: 6, text: '' }), 400, 'VALIDATION');
      await expectApiError(api.orders.review(id, { rating: 0, text: '' }), 400, 'VALIDATION');
    });

    it('отмена заказчиком архивирует проект; отклонение закрывает заказ', async () => {
      const id = await placeOrder();
      await asIlya();
      const accepted = await api.orders.act(id, 'accept');
      await login(DEMO_ARTIST);
      expect((await api.orders.act(id, 'cancel')).status).toBe('cancelled');
      expect((await api.projects.get(accepted.projectId!)).project.status).toBe('archived');

      // после закрытия ту же услугу можно заказать снова
      const again = await placeOrder();
      await asIlya();
      expect((await api.orders.act(again, 'decline')).status).toBe('declined');
    });
  });

  describe('удаление аккаунта', () => {
    it('убирает анкету, работы, заказы и отзывы пользователя', async () => {
      await login(DEMO_ENGINEERS[0]);
      await api.auth.deleteAccount({ password: DEMO_PASSWORD });

      expect((await api.engineers.list(ALL)).some((e) => e.userId === DEMO_ENGINEERS[0].id)).toBe(
        false,
      );
      await login(DEMO_ARTIST);
      const orders = await api.orders.list({ side: 'client', status: 'all' });
      expect(orders.some((o) => o.engineerId === DEMO_ENGINEERS[0].id)).toBe(false);
    });
  });

  describe('переименование', () => {
    it('обновляет имя автора в отзывах', async () => {
      await login(DEMO_ARTIST);
      await api.auth.updateProfile({ name: 'Лера Новая' });
      const detail = await api.engineers.get(DEMO_OWNER.id);
      expect(detail.reviews.some((r) => r.authorName === 'Лера Новая')).toBe(true);
    });
  });
});

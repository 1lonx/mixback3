import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryBlobStore } from './blobStore';
import { DB_KEY, loadDb, saveDb, SCHEMA_VERSION, type Db } from './db';
import { createMockControls } from './mockControls';
import { hashPassword, randomHex } from './password';
import { createBrowserStorage, createMemoryStorage } from './storage';

const emptyDb = (): Db => ({
  schema: SCHEMA_VERSION,
  users: [],
  projects: [],
  members: [],
  versions: [],
  comments: [],
  checklists: [],
  engineers: [],
  portfolio: [],
  orders: [],
  reviews: [],
  messages: [],
  session: null,
  loginAttempts: {},
});

describe('KeyValueStore', () => {
  it('память: set/get/remove', () => {
    const storage = createMemoryStorage({ a: '1' });
    expect(storage.getItem('a')).toBe('1');
    storage.setItem('b', '2');
    storage.removeItem('a');
    expect(storage.getItem('a')).toBeNull();
    expect(storage.getItem('b')).toBe('2');
  });

  afterEach(() => vi.restoreAllMocks());

  it('браузерное хранилище работает на localStorage', () => {
    const storage = createBrowserStorage();
    storage.setItem('mixback:test', 'ok');
    expect(window.localStorage.getItem('mixback:test')).toBe('ok');
    storage.removeItem('mixback:test');
  });

  it('если localStorage недоступен (приватный режим), приложение работает в памяти', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const storage = createBrowserStorage();
    expect(() => storage.setItem('k', 'v')).not.toThrow();
    expect(storage.getItem('k')).toBe('v');
  });
});

describe('loadDb / saveDb', () => {
  it('сохранённая база читается обратно', () => {
    const storage = createMemoryStorage();
    saveDb(storage, emptyDb());
    expect(loadDb(storage)).toEqual(emptyDb());
  });

  it.each([
    ['пусто', null],
    ['не JSON', '{oops'],
    ['не объект', '42'],
    ['старая схема', JSON.stringify({ ...emptyDb(), schema: 0 })],
    ['нет коллекции', JSON.stringify({ schema: SCHEMA_VERSION, users: [] })],
    ['коллекция не массив', JSON.stringify({ ...emptyDb(), projects: {} })],
  ])('некорректные данные (%s) → null', (_name, raw) => {
    const storage = createMemoryStorage(raw === null ? {} : { [DB_KEY]: raw });
    expect(loadDb(storage)).toBeNull();
  });
});

describe('mockControls', () => {
  it('значения по умолчанию, set/get, сохранение между экземплярами', () => {
    const storage = createMemoryStorage();
    const defaults = { latencyMs: 350, failNetwork: false };
    const first = createMockControls(storage, defaults);
    expect(first.get()).toEqual(defaults);

    first.set({ failNetwork: true });
    expect(createMockControls(storage, defaults).get()).toEqual({
      latencyMs: 350,
      failNetwork: true,
    });
  });

  it('испорченные данные игнорируются', () => {
    const defaults = { latencyMs: 10, failNetwork: false };
    expect(
      createMockControls(createMemoryStorage({ 'mixback:mock': '{x' }), defaults).get(),
    ).toEqual(defaults);
    expect(
      createMockControls(
        createMemoryStorage({ 'mixback:mock': '{"latencyMs":"fast","failNetwork":1}' }),
        defaults,
      ).get(),
    ).toEqual(defaults);
  });
});

describe('пароли', () => {
  it('одинаковый пароль и соль → одинаковый хеш; другая соль → другой хеш', async () => {
    const a = await hashPassword('secret123', 'salt-1');
    expect(await hashPassword('secret123', 'salt-1')).toBe(a);
    expect(await hashPassword('secret123', 'salt-2')).not.toBe(a);
    expect(await hashPassword('secret124', 'salt-1')).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('secret123');
  });

  it('randomHex: нужная длина и уникальность', () => {
    expect(randomHex(8)).toHaveLength(16);
    expect(randomHex()).not.toBe(randomHex());
  });
});

describe('BlobStore (в памяти)', () => {
  const create = createMemoryBlobStore;
  it('put → get возвращает тот же файл', async () => {
    const store = create();
    await store.put('f1', new Blob(['hello'], { type: 'audio/mpeg' }));
    const blob = await store.get('f1');
    expect(blob).not.toBeNull();
    expect(blob?.size).toBe(5);
  });

  it('неизвестный id → null', async () => {
    expect(await create().get('нет такого')).toBeNull();
  });

  it('delete удаляет файл, повторное удаление безопасно', async () => {
    const store = create();
    await store.put('f2', new Blob(['x']));
    await store.delete('f2');
    expect(await store.get('f2')).toBeNull();
    await expect(store.delete('f2')).resolves.toBeUndefined();
  });

  it('put по существующему id заменяет файл', async () => {
    const store = create();
    await store.put('f3', new Blob(['a']));
    await store.put('f3', new Blob(['abcdef']));
    expect((await store.get('f3'))?.size).toBe(6);
  });
});

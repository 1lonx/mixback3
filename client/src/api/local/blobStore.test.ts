// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createIndexedDbBlobStore } from './blobStore';

// Окружение node: там Blob настоящий и клонируется в IndexedDB так же, как в браузере.
describe('BlobStore (IndexedDB)', () => {
  it('put → get возвращает тот же файл', async () => {
    const store = createIndexedDbBlobStore();
    await store.put('f1', new Blob(['hello'], { type: 'audio/mpeg' }));
    const blob = await store.get('f1');
    expect(blob).not.toBeNull();
    expect(blob?.size).toBe(5);
    expect(blob?.type).toBe('audio/mpeg');
  });

  it('неизвестный id → null', async () => {
    expect(await createIndexedDbBlobStore().get('нет такого')).toBeNull();
  });

  it('delete удаляет файл, повторное удаление безопасно', async () => {
    const store = createIndexedDbBlobStore();
    await store.put('f2', new Blob(['x']));
    await store.delete('f2');
    expect(await store.get('f2')).toBeNull();
    await expect(store.delete('f2')).resolves.toBeUndefined();
  });

  it('put по существующему id заменяет файл', async () => {
    const store = createIndexedDbBlobStore();
    await store.put('f3', new Blob(['a']));
    await store.put('f3', new Blob(['abcdef']));
    expect((await store.get('f3'))?.size).toBe(6);
  });

  it('данные переживают «перезапуск» (новый экземпляр хранилища)', async () => {
    await createIndexedDbBlobStore().put('f4', new Blob(['persist']));
    expect((await createIndexedDbBlobStore().get('f4'))?.size).toBe(7);
  });
});

export interface BlobStore {
  put(id: string, blob: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  delete(id: string): Promise<void>;
}

export function createMemoryBlobStore(): BlobStore {
  const map = new Map<string, Blob>();
  return {
    put: (id, blob) => {
      map.set(id, blob);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(map.get(id) ?? null),
    delete: (id) => {
      map.delete(id);
      return Promise.resolve();
    },
  };
}

const DB_NAME = 'mixback-audio';
const STORE = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB недоступна'));
  });
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('Ошибка IndexedDB'));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('Транзакция IndexedDB отменена'));
        };
      }),
  );
}

export function createIndexedDbBlobStore(): BlobStore {
  return {
    put: (id, blob) => run('readwrite', (s) => s.put(blob, id)).then(() => undefined),
    get: (id) =>
      run<unknown>('readonly', (s) => s.get(id)).then((v) => (v instanceof Blob ? v : null)),
    delete: (id) => run('readwrite', (s) => s.delete(id)).then(() => undefined),
  };
}

import type {
  Checklist,
  Comment,
  EngineerProfile,
  Message,
  Order,
  PortfolioTrack,
  Project,
  Review,
  Role,
  User,
  Version,
} from '../../types/domain';
import type { KeyValueStore } from './storage';

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface StoredMember {
  projectId: string;
  userId: string;
  role: Role;
}

export interface StoredSession {
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

/** Счётчик неудачных входов: после лимита вход временно блокируется (защита от перебора). */
export interface LoginAttempt {
  count: number;
  lockedUntil: string | null;
}

export interface Db {
  schema: number;
  users: StoredUser[];
  projects: Project[];
  members: StoredMember[];
  versions: Version[];
  comments: Comment[];
  checklists: Checklist[];
  engineers: EngineerProfile[];
  portfolio: PortfolioTrack[];
  orders: Order[];
  reviews: Review[];
  messages: Message[];
  session: StoredSession | null;
  loginAttempts: Record<string, LoginAttempt>;
}

/** Меняйте при несовместимых изменениях формата: старые данные будут пересозданы из seed. */
export const SCHEMA_VERSION = 4;
export const DB_KEY = 'mixback:db';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Грубая проверка формы: данные в localStorage мог испортить кто угодно. */
function isDb(value: unknown): value is Db {
  return (
    isRecord(value) &&
    value.schema === SCHEMA_VERSION &&
    isRecord(value.loginAttempts) &&
    [
      'users',
      'projects',
      'members',
      'versions',
      'comments',
      'checklists',
      'engineers',
      'portfolio',
      'orders',
      'reviews',
      'messages',
    ].every((key) => Array.isArray(value[key]))
  );
}

export function loadDb(storage: KeyValueStore): Db | null {
  const raw = storage.getItem(DB_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isDb(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDb(storage: KeyValueStore, db: Db): void {
  storage.setItem(DB_KEY, JSON.stringify(db));
}

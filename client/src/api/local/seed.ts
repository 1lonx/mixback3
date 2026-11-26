import type { Comment, Project, ProjectStatus, Version } from '../../types/domain';
import { SCHEMA_VERSION, type Db, type StoredMember, type StoredUser } from './db';
import { DEMO_ARTIST, DEMO_ENGINEERS, DEMO_OWNER, DEMO_PASSWORD } from '../../lib/demoAccounts';
import { hashPassword } from './password';
import { createMarketSeed } from './seedMarket';

const DEMO_TRACK = 'demo/track.mp3';
const DEMO_DURATION = 273;

const DAY = 24 * 60 * 60 * 1000;

async function makeUser(
  base: { id: string; email: string; name: string },
  password: string,
  createdAt: string,
): Promise<StoredUser> {
  const salt = `seed-${base.id}`;
  return { ...base, salt, passwordHash: await hashPassword(password, salt), createdAt };
}

const SHARED_SALT = 'seed-engineers';
let sharedHash: Promise<string> | null = null;
const engineerHash = () => (sharedHash ??= hashPassword(DEMO_PASSWORD, SHARED_SALT));

export async function createSeedDb(now: Date): Promise<Db> {
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString();

  const project = (
    id: string,
    title: string,
    artist: string,
    description: string,
    status: ProjectStatus,
    daysAgo: number,
  ): Project => ({
    id,
    title,
    artist,
    description,
    status,
    ownerId: DEMO_OWNER.id,
    createdAt: at(daysAgo + 10),
    updatedAt: at(daysAgo),
  });

  const version = (
    projectId: string,
    number: number,
    note: string,
    lufs: number,
    peakDb: number,
    daysAgo: number,
  ): Version => ({
    id: `v_${projectId}_${number}`,
    projectId,
    number,
    note,
    fileUrl: DEMO_TRACK,
    durationSec: DEMO_DURATION,
    peaks: null,
    lufs,
    peakDb,
    createdAt: at(daysAgo),
  });

  const comment = (
    n: number,
    versionId: string,
    authorId: string,
    authorName: string,
    timeSec: number,
    text: string,
    resolved = false,
  ): Comment => ({
    id: `c_seed_${n}`,
    versionId,
    authorId,
    authorName,
    timeSec,
    text,
    resolved,
    createdAt: at(1),
  });

  const lera = (n: number, v: string, t: number, text: string, resolved = false) =>
    comment(n, v, DEMO_ARTIST.id, DEMO_ARTIST.name, t, text, resolved);
  const alex = (n: number, v: string, t: number, text: string, resolved = false) =>
    comment(n, v, DEMO_OWNER.id, DEMO_OWNER.name, t, text, resolved);

  const members: StoredMember[] = [
    { projectId: 'p_night', userId: DEMO_OWNER.id, role: 'owner' },
    { projectId: 'p_night', userId: DEMO_ARTIST.id, role: 'artist' },
    { projectId: 'p_summer', userId: DEMO_OWNER.id, role: 'owner' },
    { projectId: 'p_old', userId: DEMO_OWNER.id, role: 'owner' },
  ];

  return {
    schema: SCHEMA_VERSION,
    users: [
      await makeUser(DEMO_OWNER, DEMO_PASSWORD, at(30)),
      await makeUser(DEMO_ARTIST, DEMO_PASSWORD, at(12)),
      ...(await Promise.all(
        DEMO_ENGINEERS.map(async (engineer, i) => ({
          ...engineer,
          salt: SHARED_SALT,
          passwordHash: await engineerHash(),
          createdAt: at(60 + i),
        })),
      )),
    ],
    projects: [
      project(
        'p_night',
        'Ночной город',
        'Лера К.',
        'Сингл в стиле synth-pop. Нужно подтянуть вокал и убрать муть в низах.',
        'active',
        1,
      ),
      project(
        'p_summer',
        'Летний EP — Intro',
        'Дым',
        'Интро к EP, цель — −14 LUFS для стриминга.',
        'active',
        4,
      ),
      project(
        'p_old',
        'Старое демо',
        'Мартин',
        'Принято артистом, ждёт мастеринга.',
        'approved',
        20,
      ),
    ],
    members,
    versions: [
      version('p_night', 1, 'Черновой баланс', -18.4, -3.1, 9),
      version('p_night', 2, 'Вокал громче, подрезан низ', -12.9, -1.2, 5),
      version('p_night', 3, 'Правки по комментариям v2', -10.6, -0.3, 1),
      version('p_summer', 1, 'Первое сведение', -15.2, -2.0, 4),
      version('p_old', 1, 'Версия на утверждение', -13.8, -0.8, 21),
      version('p_old', 2, 'Финальный баланс', -11.9, -0.5, 20),
    ],
    comments: [
      lera(1, 'v_p_night_3', 12, 'Вокал в первом куплете тонет в гитарах, поднять на 1–2 дБ'),
      lera(2, 'v_p_night_3', 34, 'Бочка бубнит, подрезать низ?'),
      lera(3, 'v_p_night_3', 41, 'Сибилянты на «с» режут слух, нужен деэссер'),
      alex(4, 'v_p_night_3', 58, 'Ревер на вокале слишком длинный, хвост мешает следующей фразе'),
      lera(5, 'v_p_night_3', 83, 'Хэты слишком яркие, убрать немного верха'),
      lera(6, 'v_p_night_3', 120, 'Припев тише куплета, поднять общую громкость'),
      alex(7, 'v_p_night_3', 150, 'Расширить стерео на гитарах', true),
      lera(8, 'v_p_night_2', 20, 'Вокал всё ещё тихий', true),
      lera(9, 'v_p_night_2', 75, 'Слишком много баса в куплете', true),
    ],
    checklists: [],
    ...createMarketSeed(at),
    session: null,
    loginAttempts: {},
  };
}

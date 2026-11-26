import { DEMO_ARTIST, DEMO_ENGINEERS, DEMO_OWNER } from '../../lib/demoAccounts';
import type {
  EngineerProfile,
  Genre,
  Order,
  Message,
  PortfolioTrack,
  Review,
  Service,
  ServiceKind,
} from '../../types/domain';

const DEMO_TRACK = 'demo/track.mp3';
const DEMO_DURATION = 273;

type ServiceSeed = [kind: ServiceKind, title: string, text: string, price: number, days: number];
type TrackSeed = [title: string, genre: Genre, text: string];

interface EngineerSeed {
  userId: string;
  headline: string;
  bio: string;
  genres: Genre[];
  services: ServiceSeed[];
  tracks: TrackSeed[];
}

const ENGINEERS: EngineerSeed[] = [
  {
    userId: DEMO_OWNER.id,
    headline: 'Сведение синтпопа и инди — быстро и по делу',
    bio: 'Свожу девятый год, в основном синтпоп и инди. Работаю итерациями: вы оставляете правки прямо на волне, я отвечаю новой версией. Обычно хватает двух кругов.',
    genres: ['Поп', 'Электроника', 'Инди'],
    services: [
      [
        'mixing',
        'Сведение трека до 32 дорожек',
        'Баланс, пространство, вокал. Два круга правок.',
        5500,
        4,
      ],
      [
        'mastering',
        'Мастеринг под стриминг',
        'Громкость −14 LUFS, проверка на разных системах.',
        2200,
        2,
      ],
    ],
    tracks: [
      ['Ночной город', 'Электроника', 'Синтпоп-сингл: вокал вперёд, чистый низ'],
      ['Летний EP — Intro', 'Инди', 'Тёплое интро, акцент на гитарах'],
    ],
  },
  {
    userId: DEMO_ENGINEERS[0].id,
    headline: 'Рок и метал: плотные гитары без каши',
    bio: 'Восемь лет в студии. Люблю живые барабаны и тяжёлые гитары, которые не задавливают вокал. Умею работать с домашними записями.',
    genres: ['Рок', 'Метал'],
    services: [
      ['mixing', 'Сведение рок-трека', 'Живые барабаны, гитары, вокал. До 40 дорожек.', 6500, 5],
      ['mastering', 'Мастеринг', 'Плотный, но живой звук.', 2000, 2],
    ],
    tracks: [
      ['Стальной рассвет', 'Метал', 'Сведение с живой ударной установкой'],
      ['Дорога домой', 'Рок', 'Гитарный рок, баланс гитар и вокала'],
      ['Тишина после', 'Рок', 'Баллада, много пространства'],
    ],
  },
  {
    userId: DEMO_ENGINEERS[1].id,
    headline: 'Вокал и поп: тюнинг, чистка, сведение',
    bio: 'Работаю с вокалом: тюнинг без «робота», деэссинг, сборка дублей. Если вокал — главное в вашем треке, вам ко мне.',
    genres: ['Поп', 'Инди'],
    services: [
      [
        'vocal',
        'Тюнинг и обработка вокала',
        'Естественный тюнинг, деэссер, сборка дублей.',
        2500,
        2,
      ],
      ['mixing', 'Сведение поп-трека', 'Вокал в центре, чистая картина.', 5000, 4],
      ['editing', 'Монтаж и чистка дублей', 'Убираю шумы, вдохи, щелчки.', 1500, 1],
    ],
    tracks: [
      ['Тёплый свет', 'Поп', 'Вокал после тюнинга и обработки'],
      ['Письма', 'Инди', 'Камерное звучание, голос и пианино'],
    ],
  },
  {
    userId: DEMO_ENGINEERS[2].id,
    headline: 'Хип-хоп и электроника: качающий низ',
    bio: 'Бочка и 808 должны быть слышны и на телефоне, и на клубной системе — этим и занимаюсь. Свожу биты и вокал в одном пространстве.',
    genres: ['Хип-хоп', 'Электроника'],
    services: [
      ['mixing', 'Сведение бита с вокалом', 'Низ, вокал, эффекты. Два круга правок.', 4500, 3],
      ['mastering', 'Мастеринг для стримингов', 'Подгонка под площадки.', 1800, 1],
    ],
    tracks: [
      ['Неон', 'Хип-хоп', 'Тяжёлый 808, чистый вокал'],
      ['Ночной автобус', 'Электроника', 'Клубный трек, ширина и низ'],
    ],
  },
  {
    userId: DEMO_ENGINEERS[3].id,
    headline: 'Джаз и фолк: живые инструменты без пластика',
    bio: 'Записываю и свожу акустику: контрабас, гитары, духовые. Стараюсь сохранить воздух и динамику, а не выжимать громкость.',
    genres: ['Джаз', 'Фолк'],
    services: [
      ['mixing', 'Сведение живого ансамбля', 'До 24 дорожек, естественный баланс.', 8000, 7],
      ['mastering', 'Мягкий мастеринг', 'Динамика сохраняется.', 3000, 3],
    ],
    tracks: [
      ['Осенний блюз', 'Джаз', 'Квартет, живая запись'],
      ['Тропа', 'Фолк', 'Гитара, скрипка, вокал'],
    ],
  },
];

const PEOPLE = [DEMO_OWNER, DEMO_ARTIST, ...DEMO_ENGINEERS];

type ReviewSeed = [engineer: string, author: string, rating: number, text: string, daysAgo: number];

const REVIEWS: ReviewSeed[] = [
  [
    DEMO_OWNER.id,
    DEMO_ARTIST.id,
    5,
    'Вокал наконец вышел вперёд. Правки на волне — удобно, уложились в два круга.',
    14,
  ],
  [DEMO_OWNER.id, DEMO_ENGINEERS[1].id, 5, 'Быстро, аккуратно, всё объясняет. Приду ещё.', 40],
  [
    DEMO_ENGINEERS[0].id,
    DEMO_ARTIST.id,
    4,
    'Гитары звучат мощно, но пришлось попросить подрезать верха — исправил сразу.',
    25,
  ],
  [DEMO_ENGINEERS[0].id, DEMO_OWNER.id, 5, 'Профессионально. Барабаны — огонь.', 60],
  [
    DEMO_ENGINEERS[1].id,
    DEMO_ARTIST.id,
    5,
    'Вокал после обработки звучит естественно, без робота.',
    9,
  ],
  [DEMO_ENGINEERS[1].id, DEMO_ENGINEERS[2].id, 5, 'Лучший тюнинг, что я слышал. Рекомендую.', 33],
  [
    DEMO_ENGINEERS[2].id,
    DEMO_ARTIST.id,
    4,
    'Низ качает, вокал чистый. Немного задержался со сроком.',
    18,
  ],
  [DEMO_ENGINEERS[3].id, DEMO_OWNER.id, 5, 'Живая запись осталась живой. Очень тонкая работа.', 50],
];

export interface MarketSeed {
  engineers: EngineerProfile[];
  portfolio: PortfolioTrack[];
  orders: Order[];
  reviews: Review[];
  messages: Message[];
}

export function createMarketSeed(at: (daysAgo: number) => string): MarketSeed {
  const engineers: EngineerProfile[] = [];
  const portfolio: PortfolioTrack[] = [];

  ENGINEERS.forEach((seed, index) => {
    const services: Service[] = seed.services.map(
      ([kind, title, description, priceRub, days], i) => ({
        id: `s_${seed.userId}_${i + 1}`,
        kind,
        title,
        description,
        priceRub,
        days,
      }),
    );
    engineers.push({
      userId: seed.userId,
      headline: seed.headline,
      bio: seed.bio,
      genres: seed.genres,
      services,
      published: true,
      updatedAt: at(30 + index),
    });
    seed.tracks.forEach(([title, genre, description], i) => {
      portfolio.push({
        id: `t_${seed.userId}_${i + 1}`,
        engineerId: seed.userId,
        title,
        genre,
        description,
        fileUrl: DEMO_TRACK,
        durationSec: DEMO_DURATION,
        peaks: null,
        createdAt: at(45 - i * 3 - index),
      });
    });
  });

  const service = (userId: string, index = 0): Service => {
    const found = engineers.find((e) => e.userId === userId)?.services[index];
    if (!found) throw new Error(`В seed нет услуги ${index} у ${userId}`);
    return found;
  };

  const order = (
    id: string,
    engineerId: string,
    clientId: string,
    picked: Service,
    patch: Pick<Order, 'brief' | 'status' | 'projectId' | 'reviewed' | 'createdAt' | 'updatedAt'>,
  ): Order => ({
    id,
    engineerId,
    clientId,
    serviceId: picked.id,
    serviceTitle: picked.title,
    serviceKind: picked.kind,
    priceRub: picked.priceRub,
    days: picked.days,
    ...patch,
  });

  const orders: Order[] = [];
  const reviews: Review[] = [];

  REVIEWS.forEach(([engineerId, authorId, rating, text, daysAgo], i) => {
    const picked = service(engineerId);
    const orderId = `o_seed_${i + 1}`;
    orders.push(
      order(orderId, engineerId, authorId, picked, {
        brief: 'Нужно свести трек по референсу, подробности отправлю в проект.',
        status: 'completed',
        projectId: null,
        reviewed: true,
        createdAt: at(daysAgo + picked.days + 2),
        updatedAt: at(daysAgo),
      }),
    );
    reviews.push({
      id: `r_seed_${i + 1}`,
      engineerId,
      orderId,
      authorId,
      authorName: PEOPLE.find((p) => p.id === authorId)?.name ?? 'Клиент',
      rating,
      text,
      createdAt: at(daysAgo),
    });
  });

  orders.push(
    order('o_night', DEMO_OWNER.id, DEMO_ARTIST.id, service(DEMO_OWNER.id, 0), {
      brief: 'Сингл в стиле synth-pop. Нужно подтянуть вокал и убрать муть в низах.',
      status: 'in_progress',
      projectId: 'p_night',
      reviewed: false,
      createdAt: at(11),
      updatedAt: at(1),
    }),
    order('o_master', DEMO_OWNER.id, DEMO_ARTIST.id, service(DEMO_OWNER.id, 1), {
      brief: 'Мастеринг готового микса под стриминг, референс — любой трек Dua Lipa.',
      status: 'pending',
      projectId: null,
      reviewed: false,
      createdAt: at(0),
      updatedAt: at(0),
    }),
  );

  const talk = (
    n: number,
    orderId: string,
    authorId: string,
    authorName: string,
    text: string,
    daysAgo: number,
  ): Message => ({
    id: `m_seed_${n}`,
    orderId,
    authorId,
    authorName,
    text,
    createdAt: at(daysAgo),
  });
  const messages: Message[] = [
    talk(
      1,
      'o_night',
      DEMO_ARTIST.id,
      DEMO_ARTIST.name,
      'Привет! Референс — второй трек из прошлого EP, прикрепила в описание.',
      10,
    ),
    talk(
      2,
      'o_night',
      DEMO_OWNER.id,
      DEMO_OWNER.name,
      'Привет, Лера! Послушал, понял задачу. Первую версию пришлю завтра.',
      10,
    ),
    talk(
      3,
      'o_night',
      DEMO_OWNER.id,
      DEMO_OWNER.name,
      'Версия 3 готова — оставляйте правки прямо на волне в проекте.',
      1,
    ),
    talk(4, 'o_master', DEMO_ARTIST.id, DEMO_ARTIST.name, 'Подскажите, принимаете wav 24 бит?', 0),
  ];

  return { engineers, portfolio, orders, reviews, messages };
}

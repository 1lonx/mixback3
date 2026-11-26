import { afterEach, describe, expect, it, vi } from 'vitest';
import { sniffAudio, fileLooksLikeAudio } from './audio/sniff';
import { hueOf, initialsOf } from './avatar';
import { passwordStrength } from './passwordStrength';
import { cleanText, safeInternalPath } from './sanitize';
import {
  changePasswordSchema,
  commentSchema,
  parseWith,
  projectSchema,
  registerSchema,
} from './schemas';
import { applyTheme, readPreference, resolveTheme, setPreference } from './theme';

const bytes = (text: string, total = Math.max(16, text.length)) => {
  const out = new Uint8Array(total);
  out.set(Array.from(text, (c) => c.charCodeAt(0)));
  return out;
};

describe('cleanText', () => {
  it('убирает управляющие символы, но оставляет перевод строки и табуляцию', () => {
    expect(cleanText('a\u0000b\u0007c\nd\te')).toBe('abc\nd\te');
  });

  it('убирает символы смены направления текста (Trojan Source)', () => {
    expect(cleanText('admin‮txt.exe')).toBe('admintxt.exe');
    expect(cleanText('x⁦y⁩')).toBe('xy');
  });

  it('убирает невидимые символы нулевой ширины и BOM', () => {
    expect(cleanText('Але​кс﻿')).toBe('Алекс');
  });

  it('не портит обычный текст, кириллицу и эмодзи', () => {
    expect(cleanText('Бочка бубнит 🎧 — подрезать!')).toBe('Бочка бубнит 🎧 — подрезать!');
  });

  it('приводит к NFC: «й» из двух символов становится одним', () => {
    expect(cleanText('й')).toBe('й');
  });
});

describe('safeInternalPath', () => {
  it.each(['/projects', '/projects/p_1?v=2', '/about'])('пропускает %s', (path) => {
    expect(safeInternalPath(path)).toBe(path);
  });

  it.each([
    'https://evil.com',
    '//evil.com/path',
    '/\\evil.com',
    'javascript:alert(1)',
    'projects',
    '/path\nwith-newline',
    '',
    undefined,
  ])('подменяет %s на безопасный путь', (path) => {
    expect(safeInternalPath(path)).toBe('/projects');
  });

  it('можно задать свой запасной путь', () => {
    expect(safeInternalPath('//x', '/login')).toBe('/login');
  });
});

describe('sniffAudio (проверка по сигнатуре)', () => {
  it.each([
    ['RIFF\0\0\0\0WAVEfmt ', 'wav'],
    ['OggS\0\0\0\0\0\0\0\0\0\0\0\0', 'ogg'],
    ['fLaC\0\0\0\0\0\0\0\0\0\0\0\0', 'flac'],
    ['\0\0\0 ftypM4A \0\0\0\0', 'm4a'],
    ['ID3\u0004\0\0\0\0\0\0\0\0\0\0\0\0', 'mp3'],
  ])('распознаёт %j', (head, kind) => {
    expect(sniffAudio(bytes(head))).toBe(kind);
  });

  it('распознаёт MPEG-кадр без ID3-тега', () => {
    const frame = new Uint8Array(16);
    frame[0] = 0xff;
    frame[1] = 0xfb;
    expect(sniffAudio(frame)).toBe('mp3');
  });

  it.each([
    ['PNG', '\u0089PNG\r\n\u001a\n\0\0\0\r'],
    ['HTML', '<html><script>aler'],
    ['EXE', 'MZ\u0090\0\u0003\0\0\0\u0004\0\0\0'],
    ['ZIP', 'PK\u0003\u0004\u0014\0\0\0\b\0\0\0'],
  ])('отклоняет %s, даже если файл назван song.mp3', (_name, head) => {
    expect(sniffAudio(bytes(head))).toBeNull();
  });

  it('слишком короткий файл — не аудио', () => {
    expect(sniffAudio(new Uint8Array([0x49, 0x44, 0x33]))).toBeNull();
  });

  it('fileLooksLikeAudio читает начало Blob', async () => {
    expect(await fileLooksLikeAudio(new Blob(['RIFF\0\0\0\0WAVEfmt data']))).toBe(true);
    expect(await fileLooksLikeAudio(new Blob(['<svg onload=alert(1)>']))).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('пустой пароль — без оценки', () => {
    expect(passwordStrength('')).toEqual({ score: 0, label: '' });
  });

  it('оценка растёт с длиной и разнообразием', () => {
    const scores = ['abc', 'abcdefgh', 'Abcdefg1', 'Abcdefg1xyz!', 'Tr0ub4dor&3-Horse'].map(
      (p) => passwordStrength(p).score,
    );
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(scores[0]).toBe(0);
    expect(scores.at(-1)).toBe(4);
  });

  it('распространённые пароли не получают высокую оценку', () => {
    expect(passwordStrength('Password123!').score).toBeLessThanOrEqual(1);
    expect(passwordStrength('qwerty12345').score).toBeLessThanOrEqual(1);
  });

  it('повторы одного символа штрафуются', () => {
    expect(passwordStrength('aaaaaaaa1').score).toBeLessThan(passwordStrength('abcdefg1x').score);
  });

  it('кириллица учитывается', () => {
    expect(passwordStrength('ГромкийБас2026!').score).toBeGreaterThanOrEqual(3);
  });
});

describe('avatar', () => {
  it('инициалы: одно или два слова, регистр, пустое имя', () => {
    expect(initialsOf('Алекс Иванов')).toBe('АИ');
    expect(initialsOf('лера')).toBe('Л');
    expect(initialsOf('  one two three ')).toBe('OT');
    expect(initialsOf('   ')).toBe('?');
  });

  it('цвет стабилен для одного имени и лежит в диапазоне оттенков', () => {
    expect(hueOf('Алекс')).toBe(hueOf('Алекс'));
    expect(hueOf('Алекс')).not.toBe(hueOf('Лера'));
    expect(hueOf('Что угодно')).toBeGreaterThanOrEqual(0);
    expect(hueOf('Что угодно')).toBeLessThan(360);
  });
});

describe('схемы: очистка и пароли', () => {
  it('имя и текст правки очищаются от опасных символов до проверки', () => {
    const user = parseWith(registerSchema, {
      name: 'Ал​екс‮',
      email: 'a@b.ru',
      password: 'secret123',
    });
    expect(user).toMatchObject({ success: true, data: { name: 'Алекс' } });
    const comment = parseWith(commentSchema, { timeSec: 1, text: 'Бочка\u0000 бубнит' });
    expect(comment).toMatchObject({ success: true, data: { text: 'Бочка бубнит' } });
  });

  it('строка из одних невидимых символов не проходит как «непустая»', () => {
    expect(
      parseWith(projectSchema, {
        title: '​​​',
        artist: 'X',
        description: '',
        status: 'active',
      }).success,
    ).toBe(false);
  });

  it('HTML в тексте не изменяется (его экранирует React), но и не исполняется', () => {
    const result = parseWith(commentSchema, { timeSec: 1, text: '<img src=x onerror=alert(1)>' });
    expect(result).toMatchObject({ success: true, data: { text: '<img src=x onerror=alert(1)>' } });
  });

  describe('changePasswordSchema', () => {
    const valid = {
      currentPassword: 'old-pass1',
      newPassword: 'new-pass2',
      confirmPassword: 'new-pass2',
    };

    it('принимает корректную смену', () => {
      expect(parseWith(changePasswordSchema, valid).success).toBe(true);
    });

    it('пароли должны совпадать', () => {
      expect(
        parseWith(changePasswordSchema, { ...valid, confirmPassword: 'other-pass3' }),
      ).toMatchObject({
        errors: { confirmPassword: 'Пароли не совпадают' },
      });
    });

    it('новый пароль не может совпадать с текущим', () => {
      const same = {
        currentPassword: 'same-pass1',
        newPassword: 'same-pass1',
        confirmPassword: 'same-pass1',
      };
      expect(parseWith(changePasswordSchema, same)).toMatchObject({
        errors: { newPassword: 'Новый пароль должен отличаться от текущего' },
      });
    });

    it('новый пароль проходит ту же политику, что и при регистрации', () => {
      expect(
        parseWith(changePasswordSchema, {
          ...valid,
          newPassword: 'short1',
          confirmPassword: 'short1',
        }),
      ).toMatchObject({ errors: { newPassword: 'Пароль — минимум 8 символов' } });
    });
  });
});

describe('тема', () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
  });

  it('по умолчанию — как в системе', () => {
    expect(readPreference()).toBe('system');
  });

  it('системная тема определяется через prefers-color-scheme', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    expect(resolveTheme('system')).toBe('light');
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    expect(resolveTheme('system')).toBe('dark');
  });

  it('явный выбор важнее системной темы', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('setPreference сохраняет выбор и ставит атрибут на <html>', () => {
    setPreference('light');
    expect(readPreference()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    setPreference('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('«как в системе» стирает сохранённый выбор', () => {
    setPreference('light');
    setPreference('system');
    expect(window.localStorage.getItem('mixback:theme')).toBeNull();
  });

  it('мусор в хранилище игнорируется', () => {
    window.localStorage.setItem('mixback:theme', 'neon');
    expect(readPreference()).toBe('system');
  });

  it('applyTheme без matchMedia (старый браузер) не падает', () => {
    expect(() => applyTheme('system')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

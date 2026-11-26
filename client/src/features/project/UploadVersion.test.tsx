import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/errors';
import { renderApp } from '../../test/utils';

const analyzeAudioFile = vi.hoisted(() => vi.fn());
vi.mock('../../lib/audio/analyze', () => ({ analyzeAudioFile }));

const analysis = { durationSec: 180, peaks: [0.2, 1, 0.4], lufs: -9.2, peakDb: -0.2 };
// Начало настоящего WAV-файла: UploadVersion проверяет сигнатуру, а не только расширение.
const WAV_HEADER = 'RIFF\u0000\u0000\u0000\u0000WAVEfmt fake-audio';
const audio = (name = 'final-mix.wav') => new File([WAV_HEADER], name, { type: 'audio/wav' });

async function openProject() {
  const view = await renderApp({ route: '/projects/p_summer', as: 'owner' });
  await screen.findByRole('heading', { name: 'Летний EP — Intro', level: 1 });
  return view;
}

describe('UploadVersion', () => {
  beforeEach(() => {
    analyzeAudioFile.mockResolvedValue(analysis);
    URL.createObjectURL = () => 'blob:test';
  });

  it('без файла показывает ошибку и ничего не отправляет', async () => {
    await openProject();
    await userEvent.click(screen.getByRole('button', { name: 'Загрузить версию' }));
    expect(await screen.findByText('Выберите аудиофайл')).toBeInTheDocument();
    expect(analyzeAudioFile).not.toHaveBeenCalled();
  });

  it('не-аудио файл отклоняется до анализа', async () => {
    await openProject();
    await userEvent.upload(
      screen.getByLabelText('Аудиофайл'),
      new File(['x'], 'photo.png', { type: 'image/png' }),
      { applyAccept: false },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Загрузить версию' }));
    expect(await screen.findByText(/Нужен аудиофайл/)).toBeInTheDocument();
    expect(analyzeAudioFile).not.toHaveBeenCalled();
  });

  it('успех: анализ → сохранение → новая версия выбирается в плеере', async () => {
    const { router } = await openProject();
    await userEvent.upload(screen.getByLabelText('Аудиофайл'), audio());
    await userEvent.type(screen.getByLabelText('Что изменилось'), 'Вокал громче');
    await userEvent.click(screen.getByRole('button', { name: 'Загрузить версию' }));

    expect(await screen.findByText('Версия v2 загружена')).toBeInTheDocument();
    expect(analyzeAudioFile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(router.state.location.search).toBe('?v=2'));
    expect(await screen.findByRole('radio', { name: 'v2' })).toBeChecked();
    expect(screen.getByText('−9.2 LUFS')).toBeInTheDocument();
    expect(screen.getByText(/Вокал громче/)).toBeInTheDocument();
    // форма очистилась
    expect(screen.getByLabelText('Что изменилось')).toHaveValue('');
  });

  it('во время анализа кнопка заблокирована и показывает этап', async () => {
    let finish!: (value: typeof analysis) => void;
    analyzeAudioFile.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await openProject();
    await userEvent.upload(screen.getByLabelText('Аудиофайл'), audio());
    await userEvent.click(screen.getByRole('button', { name: 'Загрузить версию' }));

    const busy = await screen.findByRole('button', { name: 'Анализируем звук…' });
    expect(busy).toBeDisabled();
    expect(screen.getByLabelText('Аудиофайл')).toBeDisabled();

    finish(analysis);
    expect(await screen.findByText('Версия v2 загружена')).toBeInTheDocument();
  });

  it('файл, который не удалось декодировать, — понятная ошибка и форма снова доступна', async () => {
    analyzeAudioFile.mockRejectedValue(
      new ApiError(415, 'UNSUPPORTED_AUDIO', 'Не удалось прочитать аудио. Проверьте файл.'),
    );
    await openProject();
    await userEvent.upload(screen.getByLabelText('Аудиофайл'), audio('broken.mp3'));
    await userEvent.click(screen.getByRole('button', { name: 'Загрузить версию' }));

    expect(
      await screen.findByText('Не удалось прочитать аудио. Проверьте файл.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Загрузить версию' })).toBeEnabled();
  });

  it('ошибка сохранения (сеть) показывается уведомлением, версия не добавляется', async () => {
    const { appApi } = await openProject();
    await userEvent.upload(screen.getByLabelText('Аудиофайл'), audio());
    appApi.controls.set({ failNetwork: true });
    await userEvent.click(screen.getByRole('button', { name: 'Загрузить версию' }));
    expect(await screen.findByText(/Нет соединения с сервером/)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'v2' })).not.toBeInTheDocument();
  });
});

describe('UploadVersion: подмена расширения', () => {
  it('файл назван .mp3, но внутри не аудио — отклоняется до анализа', async () => {
    analyzeAudioFile.mockResolvedValue(analysis);
    await openProject();
    const fake = new File(['<html><script>alert(1)</script></html>'], 'song.mp3', {
      type: 'audio/mpeg',
    });
    await userEvent.upload(screen.getByLabelText('Аудиофайл'), fake);
    await userEvent.click(screen.getByRole('button', { name: 'Загрузить версию' }));
    expect(await screen.findByText(/Содержимое файла не похоже на аудио/)).toBeInTheDocument();
    expect(analyzeAudioFile).not.toHaveBeenCalled();
  });
});

import { useState } from 'react';
import { Link } from 'react-router';
import { resetDemoData } from '../api';
import { useApi } from '../app/apiContext';
import { useAppDispatch } from '../app/hooks';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/Dialog';
import { Select } from '../components/ui/Field';
import { restoreSession } from '../features/auth/authSlice';
import { pushToast } from '../features/toasts/toastsSlice';
import { DEMO_ARTIST, DEMO_OWNER, DEMO_PASSWORD } from '../lib/demoAccounts';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './AboutPage.module.css';

const LATENCY_OPTIONS = [
  { value: 0, label: 'Без задержки' },
  { value: 350, label: 'Быстрая сеть (350 мс)' },
  { value: 1500, label: 'Медленная сеть (1,5 с)' },
] as const;

function DemoControls() {
  const { controls, storage } = useApi();
  const dispatch = useAppDispatch();
  const [settings, setSettings] = useState(controls.get());
  const [confirmReset, setConfirmReset] = useState(false);

  const update = (patch: Partial<typeof settings>) => {
    controls.set(patch);
    setSettings(controls.get());
  };

  const reset = () => {
    resetDemoData(storage);
    setConfirmReset(false);
    void dispatch(restoreSession());
    dispatch(pushToast('success', 'Демо-данные восстановлены'));
  };

  return (
    <Card aria-labelledby="demo-title" className={styles.block}>
      <h2 id="demo-title">Демо-режим</h2>
      <p className={styles.muted}>
        Сервера пока нет: данные хранятся в вашем браузере. Эти настройки помогают проверить
        состояния загрузки и ошибки.
      </p>
      <div className={styles.controls}>
        <Select
          label="Скорость «сети»"
          value={settings.latencyMs}
          onChange={(event) => update({ latencyMs: Number(event.target.value) })}
        >
          {LATENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.failNetwork}
            onChange={(event) => update({ failNetwork: event.target.checked })}
          />
          Имитировать сбой сети (все запросы завершаются ошибкой)
        </label>
      </div>
      <div>
        <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
          Сбросить демо-данные
        </Button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        title="Сбросить демо-данные?"
        description="Все созданные вами проекты и правки исчезнут, вернутся исходные демо-проекты. Вы выйдете из аккаунта."
        confirmLabel="Сбросить"
        onConfirm={reset}
        onCancel={() => setConfirmReset(false)}
      />
    </Card>
  );
}

export function AboutPage() {
  useDocumentTitle('О проекте');

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1>О проекте</h1>
        <p>
          <strong>Mixback</strong> — сервис фидбэка на сведение музыки. Звукорежиссёр загружает
          версии микса, артист оставляет правки на таймкодах волны, а Mixback собирает из них
          чек-лист задач.
        </p>
        <p className={styles.muted}>
          Этап 3 итогового проекта: frontend MVP. Бэкенд появится на этапе 4.
        </p>
      </header>

      <div className={styles.columns}>
        <Card aria-labelledby="scenarios-title" className={styles.block}>
          <h2 id="scenarios-title">Что можно проверить</h2>
          <ol className={styles.steps}>
            <li>
              <strong>Звукорежиссёр:</strong> создать проект → загрузить версию микса → отправить
              приглашение артисту.
            </li>
            <li>
              <strong>Артист:</strong> открыть проект → сравнить версии (A/B с выравниванием
              громкости) → оставить правку на нужной секунде.
            </li>
            <li>
              <strong>Чек-лист:</strong> звукорежиссёр собирает правки в список задач и отмечает
              выполненное.
            </li>
          </ol>
          <Link to="/login" className={styles.link}>
            Перейти ко входу
          </Link>
        </Card>

        <Card aria-labelledby="accounts-title" className={styles.block}>
          <h2 id="accounts-title">Демо-аккаунты</h2>
          <dl className={styles.accounts}>
            <div>
              <dt>Звукорежиссёр</dt>
              <dd>
                <code>{DEMO_OWNER.email}</code>
              </dd>
            </div>
            <div>
              <dt>Артист</dt>
              <dd>
                <code>{DEMO_ARTIST.email}</code>
              </dd>
            </div>
            <div>
              <dt>Пароль обоих</dt>
              <dd>
                <code>{DEMO_PASSWORD}</code>
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <DemoControls />

      <Card aria-labelledby="tech-title" className={styles.block}>
        <h2 id="tech-title">Технологии и источники</h2>
        <p>
          React, TypeScript, Redux Toolkit, React Router, wavesurfer.js, CSS Modules, Vitest,
          Storybook, Playwright.
        </p>
        <p className={styles.muted}>
          Демо-трек «Happy Happy HardPopCoreTastic» — Mesostic, лицензия CC0 1.0 (общественное
          достояние), источник: Wikimedia Commons.
        </p>
      </Card>
    </div>
  );
}

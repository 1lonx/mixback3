import { useState, type SyntheticEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Field';
import type { FieldErrors } from '../../lib/errors';
import { SERVICE_LABELS } from '../../lib/labels';
import {
  engineerSchema,
  MAX_GENRES,
  MAX_SERVICES,
  parseWith,
  type EngineerInput,
} from '../../lib/schemas';
import {
  GENRES,
  SERVICE_KINDS,
  type EngineerProfile,
  type Genre,
  type ServiceKind,
} from '../../types/domain';
import styles from './EngineerForm.module.css';

/** Цена и срок в форме — строки: пустое поле не должно превращаться в 0. */
interface ServiceDraft {
  key: string;
  id?: string;
  kind: ServiceKind;
  title: string;
  description: string;
  price: string;
  days: string;
}

interface Values {
  headline: string;
  bio: string;
  genres: Genre[];
  published: boolean;
  services: ServiceDraft[];
}

let draftCounter = 0;
const newDraft = (): ServiceDraft => ({
  key: `new-${++draftCounter}`,
  kind: 'mixing',
  title: '',
  description: '',
  price: '',
  days: '',
});

const fromProfile = (profile: EngineerProfile | null): Values => ({
  headline: profile?.headline ?? '',
  bio: profile?.bio ?? '',
  genres: profile?.genres ?? [],
  published: profile?.published ?? false,
  services:
    profile?.services.map((s) => ({
      key: s.id,
      id: s.id,
      kind: s.kind,
      title: s.title,
      description: s.description,
      price: String(s.priceRub),
      days: String(s.days),
    })) ?? [],
});

const toNumber = (value: string) => (value.trim() === '' ? undefined : Number(value));

interface EngineerFormProps {
  profile: EngineerProfile | null;
  onSubmit: (input: EngineerInput) => Promise<void>;
  serverErrors?: FieldErrors;
}

export function EngineerForm({ profile, onSubmit, serverErrors }: EngineerFormProps) {
  const [values, setValues] = useState<Values>(() => fromProfile(profile));
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const errors = { ...serverErrors, ...clientErrors };
  const clear = (field: string) => setClientErrors((prev) => ({ ...prev, [field]: '' }));

  const patchService = (key: string, patch: Partial<ServiceDraft>, field: string) => {
    setValues((prev) => ({
      ...prev,
      services: prev.services.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
    clear(field);
  };

  const toggleGenre = (genre: Genre) => {
    setValues((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
    clear('genres');
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = parseWith(engineerSchema, {
      headline: values.headline,
      bio: values.bio,
      genres: values.genres,
      published: values.published,
      services: values.services.map((s) => ({
        ...(s.id ? { id: s.id } : {}),
        kind: s.kind,
        title: s.title,
        description: s.description,
        priceRub: toNumber(s.price),
        days: toNumber(s.days),
      })),
    });
    if (!parsed.success) {
      setClientErrors(parsed.errors);
      return;
    }
    setClientErrors({});
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      <Card className={styles.section} aria-labelledby="about-heading">
        <h2 id="about-heading">О вас</h2>
        <Input
          label="Заголовок анкеты"
          name="headline"
          value={values.headline}
          error={errors.headline}
          maxLength={80}
          hint="Одна строка о том, что вы делаете лучше всего"
          onChange={(event) => {
            setValues((prev) => ({ ...prev, headline: event.target.value }));
            clear('headline');
          }}
        />
        <Textarea
          label="О себе"
          name="bio"
          value={values.bio}
          error={errors.bio}
          hint={`${values.bio.length}/1000 · опыт, оборудование, как строите работу`}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, bio: event.target.value }));
            clear('bio');
          }}
        />
        <fieldset className={styles.genres}>
          <legend>Жанры (до {MAX_GENRES})</legend>
          <div className={styles.genreList}>
            {GENRES.map((genre) => {
              const checked = values.genres.includes(genre);
              return (
                <label key={genre} className={styles.genre}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && values.genres.length >= MAX_GENRES}
                    onChange={() => toggleGenre(genre)}
                  />
                  {genre}
                </label>
              );
            })}
          </div>
          {errors.genres && (
            <p className={styles.error} role="alert">
              {errors.genres}
            </p>
          )}
        </fieldset>
      </Card>

      <Card className={styles.section} aria-labelledby="services-heading">
        <div className={styles.sectionHead}>
          <h2 id="services-heading">Услуги</h2>
          <Button
            variant="secondary"
            size="sm"
            disabled={values.services.length >= MAX_SERVICES}
            onClick={() =>
              setValues((prev) => ({ ...prev, services: [...prev.services, newDraft()] }))
            }
          >
            Добавить услугу
          </Button>
        </div>
        {errors.services && (
          <p className={styles.error} role="alert">
            {errors.services}
          </p>
        )}
        {values.services.length === 0 && !errors.services && (
          <p className={styles.muted}>
            Добавьте хотя бы одну услугу с ценой и сроком — иначе заказать будет нечего.
          </p>
        )}
        <ul className={styles.services}>
          {values.services.map((service, index) => {
            const path = `services.${index}`;
            return (
              <li key={service.key} className={styles.service}>
                <fieldset className={styles.serviceFields}>
                  <legend>Услуга {index + 1}</legend>
                  <Select
                    label="Тип"
                    name={`${path}.kind`}
                    value={service.kind}
                    onChange={(event) =>
                      patchService(
                        service.key,
                        { kind: event.target.value as ServiceKind },
                        `${path}.kind`,
                      )
                    }
                  >
                    {SERVICE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {SERVICE_LABELS[kind]}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Название"
                    name={`${path}.title`}
                    value={service.title}
                    error={errors[`${path}.title`]}
                    maxLength={60}
                    onChange={(event) =>
                      patchService(service.key, { title: event.target.value }, `${path}.title`)
                    }
                  />
                  <Input
                    label="Цена, ₽"
                    name={`${path}.priceRub`}
                    type="number"
                    inputMode="numeric"
                    min={500}
                    value={service.price}
                    error={errors[`${path}.priceRub`]}
                    onChange={(event) =>
                      patchService(service.key, { price: event.target.value }, `${path}.priceRub`)
                    }
                  />
                  <Input
                    label="Срок, дней"
                    name={`${path}.days`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={service.days}
                    error={errors[`${path}.days`]}
                    onChange={(event) =>
                      patchService(service.key, { days: event.target.value }, `${path}.days`)
                    }
                  />
                  <div className={styles.wide}>
                    <Textarea
                      label="Что входит"
                      name={`${path}.description`}
                      value={service.description}
                      error={errors[`${path}.description`]}
                      hint="Сколько кругов правок, что нужно прислать"
                      onChange={(event) =>
                        patchService(
                          service.key,
                          { description: event.target.value },
                          `${path}.description`,
                        )
                      }
                    />
                  </div>
                </fieldset>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Удалить услугу ${index + 1}`}
                  onClick={() =>
                    setValues((prev) => ({
                      ...prev,
                      services: prev.services.filter((s) => s.key !== service.key),
                    }))
                  }
                >
                  Удалить
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className={styles.section} aria-labelledby="publish-heading">
        <h2 id="publish-heading">Публикация</h2>
        <label className={styles.publish}>
          <input
            type="checkbox"
            checked={values.published}
            onChange={(event) => {
              setValues((prev) => ({ ...prev, published: event.target.checked }));
              clear('services');
            }}
          />
          <span>
            Показывать анкету в каталоге
            <span className={styles.muted}> — скрытую анкету видите только вы</span>
          </span>
        </label>
        <div>
          <Button type="submit" loading={submitting}>
            Сохранить анкету
          </Button>
        </div>
      </Card>
    </form>
  );
}

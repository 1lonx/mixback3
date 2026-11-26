import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/motion';
import type { ProfileStats } from '../../types/domain';
import styles from './StatsGrid.module.css';

/** Число, которое «набегает» от нуля. Без анимации сразу показывает итог. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const counter = { v: 0 };
      gsap.to(counter, {
        v: value,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = String(Math.round(counter.v));
        },
        onComplete: () => {
          el.textContent = String(value);
        },
      });
    },
    { dependencies: [value] },
  );

  return <strong ref={ref}>{value}</strong>;
}

const ITEMS: { key: keyof ProfileStats; label: string }[] = [
  { key: 'projectsOwned', label: 'Своих проектов' },
  { key: 'projectsShared', label: 'Проектов, где вы артист' },
  { key: 'versions', label: 'Загружено версий' },
  { key: 'comments', label: 'Оставлено правок' },
  { key: 'resolved', label: 'Из них решено' },
];

export function StatsGrid({ stats }: { stats: ProfileStats }) {
  return (
    <section aria-label="Статистика">
      <dl className={styles.grid}>
        {ITEMS.map((item) => (
          <div key={item.key} className={styles.item}>
            <dd className={styles.value}>
              <CountUp value={stats[item.key]} />
            </dd>
            <dt className={styles.label}>{item.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

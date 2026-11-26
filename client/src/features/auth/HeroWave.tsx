import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/motion';
import styles from './HeroWave.module.css';

const BARS = 44;

const baseHeight = (i: number) =>
  0.22 + 0.78 * Math.abs(Math.sin(i * 0.38) * Math.cos(i * 0.11 + 0.6));

export function HeroWave() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !ref.current) return;
      const bars = ref.current.querySelectorAll('span');
      gsap.from(bars, { scaleY: 0, duration: 0.7, ease: 'back.out(1.6)', stagger: 0.015 });
      gsap.to(bars, {
        scaleY: () => gsap.utils.random(0.25, 1),
        duration: () => gsap.utils.random(0.5, 1.1),
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        repeatRefresh: true,
        delay: 0.8,
        stagger: { each: 0.03, from: 'center' },
      });
    },
    { scope: ref },
  );

  return (
    <div className={styles.wave} ref={ref} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} style={{ transform: `scaleY(${baseHeight(i)})` }} />
      ))}
    </div>
  );
}

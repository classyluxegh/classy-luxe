'use client';

import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** Counts up to `to` when scrolled into view (shows the final number instantly for reduced motion). */
export function CountUp({ to, suffix = '', duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setValue(to); return; }
    const controls = animate(0, to, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduce, to, duration]);

  return <span ref={ref} aria-label={`${to}${suffix}`}>{value}{suffix}</span>;
}

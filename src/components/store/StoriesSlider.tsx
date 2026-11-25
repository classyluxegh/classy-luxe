'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { TESTIMONIALS } from '@/lib/site';
import { Avatar } from './Testimonials';

const AUTOPLAY_MS = 5500;
const SLIDE_S = 1.1;
const EASE = [0.45, 0, 0.2, 1] as const;

/**
 * Client stories shown two at a time (one on phones), sliding one card per
 * step in an endless loop. Copies of the first cards sit after the last ones,
 * so the slider always moves forward and never rewinds across all stories.
 */
export function StoriesSlider() {
  const n = TESTIMONIALS.length;
  const reduce = useReducedMotion();
  const [perView, setPerView] = useState(2);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setPerView(mq.matches ? 2 : 1);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const slides = [...TESTIMONIALS, ...TESTIMONIALS.slice(0, perView)]; // clones for the seamless loop
  const step = 100 / perView; // % of the track width per card

  const pos = useRef(0);
  const busy = useRef(false);
  const [current, setCurrent] = useState(0);
  const offset = useMotionValue(0);
  const x = useTransform(offset, (v) => `${v}%`);

  // keep position correct if the number of visible cards changes
  useEffect(() => { offset.set(-pos.current * step); }, [step, offset]);

  const slideTo = useCallback((target: number) => {
    if (busy.current) return;
    busy.current = true;
    pos.current = target;
    setCurrent(target % n);
    const done = () => {
      if (pos.current >= n) { pos.current -= n; offset.set(-pos.current * step); } // jump from clones back to the real cards
      busy.current = false;
    };
    if (reduce) { offset.set(-target * step); done(); return; }
    animate(offset, -target * step, { duration: SLIDE_S, ease: EASE }).then(done);
  }, [n, offset, reduce, step]);

  const next = useCallback(() => slideTo(pos.current + 1), [slideTo]);
  const prev = useCallback(() => {
    if (busy.current) return;
    if (pos.current === 0) { pos.current = n; offset.set(-n * step); }
    slideTo(pos.current - 1);
  }, [n, offset, slideTo, step]);

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  useEffect(() => {
    if (reduce || !visible) return;
    const t = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [current, reduce, visible, next]);

  return (
    <div aria-roledescription="carousel" aria-label="What our clients say about Classy Luxe">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-[.68rem] uppercase tracking-[.24em] text-muted">What our clients say about Classy Luxe</p>
        <div className="flex gap-2">
          <button className="round-btn round-btn-dark !h-10 !w-10 text-sm" aria-label="Previous story" onClick={prev}>←</button>
          <button className="round-btn round-btn-dark !h-10 !w-10 text-sm" aria-label="Next story" onClick={next}>→</button>
        </div>
      </div>

      <div className="-mr-4 overflow-hidden">
        <motion.ul className="flex" style={{ x }}>
          {slides.map((t, k) => (
            <li
              key={`${t.name}-${k}`}
              className="shrink-0 pr-4"
              style={{ width: `${step}%` }}
              aria-hidden={k >= n || k < current || k >= current + perView}
            >
              <div className="flex h-full flex-col border border-line bg-ivory-2 p-6 lg:p-7">
                <span aria-hidden="true" className="block h-6 font-serif text-5xl leading-none text-gold">“</span>
                <p className="flex-1 font-serif text-[1.15rem] leading-snug text-ink">{t.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="-mr-2 origin-left scale-[.8]"><Avatar t={t} /></span>
                  <span className="text-[.68rem] uppercase tracking-[.18em] text-muted"><strong className="font-normal text-ink">{t.name}</strong> · {t.place}</span>
                </div>
              </div>
            </li>
          ))}
        </motion.ul>
      </div>

      <div className="testi-dots mt-6 justify-center" role="group" aria-label="Choose story">
        {TESTIMONIALS.map((t, k) => (
          <button key={t.name} aria-label={`Show story from ${t.name}`} aria-current={k === current} onClick={() => k !== current && slideTo(k)} />
        ))}
      </div>
    </div>
  );
}

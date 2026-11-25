'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'framer-motion';
import Image from 'next/image';
import { TESTIMONIALS, type Testimonial } from '@/lib/site';

const AUTOPLAY_MS = 6000; // time each story is shown
const SLIDE_S = 1.2;      // slide duration (gentle)
const EASE = [0.45, 0, 0.2, 1] as const;

/**
 * Client stories — an endless horizontal loop.
 * A copy of the first story sits after the last one: the carousel slides
 * forward into it, then silently resets to the real first story, so it never
 * rewinds back across all the stories.
 */
export function Testimonials() {
  const n = TESTIMONIALS.length;
  const slides = [...TESTIMONIALS, TESTIMONIALS[0]]; // last = clone of first
  const reduce = useReducedMotion();

  const pos = useRef(0);               // current slide index within `slides`
  const busy = useRef(false);          // true while a slide animation runs
  const [current, setCurrent] = useState(0); // real story index (0..n-1) for dots/labels
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(true);

  const offset = useMotionValue(0); // in % of one slide
  const x = useTransform(offset, (v) => `${v}%`);

  const slideTo = useCallback((target: number) => {
    if (busy.current) return;
    busy.current = true;
    pos.current = target;
    setCurrent(target % n);
    const done = () => {
      // Landed on the clone of the first story → jump invisibly to the real one
      if (pos.current === n) { pos.current = 0; offset.set(0); }
      busy.current = false;
    };
    if (reduce) { offset.set(-target * 100); done(); return; }
    animate(offset, -target * 100, { duration: SLIDE_S, ease: EASE }).then(done);
  }, [n, offset, reduce]);

  const next = useCallback(() => slideTo(pos.current + 1), [slideTo]);
  const prev = useCallback(() => {
    if (busy.current) return;
    if (pos.current === 0) { pos.current = n; offset.set(-n * 100); } // from the first story, start at the clone
    slideTo(pos.current - 1);
  }, [n, offset, slideTo]);
  const goTo = (k: number) => { if (k !== current) slideTo(k); };

  // Autoplay: runs on its own; pauses only while dragging or when the tab is hidden
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  useEffect(() => {
    if (reduce || dragging || !visible) return;
    const t = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [current, reduce, dragging, visible, next]);

  function onDragEnd(_: unknown, info: PanInfo) {
    setDragging(false);
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -60) next();
    else if (swipe > 60) prev();
  }

  return (
    <div className="testi-stage reveal d2" aria-roledescription="carousel" aria-label="Customer testimonials">
      <div className="overflow-hidden" aria-live="off">
        {/* outer layer: swipe/drag gesture (springs back by itself) */}
        <motion.div
          className="touch-pan-y"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          dragSnapToOrigin
          onDragStart={() => setDragging(true)}
          onDragEnd={onDragEnd}
        >
          {/* inner track: slides one story width at a time */}
          <motion.div className="flex" style={{ x }}>
            {slides.map((t, k) => (
              <figure
                key={`${t.name}-${k}`}
                className="testi-slide active w-full shrink-0 select-none px-2 sm:px-6"
                aria-hidden={k === n || k % n !== current}
                role="group"
                aria-label={`${(k % n) + 1} of ${n}`}
              >
                <blockquote><span className="testi-mark" aria-hidden="true">“</span><p>{t.text}</p></blockquote>
                <footer className="flex flex-col items-center gap-4">
                  <Avatar t={t} />
                  <span><strong>{t.name}</strong> · {t.place}</span>
                </footer>
              </figure>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="testi-nav">
        <button className="round-btn round-btn-dark" aria-label="Previous testimonial" onClick={prev}>←</button>
        <div className="testi-dots" role="group" aria-label="Choose testimonial">
          {TESTIMONIALS.map((t, k) => (
            <button key={t.name} aria-label={`Show testimonial from ${t.name}`} aria-current={k === current} onClick={() => goTo(k)} />
          ))}
        </div>
        <button className="round-btn round-btn-dark" aria-label="Next testimonial" onClick={next}>→</button>
      </div>
    </div>
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Customer photo if one has been added (see lib/site.ts), otherwise elegant initials. */
export function Avatar({ t }: { t: Testimonial }) {
  return (
    <span className="relative grid h-16 w-16 place-items-center rounded-full bg-ink ring-1 ring-gold/60 ring-offset-4 ring-offset-ivory-2">
      {t.photo ? (
        <Image src={t.photo} alt={t.name} fill sizes="64px" className="rounded-full object-cover" draggable={false} />
      ) : (
        <span aria-hidden="true" className="font-serif text-xl italic tracking-[.04em] text-gold-light">{initials(t.name)}</span>
      )}
    </span>
  );
}

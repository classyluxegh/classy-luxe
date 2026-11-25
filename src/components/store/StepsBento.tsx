'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ProductImage } from './ProductImage';
import { WaLink } from './WaLink';

export interface Step {
  title: string;
  text: string;
  footer: string;
  href?: string;   // internal link
  waText?: string; // or open WhatsApp with this message
}
export interface Slide { src: string | null; alt: string; name: string }

const SLIDE_MS = 4500;

/**
 * "The Classy Luxe experience" — 4×2 bento grid alternating step cards and
 * product-photo slideshows. Layout (desktop):
 *   [Step 1][Photos][Step 2][Photos]
 *   [Photos][Step 3][Photos][Step 4]
 * (StepCard still supports a gold `accent` style if one card should stand out.)
 */
export function StepsBento({ steps, slides }: { steps: Step[]; slides: Slide[][] }) {
  const cells: ({ kind: 'step'; i: number } | { kind: 'photo'; i: number })[] = [
    { kind: 'step', i: 0 }, { kind: 'photo', i: 0 }, { kind: 'step', i: 1 }, { kind: 'photo', i: 1 },
    { kind: 'photo', i: 2 }, { kind: 'step', i: 2 }, { kind: 'photo', i: 3 }, { kind: 'step', i: 3 }
  ];
  return (
    <div className="grid overflow-hidden rounded-md border border-ivory/10 bg-ivory/10 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 1 }}>
      {cells.map((c, k) =>
        c.kind === 'step'
          ? <StepCard key={k} step={steps[c.i]} index={c.i} total={steps.length} accent={false} />
          : <PhotoTile key={k} slides={slides[c.i] || []} className={c.i >= 2 ? 'max-sm:hidden' : ''} />
      )}
    </div>
  );
}

function StepCard({ step, index, total, accent }: { step: Step; index: number; total: number; accent: boolean }) {
  const arrow = (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${accent ? 'border-ink/30 group-hover:bg-ink group-hover:text-gold' : 'border-ivory/25 group-hover:border-gold group-hover:bg-gold group-hover:text-ink'}`} aria-hidden="true">→</span>
  );
  const footer = (
    <span className={`flex items-center justify-between gap-4 border-t pt-5 ${accent ? 'border-ink/20' : 'border-ivory/12'}`}>
      <span className={`text-[.68rem] font-medium uppercase tracking-[.2em] ${accent ? 'text-ink/80' : 'text-ivory/60'}`}>{step.footer}</span>
      {arrow}
    </span>
  );
  const body = (
    <>
      <span className="flex items-center justify-between">
        <span className={`text-[.66rem] font-medium uppercase tracking-[.24em] ${accent ? 'text-ink/70' : 'text-ivory/55'}`}>Step 0{index + 1}</span>
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: total }).map((_, d) => (
            <span key={d} className={`h-px w-3.5 ${d === index ? (accent ? 'bg-ink' : 'bg-gold') : accent ? 'bg-ink/25' : 'bg-ivory/20'}`} />
          ))}
        </span>
      </span>
      <span className="mt-7 block flex-1">
        <span className={`block font-serif text-[1.65rem] leading-tight ${accent ? 'text-ink' : 'text-ivory'}`}>{step.title}</span>
        <span className={`mt-3 block text-[.95rem] leading-relaxed ${accent ? 'text-ink/75' : 'text-ivory/65'}`}>{step.text}</span>
      </span>
      <span className="mt-8 block">{footer}</span>
    </>
  );
  const cls = `group flex min-h-[300px] flex-col p-7 lg:p-8 transition-colors duration-500 ${accent ? 'bg-gold text-ink hover:bg-gold-light' : 'bg-charcoal hover:bg-charcoal-2'}`;
  if (step.waText) return <WaLink text={step.waText} className={cls}>{body}</WaLink>;
  return <Link href={step.href || '/shop'} className={cls}>{body}</Link>;
}

function PhotoTile({ slides, className = '' }: { slides: Slide[]; className?: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const n = Math.max(1, slides.length);
  const running = playing && !reduce && n > 1;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, running, n]);

  const s = slides[i];
  return (
    <div className={`relative min-h-[300px] overflow-hidden bg-ink ${className}`} aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.div
          key={i}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <ProductImage src={s?.src} alt={s?.alt || ''} name={s?.name} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" dark />
        </motion.div>
      </AnimatePresence>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-ink/70 to-transparent" />

      {n > 1 && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 text-[.7rem] font-medium tracking-[.08em] text-ivory">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setPlaying((p) => !p)}
            className="grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-ivory backdrop-blur transition hover:bg-gold hover:text-ink"
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
          >
            {running ? (
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor"><rect width="3" height="10" /><rect x="6" width="3" height="10" /></svg>
            ) : (
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor"><path d="M0 0l9 5-9 5z" /></svg>
            )}
          </button>
          <span className="flex flex-1 gap-1.5">
            {slides.map((_, k) => (
              <span key={k} className="relative h-0.5 flex-1 overflow-hidden rounded bg-ivory/30">
                {k < i && <span className="absolute inset-0 bg-ivory" />}
                {k === i && (
                  <motion.span
                    key={`${i}-${running}`}
                    className="absolute inset-0 origin-left bg-ivory"
                    initial={{ scaleX: running ? 0 : 1 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: running ? SLIDE_MS / 1000 : 0, ease: 'linear' }}
                  />
                )}
              </span>
            ))}
          </span>
          <span className="tabular-nums">0{i + 1} <span className="text-ivory/55">/ 0{n}</span></span>
        </div>
      )}
    </div>
  );
}

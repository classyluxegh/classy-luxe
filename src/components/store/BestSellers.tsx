'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useStore } from './StoreProvider';
import { ProductCard } from './ProductCard';

/**
 * Pixels of vertical scrolling per pixel of horizontal movement.
 * Higher = slower, calmer glide.
 */
const SCROLL_RATIO = 1.6;

/**
 * Extra scrolling (as a share of the screen height) during which the row stays
 * locked — on the first item when the section arrives, and on the last item
 * before the page moves on.
 */
const HOLD_START = 0.45;
const HOLD_END = 0.45;

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** "Most loved" — pinned while the cards glide sideways as you scroll down (wide screens). */
export function BestSellers() {
  const { products } = useStore();
  const best = products
    .filter((p) => p.badge === 'Bestseller')
    .sort((a, b) => Number(!!b.images.length) - Number(!!a.images.length));

  const reduce = useReducedMotion();
  const [pinned, setPinned] = useState(false); // decided after mount (screen size)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setPinned(mq.matches && !reduce);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [reduce]);

  if (!best.length) return null;
  return pinned ? <PinnedRail products={best} /> : <SwipeRail products={best} />;
}

function Heading({ progress }: { progress?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="eyebrow eyebrow-light">Most Loved</p>
        <h2 className="h2" id="bsTitle">The fragrances Ghana<br /><em>keeps coming back for.</em></h2>
      </div>
      {progress}
    </header>
  );
}

function ViewAll() {
  return <Link href="/shop" className="btn btn-ghost-light">View the Full Collection</Link>;
}

/* ── Wide screens: vertical scroll drives horizontal movement ─────────── */
function PinnedRail({ products }: { products: ReturnType<typeof useStore>['products'] }) {
  const outer = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0); // how far the track must travel sideways
  const [vh, setVh] = useState(800);

  useIsoLayoutEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setVh(window.innerHeight);
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [products.length]);

  // Scroll budget while pinned: hold on first item → glide → hold on last item
  const holdStart = vh * HOLD_START;
  const holdEnd = vh * HOLD_END;
  const glide = distance * SCROLL_RATIO;
  const total = Math.max(1, holdStart + glide + holdEnd);
  const glideFrom = holdStart / total;
  const glideTo = (holdStart + glide) / total;

  const { scrollYProgress } = useScroll({ target: outer, offset: ['start start', 'end end'] });
  const rawX = useTransform(scrollYProgress, [0, glideFrom, glideTo, 1], [0, 0, -distance, -distance]);
  const glideProgress = useTransform(scrollYProgress, [glideFrom, glideTo], [0, 1], { clamp: true });
  // Spring smoothing: eases each scroll step instead of snapping to the wheel.
  const x = useSpring(rawX, { stiffness: 70, damping: 24, mass: 0.6, restDelta: 0.5 });
  const bar = useSpring(glideProgress, { stiffness: 70, damping: 24 });

  return (
    <section
      ref={outer}
      id="bestsellers"
      aria-labelledby="bsTitle"
      className="section-dark relative"
      style={{ height: vh + total }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center gap-[clamp(28px,5vh,56px)] overflow-hidden py-[clamp(64px,9vh,100px)]">
        <div className="container">
          <Heading
            progress={
              <div className="flex w-full max-w-xs items-center gap-4 text-[.68rem] uppercase tracking-[.22em] text-ivory/50 sm:w-auto">
                <span>Scroll</span>
                <span className="relative h-px w-40 bg-ivory/15" aria-hidden="true">
                  <motion.span className="absolute inset-y-0 left-0 w-full origin-left bg-gold" style={{ scaleX: bar }} />
                </span>
                <span>{products.length} scents</span>
              </div>
            }
          />
        </div>

        <motion.div
          ref={track}
          style={{ x, paddingInline: 'max(var(--gutter), calc((100vw - var(--maxw)) / 2 + var(--gutter)))' }}
          className="flex w-max items-stretch gap-[clamp(16px,2vw,28px)] will-change-transform"
        >
          {products.map((p, i) => (
            <div key={p.id} className="bs-card shrink-0" style={{ width: 'clamp(220px, min(24vw, calc((100vh - 430px) * .8)), 330px)' }}>
              <ProductCard product={p} index={i} dark />
            </div>
          ))}
          <div className="flex shrink-0 items-center pl-6 pr-[4vw]">
            <ViewAll />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Phones / reduced motion: normal swipeable row ───────────────────── */
function SwipeRail({ products }: { products: ReturnType<typeof useStore>['products'] }) {
  return (
    <section className="section section-dark bestsellers" id="bestsellers" aria-labelledby="bsTitle">
      <div className="container mb-10"><Heading /></div>
      <div className="bs-rail" tabIndex={0} aria-label="Best sellers — swipe to see more">
        {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} dark />)}
      </div>
      <div className="container mt-14 text-center"><ViewAll /></div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const INTERVAL = 4500; // ms each point stays open
const EASE = [0.22, 0.61, 0.36, 1] as const;

/** "Why Classy Luxe" — a self-running accordion: one point opens at a time, nonstop. */
export function WhyList({ items }: { items: [string, string][] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % items.length), INTERVAL);
    return () => clearTimeout(t);
  }, [active, reduce, items.length]); // restarts the timer whenever the open point changes (incl. clicks)

  return (
    <ol className="mt-11 border-b border-line" aria-label="Why Classy Luxe">
      {items.map(([title, text], i) => {
        const open = reduce || i === active;
        return (
          <li key={title} className="relative border-t border-line">
            {/* timer line along the top edge of the open point */}
            {!reduce && i === active && (
              <motion.span
                key={`bar-${active}`}
                aria-hidden="true"
                className="absolute -top-px left-0 h-px w-full origin-left bg-gold"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
              />
            )}
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-expanded={open}
              className="grid w-full grid-cols-[56px_1fr] items-baseline gap-3 py-[22px] text-left"
            >
              <span className={`font-serif text-xl italic transition-colors duration-500 ${open ? 'text-gold-deep' : 'text-muted-light'}`}>0{i + 1}</span>
              <span>
                <span className={`block font-serif text-[1.5rem] leading-tight transition-colors duration-500 ${open ? 'text-ink' : 'text-ink/45'}`}>{title}</span>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.span
                      key="text"
                      className="block overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: EASE }}
                    >
                      <span className="block pt-1.5 text-[.95rem] text-muted">{text}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

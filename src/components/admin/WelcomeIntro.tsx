'use client';

import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } }
};
const rise: Variants = {
  hidden: { opacity: 0, y: '0.6em', filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease } }
};
const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } }
};

/** Animated greeting for the admin dashboard's welcome band. */
export function WelcomeIntro({ today, greeting, name, days }: { today: string; greeting: string; name: string; days: number }) {
  const words = `${greeting},`.split(' ');
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.p variants={fade} className="text-[.66rem] uppercase tracking-[.3em] text-gold">
        <motion.span
          className="inline-block"
          initial={{ letterSpacing: '0.12em' }}
          animate={{ letterSpacing: '0.3em' }}
          transition={{ duration: 1.4, ease }}
        >
          {today}
        </motion.span>
      </motion.p>

      <h1 className="mt-2 font-serif text-[clamp(2rem,3.4vw,2.9rem)] font-light leading-tight" aria-label={`${greeting}, ${name}`}>
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden="true">
            <motion.span variants={rise} className="inline-block">{w}</motion.span>
            {' '}
          </span>
        ))}
        <span className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden="true">
          <motion.em variants={rise} className="welcome-name inline-block">{name}</motion.em>
        </span>
      </h1>

      <motion.p variants={fade} className="mt-1 text-sm text-ivory/60">
        Here&apos;s how Classy Luxe is doing over the last {days} days.
      </motion.p>

      <motion.span
        aria-hidden="true"
        className="mt-4 block h-px w-24 origin-left bg-linear-to-r from-gold to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.6, ease }}
      />
    </motion.div>
  );
}

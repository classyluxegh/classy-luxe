'use client';

import { motion } from 'framer-motion';

/** Gentle fade between storefront pages (disabled automatically for reduced motion). */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import type { DeliveryRate, Product, StoreSettings, Variant } from '@/lib/types';
import { displayName } from '@/lib/types';

export interface CartLine { variantId: string; quantity: number }
export interface ResolvedLine extends CartLine { product: Product; variant: Variant; lineTotal: number }

interface Toast { id: number; message: string; action?: { label: string; run: () => void } }

interface StoreCtx {
  settings: StoreSettings;
  products: Product[];
  deliveryRates: DeliveryRate[];
  paystackEnabled: boolean;
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toast: Toast | null;
  notify: (message: string, action?: Toast['action']) => void;
  bump: number;
}

const Ctx = createContext<StoreCtx | null>(null);
const KEY = 'classyluxe.cart.v2';
export const MAX_QTY = 20;

export function StoreProvider({ settings, products, deliveryRates, paystackEnabled, children }: {
  settings: StoreSettings; products: Product[]; deliveryRates: DeliveryRate[]; paystackEnabled: boolean; children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [bump, setBump] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const index = useMemo(() => {
    const m = new Map<string, { product: Product; variant: Variant }>();
    products.forEach((p) => p.variants.forEach((v) => m.set(v.id, { product: p, variant: v })));
    return m;
  }, [products]);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]') as CartLine[];
      if (Array.isArray(raw)) setItems(raw.filter((l) => l && typeof l.variantId === 'string' && l.quantity > 0).map((l) => ({ variantId: l.variantId, quantity: Math.min(MAX_QTY, Math.floor(l.quantity)) })));
    } catch { /* storage unavailable */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, loaded]);

  // Prices always come from the current catalogue; removed products drop out.
  const lines: ResolvedLine[] = useMemo(() => items.flatMap((l) => {
    const hit = index.get(l.variantId);
    return hit ? [{ ...l, ...hit, lineTotal: hit.variant.pricePesewas * l.quantity }] : [];
  }), [items, index]);

  const notify = useCallback((message: string, action?: Toast['action']) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, action });
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const add = useCallback((variantId: string, quantity = 1) => {
    const hit = index.get(variantId);
    if (!hit || !hit.variant.inStock) return;
    const cap = Math.min(MAX_QTY, hit.variant.stock ?? MAX_QTY);
    setItems((prev) => {
      const ex = prev.find((l) => l.variantId === variantId);
      if (ex) return prev.map((l) => l.variantId === variantId ? { ...l, quantity: Math.min(cap, l.quantity + quantity) } : l);
      return [...prev, { variantId, quantity: Math.min(cap, quantity) }];
    });
    setBump((b) => b + 1);
    notify(`${displayName(hit.product)} added to your bag`, { label: 'View bag', run: () => setDrawerOpen(true) });
  }, [index, notify]);

  const value: StoreCtx = {
    settings,
    products,
    deliveryRates,
    paystackEnabled,
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
    add,
    setQuantity: (variantId, quantity) => setItems((prev) => prev.map((l) => {
      if (l.variantId !== variantId) return l;
      const cap = Math.min(MAX_QTY, index.get(variantId)?.variant.stock ?? MAX_QTY);
      return { ...l, quantity: Math.max(1, Math.min(cap, quantity)) };
    })),
    remove: (variantId) => setItems((prev) => prev.filter((l) => l.variantId !== variantId)),
    clear: () => setItems([]),
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    toast,
    notify,
    bump
  };
  // reducedMotion="user": Framer Motion animations respect the visitor's OS setting
  return <Ctx.Provider value={value}><MotionConfig reducedMotion="user">{children}</MotionConfig></Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}

export function ToastHost() {
  const { toast } = useStore();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-7 z-[150] flex justify-center px-4 max-[720px]:bottom-auto max-[720px]:top-4">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-5 bg-ink py-3.5 pl-5 pr-4 text-sm text-ivory shadow-lg"
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button type="button" onClick={toast.action.run} className="whitespace-nowrap py-1.5 text-[.68rem] uppercase tracking-[.18em] text-gold">
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useSettings(): StoreSettings {
  return useStore().settings;
}

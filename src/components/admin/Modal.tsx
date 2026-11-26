'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = {
  /** Text on the button that opens the modal. */
  trigger: React.ReactNode;
  triggerClassName?: string;
  /** Small gold label above the title, e.g. "Catalogue". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Open automatically when the page URL has ?new=<openParam> (e.g. links from the dashboard). */
  openParam?: string;
  size?: 'md' | 'lg';
  children: React.ReactNode;
};

const ModalContext = createContext<{ close: () => void } | null>(null);
/** Inside a modal: `close()` shuts it. Outside: null. */
export const useModal = () => useContext(ModalContext);

/** "Cancel" button that closes the surrounding modal (renders nothing outside a modal). */
export function ModalCancel({ className = '' }: { className?: string }) {
  const modal = useModal();
  if (!modal) return null;
  return (
    <button type="button" onClick={modal.close}
      className={`inline-flex h-11 items-center rounded-full px-5 text-[.7rem] uppercase tracking-[.16em] text-muted transition-colors hover:bg-ivory hover:text-ink ${className}`}>
      Cancel
    </button>
  );
}

/** The form's buttons, right-aligned. `hint` is kept for callers but no longer shown. */
export function FormFooter({ children }: { hint?: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 pt-2">{children}</div>;
}

/**
 * A button that opens a centred dialog with a form inside.
 * Uses the native <dialog> so focus is trapped and Esc closes it.
 * It closes itself after the form is saved (the page URL changes).
 */
export function Modal({ trigger, triggerClassName = '', eyebrow, title, subtitle, openParam, size = 'md', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const qs = params.toString();
  const first = useRef(true);
  const close = () => setOpen(false);

  // Keep the <dialog> element in step with state
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    document.documentElement.style.overflow = open ? 'hidden' : '';
  }, [open]);

  // Auto-open from a link such as /admin/products?new=product
  useEffect(() => {
    if (openParam && params.get('new') === openParam) {
      setOpen(true);
      const rest = new URLSearchParams(qs);
      rest.delete('new');
      router.replace(`${pathname}${rest.toString() ? `?${rest}` : ''}`, { scroll: false });
    }
  }, [openParam, params, qs, pathname, router]);

  // The page URL changes after a successful save (?ok=…) → close
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (params.get('ok')) setOpen(false);
  }, [qs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { document.documentElement.style.overflow = ''; }, []);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>{trigger}</button>
      <dialog
        ref={ref}
        aria-labelledby="modal-title"
        onClose={close}
        onClick={(e) => { if (e.target === ref.current) close(); }}
        className={`admin-modal m-auto w-[calc(100%-1.5rem)] ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl bg-ivory p-0 text-ink shadow-[0_30px_80px_rgba(15,13,11,.18)] backdrop:bg-[rgba(245,240,232,.7)] backdrop:backdrop-blur-[4px]`}
      >
        {open && (
          <ModalContext.Provider value={{ close }}>
            <div className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 flex-col">
              {/* Header */}
              <header className="relative shrink-0 overflow-hidden border-b border-line bg-white px-6 py-6 sm:px-8">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-linear-to-r from-gold-light via-gold to-gold-light" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_100%_0%,rgba(201,169,110,.12),transparent_60%)]" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    {eyebrow && <p className="text-[.62rem] uppercase tracking-[.28em] text-gold-deep">{eyebrow}</p>}
                    <h2 id="modal-title" className="mt-1 font-serif text-[clamp(1.6rem,4vw,1.9rem)] font-light leading-tight text-ink">{title}</h2>
                    {subtitle && <p className="mt-1.5 max-w-md text-sm text-muted">{subtitle}</p>}
                  </div>
                  <button type="button" onClick={close} aria-label="Close"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold hover:text-gold-deep">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              </header>
              {/* Body */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-6 sm:px-8">{children}</div>
            </div>
          </ModalContext.Provider>
        )}
      </dialog>
    </>
  );
}

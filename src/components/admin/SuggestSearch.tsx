'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type Suggestion = { label: string; sub?: string; href: string; keywords?: string };

type Props = {
  items: Suggestion[];
  defaultValue?: string;
  placeholder: string;
  ariaLabel: string;
  /** Extra values the plain search should keep (e.g. the current filter). */
  hidden?: Record<string, string | undefined>;
  /** Where the page goes when the search is cleared (keeps filters). */
  clearHref?: string;
  className?: string;
};

const MAX = 8;
const LIVE_DELAY = 120; // ms before asking the server for the exact results

/** Instantly hide rows on the page that don't match (rows carry data-search). */
function filterRows(term: string, animate = true) {
  const t = term.trim().toLowerCase();
  const motion = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll<HTMLElement>('[data-search]').forEach((el, i) => {
    const show = !t || (el.dataset.search || '').includes(t);
    el.style.display = show ? '' : 'none';
    // A quick flick on the rows that remain — over in about 0.15s
    if (show && motion) el.animate(
      [{ opacity: 0.25, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }],
      { duration: 150, delay: Math.min(i, 6) * 12, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
    );
  });
}

/** Search box that suggests matching items as you type and filters the page list live. */
export function SuggestSearch({ items, defaultValue = '', placeholder, ariaLabel, hidden = {}, clearHref, className = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const applied = useRef(defaultValue.trim()); // the search the page list currently shows
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  const matches = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!term) return [];
    const scored: { s: Suggestion; score: number }[] = [];
    for (const s of items) {
      const label = s.label.toLowerCase();
      const hay = `${label} ${(s.keywords || '').toLowerCase()}`;
      if (!hay.includes(term)) continue;
      const score = label.startsWith(term) ? 0 : label.split(/[\s·,-]+/).some((w) => w.startsWith(term)) ? 1 : label.includes(term) ? 2 : 3;
      scored.push({ s, score });
    }
    return scored.sort((a, b) => a.score - b.score).slice(0, MAX).map((x) => x.s);
  }, [items, value]);

  // Filter the page's own list as the user types (debounced); empty box = full list straight away.
  useEffect(() => {
    const term = value.trim();
    if (term === applied.current) return;
    const run = () => {
      applied.current = term;
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(hidden)) if (v) params.set(k, v);
      if (term) params.set('q', term);
      const qs = params.toString();
      router.replace(term || !clearHref ? `${pathname}${qs ? `?${qs}` : ''}` : clearHref, { scroll: false });
    };
    if (!term) { run(); return; }
    const t = setTimeout(run, LIVE_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // After the server sends new rows, re-apply the current text to them.
  useEffect(() => { filterRows(value, false); }, [items, defaultValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = open && value.trim().length > 0;
  const go = (href: string) => { setOpen(false); router.push(href); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
    else if (e.key === 'Enter' && active >= 0 && matches[active]) { e.preventDefault(); go(matches[active].href); }
  };

  return (
    <form ref={formRef} role="search" className={`flex w-full items-center gap-2 sm:w-auto ${className}`} onSubmit={() => { setOpen(false); applied.current = value.trim(); }}>
      {Object.entries(hidden).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <div className="relative w-full sm:w-72">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          ref={inputRef} name="q" value={value} placeholder={placeholder} aria-label={ariaLabel} autoComplete="off"
          role="combobox" aria-expanded={show} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next); setOpen(true); setActive(-1);
            filterRows(next); // instant — the server catches up a moment later
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-full border border-line bg-white pl-10 pr-10 text-sm text-ink outline-none focus:border-gold-deep"
        />

        {value.length > 0 && (
          <button type="button" aria-label="Clear search" title="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setValue(''); setActive(-1); setOpen(false); filterRows('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-ivory hover:text-ink">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}

        {show && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-line bg-white shadow-[0_18px_40px_rgba(15,13,11,.12)] sm:min-w-[22rem]">
            {matches.length ? (
              <ul id={listId} role="listbox" aria-label="Suggestions" className="max-h-80 overflow-y-auto py-1.5">
                {matches.map((m, i) => (
                  <li key={`${m.href}-${i}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()} onClick={() => go(m.href)} onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${i === active ? 'bg-ivory' : ''}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-ink"><Highlight text={m.label} term={value.trim()} /></span>
                      {m.sub && <span className="block truncate text-xs text-muted">{m.sub}</span>}
                    </span>
                    <span aria-hidden="true" className={`shrink-0 text-xs ${i === active ? 'text-gold-deep' : 'text-line'}`}>→</span>
                  </li>
                ))}
              </ul>
            ) : <p className="px-4 py-3 text-sm text-muted">No matches for “{value.trim()}”.</p>}
            <button type="submit" onMouseDown={(e) => e.preventDefault()}
              className="flex w-full items-center gap-2 border-t border-line bg-ivory/60 px-4 py-2.5 text-left text-xs text-muted hover:text-ink">
              Show all results for “{value.trim()}” <span aria-hidden="true">↵</span>
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

function Highlight({ text, term }: { text: string; term: string }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<mark className="bg-transparent font-medium text-gold-deep">{text.slice(at, at + term.length)}</mark>{text.slice(at + term.length)}</>;
}

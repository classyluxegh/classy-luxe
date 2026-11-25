import Link from 'next/link';

/** Gold "+ Add …" button used at the top of admin pages. */
export const btnAdd = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gold pl-4 pr-5 text-[.7rem] font-medium uppercase leading-none tracking-[.16em] text-ink shadow-[0_6px_18px_rgba(156,124,64,.25)] transition-colors hover:bg-gold-light';

/** Crisp plus icon that sits centred next to button text. */
export function PlusIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}

export const input = 'h-10 w-full border border-line bg-white px-3 text-sm text-ink outline-none focus:border-gold-deep';
export const btn = 'inline-flex h-10 items-center justify-center gap-2 px-4 text-[.7rem] uppercase tracking-[.16em] transition disabled:opacity-50';
export const btnDark = `${btn} bg-ink text-ivory hover:bg-charcoal-2`;
export const btnOutline = `${btn} border border-line text-ink hover:border-ink`;
export const btnDanger = `${btn} border border-danger/40 text-danger hover:bg-danger hover:text-white`;

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[clamp(2rem,6vw,2.25rem)] font-light text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p role={error ? 'alert' : 'status'} className={`mb-6 border px-4 py-3 text-sm ${error ? 'border-danger/30 bg-danger/5 text-danger' : 'border-whatsapp/30 bg-whatsapp/5 text-whatsapp'}`}>
      {error || ok}
    </p>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border border-line bg-white p-5 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'gold' }) {
  const tones = {
    neutral: 'bg-beige text-text',
    good: 'bg-whatsapp/10 text-whatsapp',
    warn: 'bg-gold/20 text-gold-deep',
    bad: 'bg-danger/10 text-danger',
    gold: 'bg-ink text-gold-light'
  };
  return <span className={`inline-block whitespace-nowrap px-2 py-0.5 text-[.68rem] uppercase tracking-[.12em] ${tones[tone]}`}>{children}</span>;
}

export function statusTone(s: string): 'neutral' | 'good' | 'warn' | 'bad' | 'gold' {
  if (s === 'delivered' || s === 'paid') return 'good';
  if (s === 'cancelled' || s === 'failed' || s === 'refunded') return 'bad';
  if (s === 'pending' || s === 'unpaid') return 'warn';
  return 'gold';
}

export function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} className={`block px-3 py-2 text-sm transition ${active ? 'bg-ivory/10 text-gold' : 'text-ivory/70 hover:text-ivory'}`}>
      {children}
    </Link>
  );
}

import { WaLink } from './WaLink';

/** Renders a policy written by the business in Admin → Settings. Blank lines start new paragraphs; lines starting with "## " become headings. */
export function PolicyPage({ title, eyebrow, body, updatedAt }: { title: string; eyebrow: string; body: string | null; updatedAt?: string }) {
  const blocks = (body || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <section className="section" style={{ paddingTop: 'clamp(130px, 14vw, 180px)' }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h2 mb-10">{title}</h1>
        {blocks.length ? (
          <div className="space-y-5 text-[1.02rem] leading-relaxed text-text">
            {blocks.map((b, i) => b.startsWith('## ')
              ? <h2 key={i} className="pt-4 font-serif text-2xl text-ink">{b.slice(3)}</h2>
              : <p key={i} className="whitespace-pre-line">{b}</p>)}
            {updatedAt && <p className="pt-6 text-xs text-muted">Last updated {new Date(updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
          </div>
        ) : (
          <div className="border border-line bg-ivory p-8">
            <p className="text-text">This page is being prepared.</p>
            <p className="mt-2 text-muted">If you have a question in the meantime, we&apos;re happy to help.</p>
            <WaLink className="btn btn-dark mt-6" text={`Hello Classy Luxe! I have a question about your ${title.toLowerCase()}.`}>Ask on WhatsApp</WaLink>
          </div>
        )}
      </div>
    </section>
  );
}

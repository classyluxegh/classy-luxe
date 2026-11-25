import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section" style={{ paddingTop: 180, textAlign: 'center' }}>
      <div className="container">
        <p className="eyebrow">Page not found</p>
        <h1 className="h2">This scent has <em>drifted away.</em></h1>
        <p className="lead" style={{ margin: '24px auto 40px' }}>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/shop" className="btn btn-dark">Explore the Collection</Link>
      </div>
    </section>
  );
}

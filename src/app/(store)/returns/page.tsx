import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog';
import { PolicyPage } from '@/components/store/PolicyPage';

export const metadata: Metadata = { title: 'Returns & Refunds', alternates: { canonical: '/returns' } };

export default async function Page() {
  const { settings } = await getCatalog();
  return <PolicyPage eyebrow="Customer Care" title="Returns & Refunds" body={settings.returnsPolicy} />;
}

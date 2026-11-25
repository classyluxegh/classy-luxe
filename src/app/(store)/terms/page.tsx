import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog';
import { PolicyPage } from '@/components/store/PolicyPage';

export const metadata: Metadata = { title: 'Terms & Conditions', alternates: { canonical: '/terms' } };

export default async function Page() {
  const { settings } = await getCatalog();
  return <PolicyPage eyebrow="Customer Care" title="Terms & Conditions" body={settings.termsConditions} />;
}

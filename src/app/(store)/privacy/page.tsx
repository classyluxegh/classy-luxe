import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog';
import { PolicyPage } from '@/components/store/PolicyPage';

export const metadata: Metadata = { title: 'Privacy Policy', alternates: { canonical: '/privacy' } };

export default async function Page() {
  const { settings } = await getCatalog();
  return <PolicyPage eyebrow="Customer Care" title="Privacy Policy" body={settings.privacyPolicy} />;
}

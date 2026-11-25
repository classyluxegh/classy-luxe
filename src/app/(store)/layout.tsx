import { getCatalog } from '@/lib/catalog';
import { serverEnv } from '@/lib/env';
import { StoreProvider, ToastHost } from '@/components/store/StoreProvider';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { CartDrawer } from '@/components/store/CartDrawer';
import { RevealObserver } from '@/components/store/RevealObserver';

export const revalidate = 60; // catalogue refreshes at least every minute (admin edits revalidate instantly)

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { products, categories, deliveryRates, settings } = await getCatalog();
  return (
    <StoreProvider settings={settings} products={products} deliveryRates={deliveryRates} paystackEnabled={serverEnv.paystackEnabled()}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">{children}</main>
      <Footer categories={categories} settings={settings} />
      <CartDrawer />
      <ToastHost />
      <RevealObserver />
    </StoreProvider>
  );
}

import { requireAdmin } from '@/lib/admin';
import { PageHead } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function NewProduct() {
  const { supabase } = await requireAdmin('manager');
  const { data: categories } = await supabase.from('categories').select('id, name').order('sort_order');
  return (
    <>
      <PageHead title="Add product" />
      <ProductForm categories={categories || []} />
    </>
  );
}

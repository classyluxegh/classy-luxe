'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { back, requireAdmin } from '@/lib/admin';
import { cedisToPesewas } from '@/lib/money';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, categorySchema, productSchema, settingsSchema } from '@/lib/validation';
import { createServiceClient } from '@/lib/supabase/service';
import { publicEnv } from '@/lib/env';
import { log } from '@/lib/log';

const BUCKET = 'product-images';
const uuid = z.string().uuid();

function refreshStore(slug?: string) {
  revalidatePath('/', 'layout');
  if (slug) revalidatePath(`/product/${slug}`);
}

function dbMessage(e: { message?: string; code?: string } | null): string {
  if (!e) return 'Something went wrong.';
  if (e.code === '23505') return 'That slug is already in use — choose another.';
  if (e.code === '23503') return 'This item is still in use and cannot be deleted.';
  if (e.code === '42501' || /NOT_AUTHORISED/.test(e.message || '')) return 'You do not have permission to do that.';
  if (/LAST_OWNER/.test(e.message || '')) return 'There must always be at least one active owner.';
  return e.message || 'Something went wrong.';
}

/* ───────────────────────────── Products ───────────────────────────── */

export type ProductFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const { supabase } = await requireAdmin('manager');
  const productId = String(formData.get('id') || '') || null;
  if (productId && !uuid.safeParse(productId).success) return { error: 'Invalid product.' };

  let variants: unknown = [];
  try { variants = JSON.parse(String(formData.get('variants') || '[]')); } catch { return { error: 'Invalid sizes.' }; }

  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    variantLabel: formData.get('variantLabel') || undefined,
    collection: formData.get('collection'),
    categoryId: formData.get('categoryId'),
    description: formData.get('description') || undefined,
    notes: formData.get('notes') || undefined,
    badge: formData.get('badge') || '',
    isActive: formData.get('isActive') === 'on',
    isFeatured: formData.get('isFeatured') === 'on',
    sortOrder: formData.get('sortOrder') || 0,
    variants
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => { const k = String(i.path[0]); fieldErrors[k] ??= i.message; });
    return { error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const v = parsed.data;

  // Validate uploads before writing anything
  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return { error: `${f.name}: use JPG, PNG, WebP or AVIF images.` };
    if (f.size > MAX_IMAGE_BYTES) return { error: `${f.name} is larger than 5 MB.` };
  }
  if (files.length > 8) return { error: 'Upload at most 8 images at a time.' };

  const row = {
    name: v.name, slug: v.slug, variant_label: v.variantLabel, collection: v.collection, category_id: v.categoryId,
    description: v.description, notes: v.notes, badge: v.badge, is_active: v.isActive, is_featured: v.isFeatured, sort_order: v.sortOrder
  };

  let id = productId;
  if (id) {
    const { error } = await supabase.from('products').update(row).eq('id', id);
    if (error) return { error: dbMessage(error) };
  } else {
    const { data, error } = await supabase.from('products').insert(row).select('id').single();
    if (error || !data) return { error: dbMessage(error) };
    id = data.id as string;
  }

  // Sync sizes/prices. Removed sizes are deleted (past orders keep their snapshot).
  const { data: existing } = await supabase.from('product_variants').select('id').eq('product_id', id);
  const keep = new Set(v.variants.map((x) => x.id).filter(Boolean) as string[]);
  const toDelete = (existing || []).map((e) => e.id as string).filter((x) => !keep.has(x));
  if (toDelete.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', toDelete);
    if (error) return { error: dbMessage(error) };
  }
  for (const [i, x] of v.variants.entries()) {
    const vr = { product_id: id, label: x.label, price_pesewas: cedisToPesewas(x.price), is_active: x.isActive, sort_order: i };
    const { error } = x.id
      ? await supabase.from('product_variants').update(vr).eq('id', x.id).eq('product_id', id)
      : await supabase.from('product_variants').insert(vr);
    if (error) return { error: dbMessage(error) };
  }

  // Upload images to Supabase Storage (RLS: admins only)
  const { count } = await supabase.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', id);
  let order = count || 0;
  for (const f of files) {
    const ext = (f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `products/${id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type, cacheControl: '31536000', upsert: false });
    if (upErr) return { error: `Image upload failed: ${upErr.message}` };
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { error } = await supabase.from('product_images').insert({ product_id: id, url: pub.publicUrl, storage_path: path, alt: v.name, sort_order: order++ });
    if (error) return { error: dbMessage(error) };
  }

  log.info('admin.product_saved', { id, slug: v.slug });
  refreshStore(v.slug);
  redirect(`/admin/products/${id}?ok=${encodeURIComponent('Product saved')}`);
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireAdmin('manager');
  const id = String(formData.get('id'));
  if (!uuid.safeParse(id).success) back('/admin/products', 'error', 'Invalid product');
  const { data: imgs } = await supabase.from('product_images').select('storage_path').eq('product_id', id);
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) back(`/admin/products/${id}`, 'error', dbMessage(error));
  const paths = (imgs || []).map((i) => i.storage_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  refreshStore();
  back('/admin/products', 'ok', 'Product deleted');
}

export async function deleteImage(formData: FormData) {
  const { supabase } = await requireAdmin('manager');
  const id = String(formData.get('imageId'));
  const productId = String(formData.get('productId'));
  if (!uuid.safeParse(id).success || !uuid.safeParse(productId).success) back('/admin/products', 'error', 'Invalid image');
  const { data: img } = await supabase.from('product_images').select('storage_path').eq('id', id).maybeSingle();
  const { error } = await supabase.from('product_images').delete().eq('id', id);
  if (error) back(`/admin/products/${productId}`, 'error', dbMessage(error));
  if (img?.storage_path) await supabase.storage.from(BUCKET).remove([img.storage_path]);
  refreshStore();
  back(`/admin/products/${productId}`, 'ok', 'Image removed');
}

export async function makeImagePrimary(formData: FormData) {
  const { supabase } = await requireAdmin('manager');
  const id = String(formData.get('imageId'));
  const productId = String(formData.get('productId'));
  if (!uuid.safeParse(id).success || !uuid.safeParse(productId).success) back('/admin/products', 'error', 'Invalid image');
  const { data: imgs } = await supabase.from('product_images').select('id').eq('product_id', productId).order('sort_order');
  const ordered = [id, ...(imgs || []).map((i) => i.id as string).filter((x) => x !== id)];
  for (const [i, imgId] of ordered.entries()) await supabase.from('product_images').update({ sort_order: i }).eq('id', imgId);
  refreshStore();
  back(`/admin/products/${productId}`, 'ok', 'Main image updated');
}

/* ───────────────────────────── Categories ───────────────────────────── */

export async function saveCategory(formData: FormData) {
  const { supabase } = await requireAdmin('manager');
  const id = String(formData.get('id') || '');
  const parsed = categorySchema.safeParse({
    name: formData.get('name'), slug: formData.get('slug'), description: formData.get('description') || undefined,
    sortOrder: formData.get('sortOrder') || 0, isActive: formData.get('isActive') === 'on'
  });
  if (!parsed.success) back('/admin/categories', 'error', parsed.error.issues[0].message);
  const row: Record<string, unknown> = { name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description, sort_order: parsed.data.sortOrder, is_active: parsed.data.isActive };

  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) back('/admin/categories', 'error', 'Category image must be JPG, PNG, WebP or AVIF, max 5 MB.');
    const path = `categories/${crypto.randomUUID()}.${(file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    if (upErr) back('/admin/categories', 'error', `Image upload failed: ${upErr.message}`);
    row.image_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  if (formData.get('removeImage') === 'on') row.image_url = null;

  const { error } = id
    ? await supabase.from('categories').update(row).eq('id', id)
    : await supabase.from('categories').insert(row);
  if (error) back('/admin/categories', 'error', dbMessage(error));
  refreshStore();
  back('/admin/categories', 'ok', id ? 'Category updated' : 'Category added');
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await requireAdmin('manager');
  const id = String(formData.get('id'));
  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (count) back('/admin/categories', 'error', `Move or delete its ${count} product(s) first.`);
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) back('/admin/categories', 'error', dbMessage(error));
  refreshStore();
  back('/admin/categories', 'ok', 'Category deleted');
}

/* ───────────────────────────── Inventory ───────────────────────────── */

export async function updateStock(formData: FormData) {
  const { supabase } = await requireAdmin();
  const variantId = String(formData.get('variantId'));
  const stock = Number(formData.get('stock'));
  const track = formData.get('track') === 'on';
  const reason = formData.get('reason') === 'restock' ? 'restock' : 'adjustment';
  if (!uuid.safeParse(variantId).success || !Number.isInteger(stock) || stock < 0) back('/admin/inventory', 'error', 'Enter a whole number of 0 or more.');
  const { error } = await supabase.rpc('adjust_stock', { p_variant: variantId, p_new_stock: stock, p_track: track, p_reason: reason });
  if (error) back('/admin/inventory', 'error', dbMessage(error));
  refreshStore();
  back('/admin/inventory', 'ok', 'Stock updated');
}

export async function toggleVariant(formData: FormData) {
  const { supabase } = await requireAdmin('manager');
  const variantId = String(formData.get('variantId'));
  const active = formData.get('active') === 'true';
  const { error } = await supabase.from('product_variants').update({ is_active: active }).eq('id', variantId);
  if (error) back('/admin/inventory', 'error', dbMessage(error));
  refreshStore();
  back('/admin/inventory', 'ok', active ? 'Size is visible in the shop' : 'Size hidden from the shop');
}

/* ───────────────────────────── Orders ───────────────────────────── */

const statusSchema = z.enum(['pending', 'confirmed', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled']);

export async function updateOrderStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('orderId'));
  const status = statusSchema.safeParse(formData.get('status'));
  const note = String(formData.get('note') || '').slice(0, 500);
  if (!uuid.safeParse(id).success || !status.success) back('/admin/orders', 'error', 'Invalid status');
  const { error } = await supabase.rpc('set_order_status', { p_order: id, p_status: status.data, p_note: note });
  if (error) back(`/admin/orders/${id}`, 'error', /ORDER_CANCELLED/.test(error.message) ? 'Cancelled orders cannot be reopened.' : dbMessage(error));
  log.info('admin.order_status', { order: id, status: status.data });
  revalidatePath('/admin');
  refreshStore(); // stock may have changed
  back(`/admin/orders/${id}`, 'ok', 'Status updated');
}

export async function updateOrderDetails(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('orderId'));
  if (!uuid.safeParse(id).success) back('/admin/orders', 'error', 'Invalid order');
  const feeRaw = String(formData.get('deliveryFee') ?? '').trim();
  const fee = feeRaw === '' ? null : cedisToPesewas(feeRaw);
  if (fee !== null && (!Number.isFinite(fee) || fee < 0)) back(`/admin/orders/${id}`, 'error', 'Delivery fee must be 0 or more');
  const { error } = await supabase.from('orders').update({
    delivery_fee_pesewas: fee,
    admin_notes: String(formData.get('adminNotes') || '').slice(0, 2000) || null
  }).eq('id', id);
  if (error) back(`/admin/orders/${id}`, 'error', dbMessage(error));
  revalidatePath('/admin');
  back(`/admin/orders/${id}`, 'ok', 'Order updated');
}

/** Record money received outside Paystack (e.g. MoMo sent after a WhatsApp order). */
export async function recordPayment(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('orderId'));
  const amount = cedisToPesewas(String(formData.get('amount') || ''));
  const channel = String(formData.get('channel') || '');
  const note = String(formData.get('note') || '').slice(0, 300);
  if (!uuid.safeParse(id).success) back('/admin/orders', 'error', 'Invalid order');
  if (!Number.isFinite(amount) || amount <= 0) back(`/admin/orders/${id}`, 'error', 'Enter the amount received');
  const { error } = await supabase.rpc('record_manual_payment', { p_order: id, p_amount: amount, p_channel: channel, p_note: note });
  if (error) back(`/admin/orders/${id}`, 'error', /ORDER_CANCELLED/.test(error.message) ? 'This order was cancelled.' : /INVALID_CHANNEL/.test(error.message) ? 'Choose how the payment was made.' : dbMessage(error));
  log.info('admin.payment_recorded', { order: id, amount, channel });
  revalidatePath('/admin');
  back(`/admin/orders/${id}`, 'ok', 'Payment recorded');
}

export async function markRefunded(formData: FormData) {
  const { supabase } = await requireAdmin('manager');
  const id = String(formData.get('orderId'));
  if (!uuid.safeParse(id).success) back('/admin/orders', 'error', 'Invalid order');
  const { error } = await supabase.rpc('mark_order_refunded', { p_order: id, p_note: String(formData.get('note') || '').slice(0, 300) });
  if (error) back(`/admin/orders/${id}`, 'error', /NOT_PAID/.test(error.message) ? 'Only paid orders can be refunded.' : dbMessage(error));
  log.info('admin.order_refunded', { order: id });
  revalidatePath('/admin');
  back(`/admin/orders/${id}`, 'ok', 'Order marked as refunded. Remember to return the money through Paystack or MoMo.');
}

/* ───────────────────────────── Reviews ───────────────────────────── */

export async function moderateReview(formData: FormData) {
  const { supabase, user } = await requireAdmin('manager');
  const id = String(formData.get('reviewId'));
  const decision = String(formData.get('decision'));
  const to = String(formData.get('back') || '/admin/reviews');
  const safeBack = to.startsWith('/admin/reviews') ? to : '/admin/reviews';
  if (!uuid.safeParse(id).success) back(safeBack, 'error', 'Invalid review');
  if (decision === 'delete') {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) back(safeBack, 'error', dbMessage(error));
  } else if (decision === 'approved' || decision === 'rejected' || decision === 'pending') {
    const { error } = await supabase.from('reviews').update({ status: decision, moderated_by: user.id, moderated_at: new Date().toISOString() }).eq('id', id);
    if (error) back(safeBack, 'error', dbMessage(error));
  } else back(safeBack, 'error', 'Unknown action');
  refreshStore();
  back(safeBack, 'ok', decision === 'delete' ? 'Review deleted' : `Review ${decision}`);
}

/* ───────────────────────────── Settings ───────────────────────────── */

export async function saveSettings(formData: FormData) {
  const { supabase, user } = await requireAdmin('manager');
  const g = (k: string) => (formData.get(k) ?? undefined) as string | undefined;
  const parsed = settingsSchema.safeParse({
    businessName: g('businessName'), tagline: g('tagline'), whatsappNumber: g('whatsappNumber') || '', whatsappDisplay: g('whatsappDisplay'),
    phoneNumber: g('phoneNumber'), phoneDisplay: g('phoneDisplay'), email: g('email'), instagramUrl: g('instagramUrl'),
    instagramHandle: g('instagramHandle'), snapchatHandle: g('snapchatHandle'), tiktokUrl: g('tiktokUrl'), facebookUrl: g('facebookUrl'),
    addressLine1: g('addressLine1'), addressLine2: g('addressLine2'), businessHours: g('businessHours'), businessHoursShort: g('businessHoursShort'),
    deliveryInfo: g('deliveryInfo'), studentDeliveryInfo: g('studentDeliveryInfo'), aboutText: g('aboutText'),
    privacyPolicy: g('privacyPolicy'), termsConditions: g('termsConditions'), returnsPolicy: g('returnsPolicy'),
    reviewsEnabled: formData.get('reviewsEnabled') === 'on', lowStockThreshold: g('lowStockThreshold') || 3
  });
  if (!parsed.success) back('/admin/settings', 'error', parsed.error.issues[0].message);
  const v = parsed.data;
  const { error } = await supabase.from('store_settings').update({
    business_name: v.businessName, tagline: v.tagline, whatsapp_number: v.whatsappNumber, whatsapp_display: v.whatsappDisplay,
    phone_number: v.phoneNumber, phone_display: v.phoneDisplay, email: v.email, instagram_url: v.instagramUrl, instagram_handle: v.instagramHandle,
    snapchat_handle: v.snapchatHandle, tiktok_url: v.tiktokUrl, facebook_url: v.facebookUrl, address_line1: v.addressLine1, address_line2: v.addressLine2,
    business_hours: v.businessHours, business_hours_short: v.businessHoursShort, delivery_info: v.deliveryInfo, student_delivery_info: v.studentDeliveryInfo,
    about_text: v.aboutText, privacy_policy: v.privacyPolicy, terms_conditions: v.termsConditions, returns_policy: v.returnsPolicy,
    reviews_enabled: v.reviewsEnabled, low_stock_threshold: v.lowStockThreshold, updated_by: user.id
  }).eq('id', true);
  if (error) back('/admin/settings', 'error', dbMessage(error));
  log.info('admin.settings_saved', { by: user.id });
  refreshStore();
  back('/admin/settings', 'ok', 'Settings saved — the website is updated');
}

/* ───────────────────────────── Team (owner only) ───────────────────────────── */

const roleSchema = z.enum(['owner', 'manager', 'staff']);

/** Invite a new administrator by email. Supabase sends them a link to set their password. */
export async function inviteAdmin(formData: FormData) {
  const { user } = await requireAdmin('owner');
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get('email'));
  const role = roleSchema.safeParse(formData.get('role'));
  const name = String(formData.get('displayName') || '').trim().slice(0, 80) || null;
  if (!email.success || !role.success) back('/admin/team', 'error', 'Enter a valid email and role');
  // Service role is required to create auth users; used only after the owner check above.
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.inviteUserByEmail(email.data, { redirectTo: `${publicEnv.siteUrl}/admin/login` });
  if (error || !data.user) back('/admin/team', 'error', error?.message || 'Could not send the invitation');
  const { error: insErr } = await service.from('admins').insert({ user_id: data.user.id, role: role.data, display_name: name, invited_by: user.id });
  if (insErr) back('/admin/team', 'error', insErr.code === '23505' ? 'That person is already an admin.' : dbMessage(insErr));
  log.info('admin.invited', { role: role.data, by: user.id });
  back('/admin/team', 'ok', `Invitation sent to ${email.data}`);
}

export async function updateAdmin(formData: FormData) {
  const { supabase, user } = await requireAdmin('owner');
  const target = String(formData.get('userId'));
  const role = roleSchema.safeParse(formData.get('role'));
  const isActive = formData.get('isActive') === 'on';
  if (!uuid.safeParse(target).success || !role.success) back('/admin/team', 'error', 'Invalid request');
  const { error } = await supabase.from('admins').update({ role: role.data, is_active: isActive }).eq('user_id', target);
  if (error) back('/admin/team', 'error', dbMessage(error));
  log.info('admin.updated', { target, role: role.data, isActive, by: user.id });
  back('/admin/team', 'ok', 'Team member updated');
}

export async function removeAdmin(formData: FormData) {
  const { supabase, user } = await requireAdmin('owner');
  const target = String(formData.get('userId'));
  if (!uuid.safeParse(target).success) back('/admin/team', 'error', 'Invalid request');
  if (target === user.id) back('/admin/team', 'error', 'You cannot remove yourself.');
  const { error } = await supabase.from('admins').delete().eq('user_id', target);
  if (error) back('/admin/team', 'error', dbMessage(error));
  log.info('admin.removed', { target, by: user.id });
  back('/admin/team', 'ok', 'Admin access removed (their login still exists in Supabase Auth and can be deleted there).');
}

/* ───────────────────────────── Delivery fees ───────────────────────────── */

export async function updateDeliveryRate(formData: FormData) {
  const { supabase } = await requireAdmin('manager');
  const id = String(formData.get('id'));
  const raw = String(formData.get('fee') ?? '').trim();
  const fee = raw === '' ? null : cedisToPesewas(raw);
  if (!uuid.safeParse(id).success || (fee !== null && (!Number.isFinite(fee) || fee < 0))) back('/admin/delivery', 'error', 'Enter a fee of 0 or more, or leave blank');
  const { error } = await supabase.from('delivery_rates').update({ fee_pesewas: fee }).eq('id', id);
  if (error) back('/admin/delivery', 'error', dbMessage(error));
  refreshStore();
  back('/admin/delivery', 'ok', 'Delivery fee saved');
}

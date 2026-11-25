-- Classy Luxe seed: catalogue carried over from the previous website.
-- Stock tracking is OFF for every product (no stock figures existed); turn it on per size in Admin → Inventory.

insert into public.categories (slug, name, description, sort_order) values
  ('luxury-perfumes', 'Luxury Perfumes', 'Eau de Parfum & Eau de Toilette in premium formulations', 0),
  ('body-splash', 'Body Splash', 'Light, refreshing everyday mists for all-day radiance', 1),
  ('oil-perfumes', 'Oil Perfumes', 'Concentrated attar oils for long-lasting skin warmth', 2),
  ('deodorants', 'Deodorants', 'Everyday freshness with a signature finish', 3),
  ('diffusers', 'Diffusers', 'Fragrance for the home and workspace', 4),
  ('hand-cream', 'Hand Cream', 'Scented, nourishing care for your hands', 5),
  ('mini-wipes', 'Mini Wipes', 'Fresh, portable and perfect on the go', 6),
  ('petal-paper-soap', 'Petal Paper Soap', 'Delicate, travel-ready petal soap sheets', 7)
on conflict (slug) do nothing;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'angham', 'Angham', null, 'student', c.id, 'A warm gourmand fragrance with spicy ginger, sweet praline, and rich vanilla. Soft, elegant, and perfect for everyday wear or special occasions.', array['Ginger','Praline','Vanilla']::text[], 'Bestseller', 0
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '30ml', 9000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/fe/34/23/fe3423dd1a0c3edb9e2efbb1407116db.jpg', 'Angham' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'ophelia', 'Ophelia', null, 'student', c.id, 'A graceful floral fragrance with fresh herbal notes, soft honeyed florals, and a warm woody base. Feminine, elegant, and long-lasting.', array['Basil','Lavender','Honeyed Florals']::text[], 'New Arrival', 1
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '50ml', 9000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/4d/ff/a1/4dffa130dc03ee873897391f968b9498.jpg', 'Ophelia' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'suave', 'Suave', null, 'student', c.id, 'A bold blend of spicy cardamom, smooth cedarwood, and sensual musk. Fresh, modern, and perfect for both day and night.', array['Cardamom','Cedarwood','Musk']::text[], null, 2
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '50ml', 11500 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/71/3e/ff/713eff99177349a2ef1f1beaa94b0230.jpg', 'Suave' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'aventos', 'Aventos', null, 'student', c.id, 'A vibrant blend of fresh pineapple, sparkling bergamot, and earthy patchouli. Modern, masculine, and long-lasting with an elegant woody finish.', array['Pineapple','Bergamot','Patchouli']::text[], 'Bestseller', 3
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '50ml', 11000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/c6/73/4b/c6734b21d8dac355171f2d7481d4ddf8.jpg', 'Aventos' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'club-de-nuit-student', 'Club de Nuit', null, 'student', c.id, 'A vibrant blend of juicy pineapple, elegant rose, and earthy patchouli, finishing with warm woods and musk. Confident, timeless, and suitable for any occasion.', array['Pineapple','Rose','Patchouli']::text[], null, 4
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '50ml', 10500 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/85/ed/68/85ed6843ff15dac3bec7839b41fe8394.jpg', 'Club de Nuit' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'barakkat', 'Barakkat', null, 'student', c.id, 'An exquisite fragrance combining rich saffron, smooth ambergris, and refined cedarwood. Warm, airy, and perfect for making a lasting impression.', array['Saffron','Ambergris','Cedarwood']::text[], 'New Arrival', 5
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '50ml', 9500 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/99/4b/5c/994b5c042a28b033c193070db4a60987.jpg', 'Barakkat' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'summer-pink', 'Summer Pink', null, 'student', c.id, 'A cheerful blend of juicy red berries, delicate rose, and creamy vanilla. Light, youthful, and ideal for everyday wear.', array['Red Berries','Rose','Vanilla']::text[], 'Bestseller', 6
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '50ml', 5000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://perfumesandbeyondltd.com/wp-content/uploads/2025/02/5834908596163430599.jpg', 'Summer Pink' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'intense-man', 'Intense Man', null, 'student', c.id, 'A bold blend of fresh citrus, warm spices, and smooth woody notes. Sophisticated, masculine, and designed to leave a lasting impression.', array['Citrus','Spices','Woody Notes']::text[], 'Bestseller', 7
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '50ml', 5000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/736x/84/b7/56/84b756fe7404c064e220096809091dc3.jpg', 'Intense Man' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'yara', 'Yara', null, 'student', c.id, 'A delightful blend of tropical fruits, powdery heliotrope, and creamy vanilla. Warm, playful, and long-lasting with a smooth, gourmand finish.', array['Heliotrope','Tropical Fruits','Vanilla']::text[], 'Bestseller', 8
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '50ml', 5000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/f3/25/6c/f3256c3e79b12d8df3d4fa39ede562b1.jpg', 'Yara' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'barakkat-rouge', 'Barakkat Rouge', null, 'general', c.id, 'A sophisticated fragrance featuring luminous saffron, smooth ambergris, and refined cedarwood. Bold, modern, and perfect for any occasion.', array['Saffron','Ambergris','Cedarwood']::text[], 'Bestseller', 9
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 16000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/53/74/f1/5374f13ddb1c2222138b480ca5f0938f.jpg', 'Barakkat Rouge' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'shamoki', 'Shamoki', null, 'general', c.id, 'A captivating blend of warm saffron, creamy vanilla, and soft musk. Smooth, sophisticated, and perfect for both day and evening wear.', array['Saffron','Vanilla','Musk']::text[], 'Bestseller', 10
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 22000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/2d/4c/aa/2d4caa2518efdd8616a01e7ba3116348.jpg', 'Shamoki' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'oud-arabia', 'Oud Arabia', null, 'general', c.id, 'An exquisite oriental fragrance combining rich oud wood, exotic saffron, warm amber, and sensual musk. Oud Arabia delivers a captivating, sophisticated aroma that reflects elegance, tradition, and luxury.', array['Oud Wood','Saffron','Amber','Musk']::text[], null, 11
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 16000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/736x/d7/6e/3e/d76e3e15e4c438b6b02361a02fc847f0.jpg', 'Oud Arabia' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'berrys-weekend', 'Berrys Weekend', null, 'general', c.id, 'A delightful fragrance combining juicy red berries, romantic rose, creamy vanilla, and soft musk. Berrys Weekend creates a sweet, feminine, and elegant aroma perfect for memorable moments.', array['Red Berries','Rose','Vanilla','Musk']::text[], 'New Arrival', 12
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 15000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/736x/8f/82/90/8f8290162b2a794a6b1f7999b1dfb54b.jpg', 'Berrys Weekend' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'hawas-ice', 'Hawas Ice', null, 'general', c.id, 'An invigorating fragrance combining sparkling bergamot, refreshing mint, cool aquatic accords, and sensual musk. Hawas Ice creates a modern, fresh, and sophisticated scent for the confident individual.', array['Bergamot','Mint','Aquatic Notes','Musk']::text[], null, 13
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 48000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/736x/44/ad/43/44ad43d5dadd934a0cef384c4ea9b480.jpg', 'Hawas Ice' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'club-de-nuit', 'Club de Nuit', null, 'general', c.id, 'An elegant fragrance combining sparkling citrus, rich blackcurrant, delicate rose, sweet vanilla, and sensual musk. Club de Nuit creates a timeless, powerful aroma that reflects confidence and refined luxury.', array['Citrus Fruits','Blackcurrant','Rose','Vanilla','Musk']::text[], 'Bestseller', 14
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 53000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/ba/c4/8f/bac48fdbedae96d4efefd882b313079e.jpg', 'Club de Nuit' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select '9pm-rebel', '9PM Rebel', null, 'general', c.id, 'A captivating fragrance combining fresh apple, smooth lavender, warm spices, creamy vanilla, and rich amber. 9PM Rebel creates a powerful and irresistible aroma for those who love to stand out.', array['Apple','Lavender','Spices','Vanilla','Amber']::text[], null, 15
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 47000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/1200x/22/24/53/222453b3d6d32cda19056b9f6c5e0b18.jpg', '9PM Rebel' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'mousuf', 'Mousuf', null, 'general', c.id, 'A refined fragrance combining juicy fruits, delicate rose, creamy vanilla, warm amber, and sensual musk. Mousuf creates a charming and sophisticated scent perfect for confident everyday wear and memorable occasions.', array['Rose','Fruits','Vanilla','Musk','Amber']::text[], 'New Arrival', 16
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 18000 from p
)
insert into public.product_images (product_id, url, alt) select id, 'https://i.pinimg.com/736x/61/41/a5/6141a53330bb5c4e5e7ecf3170e60077.jpg', 'Mousuf' from p;

with p as (
  insert into public.products (slug, name, variant_label, collection, category_id, description, notes, badge, sort_order)
  select 'mousuf-oud', 'Mousuf', 'Burlap pouch edition', 'general', c.id, 'A rich Arabian masterpiece — deep oud and warming amber spices elegantly packaged in a hand-stitched burlap pouch. Commanding longevity and extraordinary sillage.', array['Oud','Amber','Warm Spice','Sandalwood']::text[], 'Bestseller', 17
    from public.categories c where c.slug = 'luxury-perfumes'
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, label, price_pesewas) select id, '100ml', 55000 from p
)
select 1;

insert into public.delivery_rates (option, region, fee_pesewas) values
  ('gctu', null, 0),
  ('accra', null, null),
  ('region', 'Greater Accra', null),
  ('region', 'Ashanti', null),
  ('region', 'Central', null),
  ('region', 'Eastern', null),
  ('region', 'Western', null),
  ('region', 'Western North', null),
  ('region', 'Volta', null),
  ('region', 'Oti', null),
  ('region', 'Northern', null),
  ('region', 'Savannah', null),
  ('region', 'North East', null),
  ('region', 'Upper East', null),
  ('region', 'Upper West', null),
  ('region', 'Bono', null),
  ('region', 'Bono East', null),
  ('region', 'Ahafo', null)
on conflict do nothing;

-- Store settings: business details carried over from the previous website.
-- Policies are left empty on purpose — write your own in Admin → Settings.
insert into public.store_settings (id, business_name, tagline, whatsapp_number, whatsapp_display, phone_number, phone_display,
  instagram_url, instagram_handle, snapchat_handle, address_line1, address_line2, business_hours, business_hours_short,
  delivery_info, student_delivery_info)
values (true, 'Classy Luxe', 'The Scent of Elegance', '233248751541', '+233 024 875 1541', '+233539460710', '+233 053 946 0710',
  'https://instagram.com/berryjohnson252', '@berryjohnson252', 'berryjohnson252', 'Alhaji Lapaz, Accra', 'Greater Accra Region, Ghana',
  'Monday – Saturday · 8:00 AM – 8:00 PM', 'Mon – Sat · 8AM – 8PM',
  'Nationwide delivery to all 16 regions of Ghana. Discreet, secure packaging. WhatsApp tracking from dispatch to delivery. Estimated 1 – 3 business days.',
  'Free delivery within the GCTU campus area, Monday – Saturday, 8AM – 8PM. Mention "GCTU" when you message us on WhatsApp.')
on conflict (id) do nothing;

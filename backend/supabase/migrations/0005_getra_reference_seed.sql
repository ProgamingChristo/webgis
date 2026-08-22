-- GETRA Step 2 / Migration 0005
-- REFERENCE-ONLY SEED
--
-- No spatial point, merchant, survey, Community Maps, or Mission record is inserted.

begin;

insert into public.categories (
  slug,
  name,
  category_group,
  sort_order
)
values
  ('food', 'Makanan', 'FOOD', 10),
  ('restaurant', 'Restoran', 'FOOD', 11),
  ('warung', 'Warung / Tenda', 'FOOD', 12),
  ('street-food', 'Kaki Lima / Gerobak', 'FOOD', 13),
  ('fast-food', 'Fast Food', 'FOOD', 14),

  ('beverage', 'Minuman', 'BEVERAGE', 20),
  ('coffee', 'Kopi / Kafe', 'BEVERAGE', 21),

  ('retail', 'Retail', 'RETAIL', 30),
  ('minimarket', 'Minimarket / Supermarket', 'RETAIL', 31),

  ('health', 'Kesehatan', 'HEALTH', 40),
  ('pharmacy', 'Apotek', 'HEALTH', 41),

  ('services', 'Jasa', 'SERVICES', 50),
  ('laundry', 'Laundry', 'SERVICES', 51),

  ('property', 'Properti', 'PROPERTY', 60),
  ('transport', 'Transportasi', 'TRANSPORT', 70),
  ('accessibility', 'Aksesibilitas', 'ACCESSIBILITY', 80)
on conflict (slug) do update
set
  name = excluded.name,
  category_group = excluded.category_group,
  sort_order = excluded.sort_order;

-- Establish stable parent taxonomy.
update public.categories child
set parent_id = parent.id
from public.categories parent
where
  (child.slug, parent.slug) in (
    ('restaurant', 'food'),
    ('warung', 'food'),
    ('street-food', 'food'),
    ('fast-food', 'food'),
    ('coffee', 'beverage'),
    ('minimarket', 'retail'),
    ('pharmacy', 'health'),
    ('laundry', 'services')
  )
  and child.parent_id is distinct from parent.id;

insert into public.feature_registry (
  feature_key,
  status,
  description,
  is_public
)
values
  (
    'map_workspace',
    'ACTIVE',
    'MAPID + MapLibre map-led GETRA workspace.',
    true
  ),
  (
    'database_foundation',
    'ACTIVE',
    'Supabase/PostGIS foundation and security boundary.',
    true
  ),
  (
    'competition_ingestion',
    'FOUNDATION',
    'Raw Community Activity and Mission ingestion tables are prepared but empty.',
    false
  ),
  (
    'pedestrian_routing',
    'PLANNED',
    'Network routing and service area belong to Step 3.',
    true
  ),
  (
    'grounded_ai',
    'FOUNDATION',
    'AI orchestration exists but production grounding waits for real GIS/data.',
    true
  )
on conflict (feature_key) do update
set
  status = excluded.status,
  description = excluded.description,
  is_public = excluded.is_public,
  updated_at = now();

commit;

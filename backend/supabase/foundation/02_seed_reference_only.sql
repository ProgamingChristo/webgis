-- GETRA Step 2 - Reference Seed Only
-- Safe reference metadata only. No spatial observations, merchants, transit points,
-- survey records, or competition records are inserted here.

begin;

-- -----------------------------------------------------------------------------
-- Category taxonomy
-- -----------------------------------------------------------------------------
insert into public.categories (slug, name, category_group, sort_order)
values
  ('food', 'Makanan', 'merchant', 10),
  ('coffee', 'Kopi & Kafe', 'merchant', 20),
  ('minimarket', 'Minimarket', 'merchant', 30),
  ('pharmacy', 'Apotek', 'service', 40),
  ('health', 'Kesehatan', 'service', 50),
  ('laundry', 'Laundry', 'service', 60),
  ('retail', 'Retail', 'merchant', 70),
  ('services', 'Jasa', 'service', 80),
  ('property', 'Properti', 'property', 90),
  ('transport', 'Transportasi', 'transit', 100),
  ('access-issue', 'Hambatan Akses', 'issue', 110)
on conflict (slug) do update
set
  name = excluded.name,
  category_group = excluded.category_group,
  sort_order = excluded.sort_order,
  is_active = true;

-- -----------------------------------------------------------------------------
-- Source registry
-- -----------------------------------------------------------------------------
-- These rows describe expected source families. terms_confirmed remains FALSE for
-- MAPID competition sources until the team receives/records the actual API/data terms.
insert into public.data_sources (
  code,
  name,
  source_group,
  provider,
  access_scope,
  redistribution_allowed,
  terms_confirmed,
  is_public_metadata,
  notes
)
values
  (
    'GETRA_SYNTHETIC',
    'GETRA Synthetic / UI Scenario',
    'synthetic',
    'GETRA',
    'public',
    true,
    true,
    true,
    'Only for clearly labeled interface and development scenarios. Must never be presented as surveyed or verified field data.'
  ),
  (
    'MAPID_COMMUNITY_ACTIVITY',
    'MAPID Community Maps Activity',
    'mapid_community',
    'MAPID',
    'backend_only',
    false,
    false,
    true,
    'Competition source family registered in advance. Do not ingest records until actual access terms/API contract are recorded.'
  ),
  (
    'MAPID_MENU_GO',
    'MAPID Mission - Menu Go',
    'mapid_mission',
    'MAPID',
    'backend_only',
    false,
    false,
    true,
    'Competition source family registered in advance. Raw records remain backend-only.'
  ),
  (
    'MAPID_STRUK_GO',
    'MAPID Mission - Struk Go',
    'mapid_mission',
    'MAPID',
    'reviewer_only',
    false,
    false,
    true,
    'Receipt/evidence can contain sensitive information; keep raw records and media restricted.'
  ),
  (
    'MAPID_PROPERTI_GO',
    'MAPID Mission - Properti Go',
    'mapid_mission',
    'MAPID',
    'backend_only',
    false,
    false,
    true,
    'Competition source family registered in advance. Raw records remain backend-only.'
  ),
  (
    'GETRA_FIELD_SURVEY',
    'GETRA / Competition Field Survey',
    'getra_survey',
    'GETRA + MAPID Apps',
    'backend_only',
    false,
    false,
    true,
    'Final technical survey contract is not fixed yet; use survey_submissions as a staging envelope until the official contract is available.'
  )
on conflict (code) do update
set
  name = excluded.name,
  source_group = excluded.source_group,
  provider = excluded.provider,
  access_scope = excluded.access_scope,
  redistribution_allowed = excluded.redistribution_allowed,
  is_public_metadata = excluded.is_public_metadata,
  notes = excluded.notes,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Feature registry
-- -----------------------------------------------------------------------------
insert into public.feature_registry (feature_key, description, enabled, is_public, rollout_stage)
values
  ('mapid_basemap', 'MAPID Maps basemap integration', true, true, 'prototype'),
  ('local_demo_merchants', 'Clearly labeled local synthetic merchant overlay for UI development', true, true, 'prototype'),
  ('supabase_foundation', 'Supabase/PostGIS foundation schema', true, false, 'foundation'),
  ('real_merchant_data', 'Canonical merchant data derived from real sources', false, true, 'foundation'),
  ('pedestrian_routing', 'Network-based pedestrian routing and walking-time computation', false, true, 'foundation'),
  ('community_activity', 'MAPID Community Maps Activity evidence layer', false, true, 'foundation'),
  ('grounded_ai', 'AI interface grounded on structured GIS results', false, true, 'foundation')
on conflict (feature_key) do update
set
  description = excluded.description,
  enabled = excluded.enabled,
  is_public = excluded.is_public,
  rollout_stage = excluded.rollout_stage,
  updated_at = now();

commit;

-- supabase/seed.sql
-- Seed file for local development and testing purposes ONLY.
-- DO NOT RUN ON PRODUCTION.
-- FIXTURE / TEST DATA

SET search_path = public, extensions, gis;

-- Insert test profiles directly (skipping auth.users for simplicity in database testing).
-- Normally, profiles are created via trigger on auth.users, but for testing RLS we can mock.
-- However, since the trigger requires auth.users, let's insert into auth.users first if we can,
-- or just bypass and insert into profiles manually (if foreign key checks allow, but they don't).
-- So we MUST insert into auth.users. 
-- Since we are bypassing standard signup, we will insert raw users.

DO $$
DECLARE
  admin_id UUID := '00000000-0000-0000-0000-000000000001';
  umkm_user_id UUID := '00000000-0000-0000-0000-000000000002';
  general_user_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN
  -- Insert auth.users. All users start with no privileged metadata.
  -- account_role is assigned by the trigger (USER) and then overridden for admin below.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES 
    ('00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated', 'admin.mock@getra.local', crypt('PasswordDevelopment123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Admin Test"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', umkm_user_id, 'authenticated', 'authenticated', 'umkm.mock@getra.local', crypt('PasswordDevelopment123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "UMKM Test"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', general_user_id, 'authenticated', 'authenticated', 'user.mock@getra.local', crypt('PasswordDevelopment123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "General User Test"}', now(), now(), '', '', '', '');

END $$;

-- Elevate admin profile to ADMIN account_role (bypass trigger default).
UPDATE public.profiles
SET account_role = 'ADMIN'::public.account_role
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Assign UMKM stakeholder mode to the UMKM test user.
INSERT INTO public.user_stakeholder_modes (user_id, mode)
VALUES ('00000000-0000-0000-0000-000000000002', 'UMKM')
ON CONFLICT DO NOTHING;

-- Spatial fixtures are synthetic DEV/TEST records only. Coordinates are deliberately
-- simple and do not represent a real study area, transport route, or research data.
INSERT INTO public.spatial_sources (
  id,
  source_name,
  source_type,
  description,
  metadata
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'TEST MANUAL SOURCE',
  'manual',
  'Synthetic fixture for local database tests only',
  '{"fixture":true,"environment":"development"}'::jsonb
);

INSERT INTO public.study_areas (
  id,
  source_id,
  name,
  description,
  geometry
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'TEST STUDY AREA',
  'Synthetic polygon fixture',
  ST_GeomFromText('MULTIPOLYGON(((0 0,0 0.01,0.01 0.01,0.01 0,0 0)))', 4326)
);

INSERT INTO public.transport_corridors (
  id,
  source_id,
  name,
  transport_mode,
  description,
  geometry
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'TEST CORRIDOR',
  'test_mode',
  'Synthetic line fixture',
  ST_GeomFromText('MULTILINESTRING((0 0,0.01 0.01))', 4326)
);

INSERT INTO public.transport_nodes (
  id,
  source_id,
  corridor_id,
  name,
  node_type,
  transport_mode,
  geometry
) VALUES (
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'TEST TRANSPORT NODE',
  'test_node',
  'test_mode',
  ST_SetSRID(ST_MakePoint(0.005, 0.005), 4326)
);

INSERT INTO public.umkm_profiles (
  id,
  owner_id,
  source_id,
  business_name,
  category,
  description,
  address,
  geometry
) VALUES (
  '10000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'TEST UMKM',
  'test_category',
  'Synthetic point fixture',
  'TEST ADDRESS - NOT PRODUCTION DATA',
  ST_SetSRID(ST_MakePoint(0.006, 0.006), 4326)
);

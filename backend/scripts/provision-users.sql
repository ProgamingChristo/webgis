DO $$
DECLARE
  commuter_id UUID;
  umkm_id UUID;
  community_id UUID;
  admin_id UUID;
  pwd_hash TEXT;
BEGIN
  pwd_hash := extensions.crypt('PasswordDevelopment123!', extensions.gen_salt('bf'));

  -- 1. COMMUTER
  SELECT id INTO commuter_id FROM auth.users WHERE email = 'getra.commuter.test@example.com';
  IF commuter_id IS NULL THEN
    commuter_id := extensions.gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', commuter_id, 'authenticated', 'authenticated',
      'getra.commuter.test@example.com', pwd_hash, now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Commuter Test User","role":"COMMUTER"}',
      now(), now(), '', '', '', ''
    );
  END IF;
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (commuter_id, 'Commuter Test User', 'COMMUTER'::public.user_role)
  ON CONFLICT (id) DO UPDATE SET display_name = 'Commuter Test User', role = 'COMMUTER'::public.user_role;

  -- 2. UMKM
  SELECT id INTO umkm_id FROM auth.users WHERE email = 'getra.umkm.test@example.com';
  IF umkm_id IS NULL THEN
    umkm_id := extensions.gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', umkm_id, 'authenticated', 'authenticated',
      'getra.umkm.test@example.com', pwd_hash, now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"UMKM Test User","role":"UMKM"}',
      now(), now(), '', '', '', ''
    );
  END IF;
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (umkm_id, 'UMKM Test User', 'UMKM'::public.user_role)
  ON CONFLICT (id) DO UPDATE SET display_name = 'UMKM Test User', role = 'UMKM'::public.user_role;

  -- 3. COMMUNITY
  SELECT id INTO community_id FROM auth.users WHERE email = 'getra.community.test@example.com';
  IF community_id IS NULL THEN
    community_id := extensions.gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', community_id, 'authenticated', 'authenticated',
      'getra.community.test@example.com', pwd_hash, now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Community Test User","role":"COMMUNITY"}',
      now(), now(), '', '', '', ''
    );
  END IF;
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (community_id, 'Community Test User', 'COMMUNITY'::public.user_role)
  ON CONFLICT (id) DO UPDATE SET display_name = 'Community Test User', role = 'COMMUNITY'::public.user_role;

  -- 4. ADMIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'getra.admin.test@example.com';
  IF admin_id IS NULL THEN
    admin_id := extensions.gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'getra.admin.test@example.com', pwd_hash, now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Admin Test User","role":"COMMUTER"}',
      now(), now(), '', '', '', ''
    );
  END IF;
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (admin_id, 'Admin Test User', 'ADMIN'::public.user_role)
  ON CONFLICT (id) DO UPDATE SET display_name = 'Admin Test User', role = 'ADMIN'::public.user_role;

END $$;

-- Reconcile legacy profile.role and app_role with the canonical account_role column.
-- Target: public.profiles must have:
--   account_role public.account_role
--   onboarding_complete boolean

-- 1. Create account_role enum if not exists
DO $$
BEGIN
  CREATE TYPE public.account_role AS ENUM ('USER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 2. Add columns to profiles if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_role public.account_role,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN;

-- 3. Backfill columns
UPDATE public.profiles
SET account_role = 'USER'::public.account_role
WHERE account_role IS NULL;

-- If legacy 'role' column exists, map 'ADMIN' to 'ADMIN', and others to 'USER'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    UPDATE public.profiles
    SET account_role = 'ADMIN'::public.account_role
    WHERE role = 'ADMIN'::public.user_role;
  END IF;
END
$$;

UPDATE public.profiles
SET onboarding_complete = FALSE
WHERE onboarding_complete IS NULL;

-- 4. Set NOT NULL and DEFAULT constraints
ALTER TABLE public.profiles 
  ALTER COLUMN account_role SET DEFAULT 'USER'::public.account_role,
  ALTER COLUMN account_role SET NOT NULL,
  ALTER COLUMN onboarding_complete SET DEFAULT FALSE,
  ALTER COLUMN onboarding_complete SET NOT NULL;

-- 5. Update private.is_admin() to check profiles.account_role
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND account_role = 'ADMIN'::public.account_role
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

-- Replace the recursive legacy profile policies. Authorization must use the
-- canonical account_role through private.is_admin(); stakeholder/legacy roles
-- never grant administrative access.
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- 6. Update public.handle_new_user() trigger to use account_role and onboarding_complete
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Strict security check: do not trust account_role / role from metadata.
  -- All public registrations default to USER with onboarding not complete.
  INSERT INTO public.profiles (id, display_name, account_role, onboarding_complete)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name'
    ),
    'USER'::public.account_role,
    FALSE
  );

  RETURN NEW;
END;
$$;

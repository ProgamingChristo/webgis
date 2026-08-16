-- Create ENUM type for roles
CREATE TYPE public.user_role AS ENUM ('COMMUTER', 'UMKM', 'COMMUNITY', 'ADMIN');

-- Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'COMMUTER'::public.user_role;

-- Update trigger for handle_new_user to extract and validate role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    role_val text;
    final_role public.user_role;
BEGIN
    role_val := NEW.raw_user_meta_data->>'role';
    
    -- Strictly prohibit ADMIN from auth.users metadata to prevent escalation via public registration
    IF role_val = 'ADMIN' THEN
        RAISE EXCEPTION 'ROLE_NOT_ALLOWED: Admin role cannot be created via public registration';
    END IF;

    -- Map string to enum, default to COMMUTER
    IF role_val = 'UMKM' THEN
        final_role := 'UMKM'::public.user_role;
    ELSIF role_val = 'COMMUNITY' THEN
        final_role := 'COMMUNITY'::public.user_role;
    ELSE
        final_role := 'COMMUTER'::public.user_role;
    END IF;

    INSERT INTO public.profiles (id, display_name, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
        final_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for Admins to view all profiles
CREATE POLICY "Admins can read all profiles"
    ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'
        )
    );

-- Add RLS policy for Admins to update all profiles
CREATE POLICY "Admins can update all profiles"
    ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'
        )
    );

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sesakxnjaphrxqxllqjm.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stableUsers = [
  { role: "COMMUTER", email: "getra.commuter.test@example.com", name: "Commuter Test User" },
  { role: "UMKM", email: "getra.umkm.test@example.com", name: "UMKM Test User" },
  { role: "COMMUNITY", email: "getra.community.test@example.com", name: "Community Test User" },
  { role: "ADMIN", email: "getra.admin.test@example.com", name: "Admin Test User" },
];

async function provisionViaAdminApi(serviceRoleKey: string) {
  console.log("[PROVISION] Using Supabase Admin Service Role API...");
  const adminClient = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const user of stableUsers) {
    console.log(`- Provisioning ${user.role} (${user.email})...`);
    
    // Check if user exists
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const existing = listData?.users?.find((u) => u.email === user.email);

    let userId = existing?.id;

    if (!existing) {
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: user.name,
          role: user.role === "ADMIN" ? "COMMUTER" : user.role, // avoid trigger rejection for admin
        },
      });

      if (createError) {
        throw new Error(`Failed to create ${user.email}: ${createError.message}`);
      }
      userId = createData.user.id;
      console.log(`  -> Created new user ${userId}`);
    } else {
      console.log(`  -> User already exists (${userId}), reusing.`);
    }

    // Ensure profile row exists and role is correct (bypasses trigger for ADMIN)
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        display_name: user.name,
        role: user.role,
      });

    if (profileError) {
      console.warn(`  -> Profile upsert warning: ${profileError.message}`);
    } else {
      console.log(`  -> Profile verified with role ${user.role}.`);
    }
  }
}

async function provisionViaCli() {
  console.log("[PROVISION] Using Supabase CLI linked database execution...");
  const sqlContent = `
DO $$
DECLARE
  commuter_id UUID;
  umkm_id UUID;
  community_id UUID;
  admin_id UUID;
  pwd_hash TEXT;
BEGIN
  pwd_hash := extensions.crypt('${DEFAULT_PASSWORD.replace(/'/g, "''")}', extensions.gen_salt('bf'));

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
`;

  const tempFile = path.join(process.cwd(), "scripts", "provision-users.sql");
  fs.writeFileSync(tempFile, sqlContent, "utf-8");

  try {
    execSync("npx supabase db query --linked --file scripts/provision-users.sql", {
      stdio: "inherit",
    });
    console.log("[PROVISION] Successfully provisioned all stable test accounts and profiles.");
  } finally {
    if (fs.existsSync(tempFile)) {
      // Keep or cleanup
    }
  }
}

async function main() {
  if (SERVICE_ROLE_KEY) {
    await provisionViaAdminApi(SERVICE_ROLE_KEY);
  } else {
    await provisionViaCli();
  }
}

main().catch((err) => {
  console.error("[PROVISION ERROR]:", err);
  process.exit(1);
});

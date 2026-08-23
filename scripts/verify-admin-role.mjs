import { createClient } from "@supabase/supabase-js";

process.loadEnvFile("backend/.env.local");

const email = process.argv[2];

if (!email) {
  throw new Error("Usage: node scripts/verify-admin-role.mjs <email>");
}

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const { data, error } = await client.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (error) {
  throw error;
}

const user = data.users.find((candidate) => candidate.email === email);

if (!user) {
  console.log(JSON.stringify({ exists: false }));
  process.exit(0);
}

const profileResult = await client
  .from("profiles")
  .select("account_role,onboarding_complete,display_name")
  .eq("id", user.id)
  .maybeSingle();

if (profileResult.error) {
  throw profileResult.error;
}

console.log(
  JSON.stringify({
    exists: true,
    emailConfirmed: Boolean(user.email_confirmed_at),
    profile: profileResult.data,
  }),
);

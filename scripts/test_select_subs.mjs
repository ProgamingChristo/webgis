import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, anonKey);

async function testSelectSubmissions() {
  const { data: authData } = await client.auth.signInWithPassword({
    email: "getra.admin.test@example.com",
    password: "PasswordDevelopment123!",
  });

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  console.log("Testing select from merchant_submissions as authenticated admin...");
  const { data, error } = await authClient
    .from("merchant_submissions")
    .select("id, name, status, submitted_by")
    .limit(10);

  console.log("Select result:", { count: data?.length, error });
}

testSelectSubmissions().catch(console.error);

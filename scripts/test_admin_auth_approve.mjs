import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, anonKey);
const service = createClient(supabaseUrl, serviceKey);

async function testAdminLoginAndApprove() {
  console.log("1. Signing in as admin...");
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: "getra.admin.test@example.com",
    password: "PasswordDevelopment123!",
  });

  if (authError || !authData.session) {
    console.error("Auth error:", authError);
    return;
  }

  const adminUser = authData.user;
  console.log("Logged in admin:", { id: adminUser.id, email: adminUser.email });

  // Check admin's profile
  const { data: profile } = await service
    .from("profiles")
    .select("*")
    .eq("id", adminUser.id)
    .single();

  console.log("Admin profile:", profile);

  // Authenticated client with admin token
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  // Let's test calling RPC approve_merchant_submission on:
  // submission 0: f331dd3a-f989-4214-b402-ff087d5700eb (submitted by 41c1a67e, NOT this admin!)
  const subId = "f331dd3a-f989-4214-b402-ff087d5700eb";

  console.log("2. Calling approve_merchant_submission RPC as admin for submission:", subId);
  const { data: rpcResult, error: rpcError } = await authClient.rpc("approve_merchant_submission", {
    p_submission_id: subId,
    p_review_note: "Approved by test script",
  });

  console.log("RPC result:", { rpcResult, rpcError });

  // Let's also check submission 'e83ec3d1' (kopi christo, submitted by 23fb3a46)
  const christoSubId = "e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae";
  console.log("3. Calling approve_merchant_submission RPC for 'kopi christo' (submitted by 23fb3a46):", christoSubId);
  const { data: rpcChristo, error: errChristo } = await authClient.rpc("approve_merchant_submission", {
    p_submission_id: christoSubId,
    p_review_note: "Approved christo",
  });
  console.log("kopi christo result:", { rpcChristo, errChristo });
}

testAdminLoginAndApprove().catch(console.error);

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = createClient(supabaseUrl, anonKey);

async function testAdminNetworkCalls() {
  console.log("1. Authenticating admin...");
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: "getra.admin.test@example.com",
    password: "PasswordDevelopment123!",
  });
  if (authErr) throw authErr;
  const token = auth.session.access_token;
  console.log("Admin authenticated:", auth.user.id);

  // Request 1: GET /api/admin/merchant-submissions
  console.log("\n2. Testing GET /api/admin/merchant-submissions...");
  const subRes = await fetch("http://localhost:8080/api/admin/merchant-submissions?limit=50&offset=0", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const subJson = await subRes.json();
  console.log("Submissions status:", subRes.status, "Items:", subJson.data?.length, "Error:", subJson.error);

  // Request 2: GET /api/admin/merchant-claims
  console.log("\n3. Testing GET /api/admin/merchant-claims...");
  const claimRes = await fetch("http://localhost:8080/api/admin/merchant-claims?limit=50&offset=0", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const claimJson = await claimRes.json();
  console.log("Claims status:", claimRes.status, "Items:", claimJson.data?.length, "Error:", claimJson.error);

  // Request 3: POST /api/admin/merchant-submissions/e83ec3d1.../approve (kopi christo)
  console.log("\n4. Testing POST /api/admin/merchant-submissions/e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae/approve...");
  const approveRes = await fetch("http://localhost:8080/api/admin/merchant-submissions/e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae/approve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ note: "Test approve from script" }),
  });
  const approveJson = await approveRes.json();
  console.log("Approve status:", approveRes.status, "Response:", approveJson);
}

testAdminNetworkCalls().catch(console.error);

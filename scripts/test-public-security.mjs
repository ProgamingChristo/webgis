const webUrl = "https://getra-routing-api.tail0ed517.ts.net:8443";
const apiUrl = "https://getra-routing-api.tail0ed517.ts.net";

async function testPublicSecurity() {
  console.log("=== Testing Public Security Baseline ===");

  // 1. Frontend Security Headers
  console.log("\n1. Testing Frontend Security Headers...");
  const webRes = await fetch(`${webUrl}/login`, { method: "GET" });
  console.log("Frontend Status:", webRes.status);
  const csp = webRes.headers.get("content-security-policy");
  const nosniff = webRes.headers.get("x-content-type-options");
  const frameOptions = webRes.headers.get("x-frame-options");
  const referrer = webRes.headers.get("referrer-policy");
  const permissions = webRes.headers.get("permissions-policy");

  console.log("CSP present:", !!csp);
  console.log("X-Content-Type-Options:", nosniff);
  console.log("X-Frame-Options:", frameOptions);
  console.log("Referrer-Policy:", referrer);
  console.log("Permissions-Policy:", permissions);

  // 2. Backend API Security Headers
  console.log("\n2. Testing Backend API Security Headers...");
  const apiRes = await fetch(`${apiUrl}/api/health`, { method: "GET" });
  console.log("Backend Health Status:", apiRes.status);
  const apiCsp = apiRes.headers.get("content-security-policy");
  const apiNosniff = apiRes.headers.get("x-content-type-options");
  const apiFrame = apiRes.headers.get("x-frame-options");
  console.log("API CSP:", apiCsp);
  console.log("API Nosniff:", apiNosniff);
  console.log("API Frame:", apiFrame);

  // 3. Negative Penetration Tests on Registration
  console.log("\n3. Testing Registration Security Controls...");

  // 3a. Short password (< 12 chars)
  const shortPwdRes = await fetch(`${apiUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test_short@example.com",
      password: "Short1!",
      display_name: "Short User",
    }),
  });
  const shortJson = await shortPwdRes.json();
  console.log("Short password response status:", shortPwdRes.status, "code:", shortJson.error?.code);

  // 3b. Common password
  const commonPwdRes = await fetch(`${apiUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test_common@example.com",
      password: "password12345",
      display_name: "Common User",
    }),
  });
  const commonJson = await commonPwdRes.json();
  console.log("Common password response status:", commonPwdRes.status, "code:", commonJson.error?.code);

  // 3c. Public self-registration admin escalation
  const adminRes = await fetch(`${apiUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test_admin@example.com",
      password: "ValidSecurePassphrase2026!",
      display_name: "Attacker User",
      role: "ADMIN",
    }),
  });
  const adminJson = await adminRes.json();
  console.log("Self-register ADMIN response status:", adminRes.status, "code:", adminJson.error?.code);

  // 4. Anonymous Admin Endpoint Access Blocked
  console.log("\n4. Testing Protected Admin Endpoint...");
  const adminQueueRes = await fetch(`${apiUrl}/api/admin/merchant-submissions`, {
    method: "GET",
  });
  const adminQueueJson = await adminQueueRes.json();
  console.log("Anonymous -> Admin status:", adminQueueRes.status, "code:", adminQueueJson.error?.code);

  console.log("\n=== Public Security QA Complete ===");
}

testPublicSecurity().catch((err) => {
  console.error("Public security test failed:", err);
  process.exit(1);
});

export {};

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const TEST_PASSWORD = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";

const stableUsers = [
  { role: "COMMUTER", email: "getra.commuter.test@example.com", password: TEST_PASSWORD },
  { role: "UMKM", email: "getra.umkm.test@example.com", password: TEST_PASSWORD },
  { role: "COMMUNITY", email: "getra.community.test@example.com", password: TEST_PASSWORD },
  { role: "ADMIN", email: "getra.admin.test@example.com", password: TEST_PASSWORD },
];

interface TestResult {
  name: string;
  expectedStatus: number;
  actualStatus: number;
  success: boolean;
  error?: unknown;
}

const results: TestResult[] = [];

async function callEndpoint(
  name: string,
  url: string,
  options: RequestInit,
  expectedStatus: number,
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  try {
    const res = await fetch(url, options);
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const success = res.status === expectedStatus;

    results.push({
      name,
      expectedStatus,
      actualStatus: res.status,
      success,
      error: !success ? json : undefined,
    });

    if (success) {
      console.log(`  [PASS] ${name} -> ${res.status}`);
    } else {
      console.error(`  [FAIL] ${name} -> Expected ${expectedStatus}, got ${res.status}`);
      console.error(`         Response: ${JSON.stringify(json)}`);
    }

    return { status: res.status, body: json };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      name,
      expectedStatus,
      actualStatus: 0,
      success: false,
      error: message,
    });
    console.error(`  [FAIL] ${name} -> Exception: ${message}`);
    return { status: 0, body: null };
  }
}

async function runSmokeTest(runNumber: number) {
  console.log(`\n======================================================`);
  console.log(`  GETRA API SMOKE TEST — RUN ${runNumber}`);
  console.log(`======================================================\n`);

  // 1. Health Check
  console.log(`[1] HEALTH CHECK`);
  await callEndpoint("GET /api/health", `${BASE_URL}/api/health`, { method: "GET" }, 200);

  // 2. Wrong Password Check
  console.log(`\n[2] NEGATIVE TEST: WRONG PASSWORD`);
  await callEndpoint(
    "POST /api/auth/login (Invalid Password)",
    `${BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "getra.commuter.test@example.com",
        password: "WrongPassword999!",
      }),
    },
    401,
  );

  // 3. Unauthorized checks for protected routes
  console.log(`\n[3] NEGATIVE TEST: UNAUTHORIZED ACCESS WITHOUT TOKEN`);
  await callEndpoint("GET /api/auth/me (No Token)", `${BASE_URL}/api/auth/me`, { method: "GET" }, 401);
  await callEndpoint("GET /api/profile (No Token)", `${BASE_URL}/api/profile`, { method: "GET" }, 401);
  await callEndpoint("GET /api/spatial/nearby (No Token)", `${BASE_URL}/api/spatial/nearby?latitude=-6.2&longitude=106.8&radius=1000`, { method: "GET" }, 401);

  // 4. Role-based Auth Flows
  let commuterToken = "";

  for (const user of stableUsers) {
    console.log(`\n[4] AUTH FLOW FOR ROLE: ${user.role} (${user.email})`);

    // A. Login
    const loginRes = await callEndpoint(
      `POST /api/auth/login (${user.role})`,
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password: user.password }),
      },
      200,
    );

    const loginData = loginRes.body?.data as { session?: { access_token?: string } } | undefined;
    const token = loginData?.session?.access_token;
    if (!token) {
      console.error(`  [SKIP] Skipping subsequent tests for ${user.role} due to login failure.`);
      continue;
    }

    if (user.role === "COMMUTER") {
      commuterToken = token;
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // B. GET /api/auth/me
    await callEndpoint(`GET /api/auth/me (${user.role})`, `${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: authHeaders,
    }, 200);

    // C. GET /api/profile
    await callEndpoint(`GET /api/profile (${user.role})`, `${BASE_URL}/api/profile`, {
      method: "GET",
      headers: authHeaders,
    }, 200);

    // D. PATCH /api/profile
    await callEndpoint(`PATCH /api/profile (${user.role})`, `${BASE_URL}/api/profile`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ display_name: `${user.role} Updated Name` }),
    }, 200);

    // E. POST /api/auth/logout
    await callEndpoint(`POST /api/auth/logout (${user.role})`, `${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: authHeaders,
    }, 200);
  }

  // 5. Spatial API Tests (using authenticated token)
  console.log(`\n[5] SPATIAL APIS`);
  if (!commuterToken) {
    // Re-login commuter to get token
    const res = await callEndpoint(
      "POST /api/auth/login (for Spatial Tests)",
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "getra.commuter.test@example.com", password: TEST_PASSWORD }),
      },
      200,
    );
    const resData = res.body?.data as { session?: { access_token?: string } } | undefined;
    commuterToken = resData?.session?.access_token || "";
  }

  if (commuterToken) {
    const authHeaders = {
      Authorization: `Bearer ${commuterToken}`,
      "Content-Type": "application/json",
    };

    // Nearby
    await callEndpoint(
      "GET /api/spatial/nearby",
      `${BASE_URL}/api/spatial/nearby?lat=-6.2088&lng=106.8456&radius=1000&type=transport_node`,
      { method: "GET", headers: authHeaders },
      200,
    );

    // Distance
    await callEndpoint(
      "POST /api/spatial/distance",
      `${BASE_URL}/api/spatial/distance`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          origin: { latitude: -6.2088, longitude: 106.8456 },
          destination: { latitude: -6.2000, longitude: 106.8500 },
        }),
      },
      200,
    );

    // BBox
    await callEndpoint(
      "GET /api/spatial/bbox",
      `${BASE_URL}/api/spatial/bbox?west=106.8&south=-6.3&east=106.9&north=-6.2&type=transport_node`,
      { method: "GET", headers: authHeaders },
      200,
    );
  } else {
    console.error("  [SKIP] Spatial APIs skipped because commuter token is unavailable.");
  }
}

async function main() {
  results.length = 0;
  await runSmokeTest(1);
  const run1Failed = results.filter((r) => !r.success).length;

  results.length = 0;
  await runSmokeTest(2);
  const run2Failed = results.filter((r) => !r.success).length;

  console.log(`\n======================================================`);
  console.log(`  SMOKE TEST SUMMARY`);
  console.log(`======================================================`);
  console.log(`  RUN 1 Result: ${run1Failed === 0 ? "ALL PASS" : `${run1Failed} FAILED`}`);
  console.log(`  RUN 2 Result: ${run2Failed === 0 ? "ALL PASS" : `${run2Failed} FAILED`}`);
  console.log(`======================================================\n`);

  if (run1Failed > 0 || run2Failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

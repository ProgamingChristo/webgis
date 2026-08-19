export {};

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const TEST_PASSWORD = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";

async function runRegisterSmokeTest() {
  const timestamp = Date.now();
  const testEmail = `getra.register.test.${timestamp}@gmail.com`;

  console.log(`\n======================================================`);
  console.log(`  GETRA AUTH REGISTER SMOKE TEST`);
  console.log(`======================================================\n`);
  console.log(`[TEST EMAIL]: ${testEmail}\n`);

  // 1. Positive Single Registration Test
  console.log(`[1] POSITIVE TEST: UNIQUE SIGNUP`);
  let registerSucceeded = false;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: TEST_PASSWORD,
        display_name: `Test Commuter ${timestamp}`,
        role: "COMMUTER",
      }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 200 && json?.success) {
      console.log(`  [PASS] Registration succeeded -> 200 OK`);
      registerSucceeded = true;
    } else if (res.status === 429) {
      console.warn(`  [REGISTER: BLOCKED BY SUPABASE AUTH UPSTREAM RATE LIMIT]`);
      console.warn(`  Source: ${json?.error?.details?.source || "SUPABASE_AUTH"}`);
      console.warn(`  Response: ${JSON.stringify(json)}`);
    } else {
      console.error(`  [FAIL] Registration failed -> Status ${res.status}`);
      console.error(`  Response: ${JSON.stringify(json)}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [FAIL] Exception during register: ${message}`);
  }

  // 2. Duplicate Registration Test (if first succeeded)
  if (registerSucceeded) {
    console.log(`\n[2] NEGATIVE TEST: DUPLICATE SIGNUP`);
    try {
      const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: TEST_PASSWORD,
          display_name: `Test Commuter Duplicate`,
          role: "COMMUTER",
        }),
      });

      const dupJson = await dupRes.json().catch(() => null);
      if (dupRes.status === 409) {
        console.log(`  [PASS] Duplicate registration rejected -> 409 CONFLICT`);
      } else {
        console.error(`  [FAIL] Duplicate registration expected 409, got ${dupRes.status}`);
        console.error(`  Response: ${JSON.stringify(dupJson)}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [FAIL] Exception during duplicate register: ${message}`);
    }
  } else {
    console.log(`\n[2] NEGATIVE TEST: DUPLICATE SIGNUP (SKIPPED because initial signup was rate-limited)`);
  }

  // 3. Admin Public Registration Rejection Test
  console.log(`\n[3] NEGATIVE TEST: PUBLIC ADMIN SIGNUP REJECTION`);
  try {
    const adminRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `getra.admin.attempt.${timestamp}@gmail.com`,
        password: TEST_PASSWORD,
        display_name: `Admin Attempt`,
        role: "ADMIN",
      }),
    });

    const adminJson = await adminRes.json().catch(() => null);
    if (adminRes.status === 403) {
      console.log(`  [PASS] Public Admin registration rejected -> 403 FORBIDDEN`);
    } else {
      console.error(`  [FAIL] Public Admin registration expected 403, got ${adminRes.status}`);
      console.error(`  Response: ${JSON.stringify(adminJson)}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [FAIL] Exception during admin register test: ${message}`);
  }

  console.log(`\n======================================================\n`);
}

runRegisterSmokeTest().catch(console.error);

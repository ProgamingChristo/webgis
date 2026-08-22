export {};

const BASE_URL =
  process.env.APP_BASE_URL ||
  "http://localhost:3000";

const TEST_PASSWORD =
  process.env.GETRA_TEST_USER_PASSWORD ||
  "PasswordDevelopment123!";

type AccountRole =
  | "USER"
  | "ADMIN";

interface StableUser {
  label: string;
  email: string;
  password: string;
  expectedAccountRole: AccountRole;
}

/*
 * Akun test lama boleh tetap dipakai.
 *
 * Yang berubah adalah interpretasinya:
 *
 * - COMMUTER bukan authorization role lagi.
 * - COMMUNITY bukan authorization role lagi.
 * - UMKM bukan authorization role lagi.
 *
 * Semua akun biasa memiliki:
 * account_role = USER
 *
 * UMKM adalah stakeholder mode terpisah.
 *
 * ADMIN tetap:
 * account_role = ADMIN
 */
const stableUsers: StableUser[] = [
  {
    label: "GENERAL_USER_1",
    email:
      "getra.commuter.test@example.com",
    password:
      TEST_PASSWORD,
    expectedAccountRole:
      "USER",
  },
  {
    label: "UMKM_USER",
    email:
      "getra.umkm.test@example.com",
    password:
      TEST_PASSWORD,
    expectedAccountRole:
      "USER",
  },
  {
    label: "GENERAL_USER_2",
    email:
      "getra.community.test@example.com",
    password:
      TEST_PASSWORD,
    expectedAccountRole:
      "USER",
  },
  {
    label: "ADMIN",
    email:
      "getra.admin.test@example.com",
    password:
      TEST_PASSWORD,
    expectedAccountRole:
      "ADMIN",
  },
];

interface TestResult {
  name: string;
  expectedStatus: number;
  actualStatus: number;
  success: boolean;
  error?: unknown;
}

interface LoginResponseData {
  session?: {
    access_token?: string;
  };

  profile?: {
    display_name?: string | null;
    avatar_url?: string | null;
    account_role?: string;
    onboarding_complete?: boolean;
  };

  user?: {
    id?: string;
    email?: string;
  };
}

interface ApiEnvelope {
  success?: boolean;
  data?: unknown;
  error?: unknown;
}

const results: TestResult[] = [];

async function callEndpoint(
  name: string,
  url: string,
  options: RequestInit,
  expectedStatus: number,
): Promise<{
  status: number;
  body: ApiEnvelope | null;
}> {
  try {
    const res =
      await fetch(
        url,
        options,
      );

    const json =
      (await res
        .json()
        .catch(
          () => null,
        )) as ApiEnvelope | null;

    const success =
      res.status ===
      expectedStatus;

    results.push({
      name,
      expectedStatus,
      actualStatus:
        res.status,
      success,
      error:
        !success
          ? json
          : undefined,
    });

    if (success) {
      console.log(
        `  [PASS] ${name} -> ${res.status}`,
      );
    } else {
      console.error(
        `  [FAIL] ${name} -> Expected ${expectedStatus}, got ${res.status}`,
      );

      console.error(
        `         Response: ${JSON.stringify(json)}`,
      );
    }

    return {
      status:
        res.status,
      body:
        json,
    };
  } catch (
    err: unknown
  ) {
    const message =
      err instanceof Error
        ? err.message
        : String(err);

    results.push({
      name,
      expectedStatus,
      actualStatus:
        0,
      success:
        false,
      error:
        message,
    });

    console.error(
      `  [FAIL] ${name} -> Exception: ${message}`,
    );

    return {
      status:
        0,
      body:
        null,
    };
  }
}

function recordAssertion(
  name: string,
  success: boolean,
  error?: unknown,
): void {
  results.push({
    name,
    expectedStatus:
      1,
    actualStatus:
      success
        ? 1
        : 0,
    success,
    error:
      success
        ? undefined
        : error,
  });

  if (success) {
    console.log(
      `  [PASS] ${name}`,
    );
  } else {
    console.error(
      `  [FAIL] ${name}`,
    );

    if (
      error !== undefined
    ) {
      console.error(
        `         Detail: ${JSON.stringify(error)}`,
      );
    }
  }
}

async function runSmokeTest(
  runNumber: number,
) {
  console.log(
    `\n======================================================`,
  );

  console.log(
    `  GETRA API SMOKE TEST — RUN ${runNumber}`,
  );

  console.log(
    `======================================================\n`,
  );

  // ==========================================================
  // 1. HEALTH CHECK
  // ==========================================================

  console.log(
    `[1] HEALTH CHECK`,
  );

  await callEndpoint(
    "GET /api/health",
    `${BASE_URL}/api/health`,
    {
      method:
        "GET",
    },
    200,
  );

  // ==========================================================
  // 2. WRONG PASSWORD
  // ==========================================================

  console.log(
    `\n[2] NEGATIVE TEST: WRONG PASSWORD`,
  );

  await callEndpoint(
    "POST /api/auth/login (Invalid Password)",
    `${BASE_URL}/api/auth/login`,
    {
      method:
        "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify({
          email:
            "getra.commuter.test@example.com",

          password:
            "WrongPassword999!",
        }),
    },
    401,
  );

  // ==========================================================
  // 3. UNAUTHORIZED PROTECTED ROUTES
  // ==========================================================

  console.log(
    `\n[3] NEGATIVE TEST: UNAUTHORIZED ACCESS WITHOUT TOKEN`,
  );

  await callEndpoint(
    "GET /api/auth/me (No Token)",
    `${BASE_URL}/api/auth/me`,
    {
      method:
        "GET",
    },
    401,
  );

  await callEndpoint(
    "GET /api/profile (No Token)",
    `${BASE_URL}/api/profile`,
    {
      method:
        "GET",
    },
    401,
  );

  await callEndpoint(
    "GET /api/spatial/nearby (No Token)",
    `${BASE_URL}/api/spatial/nearby?latitude=-6.2&longitude=106.8&radius=1000`,
    {
      method:
        "GET",
    },
    401,
  );

  // ==========================================================
  // 4. AUTH FLOWS
  // ==========================================================
  //
  // Authorization sekarang hanya:
  //
  // USER
  // ADMIN
  //
  // UMKM adalah stakeholder mode dan tidak diuji sebagai
  // authorization role pada endpoint login.
  // ==========================================================

  let generalUserToken =
    "";

  for (
    const user of
    stableUsers
  ) {
    console.log(
      `\n[4] AUTH FLOW: ${user.label} (${user.email})`,
    );

    // --------------------------------------------------------
    // A. LOGIN
    // --------------------------------------------------------

    const loginRes =
      await callEndpoint(
        `POST /api/auth/login (${user.label})`,
        `${BASE_URL}/api/auth/login`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              email:
                user.email,

              password:
                user.password,
            }),
        },
        200,
      );

    const loginData =
      loginRes.body
        ?.data as
        | LoginResponseData
        | undefined;

    const token =
      loginData
        ?.session
        ?.access_token;

    if (!token) {
      console.error(
        `  [SKIP] Skipping subsequent tests for ${user.label} due to login failure.`,
      );

      continue;
    }

    // --------------------------------------------------------
    // B. VERIFY CANONICAL ACCOUNT ROLE
    // --------------------------------------------------------

    const actualAccountRole =
      loginData
        ?.profile
        ?.account_role;

    recordAssertion(
      `LOGIN account_role (${user.label}) = ${user.expectedAccountRole}`,
      actualAccountRole ===
        user.expectedAccountRole,
      {
        expected:
          user.expectedAccountRole,

        actual:
          actualAccountRole ??
          null,
      },
    );

    /*
     * Simpan token USER biasa untuk spatial tests.
     *
     * Kita tidak lagi menyebut token ini commuterToken
     * karena COMMUTER bukan role aplikasi.
     */
    if (
      !generalUserToken &&
      user.expectedAccountRole ===
        "USER"
    ) {
      generalUserToken =
        token;
    }

    const authHeaders = {
      Authorization:
        `Bearer ${token}`,

      "Content-Type":
        "application/json",
    };

    // --------------------------------------------------------
    // C. GET /api/auth/me
    // --------------------------------------------------------

    const meRes =
      await callEndpoint(
        `GET /api/auth/me (${user.label})`,
        `${BASE_URL}/api/auth/me`,
        {
          method:
            "GET",

          headers:
            authHeaders,
        },
        200,
      );

    const meData =
      meRes.body
        ?.data as
        | LoginResponseData
        | undefined;

    const meAccountRole =
      meData
        ?.profile
        ?.account_role;

    recordAssertion(
      `GET /api/auth/me account_role (${user.label}) = ${user.expectedAccountRole}`,
      meAccountRole ===
        user.expectedAccountRole,
      {
        expected:
          user.expectedAccountRole,

        actual:
          meAccountRole ??
          null,
      },
    );

    // --------------------------------------------------------
    // D. GET /api/profile
    // --------------------------------------------------------

    await callEndpoint(
      `GET /api/profile (${user.label})`,
      `${BASE_URL}/api/profile`,
      {
        method:
          "GET",

        headers:
          authHeaders,
      },
      200,
    );

    // --------------------------------------------------------
    // E. PATCH /api/profile
    // --------------------------------------------------------

    await callEndpoint(
      `PATCH /api/profile (${user.label})`,
      `${BASE_URL}/api/profile`,
      {
        method:
          "PATCH",

        headers:
          authHeaders,

        body:
          JSON.stringify({
            display_name:
              `${user.label} Updated Name`,
          }),
      },
      200,
    );

    // --------------------------------------------------------
    // F. LOGOUT
    // --------------------------------------------------------

    await callEndpoint(
      `POST /api/auth/logout (${user.label})`,
      `${BASE_URL}/api/auth/logout`,
      {
        method:
          "POST",

        headers:
          authHeaders,
      },
      200,
    );
  }

  // ==========================================================
  // 5. SPATIAL API TESTS
  // ==========================================================

  console.log(
    `\n[5] SPATIAL APIS`,
  );

  if (
    !generalUserToken
  ) {
    /*
     * Re-login salah satu USER general untuk mendapatkan token.
     *
     * Nama email lama boleh tetap "commuter" sebagai fixture,
     * tetapi authorization account-nya sekarang USER.
     */

    const res =
      await callEndpoint(
        "POST /api/auth/login (for Spatial Tests)",
        `${BASE_URL}/api/auth/login`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              email:
                "getra.commuter.test@example.com",

              password:
                TEST_PASSWORD,
            }),
        },
        200,
      );

    const resData =
      res.body
        ?.data as
        | LoginResponseData
        | undefined;

    generalUserToken =
      resData
        ?.session
        ?.access_token ||
      "";
  }

  if (
    generalUserToken
  ) {
    const authHeaders = {
      Authorization:
        `Bearer ${generalUserToken}`,

      "Content-Type":
        "application/json",
    };

    // --------------------------------------------------------
    // Nearby
    // --------------------------------------------------------

    await callEndpoint(
      "GET /api/spatial/nearby",
      `${BASE_URL}/api/spatial/nearby?lat=-6.2088&lng=106.8456&radius=1000&type=transport_node`,
      {
        method:
          "GET",

        headers:
          authHeaders,
      },
      200,
    );

    // --------------------------------------------------------
    // Distance
    // --------------------------------------------------------

    await callEndpoint(
      "POST /api/spatial/distance",
      `${BASE_URL}/api/spatial/distance`,
      {
        method:
          "POST",

        headers:
          authHeaders,

        body:
          JSON.stringify({
            origin: {
              latitude:
                -6.2088,

              longitude:
                106.8456,
            },

            destination: {
              latitude:
                -6.2,

              longitude:
                106.85,
            },
          }),
      },
      200,
    );

    // --------------------------------------------------------
    // BBox
    // --------------------------------------------------------

    await callEndpoint(
      "GET /api/spatial/bbox",
      `${BASE_URL}/api/spatial/bbox?west=106.8&south=-6.3&east=106.9&north=-6.2&type=transport_node`,
      {
        method:
          "GET",

        headers:
          authHeaders,
      },
      200,
    );
  } else {
    console.error(
      "  [SKIP] Spatial APIs skipped because USER token is unavailable.",
    );
  }
}

async function main() {
  results.length =
    0;

  await runSmokeTest(
    1,
  );

  const run1Failed =
    results.filter(
      (result) =>
        !result.success,
    ).length;

  results.length =
    0;

  await runSmokeTest(
    2,
  );

  const run2Failed =
    results.filter(
      (result) =>
        !result.success,
    ).length;

  console.log(
    `\n======================================================`,
  );

  console.log(
    `  SMOKE TEST SUMMARY`,
  );

  console.log(
    `======================================================`,
  );

  console.log(
    `  RUN 1 Result: ${
      run1Failed === 0
        ? "ALL PASS"
        : `${run1Failed} FAILED`
    }`,
  );

  console.log(
    `  RUN 2 Result: ${
      run2Failed === 0
        ? "ALL PASS"
        : `${run2Failed} FAILED`
    }`,
  );

  console.log(
    `======================================================\n`,
  );

  if (
    run1Failed > 0 ||
    run2Failed > 0
  ) {
    process.exit(
      1,
    );
  }
}

main().catch(
  (
    err: unknown,
  ) => {
    console.error(
      "Fatal error:",
      err,
    );

    process.exit(
      1,
    );
  },
);
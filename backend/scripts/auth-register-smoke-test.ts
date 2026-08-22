export {};

const BASE_URL =
  process.env.APP_BASE_URL ||
  "http://localhost:3000";

const TEST_PASSWORD =
  process.env.GETRA_TEST_USER_PASSWORD ||
  "PasswordDevelopment123!";

interface ApiResponse {
  success?: boolean;

  data?: {
    user?: {
      id?: string | null;
      email?: string | null;
    };

    profile?: {
      display_name?: string | null;
      account_role?: string;
      onboarding_complete?: boolean;
    };
  };

  error?: {
    code?: string;
    message?: string;

    details?: {
      source?: string;
    };
  };
}

async function readJson(
  response: Response,
): Promise<ApiResponse | null> {
  return response
    .json()
    .catch(() => null) as Promise<ApiResponse | null>;
}

async function runRegisterSmokeTest() {
  const timestamp =
    Date.now();

  const testEmail =
    `getra.register.test.${timestamp}@gmail.com`;

  console.log(
    `\n======================================================`,
  );

  console.log(
    `  GETRA AUTH REGISTER SMOKE TEST`,
  );

  console.log(
    `======================================================\n`,
  );

  console.log(
    `[TEST EMAIL]: ${testEmail}\n`,
  );

  // ==========================================================
  // 1. POSITIVE REGISTRATION
  // ==========================================================
  //
  // Public signup sekarang hanya menerima:
  //
  // email
  // password
  // display_name
  //
  // Tidak ada role selector.
  //
  // Database trigger membuat:
  // account_role = USER
  // onboarding_complete = false
  // ==========================================================

  console.log(
    `[1] POSITIVE TEST: UNIQUE SIGNUP`,
  );

  let registerSucceeded =
    false;

  try {
    const res =
      await fetch(
        `${BASE_URL}/api/auth/register`,
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
                testEmail,

              password:
                TEST_PASSWORD,

              display_name:
                `Test User ${timestamp}`,
            }),
        },
      );

    const json =
      await readJson(
        res,
      );

    if (
      res.status === 200 &&
      json?.success
    ) {
      const accountRole =
        json.data
          ?.profile
          ?.account_role;

      const onboardingComplete =
        json.data
          ?.profile
          ?.onboarding_complete;

      if (
        accountRole !==
        "USER"
      ) {
        console.error(
          `  [FAIL] Registration returned unexpected account_role`,
        );

        console.error(
          `         Expected: USER`,
        );

        console.error(
          `         Actual: ${String(accountRole)}`,
        );
      } else if (
        onboardingComplete !==
        false
      ) {
        console.error(
          `  [FAIL] Registration returned unexpected onboarding_complete`,
        );

        console.error(
          `         Expected: false`,
        );

        console.error(
          `         Actual: ${String(onboardingComplete)}`,
        );
      } else {
        console.log(
          `  [PASS] Registration succeeded -> 200 OK`,
        );

        console.log(
          `  [PASS] account_role -> USER`,
        );

        console.log(
          `  [PASS] onboarding_complete -> false`,
        );

        registerSucceeded =
          true;
      }
    } else if (
      res.status === 429
    ) {
      console.warn(
        `  [REGISTER: BLOCKED BY SUPABASE AUTH UPSTREAM RATE LIMIT]`,
      );

      console.warn(
        `  Source: ${
          json?.error
            ?.details
            ?.source ||
          "SUPABASE_AUTH"
        }`,
      );

      console.warn(
        `  Response: ${JSON.stringify(json)}`,
      );
    } else {
      console.error(
        `  [FAIL] Registration failed -> Status ${res.status}`,
      );

      console.error(
        `  Response: ${JSON.stringify(json)}`,
      );
    }
  } catch (
    err: unknown
  ) {
    const message =
      err instanceof Error
        ? err.message
        : String(err);

    console.error(
      `  [FAIL] Exception during register: ${message}`,
    );
  }

  // ==========================================================
  // 2. DUPLICATE REGISTRATION
  // ==========================================================
  //
  // Jika Supabase mengembalikan explicit duplicate error,
  // GETRA harus memetakannya ke 409.
  //
  // Beberapa konfigurasi Supabase dapat menyamarkan keberadaan
  // email lama untuk mencegah email enumeration dan mengembalikan
  // response success-like. Karena itu response 200 dicatat sebagai
  // upstream behavior, bukan dianggap authorization failure.
  // ==========================================================

  if (
    registerSucceeded
  ) {
    console.log(
      `\n[2] NEGATIVE TEST: DUPLICATE SIGNUP`,
    );

    try {
      const dupRes =
        await fetch(
          `${BASE_URL}/api/auth/register`,
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
                  testEmail,

                password:
                  TEST_PASSWORD,

                display_name:
                  "Test User Duplicate",
              }),
          },
        );

      const dupJson =
        await readJson(
          dupRes,
        );

      if (
        dupRes.status ===
        409
      ) {
        console.log(
          `  [PASS] Duplicate registration rejected -> 409 CONFLICT`,
        );
      } else if (
        dupRes.status ===
          200 &&
        dupJson?.success
      ) {
        console.warn(
          `  [INFO] Supabase returned a success-like response for duplicate signup.`,
        );

        console.warn(
          `         This may occur because of email enumeration protection.`,
        );
      } else if (
        dupRes.status ===
        429
      ) {
        console.warn(
          `  [INFO] Duplicate signup test was rate-limited by Supabase Auth.`,
        );

        console.warn(
          `  Response: ${JSON.stringify(dupJson)}`,
        );
      } else {
        console.error(
          `  [FAIL] Unexpected duplicate signup response -> ${dupRes.status}`,
        );

        console.error(
          `  Response: ${JSON.stringify(dupJson)}`,
        );
      }
    } catch (
      err: unknown
    ) {
      const message =
        err instanceof Error
          ? err.message
          : String(err);

      console.error(
        `  [FAIL] Exception during duplicate register: ${message}`,
      );
    }
  } else {
    console.log(
      `\n[2] NEGATIVE TEST: DUPLICATE SIGNUP (SKIPPED because initial signup did not complete)`,
    );
  }

  // ==========================================================
  // 3. ACCOUNT ROLE INJECTION
  // ==========================================================
  //
  // Public user tidak boleh memilih USER/ADMIN melalui request.
  //
  // account_role tidak termasuk registerSchema.
  // Karena schema strict, field tambahan harus ditolak dengan:
  //
  // 400 VALIDATION_ERROR
  //
  // Bukan 403, karena request tersebut bahkan tidak memenuhi
  // contract API registration.
  // ==========================================================

  console.log(
    `\n[3] NEGATIVE TEST: PUBLIC ACCOUNT_ROLE INJECTION`,
  );

  try {
    const adminRes =
      await fetch(
        `${BASE_URL}/api/auth/register`,
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
                `getra.admin.attempt.${timestamp}@gmail.com`,

              password:
                TEST_PASSWORD,

              display_name:
                "Admin Attempt",

              account_role:
                "ADMIN",
            }),
        },
      );

    const adminJson =
      await readJson(
        adminRes,
      );

    if (
      adminRes.status ===
        400 &&
      adminJson?.success ===
        false &&
      adminJson.error
        ?.code ===
        "VALIDATION_ERROR"
    ) {
      console.log(
        `  [PASS] Public account_role injection rejected -> 400 VALIDATION_ERROR`,
      );
    } else {
      console.error(
        `  [FAIL] account_role injection expected 400 VALIDATION_ERROR, got ${adminRes.status}`,
      );

      console.error(
        `  Response: ${JSON.stringify(adminJson)}`,
      );
    }
  } catch (
    err: unknown
  ) {
    const message =
      err instanceof Error
        ? err.message
        : String(err);

    console.error(
      `  [FAIL] Exception during account_role injection test: ${message}`,
    );
  }

  // ==========================================================
  // 4. LEGACY ROLE FIELD REJECTION
  // ==========================================================
  //
  // Memastikan contract lama:
  //
  // role = COMMUTER
  // role = UMKM
  // role = COMMUNITY
  //
  // tidak diam-diam diterima kembali.
  // ==========================================================

  console.log(
    `\n[4] NEGATIVE TEST: LEGACY ROLE FIELD REJECTION`,
  );

  try {
    const legacyRes =
      await fetch(
        `${BASE_URL}/api/auth/register`,
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
                `getra.legacy.role.${timestamp}@gmail.com`,

              password:
                TEST_PASSWORD,

              display_name:
                "Legacy Role Attempt",

              role:
                "COMMUTER",
            }),
        },
      );

    const legacyJson =
      await readJson(
        legacyRes,
      );

    if (
      legacyRes.status ===
        400 &&
      legacyJson?.success ===
        false &&
      legacyJson.error
        ?.code ===
        "VALIDATION_ERROR"
    ) {
      console.log(
        `  [PASS] Legacy role field rejected -> 400 VALIDATION_ERROR`,
      );
    } else {
      console.error(
        `  [FAIL] Legacy role field expected 400 VALIDATION_ERROR, got ${legacyRes.status}`,
      );

      console.error(
        `  Response: ${JSON.stringify(legacyJson)}`,
      );
    }
  } catch (
    err: unknown
  ) {
    const message =
      err instanceof Error
        ? err.message
        : String(err);

    console.error(
      `  [FAIL] Exception during legacy role test: ${message}`,
    );
  }

  console.log(
    `\n======================================================\n`,
  );
}

runRegisterSmokeTest()
  .catch(
    (
      err: unknown,
    ) => {
      console.error(
        "Fatal register smoke test error:",
        err,
      );

      process.exit(
        1,
      );
    },
  );
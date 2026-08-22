import { createClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD =
  process.env.GETRA_TEST_USER_PASSWORD ||
  "PasswordDevelopment123!";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://sesakxnjaphrxqxllqjm.supabase.co";

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

type AccountRole =
  | "USER"
  | "ADMIN";

type StakeholderMode =
  | "UMKM"
  | "INVESTOR"
  | "GOVERNMENT";

interface StableUser {
  label: string;
  email: string;
  name: string;
  accountRole: AccountRole;
  stakeholderModes: StakeholderMode[];
}

/*
 * ============================================================
 * GETRA TEST USER MODEL
 * ============================================================
 *
 * Authorization:
 *
 * profiles.account_role
 *   USER
 *   ADMIN
 *
 * Optional stakeholder modes:
 *
 * user_stakeholder_modes
 *   UMKM
 *   INVESTOR
 *   GOVERNMENT
 *
 * GENERAL / commuter functionality tidak membutuhkan mode.
 *
 * COMMUNITY juga bukan role.
 * Community adalah fitur sosial yang dapat digunakan USER.
 *
 * Email fixture lama tetap dipertahankan supaya smoke test
 * yang sudah ada tidak perlu mengganti akun.
 * ============================================================
 */
const stableUsers: StableUser[] = [
  {
    label: "GENERAL_USER_1",

    email:
      "getra.commuter.test@example.com",

    name:
      "General Test User",

    accountRole:
      "USER",

    stakeholderModes:
      [],
  },

  {
    label: "UMKM_USER",

    email:
      "getra.umkm.test@example.com",

    name:
      "UMKM Test User",

    accountRole:
      "USER",

    stakeholderModes: [
      "UMKM",
    ],
  },

  {
    label: "GENERAL_USER_2",

    email:
      "getra.community.test@example.com",

    name:
      "Community Feature Test User",

    accountRole:
      "USER",

    stakeholderModes:
      [],
  },

  {
    label: "ADMIN",

    email:
      "getra.admin.test@example.com",

    name:
      "Admin Test User",

    accountRole:
      "ADMIN",

    stakeholderModes:
      [],
  },
];

function requireServiceRoleKey(): string {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      [
        "Supabase service-role key is required to provision stable test users.",
        "",
        "Set one of:",
        "  SUPABASE_SERVICE_ROLE_KEY",
        "  SUPABASE_SECRET_KEY",
        "",
        "This script no longer directly inserts rows into auth.users.",
      ].join("\n"),
    );
  }

  return SERVICE_ROLE_KEY;
}

async function main() {
  const serviceRoleKey =
    requireServiceRoleKey();

  console.log(
    "\n======================================================",
  );

  console.log(
    "  GETRA TEST USER PROVISIONING",
  );

  console.log(
    "======================================================\n",
  );

  console.log(
    "[PROVISION] Using Supabase Admin API.",
  );

  const adminClient =
    createClient(
      SUPABASE_URL,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken:
            false,

          persistSession:
            false,
        },
      },
    );

  /*
   * Stable test account count sangat kecil.
   * Ambil daftar sekali supaya tidak melakukan listUsers()
   * berulang untuk setiap fixture.
   */
  const {
    data: usersData,
    error: usersError,
  } =
    await adminClient.auth.admin.listUsers();

  if (usersError) {
    throw new Error(
      `Failed to list Supabase users: ${usersError.message}`,
    );
  }

  const existingUsers =
    new Map(
      usersData.users.map(
        (user) => [
          user.email,
          user,
        ],
      ),
    );

  for (
    const fixture of
    stableUsers
  ) {
    console.log(
      `\n- Provisioning ${fixture.label} (${fixture.email})...`,
    );

    const existing =
      existingUsers.get(
        fixture.email,
      );

    let userId:
      | string
      | undefined =
      existing?.id;

    // ========================================================
    // 1. AUTH USER
    // ========================================================

    if (!existing) {
      const {
        data:
          createData,

        error:
          createError,
      } =
        await adminClient
          .auth
          .admin
          .createUser({
            email:
              fixture.email,

            password:
              DEFAULT_PASSWORD,

            email_confirm:
              true,

            /*
             * Jangan simpan authorization role
             * atau stakeholder mode di metadata.
             *
             * Trigger handle_new_user() akan
             * membuat profile USER secara default.
             */
            user_metadata: {
              display_name:
                fixture.name,
            },
          });

      if (
        createError
      ) {
        throw new Error(
          `Failed to create ${fixture.email}: ${createError.message}`,
        );
      }

      userId =
        createData
          .user
          .id;

      console.log(
        `  -> Created auth user ${userId}`,
      );
    } else {
      console.log(
        `  -> Auth user already exists (${userId}), reusing.`,
      );

      /*
       * Sinkronkan fixture password dan metadata
       * supaya smoke test tetap deterministic.
       */
      const {
        error:
          updateAuthError,
      } =
        await adminClient
          .auth
          .admin
          .updateUserById(
            existing.id,
            {
              password:
                DEFAULT_PASSWORD,

              email_confirm:
                true,

              user_metadata: {
                ...existing
                  .user_metadata,

                display_name:
                  fixture.name,
              },
            },
          );

      if (
        updateAuthError
      ) {
        throw new Error(
          `Failed to update auth fixture ${fixture.email}: ${updateAuthError.message}`,
        );
      }

      console.log(
        "  -> Auth password and metadata synchronized.",
      );
    }

    if (!userId) {
      throw new Error(
        `Unable to resolve user id for ${fixture.email}`,
      );
    }

    // ========================================================
    // 2. PROFILE
    // ========================================================
    //
    // Canonical authorization sekarang hanya:
    //
    // USER
    // ADMIN
    //
    // Service-role client digunakan sehingga ADMIN fixture
    // dapat ditetapkan secara trusted.
    // ========================================================

    const {
      error:
        profileError,
    } =
      await adminClient
        .from(
          "profiles",
        )
        .upsert(
          {
            id:
              userId,

            display_name:
              fixture.name,

            account_role:
              fixture.accountRole,
          },
          {
            onConflict:
              "id",
          },
        );

    if (
      profileError
    ) {
      throw new Error(
        `Failed to synchronize profile for ${fixture.email}: ${profileError.message}`,
      );
    }

    console.log(
      `  -> Profile account_role = ${fixture.accountRole}`,
    );

    // ========================================================
    // 3. OPTIONAL STAKEHOLDER MODES
    // ========================================================
    //
    // Hapus mode fixture yang sebelumnya mungkin ada supaya
    // hasil provisioning selalu deterministic.
    // ========================================================

    const {
      error:
        deleteModesError,
    } =
      await adminClient
        .from(
          "user_stakeholder_modes",
        )
        .delete()
        .eq(
          "user_id",
          userId,
        );

    if (
      deleteModesError
    ) {
      throw new Error(
        `Failed to reset stakeholder modes for ${fixture.email}: ${deleteModesError.message}`,
      );
    }

    if (
      fixture
        .stakeholderModes
        .length >
      0
    ) {
      const rows =
        fixture
          .stakeholderModes
          .map(
            (
              mode,
            ) => ({
              user_id:
                userId,

              mode,
            }),
          );

      const {
        error:
          modeError,
      } =
        await adminClient
          .from(
            "user_stakeholder_modes",
          )
          .insert(
            rows,
          );

      if (
        modeError
      ) {
        throw new Error(
          `Failed to assign stakeholder modes for ${fixture.email}: ${modeError.message}`,
        );
      }

      console.log(
        `  -> Stakeholder modes = ${fixture.stakeholderModes.join(", ")}`,
      );
    } else {
      console.log(
        "  -> Stakeholder modes = none (general GETRA access)",
      );
    }
  }

  // ==========================================================
  // FINAL VERIFICATION
  // ==========================================================

  console.log(
    "\n======================================================",
  );

  console.log(
    "  VERIFYING PROVISIONED USERS",
  );

  console.log(
    "======================================================\n",
  );

  let verificationFailed =
    false;

  for (
    const fixture of
    stableUsers
  ) {
    const {
      data:
        profile,

      error:
        profileError,
    } =
      await adminClient
        .from(
          "profiles",
        )
        .select(
          "id, display_name, account_role, onboarding_complete",
        )
        .eq(
          "display_name",
          fixture.name,
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        `  [FAIL] ${fixture.label}: ${profileError.message}`,
      );

      verificationFailed =
        true;

      continue;
    }

    if (!profile) {
      console.error(
        `  [FAIL] ${fixture.label}: profile not found`,
      );

      verificationFailed =
        true;

      continue;
    }

    if (
      profile.account_role !==
      fixture.accountRole
    ) {
      console.error(
        `  [FAIL] ${fixture.label}: expected account_role ${fixture.accountRole}, got ${String(profile.account_role)}`,
      );

      verificationFailed =
        true;

      continue;
    }

    const {
      data:
        modes,

      error:
        modesError,
    } =
      await adminClient
        .from(
          "user_stakeholder_modes",
        )
        .select(
          "mode",
        )
        .eq(
          "user_id",
          profile.id,
        );

    if (
      modesError
    ) {
      console.error(
        `  [FAIL] ${fixture.label}: ${modesError.message}`,
      );

      verificationFailed =
        true;

      continue;
    }

    const actualModes =
      (modes ?? [])
        .map(
          (
            row,
          ) =>
            String(
              row.mode,
            ),
        )
        .sort();

    const expectedModes =
      [
        ...fixture
          .stakeholderModes,
      ].sort();

    const modesMatch =
      JSON.stringify(
        actualModes,
      ) ===
      JSON.stringify(
        expectedModes,
      );

    if (!modesMatch) {
      console.error(
        `  [FAIL] ${fixture.label}: stakeholder modes mismatch`,
      );

      console.error(
        `         Expected: ${JSON.stringify(expectedModes)}`,
      );

      console.error(
        `         Actual:   ${JSON.stringify(actualModes)}`,
      );

      verificationFailed =
        true;

      continue;
    }

    console.log(
      `  [PASS] ${fixture.label} -> account_role=${profile.account_role}, modes=${
        actualModes.length > 0
          ? actualModes.join(",")
          : "GENERAL"
      }`,
    );
  }

  console.log(
    "\n======================================================",
  );

  if (
    verificationFailed
  ) {
    console.error(
      "  PROVISION RESULT: FAILED",
    );

    console.log(
      "======================================================\n",
    );

    process.exit(
      1,
    );
  }

  console.log(
    "  PROVISION RESULT: ALL PASS",
  );

  console.log(
    "======================================================\n",
  );
}

main().catch(
  (
    err: unknown,
  ) => {
    const message =
      err instanceof Error
        ? err.message
        : String(err);

    console.error(
      `[PROVISION ERROR]: ${message}`,
    );

    process.exit(
      1,
    );
  },
);
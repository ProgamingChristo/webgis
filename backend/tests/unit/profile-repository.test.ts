import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "server-only",
  () => ({}),
);

import {
  ProfileRepository,
} from "@/src/repositories/profile.repository";

import {
  RepositoryError,
} from "@/src/repositories/errors";

import type {
  ProfileDatabaseRow,
} from "@/src/types/profile";

const PROFILE_COLUMNS =
  "id, display_name, avatar_url, account_role, trust_score, onboarding_complete, created_at, updated_at";

const profileRow:
  ProfileDatabaseRow & {
    internal_fixture_note: string;
  } = {
    avatar_url: null,

    created_at:
      "2026-08-16T00:00:00.000Z",

    display_name:
      "TEST USER",

    id:
      "00000000-0000-0000-0000-000000000001",

    internal_fixture_note:
      "must not reach the DTO",

    account_role:
      "USER",

    trust_score:
      0,

    onboarding_complete:
      false,

    updated_at:
      "2026-08-16T01:00:00.000Z",
  };

const expectedProfile = {
  avatar_url: null,

  created_at:
    "2026-08-16T00:00:00.000Z",

  display_name:
    "TEST USER",

  id:
    "00000000-0000-0000-0000-000000000001",

  account_role:
    "USER",

  trust_score:
    0,

  onboarding_complete:
    false,

  updated_at:
    "2026-08-16T01:00:00.000Z",
};

function createRepository(
  builder: object,
) {
  const from =
    vi.fn()
      .mockReturnValue(
        builder,
      );

  const client = {
    from,
  } as unknown as SupabaseClient;

  return {
    from,

    repository:
      new ProfileRepository(
        client,
      ),
  };
}

async function captureRepositoryError(
  operation: Promise<unknown>,
): Promise<RepositoryError> {
  let thrown: unknown;

  try {
    await operation;
  } catch (error) {
    thrown = error;
  }

  expect(
    thrown,
  ).toBeInstanceOf(
    RepositoryError,
  );

  return thrown as RepositoryError;
}

describe(
  "ProfileRepository",
  () => {
    it(
      "findById selects explicit columns and maps the database row to a DTO",
      async () => {
        const builder = {
          eq: vi.fn(),

          maybeSingle:
            vi.fn()
              .mockResolvedValue({
                data:
                  profileRow,

                error:
                  null,
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        builder.eq
          .mockReturnValue(
            builder,
          );

        const {
          from,
          repository,
        } =
          createRepository(
            builder,
          );

        await expect(
          repository.findById(
            profileRow.id,
          ),
        ).resolves.toEqual(
          expectedProfile,
        );

        expect(
          from,
        ).toHaveBeenCalledWith(
          "profiles",
        );

        expect(
          builder.select,
        ).toHaveBeenCalledWith(
          PROFILE_COLUMNS,
        );

        expect(
          builder.select,
        ).not.toHaveBeenCalledWith(
          "*",
        );

        expect(
          builder.eq,
        ).toHaveBeenCalledWith(
          "id",
          profileRow.id,
        );
      },
    );

    it(
      "findById returns null when no RLS-visible row exists",
      async () => {
        const builder = {
          eq: vi.fn(),

          maybeSingle:
            vi.fn()
              .mockResolvedValue({
                data:
                  null,

                error:
                  null,
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        builder.eq
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        await expect(
          repository.findById(
            "missing-fixture",
          ),
        ).resolves.toBeNull();
      },
    );

    it(
      "findById maps and sanitizes database failures",
      async () => {
        const internalDetail =
          "permission denied for relation profiles";

        const builder = {
          eq: vi.fn(),

          maybeSingle:
            vi.fn()
              .mockResolvedValue({
                data:
                  null,

                error: {
                  code:
                    "42501",

                  message:
                    internalDetail,
                },
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        builder.eq
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        const error =
          await captureRepositoryError(
            repository.findById(
              "forbidden-fixture",
            ),
          );

        expect(
          error,
        ).toMatchObject({
          code:
            "FORBIDDEN",

          operation:
            "profiles.findById",
        });

        expect(
          error.message,
        ).not.toContain(
          internalDetail,
        );
      },
    );

    it(
      "findMany applies typed account role filter, sort, and offset pagination",
      async () => {
        const builder = {
          eq: vi.fn(),

          order:
            vi.fn(),

          range:
            vi.fn()
              .mockResolvedValue({
                count:
                  21,

                data: [
                  profileRow,
                ],

                error:
                  null,
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        builder.eq
          .mockReturnValue(
            builder,
          );

        builder.order
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        await expect(
          repository.findMany({
            account_role:
              "USER",

            page:
              3,

            limit:
              10,

            offset:
              20,

            sort:
              "updated_at",

            order:
              "desc",
          }),
        ).resolves.toEqual({
          items: [
            expectedProfile,
          ],

          page:
            3,

          limit:
            10,

          offset:
            20,

          total:
            21,
        });

        expect(
          builder.select,
        ).toHaveBeenCalledWith(
          PROFILE_COLUMNS,
          {
            count:
              "exact",
          },
        );

        expect(
          builder.eq,
        ).toHaveBeenCalledWith(
          "account_role",
          "USER",
        );

        expect(
          builder.order,
        ).toHaveBeenCalledWith(
          "updated_at",
          {
            ascending:
              false,
          },
        );

        expect(
          builder.range,
        ).toHaveBeenCalledWith(
          20,
          29,
        );
      },
    );

    it(
      "findMany rejects invalid pagination before starting a database query",
      async () => {
        const {
          from,
          repository,
        } =
          createRepository(
            {},
          );

        await expect(
          repository.findMany({
            page:
              0,

            limit:
              10,

            offset:
              0,

            sort:
              "created_at",

            order:
              "asc",
          }),
        ).rejects.toThrow(
          new TypeError(
            "Invalid repository pagination",
          ),
        );

        expect(
          from,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "findMany maps invalid database input without exposing its detail",
      async () => {
        const internalDetail =
          "invalid input syntax for type fixture";

        const builder = {
          order:
            vi.fn(),

          range:
            vi.fn()
              .mockResolvedValue({
                count:
                  null,

                data:
                  null,

                error: {
                  code:
                    "22P02",

                  message:
                    internalDetail,
                },
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        builder.order
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        const error =
          await captureRepositoryError(
            repository.findMany({
              page:
                1,

              limit:
                20,

              offset:
                0,

              sort:
                "created_at",

              order:
                "asc",
            }),
          );

        expect(
          error,
        ).toMatchObject({
          code:
            "VALIDATION_ERROR",

          operation:
            "profiles.findMany",
        });

        expect(
          error.message,
        ).not.toContain(
          internalDetail,
        );
      },
    );

    it.each([
      [
        1,
        true,
      ],

      [
        0,
        false,
      ],

      [
        null,
        false,
      ],
    ])(
      "exists maps count %s to %s",
      async (
        count,
        expected,
      ) => {
        const builder = {
          eq:
            vi.fn()
              .mockResolvedValue({
                count,
                error:
                  null,
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        await expect(
          repository.exists(
            profileRow.id,
          ),
        ).resolves.toBe(
          expected,
        );

        expect(
          builder.select,
        ).toHaveBeenCalledWith(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        );

        expect(
          builder.eq,
        ).toHaveBeenCalledWith(
          "id",
          profileRow.id,
        );
      },
    );

    it(
      "exists maps an unclassified SDK failure to DATABASE_ERROR",
      async () => {
        const builder = {
          eq:
            vi.fn()
              .mockResolvedValue({
                count:
                  null,

                error: {
                  code:
                    "XX000",

                  message:
                    "internal fixture failure",
                },
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        const error =
          await captureRepositoryError(
            repository.exists(
              profileRow.id,
            ),
          );

        expect(
          error,
        ).toMatchObject({
          code:
            "DATABASE_ERROR",

          operation:
            "profiles.exists",
        });
      },
    );

    it(
      "count applies the typed account role filter and returns the exact count",
      async () => {
        const builder = {
          eq:
            vi.fn()
              .mockResolvedValue({
                count:
                  4,

                error:
                  null,
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        await expect(
          repository.count({
            account_role:
              "ADMIN",
          }),
        ).resolves.toBe(
          4,
        );

        expect(
          builder.select,
        ).toHaveBeenCalledWith(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        );

        expect(
          builder.eq,
        ).toHaveBeenCalledWith(
          "account_role",
          "ADMIN",
        );
      },
    );

    it(
      "count maps RLS denial to FORBIDDEN",
      async () => {
        const builder = {
          eq:
            vi.fn()
              .mockResolvedValue({
                count:
                  null,

                error: {
                  code:
                    "PGRST301",

                  message:
                    "private policy detail",
                },
              }),

          select:
            vi.fn(),
        };

        builder.select
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        const error =
          await captureRepositoryError(
            repository.count({
              account_role:
                "ADMIN",
            }),
          );

        expect(
          error,
        ).toMatchObject({
          code:
            "FORBIDDEN",

          operation:
            "profiles.count",
        });
      },
    );

    it(
      "update writes mutable fields and maps its selected row to a DTO",
      async () => {
        const updateData = {
          avatar_url:
            "https://example.invalid/test-avatar.png",
        };

        const builder = {
          eq:
            vi.fn(),

          maybeSingle:
            vi.fn()
              .mockResolvedValue({
                data:
                  profileRow,

                error:
                  null,
              }),

          select:
            vi.fn(),

          update:
            vi.fn(),
        };

        builder.update
          .mockReturnValue(
            builder,
          );

        builder.eq
          .mockReturnValue(
            builder,
          );

        builder.select
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        await expect(
          repository.update(
            profileRow.id,
            updateData,
          ),
        ).resolves.toEqual(
          expectedProfile,
        );

        expect(
          builder.update,
        ).toHaveBeenCalledWith(
          updateData,
        );

        expect(
          builder.eq,
        ).toHaveBeenCalledWith(
          "id",
          profileRow.id,
        );

        expect(
          builder.select,
        ).toHaveBeenCalledWith(
          PROFILE_COLUMNS,
        );
      },
    );

    it(
      "update reports NOT_FOUND when no RLS-visible row is returned",
      async () => {
        const builder = {
          eq:
            vi.fn(),

          maybeSingle:
            vi.fn()
              .mockResolvedValue({
                data:
                  null,

                error:
                  null,
              }),

          select:
            vi.fn(),

          update:
            vi.fn(),
        };

        builder.update
          .mockReturnValue(
            builder,
          );

        builder.eq
          .mockReturnValue(
            builder,
          );

        builder.select
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        const error =
          await captureRepositoryError(
            repository.update(
              profileRow.id,
              {
                display_name:
                  "UPDATED TEST USER",
              },
            ),
          );

        expect(
          error,
        ).toMatchObject({
          code:
            "NOT_FOUND",

          operation:
            "profiles.update",
        });
      },
    );

    it(
      "update maps a unique violation to CONFLICT",
      async () => {
        const builder = {
          eq:
            vi.fn(),

          maybeSingle:
            vi.fn()
              .mockResolvedValue({
                data:
                  null,

                error: {
                  code:
                    "23505",

                  message:
                    "private unique index detail",
                },
              }),

          select:
            vi.fn(),

          update:
            vi.fn(),
        };

        builder.update
          .mockReturnValue(
            builder,
          );

        builder.eq
          .mockReturnValue(
            builder,
          );

        builder.select
          .mockReturnValue(
            builder,
          );

        const {
          repository,
        } =
          createRepository(
            builder,
          );

        const error =
          await captureRepositoryError(
            repository.update(
              profileRow.id,
              {
                display_name:
                  "UPDATED TEST USER",
              },
            ),
          );

        expect(
          error,
        ).toMatchObject({
          code:
            "CONFLICT",

          operation:
            "profiles.update",
        });
      },
    );
  },
);
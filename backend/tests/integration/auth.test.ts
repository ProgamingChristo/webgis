import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  NextRequest,
} from "next/server";

import {
  POST as RegisterPOST,
} from "@/app/api/auth/register/route";

import {
  POST as LoginPOST,
} from "@/app/api/auth/login/route";

vi.mock(
  "server-only",
  () => ({}),
);

vi.mock(
  "@/src/lib/supabase/server",
  () => ({
    getServerSupabaseClient:
      vi.fn(),

    getRequestSupabaseClient:
      vi.fn(),
  }),
);

import {
  getRequestSupabaseClient,
  getServerSupabaseClient,
} from "@/src/lib/supabase/server";

describe(
  "Auth API",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe(
      "POST /api/auth/register",
      () => {
        it(
          "should register a public user without choosing an account role",
          async () => {
            const signUp =
              vi.fn()
                .mockResolvedValue({
                  data: {
                    session: {
                      access_token:
                        "register-token",

                      refresh_token:
                        "register-refresh-token",

                      expires_at:
                        1787420000,
                    },

                    user: {
                      id: "123",
                      email:
                        "test@example.com",
                    },
                  },

                  error: null,
                });

            const mockSupabaseClient = {
              auth: {
                signUp,
              },
            };

            vi.mocked(
              getServerSupabaseClient,
            ).mockReturnValue(
              mockSupabaseClient as unknown as ReturnType<
                typeof getServerSupabaseClient
              >,
            );

            const req =
              new NextRequest(
                "http://localhost:3000/api/auth/register",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      email:
                        "test@example.com",

                      password:
                        "PasswordDevelopment123!",

                      display_name:
                        "Test User",
                    }),
                },
              );

            const res =
              await RegisterPOST(
                req,
              );

            const json =
              await res.json();

            expect(
              res.status,
            ).toBe(200);

            expect(
              json.success,
            ).toBe(true);

            expect(
              json.data.user,
            ).toEqual({
              id: "123",

              email:
                "test@example.com",
            });

            expect(
              json.data.session,
            ).toEqual({
              access_token:
                "register-token",

              refresh_token:
                "register-refresh-token",

              expires_at:
                1787420000,
            });

            expect(
              json.data.profile,
            ).toEqual({
              display_name:
                "Test User",

              account_role:
                "USER",

              onboarding_complete:
                false,
            });

            /*
             * Authorization role tidak boleh
             * berasal dari request publik.
             *
             * Supabase hanya menerima
             * display_name sebagai metadata.
             */
            expect(
              signUp,
            ).toHaveBeenCalledWith({
              email:
                "test@example.com",

              password:
                "PasswordDevelopment123!",

              options: {
                data: {
                  display_name:
                    "Test User",
                },
              },
            });
          },
        );

        it(
          "should reject an account role supplied by public registration",
          async () => {
            const mockSupabaseClient = {
              auth: {
                signUp:
                  vi.fn(),
              },
            };

            vi.mocked(
              getServerSupabaseClient,
            ).mockReturnValue(
              mockSupabaseClient as unknown as ReturnType<
                typeof getServerSupabaseClient
              >,
            );

            const req =
              new NextRequest(
                "http://localhost:3000/api/auth/register",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      email:
                        "admin@example.com",

                      password:
                        "PasswordDevelopment123!",

                      display_name:
                        "Admin",

                      /*
                       * Public client mencoba
                       * menentukan role sendiri.
                       * Schema strict harus menolak.
                       */
                      role:
                        "ADMIN",
                    }),
                },
              );

            const res =
              await RegisterPOST(
                req,
              );

            const json =
              await res.json();

            /*
             * Sekarang hasil yang benar adalah
             * 400 VALIDATION_ERROR, bukan 403.
             *
             * Karena `role` sudah bukan bagian
             * contract register sama sekali.
             */
            expect(
              res.status,
            ).toBe(400);

            expect(
              json.success,
            ).toBe(false);

            expect(
              json.error.code,
            ).toBe(
              "VALIDATION_ERROR",
            );

            /*
             * Request invalid harus ditolak
             * sebelum Supabase signup berjalan.
             */
            expect(
              mockSupabaseClient
                .auth
                .signUp,
            ).not.toHaveBeenCalled();
          },
        );
      },
    );

    describe(
      "POST /api/auth/login",
      () => {
        it(
          "should return user and canonical profile on success",
          async () => {
            const mockSupabaseClient = {
              auth: {
                signInWithPassword:
                  vi.fn()
                    .mockResolvedValue({
                      data: {
                        user: {
                          id:
                            "123",

                          email:
                            "test@example.com",
                        },

                        session: {
                          access_token:
                            "token",
                        },
                      },

                      error:
                        null,
                    }),
              },

              from:
                vi.fn()
                  .mockReturnThis(),

              select:
                vi.fn()
                  .mockReturnThis(),

              eq:
                vi.fn()
                  .mockReturnThis(),

              maybeSingle:
                vi.fn()
                  .mockResolvedValue({
                    data: {
                      id:
                        "123",

                      display_name:
                        "Test User",

                      avatar_url:
                        null,

                      account_role:
                        "USER",

                      trust_score:
                        0,

                      onboarding_complete:
                        false,

                      created_at:
                        "2026-08-22T00:00:00.000Z",

                      updated_at:
                        "2026-08-22T00:00:00.000Z",
                    },

                    error:
                      null,
                  }),
            };

            vi.mocked(
              getServerSupabaseClient,
            ).mockReturnValue(
              mockSupabaseClient as unknown as ReturnType<
                typeof getServerSupabaseClient
              >,
            );

            vi.mocked(
              getRequestSupabaseClient,
            ).mockReturnValue(
              mockSupabaseClient as unknown as ReturnType<
                typeof getRequestSupabaseClient
              >,
            );

            const req =
              new NextRequest(
                "http://localhost:3000/api/auth/login",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      email:
                        "test@example.com",

                      password:
                        "PasswordDevelopment123!",
                    }),
                },
              );

            const res =
              await LoginPOST(
                req,
              );

            const json =
              await res.json();

            expect(
              res.status,
            ).toBe(200);

            expect(
              json.success,
            ).toBe(true);

            expect(
              json.data.user,
            ).toEqual({
              id: "123",

              email:
                "test@example.com",
            });

            expect(
              json.data.session,
            ).toEqual({
              access_token:
                "token",
              expires_at: null,
            });

            expect(
              json.data.profile,
            ).toEqual({
              display_name:
                "Test User",

              avatar_url:
                null,

              account_role:
                "USER",

              onboarding_complete:
                false,
            });

            /*
             * Legacy profile.role tidak boleh
             * lagi keluar dari auth API.
             */
            expect(
              json.data.profile.role,
            ).toBeUndefined();
          },
        );
      },
    );
  },
);

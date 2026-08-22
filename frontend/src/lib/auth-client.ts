"use client";

import {
  getBrowserSupabaseClient,
} from "@/src/lib/supabase/browser";

const AUTH_OPERATION_TIMEOUT_MS = 10_000;

async function withAuthTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Operasi autentikasi melewati batas waktu.")),
          AUTH_OPERATION_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export interface BrowserAuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
}

export async function persistAuthSession(
  session: BrowserAuthSession,
): Promise<void> {
  const supabase =
    getBrowserSupabaseClient();

  const {
    error,
  } =
    await withAuthTimeout(
      supabase.auth.setSession({
        access_token:
          session.access_token,

        refresh_token:
          session.refresh_token,
      }),
    );

  if (error) {
    throw new Error(
      "Gagal menyimpan sesi login.",
    );
  }
}

export async function getAccessToken():
Promise<string | null> {
  const supabase =
    getBrowserSupabaseClient();

  const {
    data,
    error,
  } =
    await withAuthTimeout(
      supabase.auth.getSession(),
    );

  if (error) {
    return null;
  }

  return (
    data.session
      ?.access_token ??
    null
  );
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token =
    await getAccessToken();

  if (!token) {
    throw new Error(
      "Session tidak tersedia.",
    );
  }

  const headers =
    new Headers(
      init.headers,
    );

  headers.set(
    "Authorization",
    `Bearer ${token}`,
  );

  return fetch(
    input,
    {
      ...init,
      headers,
    },
  );
}

export async function clearAuthSession():
Promise<void> {
  const supabase =
    getBrowserSupabaseClient();

  const {
    error,
  } =
    await withAuthTimeout(
      supabase.auth.signOut({
        scope:
          "local",
      }),
    );

  if (error) {
    throw new Error(
      "Gagal menghapus sesi lokal.",
    );
  }
}

export interface UserContext {
  user: {
    id: string;
    email: string | null;
  };
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    account_role: "USER" | "ADMIN";
    onboarding_complete: boolean;
    trust_score: number;
  } | null;
  stakeholder_modes: ("UMKM" | "INVESTOR" | "GOVERNMENT")[];
}

export async function getUserContext(): Promise<UserContext | null> {
  try {
    const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`);
    if (!response.ok) return null;

    const json = await response.json();
    if (!json.success || !json.data) return null;

    return json.data as UserContext;
  } catch {
    return null;
  }
}

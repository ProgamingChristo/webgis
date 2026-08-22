"use client";

import {
  getBrowserSupabaseClient,
} from "@/src/lib/supabase/browser";

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
    await supabase.auth
      .setSession({
        access_token:
          session.access_token,

        refresh_token:
          session.refresh_token,
      });

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
    await supabase.auth
      .getSession();

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
    await supabase.auth.signOut({
      scope:
        "local",
    });

  if (error) {
    throw new Error(
      "Gagal menghapus sesi lokal.",
    );
  }
}
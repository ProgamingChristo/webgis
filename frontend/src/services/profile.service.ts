"use client";

import {
  authenticatedFetch,
  type PublicProfile,
  type UserContext,
} from "@/src/lib/auth-client";
import {
  getBrowserSupabaseClient,
} from "@/src/lib/supabase/browser";

export interface ProfileUpdatePayload {
  display_name?: string;
  username?: string | null;
  avatar_url?: string | null;
  phone_number?: string | null;
  bio?: string | null;
}

async function readJson<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    throw new Error(
      json?.error?.message ?? fallbackMessage,
    );
  }

  return json.data as T;
}

export const profileService = {
  async uploadAvatar(
    userId: string,
    file: File,
  ) {
    if (!file.type.startsWith("image/")) {
      throw new Error(
        "File avatar harus berupa gambar.",
      );
    }

    const maxBytes =
      2 * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new Error(
        "Ukuran foto profil maksimal 2 MB.",
      );
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        ?.replace(/[^a-z0-9]/g, "") ||
      "jpg";

    const path =
      `${userId}/avatar-${Date.now()}.${extension}`;

    const supabase =
      getBrowserSupabaseClient();

    const {
      error,
    } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      throw new Error(
        `Upload foto gagal: ${error.message}`,
      );
    }

    const {
      data,
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    return data.publicUrl;
  },

  async getOwnProfile() {
    const response = await authenticatedFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/profile`,
    );

    return readJson<UserContext["profile"]>(
      response,
      "Gagal memuat profil.",
    );
  },

  async updateOwnProfile(
    payload: ProfileUpdatePayload,
  ) {
    const response = await authenticatedFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/profile`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    return readJson<UserContext["profile"]>(
      response,
      "Gagal menyimpan profil.",
    );
  },

  async listPublicProfiles(
    search = "",
  ) {
    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim(),
      );
    }

    const response = await authenticatedFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/profiles${
        params.size > 0 ? `?${params.toString()}` : ""
      }`,
    );

    return readJson<{
      profiles: PublicProfile[];
    }>(
      response,
      "Gagal memuat direktori user.",
    );
  },

  async getPublicProfile(
    id: string,
  ) {
    const response = await authenticatedFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/profiles/${id}`,
    );

    return readJson<PublicProfile>(
      response,
      "Gagal memuat profil user.",
    );
  },
};

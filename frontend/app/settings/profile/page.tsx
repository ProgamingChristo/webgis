"use client";

import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  LoaderCircle,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "@/src/components/providers/AuthProvider";
import type {
  UserContext,
} from "@/src/lib/auth-client";
import {
  profileService,
} from "@/src/services/profile.service";

interface ProfileForm {
  display_name: string;
  username: string;
  avatar_url: string;
  phone_number: string;
  bio: string;
}

function initials(
  value: string,
) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "G";
}

function createProfileForm(
  profile:
    UserContext["profile"] | null | undefined,
): ProfileForm {
  return {
    display_name:
      profile?.display_name ?? "",
    username:
      profile?.username ?? "",
    avatar_url:
      profile?.avatar_url ?? "",
    phone_number:
      profile?.phone_number ?? "",
    bio:
      profile?.bio ?? "",
  };
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const {
    context,
    refresh,
  } = useAuth();

  const [form, setForm] =
    useState<ProfileForm>(() =>
      createProfileForm(
        context?.profile,
      ),
    );
  const [saving, setSaving] =
    useState(false);
  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] =
    useState<string | null>(null);
  const [message, setMessage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const previewName =
    form.display_name.trim() ||
    context?.user.email ||
    "Akun GETRA";

  const previewInitials =
    useMemo(
      () => initials(previewName),
      [previewName],
    );

  const stakeholderModes =
    context?.stakeholder_modes ?? [];

  const primaryExperience =
    stakeholderModes.length > 0
      ? stakeholderModes.join(" + ")
      : "General / Commuter";

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          setForm(
            createProfileForm(
              context?.profile,
            ),
          );
        },
        0,
      );

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [context?.profile]);

  useEffect(() => {
    let objectUrl:
      string | null = null;

    const timeoutId =
      window.setTimeout(
        () => {
          if (!avatarFile) {
            setAvatarPreview(null);
            return;
          }

          objectUrl =
            URL.createObjectURL(
              avatarFile,
            );

          setAvatarPreview(objectUrl);
        },
        0,
      );

    if (!avatarFile) {
      return () =>
        window.clearTimeout(
          timeoutId,
        );
    }

    return () => {
      window.clearTimeout(
        timeoutId,
      );
      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl,
        );
      }
    };
  }, [avatarFile]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      let avatarUrl =
        form.avatar_url.trim() || null;

      if (avatarFile) {
        if (!context?.user.id) {
          throw new Error(
            "Session user tidak tersedia untuk upload avatar.",
          );
        }

        avatarUrl =
          await profileService.uploadAvatar(
            context.user.id,
            avatarFile,
          );
      }

      await profileService.updateOwnProfile({
        display_name:
          form.display_name.trim(),
        username:
          form.username.trim() || null,
        avatar_url:
          avatarUrl,
        phone_number:
          form.phone_number.trim() || null,
        bio:
          form.bio.trim() || null,
      });

      await refresh();
      setAvatarFile(null);
      setMessage(
        "Profil berhasil diperbarui.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Profil gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField(
    field: keyof ProfileForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="min-h-screen bg-[#050a10] text-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[340px_1fr]">
        <aside className="border border-cyan-300/15 bg-slate-950/72 p-6">
          <button
            className="inline-flex h-10 items-center gap-2 border border-cyan-300/20 px-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300/70"
            type="button"
            onClick={() => router.push("/")}
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>

          <div className="mt-10">
            <div className="grid h-24 w-24 place-items-center overflow-hidden border border-cyan-300/55 bg-cyan-300/10 text-2xl font-black text-cyan-200">
              {avatarPreview || form.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={avatarPreview ?? form.avatar_url}
                />
              ) : (
                previewInitials
              )}
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Account settings
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              Profil GETRA
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Atur identitas yang tampil di header dan profil publik. Nomor HP
              tersimpan untuk akun kamu dan tidak ditampilkan ke user lain.
            </p>

            <div className="mt-6 grid gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                <ShieldCheck size={15} />
                Tipe akun
              </div>
              <strong className="text-lg">
                {context?.profile?.account_role ?? "USER"}
              </strong>
              <p className="text-xs leading-5 text-slate-400">
                Authorization role tetap USER/ADMIN. Jenis pengalaman user
                dibaca dari stakeholder mode.
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-[11px] font-black text-lime-200">
                  General / Commuter
                </span>
                {stakeholderModes.map((mode) => (
                  <span
                    className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-black text-cyan-100"
                    key={mode}
                  >
                    {mode}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Pengalaman utama: {primaryExperience}
              </p>
            </div>
          </div>
        </aside>

        <section className="border border-cyan-300/15 bg-slate-950/64 p-6">
          <form
            className="grid gap-5"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Nama tampilan
              </label>
              <input
                className="getra-input"
                maxLength={50}
                minLength={2}
                required
                value={form.display_name}
                onChange={(event) =>
                  updateField(
                    "display_name",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Username
              </label>
              <input
                className="getra-input"
                maxLength={30}
                pattern="[a-z0-9_]{3,30}"
                placeholder="contoh: chris_getra"
                value={form.username}
                onChange={(event) =>
                  updateField(
                    "username",
                    event.target.value.toLowerCase(),
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Foto profil
              </label>
              <div className="grid gap-3 rounded-2xl border border-cyan-300/12 bg-slate-950/70 p-4 md:grid-cols-[88px_1fr]">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-cyan-300/45 bg-cyan-300/10 text-xl font-black text-cyan-200">
                  {avatarPreview || form.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={avatarPreview ?? form.avatar_url}
                    />
                  ) : (
                    previewInitials
                  )}
                </div>

                <div className="grid gap-3">
                  <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/8 px-4 text-sm font-black text-cyan-100 transition hover:border-cyan-300/70">
                    <Camera size={16} />
                    Pilih foto dari perangkat
                    <input
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      type="file"
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0] ?? null;
                        setAvatarFile(file);
                        setError(null);
                        setMessage(null);
                      }}
                    />
                  </label>

                  <input
                    className="getra-input"
                    placeholder="Atau tempel URL foto publik"
                    type="url"
                    value={form.avatar_url}
                    onChange={(event) => {
                      setAvatarFile(null);
                      updateField(
                        "avatar_url",
                        event.target.value,
                      );
                    }}
                  />

                  <p className="text-xs leading-5 text-slate-500">
                    Format: JPG, PNG, WEBP, GIF. Maksimal 2 MB. Foto akan
                    di-upload ke bucket Supabase <code>avatars</code>.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Nomor HP
              </label>
              <input
                className="getra-input"
                inputMode="tel"
                maxLength={32}
                placeholder="+62..."
                value={form.phone_number}
                onChange={(event) =>
                  updateField(
                    "phone_number",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Bio
              </label>
              <textarea
                className="getra-input min-h-32 resize-none py-3"
                maxLength={240}
                placeholder="Tulis ringkasan singkat tentang kamu."
                value={form.bio}
                onChange={(event) =>
                  updateField(
                    "bio",
                    event.target.value,
                  )
                }
              />
              <span className="text-right text-xs text-slate-500">
                {form.bio.length}/240
              </span>
            </div>

            {message ? (
              <p className="flex items-center gap-2 border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">
                <CheckCircle2 size={16} />
                {message}
              </p>
            ) : null}

            {error ? (
              <p className="border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cyan-300/10 pt-5">
              <button
                className="inline-flex h-11 items-center gap-2 border border-cyan-300/20 px-4 text-sm font-black text-cyan-100 transition hover:border-cyan-300/70"
                type="button"
                onClick={() =>
                  router.push(
                    `/users/${context?.user.id ?? ""}`,
                  )
                }
              >
                <UserRound size={16} />
                Lihat profil publik
              </button>

              <button
                className="inline-flex h-11 items-center gap-2 bg-gradient-to-r from-lime-300 to-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={16}
                  />
                ) : (
                  <Save size={16} />
                )}
                Simpan profil
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

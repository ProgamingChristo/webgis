"use client";

import {
  ArrowLeft,
  CalendarDays,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "@/src/components/providers/AuthProvider";
import type {
  PublicProfile,
} from "@/src/lib/auth-client";
import {
  profileService,
} from "@/src/services/profile.service";
import {
  getExperienceBadges,
  getPrimaryExperienceLabel,
} from "@/src/lib/user-experience";

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

function formatJoinDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(new Date(value));
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams<{
    id: string;
  }>();
  const {
    context,
  } = useAuth();
  const [profile, setProfile] =
    useState<PublicProfile | null>(
      null,
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const userId =
    params.id;

  useEffect(() => {
    let active = true;

    void profileService
      .getPublicProfile(userId)
      .then((result) => {
        if (active) {
          setProfile(result);
        }
      })
      .catch((loadError) => {
        if (active) {
          setProfile(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Profil user gagal dimuat.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const displayName =
    profile?.display_name ||
    profile?.username ||
    "User GETRA";

  const avatarInitials =
    useMemo(
      () => initials(displayName),
      [displayName],
    );

  const isOwnProfile =
    context?.user.id === userId;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050a10] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.15),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(154,242,74,0.1),transparent_28%),linear-gradient(120deg,rgba(255,255,255,0.025),transparent_32%)]" />
      <section className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-cyan-300/20 px-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/8"
            type="button"
            onClick={() => router.back()}
          >
            <ArrowLeft size={16} />
            Kembali
          </button>

          <div className="mt-8 rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[0.045] p-5">
            <div className="relative mx-auto size-36">
              <div className="grid size-36 place-items-center overflow-hidden rounded-full border border-cyan-200/55 bg-slate-900 text-4xl font-black text-cyan-100 shadow-[0_0_60px_rgba(34,211,238,0.14)]">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={profile.avatar_url}
                />
              ) : (
                avatarInitials
              )}
              </div>
              <span className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-full border border-slate-950 bg-gradient-to-br from-lime-300 to-cyan-300 text-slate-950">
                <UserRound size={18} />
              </span>
            </div>

            <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
              Public profile
            </p>
            <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight">
              {loading
                ? "Memuat..."
                : displayName}
            </h1>
            <p className="mt-2 text-center text-sm text-slate-400">
              {profile?.username
                ? `@${profile.username}`
                : "Belum ada username"}
            </p>
            {profile ? (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {getExperienceBadges(profile).map((badge) => (
                  <span
                    className={`user-type-badge user-type-badge--${badge.tone}`}
                    key={`${badge.tone}-${badge.label}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {isOwnProfile ? (
            <button
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-gradient-to-r from-lime-300 via-emerald-200 to-cyan-300 px-4 text-sm font-black uppercase tracking-[0.04em] text-slate-950 shadow-[0_14px_35px_rgba(34,211,238,0.22)] ring-1 ring-slate-950/10 transition hover:-translate-y-0.5 hover:brightness-110"
              type="button"
              onClick={() =>
                router.push(
                  "/settings/profile",
                )
              }
            >
              <Settings size={16} />
              Edit profil
            </button>
          ) : null}
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/72 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
          {error ? (
            <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {!error && profile ? (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-cyan-300/12 bg-cyan-300/5 p-5">
                  <ShieldCheck
                    className="text-cyan-200"
                    size={18}
                  />
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Account role
                  </p>
                  <strong className="mt-1 block text-lg">
                    {profile.account_role}
                  </strong>
                  <span className="mt-2 block text-xs text-slate-400">
                    Authorization, bukan stakeholder mode.
                  </span>
                </div>

                <div className="rounded-[1.5rem] border border-cyan-300/12 bg-cyan-300/5 p-5">
                  <UserRound
                    className="text-cyan-200"
                    size={18}
                  />
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Jenis user
                  </p>
                  <strong className="mt-1 block text-lg">
                    {getPrimaryExperienceLabel(profile)}
                  </strong>
                  <span className="mt-2 block text-xs text-slate-400">
                    General/Commuter selalu aktif; mode lain opsional.
                  </span>
                </div>

                <div className="rounded-[1.5rem] border border-cyan-300/12 bg-cyan-300/5 p-5">
                  <CalendarDays
                    className="text-cyan-200"
                    size={18}
                  />
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Bergabung
                  </p>
                  <strong className="mt-1 block text-lg">
                    {formatJoinDate(
                      profile.created_at,
                    )}
                  </strong>
                </div>
              </div>

              <article className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  Halaman pengalaman
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {getExperienceBadges(profile)
                    .filter((badge) => badge.tone !== "admin")
                    .map((badge) => (
                      <div
                        className={`rounded-2xl border p-4 user-profile-mode user-profile-mode--${badge.tone}`}
                        key={badge.tone}
                      >
                        <strong>{badge.label}</strong>
                        <p>
                          {badge.tone === "general"
                            ? "Akses peta, pencarian, rute, community, dan eksplorasi area."
                            : badge.tone === "umkm"
                              ? "Konteks usaha lokal, merchant, promosi, dan analisis sekitar lokasi."
                              : badge.tone === "investor"
                                ? "Konteks peluang area, kelayakan lokasi, dan potensi investasi."
                                : "Konteks pemerintahan, layanan kota, dan agregasi wilayah."}
                        </p>
                      </div>
                    ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  Bio
                </p>
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                  {profile.bio ||
                    "User ini belum menambahkan bio."}
                </p>
              </article>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-400">
              Memuat profil user...
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}

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
    <main className="min-h-screen bg-[#050a10] text-slate-100">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[360px_1fr]">
        <aside className="border border-cyan-300/15 bg-slate-950/72 p-6">
          <button
            className="inline-flex h-10 items-center gap-2 border border-cyan-300/20 px-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300/70"
            type="button"
            onClick={() => router.back()}
          >
            <ArrowLeft size={16} />
            Kembali
          </button>

          <div className="mt-10 grid place-items-start">
            <div className="grid h-28 w-28 place-items-center overflow-hidden border border-cyan-300/55 bg-cyan-300/10 text-3xl font-black text-cyan-200">
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

            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
              Public profile
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              {loading
                ? "Memuat..."
                : displayName}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {profile?.username
                ? `@${profile.username}`
                : "Belum ada username"}
            </p>
            {profile ? (
              <div className="mt-5 flex flex-wrap gap-2">
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
              className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 bg-gradient-to-r from-lime-300 to-cyan-300 px-4 text-sm font-black text-slate-950"
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

        <section className="border border-cyan-300/15 bg-slate-950/64 p-6">
          {error ? (
            <p className="border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {!error && profile ? (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-cyan-300/12 bg-cyan-300/5 p-4">
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

                <div className="border border-cyan-300/12 bg-cyan-300/5 p-4">
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

                <div className="border border-cyan-300/12 bg-cyan-300/5 p-4">
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

              <article className="border border-cyan-300/12 bg-slate-950/70 p-6">
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

              <article className="border border-cyan-300/12 bg-slate-950/70 p-6">
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

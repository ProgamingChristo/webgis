"use client";

import {
  ArrowLeft,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

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
import { GetraAppShell } from "@/src/components/getra-ui";

function labelForProfile(
  profile: PublicProfile,
) {
  return (
    profile.display_name ||
    profile.username ||
    "User GETRA"
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] =
    useState("");
  const [profiles, setProfiles] =
    useState<PublicProfile[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timeout =
      window.setTimeout(() => {
        setLoading(true);
        setError(null);

        void profileService
          .listPublicProfiles(search)
          .then((result) => {
            if (!active) return;
            setProfiles(result.profiles);
          })
          .catch((loadError) => {
            if (!active) return;
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Direktori user gagal dimuat.",
            );
          })
          .finally(() => {
            if (active) {
              setLoading(false);
            }
          });
      }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [search]);

  return (
    <GetraAppShell
      description="Temukan profil publik pengguna GETRA, jenis pengalaman yang aktif, dan trust score komunitas."
      eyebrow="GETRA Users"
      title="Direktori profil"
      tone="profile"
    >
      <section className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-cyan-300/15 bg-slate-950/70 p-5">
          <div>
            <button
              className="mb-5 inline-flex h-10 items-center gap-2 border border-cyan-300/20 px-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300/70"
              type="button"
              onClick={() => router.push("/app")}
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
              GETRA users
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              Direktori profil
            </h1>
          </div>

          <label className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200"
              size={18}
            />
            <input
              className="getra-input pl-12"
              placeholder="Cari nama atau username"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>
        </div>

        {error ? (
          <p className="mt-6 border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <Link
              className="group border border-cyan-300/12 bg-slate-950/70 p-5 transition hover:border-cyan-300/55 hover:bg-cyan-300/5"
              href={`/users/${profile.id}`}
              key={profile.id}
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center overflow-hidden border border-cyan-300/45 bg-cyan-300/10 text-sm font-black text-cyan-200">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={profile.avatar_url}
                    />
                  ) : (
                    <UserRound size={22} />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold group-hover:text-cyan-100">
                    {labelForProfile(profile)}
                  </h2>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {profile.username
                      ? `@${profile.username}`
                      : "Belum ada username"}
                  </p>
                  <p className="mt-1 truncate text-[11px] font-bold text-cyan-200">
                    {getPrimaryExperienceLabel(profile)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {getExperienceBadges(profile).map((badge) => (
                  <span
                    className={`user-type-badge user-type-badge--${badge.tone}`}
                    key={`${profile.id}-${badge.tone}-${badge.label}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>

              <p className="mt-4 line-clamp-3 min-h-16 text-sm leading-6 text-slate-400">
                {profile.bio ||
                  "Pengguna GETRA belum menambahkan bio."}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-cyan-300/10 pt-4 text-xs">
                <span className="inline-flex items-center gap-2 text-cyan-200">
                  <ShieldCheck size={14} />
                  Role {profile.account_role}
                </span>
                <span className="font-black text-lime-200">
                  Trust {profile.trust_score}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {!loading && profiles.length === 0 ? (
          <p className="mt-10 border border-cyan-300/15 bg-slate-950/70 p-8 text-center text-sm text-slate-400">
            Tidak ada profil yang cocok.
          </p>
        ) : null}

        {loading ? (
          <p className="mt-10 text-sm text-slate-400">
            Memuat direktori user...
          </p>
        ) : null}
      </section>
    </GetraAppShell>
  );
}

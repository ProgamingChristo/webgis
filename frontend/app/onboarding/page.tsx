"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Landmark,
  MapPinned,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { safeReturnPath } from "@/src/lib/auth-return-path";
import { authenticatedFetch } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
import { getUserFacingApiError } from "@/src/lib/user-facing-api-error";
import styles from "./onboarding.module.css";

const STAKEHOLDER_MODES = [
  {
    id: "UMKM",
    label: "UMKM",
    desc: "Analisis potensi pasar, akses pelanggan, dan aktivitas usaha lokal.",
    icon: Store,
  },
  {
    id: "INVESTOR",
    label: "Investor",
    desc: "Konteks peluang lokasi, konektivitas, dan kelayakan area.",
    icon: BriefcaseBusiness,
  },
  {
    id: "GOVERNMENT",
    label: "Pemerintah",
    desc: "Konteks kebijakan, area layanan, dan agregat kota.",
    icon: Landmark,
  },
] as const;

type StakeholderMode =
  (typeof STAKEHOLDER_MODES)[number]["id"];

function OnboardingMapArtwork() {
  return (
    <svg
      className={styles.mapArtwork}
      viewBox="0 0 560 360"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="560" height="360" fill="#eaf6f5" />
      <path d="M0 0H144C163 49 138 93 157 133C178 177 220 188 210 239C199 289 146 310 132 360H0V0Z" fill="#bee7ef" />
      <path d="M560 0H458C434 44 448 89 416 123C389 153 348 181 364 229C381 281 433 286 442 360H560V0Z" fill="#d4edcf" />
      <g stroke="#fff" strokeLinecap="round" strokeWidth="14">
        <path d="M23 94C116 104 168 139 244 125C337 108 377 57 521 78" />
        <path d="M14 291C110 264 167 242 255 266C347 291 417 331 539 303" />
        <path d="M153 8C143 79 194 135 181 202C169 260 129 291 154 352" />
        <path d="M391 6C365 73 379 131 410 196C438 255 464 287 487 355" />
      </g>
      <g stroke="#cfdbdd" strokeLinecap="round" strokeWidth="4">
        <path d="M0 170C105 186 183 148 266 101C344 56 416 66 559 42" />
        <path d="M5 231C95 212 159 202 248 220C342 239 423 274 558 240" />
        <path d="M78 0C88 84 55 132 84 200C106 251 156 280 136 360" />
        <path d="M305 0C283 75 306 122 330 174C361 242 324 295 349 360" />
      </g>
      <path d="M204 85C264 51 344 85 365 142C386 201 348 257 291 264C233 271 184 234 174 179C167 134 178 103 204 85Z" fill="#62d6c8" fillOpacity=".23" stroke="#42b9ac" strokeDasharray="7 7" strokeWidth="3" />
      <path d="M68 160C143 170 204 191 273 218C336 242 399 245 498 153" stroke="#f2bb37" strokeLinecap="round" strokeWidth="8" />
      <path d="M145 103C197 128 245 166 300 211C344 247 385 275 445 322" stroke="#118ab2" strokeLinecap="round" strokeWidth="9" />
      <path d="M145 103C197 128 245 166 300 211C344 247 385 275 445 322" stroke="#fff" strokeDasharray="3 11" strokeLinecap="round" strokeOpacity=".75" strokeWidth="3" />
      <g fill="#fff">
        <circle cx="145" cy="103" r="13" />
        <circle cx="300" cy="211" r="12" />
        <circle cx="445" cy="322" r="13" />
      </g>
      <circle cx="145" cy="103" r="8" fill="#118ab2" />
      <circle cx="300" cy="211" r="7" fill="#118ab2" />
      <circle cx="445" cy="322" r="8" fill="#367e77" />
    </svg>
  );
}

export default function OnboardingPage() {
  const { context, refresh } = useAuth();
  const editing = Boolean(context?.profile?.onboarding_complete);
  const router =
    useRouter();

  const [
    selectedModes,
    setSelectedModes,
  ] =
    useState<StakeholderMode[]>(() => [...(context?.stakeholder_modes ?? [])]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    errorMsg,
    setErrorMsg,
  ] =
    useState<string | null>(null);

  const toggleMode = (
    mode: StakeholderMode,
  ) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) {
        return prev.filter((item) => item !== mode);
      }

      return [
        ...prev,
        mode,
      ];
    });
  };

  const handleSubmit =
    async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res =
          await authenticatedFetch(
            getGetraApiUrl("/api/onboarding"),
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  modes:
                    selectedModes,
                }),
            },
          );

        const json =
          await res.json();

        if (
          !res.ok ||
          !json.success
        ) {
          throw new Error(getUserFacingApiError({
            code: json.error?.code,
            status: res.status,
            fallback: "Pilihan Anda belum dapat disimpan. Coba lagi.",
          }));
        }

        await refresh();
        router.replace(safeReturnPath(new URLSearchParams(window.location.search).get("returnTo")));
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Pilihan Anda belum dapat disimpan. Coba lagi.",
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>
              <Image
                src="/brand/getra-figma-mark.svg"
                alt=""
                width={22}
                height={22}
              />
            </span>

            <div>
              <strong>
                GETRA
              </strong>

              <span>
                Peta Cerdas Kota
              </span>
            </div>
          </div>

          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              Pengaturan akun
            </span>

            <h1>
              Pilih cara GETRA membaca kota untuk kamu.
            </h1>

            <p>
              Akses peta, pencarian, transit, UMKM, komunitas, dan
              eksplorasi area langsung aktif. Pengalaman tambahan hanya menyesuaikan
              sudut pandang analisis.
            </p>
          </div>

          <OnboardingMapArtwork />

          <div className={styles.signalGrid}>
            <div>
              <MapPinned size={18} />
              <span>
                Peta & transit
              </span>
            </div>

            <div>
              <Store size={18} />
              <span>
                Usaha lokal
              </span>
            </div>

            <div>
              <ShieldCheck size={18} />
              <span>
                Akses aman
              </span>
            </div>
          </div>
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.header}>
            <span className={styles.eyebrow}>
              Pengalaman GETRA
            </span>

            <h2>
              {editing ? "Kelola pengalaman" : "Selesaikan pengaturan"}
            </h2>

            <p>
              Pengalaman umum selalu aktif. Tambahkan pengalaman khusus bila Anda ingin
              konteks analisis yang lebih spesifik.
            </p>
          </div>

          <section
            className={styles.generalCard}
            aria-label="Akses umum"
          >
            <div className={styles.generalIcon}>
              <MapPinned size={20} />
            </div>

            <div>
              <span className={styles.generalEyebrow}>
                Aktif untuk semua pengguna
              </span>

              <h3>
                Perjalanan Umum
              </h3>

              <p>
                Gunakan peta, pencarian, rute, dan fitur umum GETRA.
              </p>
            </div>

            <span className={styles.generalBadge}>
              Utama
            </span>
          </section>

          <div className={styles.modeHeader}>
            <h3>
              Tambahkan pengalaman sesuai kebutuhan
            </h3>

            <span>
              {selectedModes.length} / 3 dipilih
            </span>
          </div>

          <div className={styles.modeGrid}>
            {STAKEHOLDER_MODES.map((mode) => {
              const isSelected =
                selectedModes.includes(mode.id);

              const Icon =
                mode.icon;

              return (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={isSelected}
                  className={`${styles.modeCard} ${isSelected ? styles.selected : ""}`}
                  onClick={() => toggleMode(mode.id)}
                >
                  <span className={styles.modeIcon}>
                    <Icon size={19} />
                  </span>

                  <span className={styles.modeText}>
                    <strong>
                      {mode.label}
                    </strong>

                    <small>
                      {mode.desc}
                    </small>
                  </span>

                  <span className={styles.checkbox}>
                    {isSelected ? (
                      <Check size={14} strokeWidth={3} />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {errorMsg ? (
            <p className={styles.error}>
              {errorMsg}
            </p>
          ) : null}

          <div className={styles.footer}>
            {editing ? <Link className={styles.skipBtn} href="/settings/profile">Batal</Link> : <button
              className={styles.skipBtn}
              onClick={() => handleSubmit()}
              disabled={loading}
            >
              Lewati, gunakan pengalaman umum
            </button>}

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={loading}
            >
              <span>
                {loading
                  ? "Menyimpan..."
                  : selectedModes.length === 0
                    ? "Lanjutkan dengan pengalaman umum"
                    : "Simpan pengalaman"}
              </span>

              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

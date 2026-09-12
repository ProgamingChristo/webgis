"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Globe2,
  Landmark,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
import { GetraLogo } from "@/src/components/getra-ui";
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

export default function OnboardingPage() {
  const router =
    useRouter();

  const [
    selectedModes,
    setSelectedModes,
  ] =
    useState<StakeholderMode[]>([]);

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
          throw new Error(
            json.error?.message ||
            "Gagal menyimpan onboarding",
          );
        }

        router.replace("/app");
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Gagal menyimpan onboarding",
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <main className={styles.page}>
      <Image
        alt=""
        className={styles.backdrop}
        fill
        preload
        sizes="100vw"
        src="/images/onboarding/getra-orbit-earth.png"
      />

      <div className={styles.backdropOverlay} aria-hidden="true" />
      <div className={styles.aurora} aria-hidden="true" />

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <GetraLogo className={styles.brandLogo} />
        </div>

        <div className={styles.progress} aria-label="Progres onboarding">
          <span className={styles.progressDot} />
          <span>Account setup</span>
          <strong>01 / 01</strong>
        </div>
      </header>

      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.heroCopy}>
            <span className={styles.heroBadge}>
              <Sparkles size={14} />
              Spatial intelligence, personalized
            </span>

            <h1>
              Pilih cara GETRA membaca
              <span> kota untuk kamu.</span>
            </h1>

            <p>
              Bangun pengalaman kota yang relevan untuk perjalanan, bisnis,
              investasi, atau pelayanan publik—semuanya dari satu peta.
            </p>
          </div>

          <div className={styles.signalGrid} aria-label="Kapabilitas GETRA">
            <div>
              <MapPinned size={17} />
              <span>Peta & transit</span>
            </div>

            <div>
              <Store size={17} />
              <span>Retail lokal</span>
            </div>

            <div>
              <Globe2 size={17} />
              <span>Spatial insight</span>
            </div>
          </div>

          <div className={styles.heroNote}>
            <ShieldCheck size={16} />
            Mode dapat diubah kembali setelah onboarding selesai.
          </div>
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.header}>
            <span className={styles.eyebrow}>
              Personalize your workspace
            </span>

            <h2>
              Mulai dari kebutuhanmu
            </h2>

            <p>
              General selalu aktif. Pilih satu atau beberapa perspektif untuk
              menyesuaikan insight di dashboard GETRA.
            </p>
          </div>

          <section
            className={styles.generalCard}
            aria-label="General access"
          >
            <div className={styles.generalIcon}>
              <MapPinned size={20} />
            </div>

            <div>
              <span className={styles.generalEyebrow}>
                Core experience
              </span>

              <h3>
                Komuter / General
              </h3>

              <p>
                Peta, pencarian, transit, UMKM/POI, dan eksplorasi area.
              </p>
            </div>

            <span className={styles.generalBadge}>
              <Check size={12} strokeWidth={3} />
              Aktif
            </span>
          </section>

          <div className={styles.modeHeader}>
            <h3>
              Tambahkan mode sesuai kebutuhan
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
                  className={`${styles.modeCard} ${isSelected ? styles.selected : ""}`}
                  aria-pressed={isSelected}
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
            <button
              className={styles.skipBtn}
              onClick={() => handleSubmit()}
              disabled={loading}
            >
              Lewati, gunakan General
            </button>

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={loading}
            >
              <span>
                {loading
                  ? "Menyimpan..."
                  : selectedModes.length === 0
                    ? "Lanjutkan dengan General"
                    : "Simpan pengalaman"}
              </span>

              <ArrowRight size={16} />
            </button>
          </div>

          <div className={styles.securityNote}>
            <LockKeyhole size={13} />
            Pilihan tersimpan aman pada profil GETRA kamu.
          </div>
        </section>
      </section>
    </main>
  );
}

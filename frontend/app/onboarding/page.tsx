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
import { authenticatedFetch } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
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
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>
              G
            </span>

            <div>
              <strong>
                GETRA
              </strong>

              <span>
                Geo-Enabled Transit & Retail Analytics
              </span>
            </div>
          </div>

          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              Account setup
            </span>

            <h1>
              Pilih cara GETRA membaca kota untuk kamu.
            </h1>

            <p>
              Akses peta, pencarian, transit, UMKM/POI, community, dan
              eksplorasi area langsung aktif. Mode tambahan hanya menyesuaikan
              sudut pandang analisis.
            </p>
          </div>

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
                Retail lokal
              </span>
            </div>

            <div>
              <ShieldCheck size={18} />
              <span>
                USER by default
              </span>
            </div>
          </div>
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.header}>
            <span className={styles.eyebrow}>
              GETRA experience
            </span>

            <h2>
              Selesaikan onboarding
            </h2>

            <p>
              General selalu aktif. Tambahkan mode khusus bila kamu ingin
              konteks analisis yang lebih spesifik.
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
                Aktif untuk semua pengguna
              </span>

              <h3>
                Komuter / General
              </h3>

              <p>
                Baseline GETRA. Tidak dikirim dan tidak disimpan sebagai
                stakeholder mode.
              </p>
            </div>

            <span className={styles.generalBadge}>
              Default
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
        </section>
      </section>
    </main>
  );
}

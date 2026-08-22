"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/src/lib/auth-client";
import styles from "./onboarding.module.css";

const STAKEHOLDER_MODES = [
  { id: "UMKM", label: "UMKM Mode", desc: "Akses data potensi pasar dan rute logistik lokal" },
  { id: "INVESTOR", label: "Investor Mode", desc: "Akses data ROI spasial dan kelayakan transit" },
  { id: "GOVERNMENT", label: "Government Mode", desc: "Akses dashboard kebijakan dan agregat transit" },
] as const;

type StakeholderMode = (typeof STAKEHOLDER_MODES)[number]["id"];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedModes, setSelectedModes] = useState<StakeholderMode[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleMode = (mode: StakeholderMode) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) return prev.filter((m) => m !== mode);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, mode];
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modes: selectedModes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Gagal menyimpan onboarding");
      
      router.replace("/");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Sesuaikan Pengalaman GETRA</h1>
        <p className={styles.subtitle}>
          Akun kamu telah berhasil dibuat! Sebagai pengguna General, kamu sudah dapat mengakses workspace.
          Pilih hingga 3 mode tambahan di bawah ini untuk membuka fitur khusus.
        </p>

        <div className={styles.modeList}>
          {STAKEHOLDER_MODES.map((mode) => {
            const isSelected = selectedModes.includes(mode.id);
            return (
              <button
                key={mode.id}
                type="button"
                className={`${styles.modeCard} ${isSelected ? styles.selected : ""}`}
                onClick={() => toggleMode(mode.id)}
              >
                <div className={styles.modeHeader}>
                  <h3 className={styles.modeTitle}>{mode.label}</h3>
                  <div className={styles.checkbox}>
                    {isSelected && <span className={styles.checkIcon}>✓</span>}
                  </div>
                </div>
                <p className={styles.modeDesc}>{mode.desc}</p>
              </button>
            );
          })}
        </div>

        {errorMsg && <p className={styles.error}>{errorMsg}</p>}

        <div className={styles.footer}>
          <button className={styles.skipBtn} onClick={() => handleSubmit()} disabled={loading}>
            Lewati, gunakan General Access
          </button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading || selectedModes.length === 0}>
            {loading ? "Menyimpan..." : "Lanjutkan"}
          </button>
        </div>
      </div>
    </main>
  );
}

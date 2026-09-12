"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { persistAuthSession, type BrowserAuthSession } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";

import styles from "../auth.module.css";

const DEV_LOGIN_EMAIL = "getra.admin.test@example.com";
const isDevelopment = process.env.NODE_ENV === "development";

interface LoginResponse {
  success: boolean;
  data?: {
    session?: BrowserAuthSession;
    profile?: { onboarding_complete?: boolean } | null;
  };
  error?: { message?: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(isDevelopment ? DEV_LOGIN_EMAIL : "");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await fetch(getGetraApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = (await response.json()) as LoginResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || "Login gagal. Periksa email dan password.");
      }

      const session = json.data?.session;
      if (!session?.access_token || !session.refresh_token) {
        throw new Error("Session login tidak tersedia.");
      }

      await persistAuthSession(session);
      router.replace(json.data?.profile?.onboarding_complete ? "/app" : "/onboarding");
      router.refresh();
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : "Login gagal.";
      setErrorMessage(
        email.trim().endsWith("@example.co")
          ? "Email fixture kurang huruf m: gunakan @example.com, bukan @example.co."
          : rawMessage === "Failed to fetch"
            ? "Backend GETRA belum bisa dijangkau. Periksa NEXT_PUBLIC_GETRA_API_URL dan pastikan backend aktif."
            : rawMessage,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label="Masuk ke GETRA">
        <aside className={styles.hero} aria-label="GETRA overview">
          <div className={styles.heroContent}>
            <h1>Kota lebih mudah dipahami.</h1>
            <p>Temukan tempat, rute, dan peluang di sekitar Anda dengan lebih mudah.</p>
          </div>
        </aside>

        <section className={styles.formSide} aria-labelledby="login-title">
          <div className={styles.card}>
            <Link href="/" className={styles.backLink}>
              <img src="/images/auth/back-arrow.png" width="16" height="16" alt="" aria-hidden="true" />
              Kembali ke Beranda
            </Link>

            <header className={styles.cardHeader}>
              <span className={styles.brandLogo} aria-label="GETRA"><img src="/brand/getra-logo-final.png" alt="GETRA" /></span>
              <h2 id="login-title">Selamat Datang Kembali</h2>
              <p>Masuk untuk melanjutkan eksplorasi Anda di GETRA.</p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <div className={styles.inputWrap}>
                  <img src="/images/auth/email.png" width="16" height="16" alt="" aria-hidden="true" />
                  <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" autoComplete="email" required />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="password">Kata Sandi</label>
                <div className={styles.inputWrap}>
                  <img src="/images/auth/lock.png" width="16" height="16" alt="" aria-hidden="true" />
                  <input id="password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" autoComplete="current-password" required />
                  <button className={styles.passwordToggle} type="button" onClick={() => setPasswordVisible((value) => !value)} aria-label={passwordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={passwordVisible}>
                    <img src="/images/auth/eye.png" width="16" height="16" alt="" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className={styles.options}>
                <label className={styles.remember}><input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} /> <span>Ingat saya di perangkat ini</span></label>
                <span className={styles.forgotPassword}>Lupa kata sandi?</span>
              </div>

              {errorMessage ? <p className={styles.error} role="alert">{errorMessage}</p> : null}

              <button className={styles.submitButton} type="submit" disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
            </form>

            <div className={styles.divider}><span>atau masuk dengan</span></div>
            <button className={styles.googleButton} type="button" aria-label="Masuk dengan Google">
              <img src="/images/auth/google-g.png" width="20" height="20" alt="" aria-hidden="true" /> Masuk dengan Google
            </button>

            <p className={styles.switchText}>Belum punya akun? <Link href="/signup">Daftar sekarang</Link></p>
            <footer className={styles.legal}><span>Privasi</span><i>·</i><span>Ketentuan</span></footer>
          </div>
        </section>
      </section>
    </main>
  );
}

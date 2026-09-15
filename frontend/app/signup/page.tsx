"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  getUserContext,
  persistAuthSession,
  type BrowserAuthSession,
} from "@/src/lib/auth-client";
import { GetraLogo } from "@/src/components/getra-ui";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
import { getUserFacingApiError } from "@/src/lib/user-facing-api-error";
import {
  evaluatePasswordStrength,
  isCommonPassword,
  MIN_PASSWORD_LENGTH,
} from "@/src/lib/password-policy";

import styles from "../auth.module.css";

interface RegisterResponse {
  success: boolean;
  data?: {
    session?: BrowserAuthSession | null;
    user?: {
      id?: string | null;
      email?: string | null;
    };
    profile?: {
      display_name?: string | null;
      account_role?: "USER";
      onboarding_complete?: boolean;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(password),
    [password],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Minimum password length check
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }

    // 2. Common password detection
    if (isCommonPassword(password)) {
      setErrorMessage("Password terlalu mudah ditebak.");
      return;
    }

    // 3. Password confirmation mismatch check
    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(getGetraApiUrl("/api/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          display_name: displayName.trim(),
        }),
      });

      const json = (await response.json()) as RegisterResponse;

      if (!response.ok || !json.success) {
        throw new Error(
          getUserFacingApiError({
            code: json.error?.code,
            status: response.status,
            fallback: "Pendaftaran belum dapat diselesaikan. Coba lagi.",
          }),
        );
      }

      const session = json.data?.session;

      if (session?.access_token && session.refresh_token) {
        setSuccessMessage("Akun berhasil dibuat. Menyiapkan onboarding GETRA...");
        await persistAuthSession(session);

        const userContext = await getUserContext();

        if (!userContext?.profile) {
          throw new Error(
            "Akun dibuat, tetapi konteks GETRA belum tersedia. Coba masuk ulang.",
          );
        }

        router.replace(
          userContext.profile.onboarding_complete ? "/app" : "/onboarding",
        );
        router.refresh();
        return;
      }

      throw new Error(
        "Akun belum dapat diaktifkan. Periksa email Anda atau coba masuk setelah beberapa saat.",
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.name !== "TypeError"
          ? error.message
          : "Layanan pendaftaran belum dapat dihubungi. Coba lagi beberapa saat nanti.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.brand}>
          <GetraLogo className={styles.brandLogo} />
        </div>

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Siapkan pengalaman GETRA Anda</span>

          <h1>
            Satu akun.
            Banyak cara
            melihat kota.
          </h1>

          <p>
            Semua akun mendapat akses untuk menjelajahi GETRA. Pengalaman tambahan
            UMKM, Investor, dan Pemerintah dapat dipilih setelah akun dibuat.
          </p>

          <div className={styles.signalRow}>
            <span className={styles.signal}>AKSES UMUM</span>
            <span className={styles.signal}>PENGALAMAN UMKM</span>
            <span className={styles.signal}>PENGALAMAN INVESTOR</span>
            <span className={styles.signal}>PENGALAMAN PEMERINTAH</span>
          </div>
        </div>

        <figure
          className={styles.mapPreview}
          aria-label="Ilustrasi peta GETRA dengan berbagai mode akses kota"
        >
          <Image
            src="/images/landing/getra-hero-smart-map.jpg"
            alt="Peta GETRA WebGIS"
            fill
            sizes="(max-width: 960px) 100vw, 580px"
            className={styles.mapPreviewImage}
          />
          <figcaption>
            <span>Ekosistem Peta Terpadu</span>
            <strong>Pilihan mode aktif setelah pendaftaran</strong>
          </figcaption>
        </figure>

        <div className={styles.heroFooter}>
          Hak akses akun dikelola secara aman oleh GETRA.
        </div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <span>Akun baru</span>
            <h2>Buat akun GETRA</h2>
            <p>
              Daftar sebagai pengguna GETRA. Pilihan mode tambahan dilakukan
              setelah proses registrasi.
            </p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="display-name">Nama</label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Nama kamu"
                autoComplete="name"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Kata sandi</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 12 karakter atau frasa sandi"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              <p className={styles.passwordPolicyHint}>
                Gunakan minimal 12 karakter. Frasa sandi yang panjang lebih aman.
                Hindari password umum, data pribadi, dan password yang pernah
                digunakan di layanan lain.
              </p>

              {password.length > 0 ? (
                <div className={styles.strengthContainer}>
                  <div className={styles.strengthBars}>
                    <div
                      className={`${styles.strengthBar} ${
                        passwordStrength.score >= 1
                          ? passwordStrength.score === 1
                            ? styles.strengthBarActiveWeak
                            : passwordStrength.score === 2
                              ? styles.strengthBarActiveFair
                              : passwordStrength.score === 3
                                ? styles.strengthBarActiveStrong
                                : styles.strengthBarActiveVeryStrong
                          : ""
                      }`}
                    />
                    <div
                      className={`${styles.strengthBar} ${
                        passwordStrength.score >= 2
                          ? passwordStrength.score === 2
                            ? styles.strengthBarActiveFair
                            : passwordStrength.score === 3
                              ? styles.strengthBarActiveStrong
                              : styles.strengthBarActiveVeryStrong
                          : ""
                      }`}
                    />
                    <div
                      className={`${styles.strengthBar} ${
                        passwordStrength.score >= 3
                          ? passwordStrength.score === 3
                            ? styles.strengthBarActiveStrong
                            : styles.strengthBarActiveVeryStrong
                          : ""
                      }`}
                    />
                    <div
                      className={`${styles.strengthBar} ${
                        passwordStrength.score >= 4
                          ? styles.strengthBarActiveVeryStrong
                          : ""
                      }`}
                    />
                  </div>

                  <div className={styles.strengthLabelRow}>
                    <span
                      className={`${styles.strengthLabel} ${
                        passwordStrength.score <= 1
                          ? styles.strengthLabelWeak
                          : passwordStrength.score === 2
                            ? styles.strengthLabelFair
                            : passwordStrength.score === 3
                              ? styles.strengthLabelStrong
                              : styles.strengthLabelVeryStrong
                      }`}
                    >
                      Kekuatan: {passwordStrength.label}
                    </span>

                    {passwordStrength.isPassphrase ? (
                      <span className={styles.strengthPassphraseBadge}>
                        ✓ Frasa Sandi
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor="confirm-password">Konfirmasi kata sandi</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Ulangi kata sandi"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Sembunyikan konfirmasi kata sandi"
                      : "Tampilkan konfirmasi kata sandi"
                  }
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <p className={styles.error}>{errorMessage}</p>
            ) : null}

            {successMessage ? (
              <p className={styles.success}>{successMessage}</p>
            ) : null}

            <button
              className={styles.submitButton}
              type="submit"
              disabled={loading}
            >
              {loading ? "Membuat akun..." : "Buat akun"}
            </button>
          </form>

          <p className={styles.switchText}>
            Sudah punya akun? <Link href="/login">Masuk</Link>
          </p>

          <p className={styles.securityNote}>
            Akun publik selalu dibuat dengan role USER. Hak akses administratif
            dikelola oleh otorisasi server GETRA.
          </p>
        </div>
      </section>
    </main>
  );
}

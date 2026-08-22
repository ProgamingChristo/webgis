"use client";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  persistAuthSession,
  type BrowserAuthSession,
} from "@/src/lib/auth-client";

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

export default function SignupPage() {
  const router =
    useRouter();

  const [
    displayName,
    setDisplayName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage(
      null,
    );

    setSuccessMessage(
      null,
    );

    setLoading(
      true,
    );

    try {
      const response =
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                email:
                  email.trim(),

                password,

                display_name:
                  displayName.trim(),
              }),
          },
        );

      const json =
        (await response.json()) as RegisterResponse;

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.error?.message ||
          "Pendaftaran gagal.",
        );
      }

      const session =
        json.data?.session;

      if (
        session?.access_token &&
        session.refresh_token
      ) {
        await persistAuthSession(
          session,
        );

        router.replace(
          "/onboarding",
        );

        router.refresh();

        return;
      }

      setSuccessMessage(
        "Akun berhasil dibuat. Periksa email kamu untuk konfirmasi akun, lalu masuk melalui halaman login.",
      );
    } catch (
      error: unknown
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pendaftaran gagal.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            G
          </div>

          <div className={styles.brandText}>
            <strong>
              GETRA
            </strong>

            <span>
              Geo-Enabled Transit & Retail Analytics
            </span>
          </div>
        </div>

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            Build your spatial profile
          </span>

          <h1>
            Satu akun.
            Banyak cara
            melihat kota.
          </h1>

          <p>
            Semua akun mendapat akses
            eksplorasi GETRA. Mode tambahan
            UMKM, Investor, dan Pemerintah
            dapat dipilih setelah akun dibuat.
          </p>

          <div className={styles.signalRow}>
            <span className={styles.signal}>
              GENERAL ACCESS
            </span>

            <span className={styles.signal}>
              UMKM MODE
            </span>

            <span className={styles.signal}>
              INVESTOR MODE
            </span>

            <span className={styles.signal}>
              GOVERNMENT MODE
            </span>
          </div>
        </div>

        <div className={styles.heroFooter}>
          Tidak ada role selector pada public signup.
        </div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <span>
              New account
            </span>

            <h2>
              Buat akun GETRA
            </h2>

            <p>
              Daftar sebagai pengguna GETRA.
              Pilihan mode tambahan dilakukan
              setelah proses registrasi.
            </p>
          </header>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <div className={styles.field}>
              <label htmlFor="display-name">
                Nama
              </label>

              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(
                  event,
                ) =>
                  setDisplayName(
                    event.target.value,
                  )
                }
                placeholder="Nama kamu"
                autoComplete="name"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="nama@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="Buat password"
                autoComplete="new-password"
                required
              />
            </div>

            {errorMessage ? (
              <p className={styles.error}>
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className={styles.success}>
                {successMessage}
              </p>
            ) : null}

            <button
              className={styles.submitButton}
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Membuat akun..."
                : "Buat akun"}
            </button>
          </form>

          <p className={styles.switchText}>
            Sudah punya akun?{" "}
            <Link href="/login">
              Masuk
            </Link>
          </p>

          <p className={styles.securityNote}>
            Akun publik selalu dibuat dengan
            account_role USER.
          </p>
        </div>
      </section>
    </main>
  );
}
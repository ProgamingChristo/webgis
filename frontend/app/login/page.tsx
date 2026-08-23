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

const DEV_LOGIN_EMAIL =
  "getra.admin.test@example.com";

const isDevelopment =
  process.env.NODE_ENV ===
  "development";

interface LoginResponse {
  success: boolean;

  data?: {
    session?: BrowserAuthSession;

    user?: {
      id?: string;
      email?: string | null;
    };

    profile?: {
      display_name?: string | null;
      avatar_url?: string | null;
      account_role?: "USER" | "ADMIN";
      onboarding_complete?: boolean;
    } | null;
  };

  error?: {
    code?: string;
    message?: string;
  };
}

export default function LoginPage() {
  const router =
    useRouter();

  const [
    email,
    setEmail,
  ] =
    useState(
      isDevelopment
        ? DEV_LOGIN_EMAIL
        : "",
    );

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

    setLoading(
      true,
    );

    try {
      const response =
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
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
              }),
          },
        );

      const json =
        (await response.json()) as LoginResponse;

      if (
        !response.ok ||
        !json.success
      ) {
        const message =
          json.error?.message ||
          "Login gagal. Periksa email dan password.";

        throw new Error(
          message === "Unauthorized"
            ? "Email atau password tidak cocok. Untuk akun dev gunakan getra.admin.test@example.com dan password fixture development."
            : message,
        );
      }

      const session =
        json.data?.session;

      if (
        !session?.access_token ||
        !session.refresh_token
      ) {
        throw new Error(
          "Session login tidak tersedia.",
        );
      }

      await persistAuthSession(
        session,
      );

      const onboardingComplete =
        json.data
          ?.profile
          ?.onboarding_complete ??
        false;

      router.replace(
        onboardingComplete
          ? "/"
          : "/onboarding",
      );

      router.refresh();
    } catch (
      error: unknown
    ) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : "Login gagal.";

      setErrorMessage(
        email.trim().endsWith(
          "@example.co",
        )
          ? "Email fixture kurang huruf m: gunakan @example.com, bukan @example.co."
          : rawMessage,
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
            Spatial intelligence platform
          </span>

          <h1>
            Akses kota,
            bisnis lokal,
            dan transit
            dalam satu peta.
          </h1>

          <p>
            Jelajahi akses transportasi,
            UMKM, pedestrian network,
            dan evidence spasial melalui
            satu workspace GETRA.
          </p>

          <div className={styles.signalRow}>
            <span className={styles.signal}>
              TRANSIT
            </span>

            <span className={styles.signal}>
              UMKM
            </span>

            <span className={styles.signal}>
              PEDESTRIAN
            </span>

            <span className={styles.signal}>
              COMMUNITY DATA
            </span>
          </div>
        </div>

        <div className={styles.heroFooter}>
          GETRA · Geo-Enabled Transit & Retail Analytics
        </div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <span>
              Account access
            </span>

            <h2>
              Masuk ke GETRA
            </h2>

            <p>
              Gunakan akun GETRA untuk
              membuka workspace dan fitur
              sesuai akses akun kamu.
            </p>
          </header>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
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
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
              />
            </div>

            {errorMessage ? (
              <p className={styles.error}>
                {errorMessage}
              </p>
            ) : null}

            <button
              className={styles.submitButton}
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Memproses..."
                : "Masuk"}
            </button>
          </form>

          <p className={styles.switchText}>
            Belum punya akun?{" "}
            <Link href="/signup">
              Daftar GETRA
            </Link>
          </p>

          <p className={styles.securityNote}>
            Session dikelola melalui
            Supabase Authentication.
          </p>
        </div>
      </section>
    </main>
  );
}

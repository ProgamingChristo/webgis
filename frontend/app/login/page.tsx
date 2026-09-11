"use client";
import { postLoginPath } from "@/src/lib/auth-return-path";

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
import Image from "next/image";
import { GetraLogo } from "@/src/components/getra-ui";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
import { getUserFacingApiError } from "@/src/lib/user-facing-api-error";

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
          getGetraApiUrl("/api/auth/login"),
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
        throw new Error(
          json.error?.code === "UNAUTHORIZED"
            ? "Email atau kata sandi tidak cocok."
            : getUserFacingApiError({
                code: json.error?.code,
                status: response.status,
                fallback: "Belum dapat masuk. Periksa kembali informasi Anda.",
              }),
        );
      }

      const session =
        json.data?.session;

      if (
        !session?.access_token ||
        !session.refresh_token
      ) {
        throw new Error(
          "Sesi belum dapat dibuat. Silakan coba masuk kembali.",
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
        postLoginPath(window.location.search, onboardingComplete),
      );

      router.refresh();
    } catch (
      error: unknown
    ) {
      const safeMessage =
        error instanceof Error && error.name !== "TypeError"
          ? error.message
          : "Layanan masuk belum dapat dihubungi. Coba lagi beberapa saat nanti.";

      setErrorMessage(
        email.trim().endsWith(
          "@example.co",
        )
          ? "Periksa kembali alamat email Anda."
          : safeMessage,
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
          <GetraLogo className={styles.brandLogo} />
        </div>

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            WebGIS untuk mobilitas dan UMKM
          </span>

          <h1>
            Jelajahi kota lebih mudah.
            <span>
              Temukan tempat, rute, dan usaha lokal.
            </span>
          </h1>

          <p>
            Masuk untuk melanjutkan pencarian tempat, melihat rute,
            memahami akses sekitar, dan menemukan usaha lokal dalam satu peta.
          </p>

          <div className={styles.signalRow}>
            <span className={styles.signal}>
              CARI TEMPAT
            </span>

            <span className={styles.signal}>
              RUTE JALAN KAKI
            </span>

            <span className={styles.signal}>
              USAHA LOKAL
            </span>
          </div>
        </div>

        <figure
          className={styles.mapPreview}
          aria-label="Ilustrasi peta GETRA berisi transit, rute pejalan kaki, dan usaha lokal"
        >
          <Image
            src="/images/landing/getra-hero-smart-map.jpg"
            alt="Peta GETRA WebGIS"
            fill
            sizes="(max-width: 960px) 100vw, 580px"
            className={styles.mapPreviewImage}
          />
          <figcaption>
            <span>Peta sebagai titik awal</span>
            <strong>Transit, rute, dan usaha lokal</strong>
          </figcaption>
        </figure>

        <div className={styles.heroFooter}>
          GETRA · Peta Transit dan Usaha
        </div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <span>
              Akses akun
            </span>

            <h2>
              Masuk ke GETRA
            </h2>

            <p>
              Masuk untuk membuka peta, rute, dan fitur yang sesuai dengan akses akun Anda.
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
                Kata sandi
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
                placeholder="Masukkan kata sandi"
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
              Daftar sekarang
            </Link>
          </p>

          <p className={styles.securityNote}>
            Sesi akun dikelola secara aman.
          </p>
        </div>
      </section>
    </main>
  );
}

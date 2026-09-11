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
  getUserContext,
  persistAuthSession,
  type BrowserAuthSession,
} from "@/src/lib/auth-client";
import Image from "next/image";
import { GetraLogo } from "@/src/components/getra-ui";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
import { getUserFacingApiError } from "@/src/lib/user-facing-api-error";

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
          getGetraApiUrl("/api/auth/register"),
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
        throw new Error(getUserFacingApiError({
          code: json.error?.code,
          status: response.status,
          fallback: "Pendaftaran belum dapat diselesaikan. Coba lagi.",
        }));
      }

      const session =
        json.data?.session;

      if (
        session?.access_token &&
        session.refresh_token
      ) {
        setSuccessMessage(
          "Akun berhasil dibuat. Menyiapkan onboarding GETRA...",
        );

        await persistAuthSession(
          session,
        );

        const userContext =
          await getUserContext();

        if (!userContext?.profile) {
          throw new Error(
            "Akun dibuat, tetapi konteks GETRA belum tersedia. Coba masuk ulang.",
          );
        }

        router.replace(
          userContext.profile.onboarding_complete
            ? "/app"
            : "/onboarding",
        );

        router.refresh();

        return;
      }

      throw new Error(
        "Akun belum dapat diaktifkan. Periksa email Anda atau coba masuk setelah beberapa saat.",
      );
    } catch (
      error: unknown
    ) {
      setErrorMessage(
        error instanceof Error && error.name !== "TypeError"
          ? error.message
          : "Layanan pendaftaran belum dapat dihubungi. Coba lagi beberapa saat nanti.",
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
            Siapkan pengalaman GETRA Anda
          </span>

          <h1>
            Satu akun.
            Banyak cara
            melihat kota.
          </h1>

          <p>
            Semua akun mendapat akses
            untuk menjelajahi GETRA. Pengalaman tambahan
            UMKM, Investor, dan Pemerintah
            dapat dipilih setelah akun dibuat.
          </p>

          <div className={styles.signalRow}>
            <span className={styles.signal}>
              AKSES UMUM
            </span>

            <span className={styles.signal}>
              PENGALAMAN UMKM
            </span>

            <span className={styles.signal}>
              PENGALAMAN INVESTOR
            </span>

            <span className={styles.signal}>
              PENGALAMAN PEMERINTAH
            </span>
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
            <span>
              Akun baru
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

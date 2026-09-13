"use client";

import { Loader2 } from "lucide-react";
import { GetraLogo } from "./getra-logo";

export interface GetraAppSkeletonProps {
  status?: "BOOTSTRAPPING" | "ERROR";
  errorMessage?: string;
  onRetry?: () => void;
}

export function GetraAppSkeleton({
  status = "BOOTSTRAPPING",
  errorMessage,
  onRetry,
}: GetraAppSkeletonProps) {
  const isError = status === "ERROR";

  return (
    <div
      className="getra-bootstrap-shell"
      role={isError ? "alert" : "status"}
      aria-live="polite"
      aria-busy={!isError}
    >
      {/* 1. Header Skeleton */}
      <header className="getra-bootstrap-header" aria-label="Memuat GETRA">
        <div className="getra-bootstrap-header__brand">
          <GetraLogo className="getra-bootstrap-header__logo" />
        </div>

        <div className="getra-bootstrap-header__nav" aria-hidden="true">
          <span className="getra-skeleton-pill getra-skeleton-pill--active" />
          <span className="getra-skeleton-pill" />
          <span className="getra-skeleton-pill" />
        </div>

        <div className="getra-bootstrap-header__user" aria-hidden="true">
          <span className="getra-skeleton-circle" />
          <span className="getra-skeleton-line getra-skeleton-line--short" />
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <main className="getra-bootstrap-workspace">
        {/* Left Sidebar Skeleton */}
        <aside className="getra-bootstrap-sidebar" aria-hidden="true">
          <div className="getra-bootstrap-sidebar__search">
            <div className="getra-skeleton-box getra-skeleton-box--search" />
          </div>

          <div className="getra-bootstrap-sidebar__chips">
            <span className="getra-skeleton-chip" />
            <span className="getra-skeleton-chip" />
            <span className="getra-skeleton-chip" />
            <span className="getra-skeleton-chip" />
          </div>

          <div className="getra-bootstrap-sidebar__list">
            <div className="getra-skeleton-card">
              <div className="getra-skeleton-line getra-skeleton-line--title" />
              <div className="getra-skeleton-line getra-skeleton-line--meta" />
              <div className="getra-skeleton-line getra-skeleton-line--desc" />
            </div>
            <div className="getra-skeleton-card">
              <div className="getra-skeleton-line getra-skeleton-line--title" />
              <div className="getra-skeleton-line getra-skeleton-line--meta" />
              <div className="getra-skeleton-line getra-skeleton-line--desc" />
            </div>
            <div className="getra-skeleton-card">
              <div className="getra-skeleton-line getra-skeleton-line--title" />
              <div className="getra-skeleton-line getra-skeleton-line--meta" />
              <div className="getra-skeleton-line getra-skeleton-line--desc" />
            </div>
          </div>
        </aside>

        {/* Right Map Canvas Skeleton */}
        <section className="getra-bootstrap-canvas">
          <div className="getra-bootstrap-canvas__grid" aria-hidden="true" />

          {/* Centered Status / Error Overlay */}
          <div className="getra-bootstrap-indicator">
            {isError ? (
              <div className="getra-bootstrap-error-card">
                <div className="getra-bootstrap-error-icon" aria-hidden="true">!</div>
                <h3>GETRA belum dapat dimuat</h3>
                <p>
                  {errorMessage ||
                    "Periksa koneksi internet Anda dan coba muat ulang aplikasi."}
                </p>
                {onRetry ? (
                  <button
                    type="button"
                    className="getra-bootstrap-retry-btn"
                    onClick={onRetry}
                  >
                    Coba Lagi
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="getra-bootstrap-loading-card">
                <Loader2
                  className="getra-bootstrap-spinner"
                  size={20}
                  aria-hidden="true"
                />
                <span className="getra-bootstrap-loading-text">
                  Menyiapkan GETRA...
                </span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

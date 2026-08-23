"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCommuterRequest } from "../../api/community.api";
import type { CommuterRequestItem } from "../../types/community.types";
import {
  formatCommuterRequestCategory,
  formatExpiry,
  formatIdr,
  formatRadiusMeters,
} from "../../utils/community-format";
import { CommunityShell } from "../community-shell";
import { PostLocationMap } from "../location/post-location-map";
import styles from "../community.module.css";

type RequestDetailProps = {
  requestId: string;
};

export function RequestDetail({ requestId }: RequestDetailProps) {
  const router = useRouter();
  const [request, setRequest] = useState<CommuterRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await getCommuterRequest(requestId);

        if (!cancelled) {
          setRequest(result);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Detail Permintaan Komuter gagal dimuat.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (loading) {
    return (
      <CommunityShell activeView="requests">
        <section className={styles.feedState}>
          <span className={styles.eyebrow}>Permintaan Komuter</span>
          <h2>Memuat permintaan...</h2>
        </section>
      </CommunityShell>
    );
  }

  if (error || !request) {
    return (
      <CommunityShell activeView="requests">
        <section className={styles.feedState} role="alert">
          <span className={styles.eyebrow}>Request error</span>
          <h2>Permintaan belum bisa dimuat.</h2>
          <p>{error ?? "Permintaan tidak ditemukan."}</p>
          <Link className={styles.locationLinkButton} href="/community?view=requests">
            Kembali ke Permintaan
          </Link>
        </section>
      </CommunityShell>
    );
  }

  return (
    <CommunityShell
      activeView="requests"
      onChangeView={(view) =>
        router.push(view === "home" ? "/community" : `/community?view=${view}`)
      }
      state={{
        contributionCount: request.status === "ACTIVE" ? 1 : 0,
        statusLabel: "Permintaan Detail",
      }}
    >
      <article className={styles.requestDetail}>
        <div className={styles.detailToolbar}>
          <Link className={styles.locationLinkButton} href="/community?view=requests">
            Kembali ke Permintaan
          </Link>
          <span className={styles.eyebrow}>{request.status}</span>
        </div>
        <header className={styles.requestDetailHeader}>
          <span className={styles.categoryBadge}>
            {formatCommuterRequestCategory(request.category)}
          </span>
          <h2>{request.title}</h2>
          <p>{request.description}</p>
        </header>
        <dl className={styles.requestFacts}>
          <div>
            <dt>Budget maksimal</dt>
            <dd>{formatIdr(request.maxBudget)}</dd>
          </div>
          <div>
            <dt>Radius</dt>
            <dd>{formatRadiusMeters(request.radiusMeters)}</dd>
          </div>
          <div>
            <dt>Aktif sampai</dt>
            <dd>{formatExpiry(request.expiresAt)}</dd>
          </div>
          <div>
            <dt>Dibuat oleh</dt>
            <dd>{request.author.displayName}</dd>
          </div>
        </dl>
        <div className={styles.postLocation}>
          <strong>
            {request.location.visibility === "EXACT"
              ? "Titik presisi dibagikan"
              : "Sekitar lokasi ini"}
          </strong>
          <button
            className={styles.locationLinkButton}
            onClick={() => setMapOpen(true)}
            type="button"
          >
            Lihat di peta
          </button>
        </div>
      </article>
      {mapOpen ? (
        <PostLocationMap
          location={request.location}
          onClose={() => setMapOpen(false)}
        />
      ) : null}
    </CommunityShell>
  );
}

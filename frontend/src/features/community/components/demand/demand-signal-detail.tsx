"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDemandSignalDetail } from "../../hooks/use-demand-signal-detail";
import {
  formatCommuterRequestCategory,
  formatIdr,
  formatLocationCoordinate,
  formatRadiusMeters,
} from "../../utils/community-format";
import { CommunityShell } from "../community-shell";
import { PostLocationMap } from "../location/post-location-map";
import { UmkmResponsePanel } from "../response/umkm-response-panel";
import styles from "../community.module.css";

type DemandSignalDetailProps = {
  signalId: string;
};

export function DemandSignalDetail({ signalId }: DemandSignalDetailProps) {
  const router = useRouter();
  const [mapOpen, setMapOpen] = useState(false);
  const detail = useDemandSignalDetail(signalId);
  const signal = detail.signal;

  if (detail.loading) {
    return (
      <CommunityShell activeView="requests">
        <section className={styles.feedState}>
          <span className={styles.eyebrow}>Community Demand Signal</span>
          <h2>Memuat signal...</h2>
        </section>
      </CommunityShell>
    );
  }

  if (detail.error || !signal) {
    return (
      <CommunityShell activeView="requests">
        <section className={styles.feedState} role="alert">
          <span className={styles.eyebrow}>Signal error</span>
          <h2>Signal belum bisa dimuat.</h2>
          <p>{detail.error ?? "Signal tidak ditemukan."}</p>
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
        contributionCount: signal.requestCount,
        statusLabel: "Sinyal Community",
      }}
    >
      <article className={styles.signalDetail}>
        <div className={styles.detailToolbar}>
          <Link className={styles.locationLinkButton} href="/community?view=requests">
            Kembali ke Permintaan
          </Link>
          <span className={styles.eyebrow}>Community Demand Signal</span>
        </div>
        <header className={styles.requestDetailHeader}>
          <span className={styles.categoryBadge}>
            {formatCommuterRequestCategory(signal.category)}
          </span>
          <h2>{signal.requestCount} permintaan serupa</h2>
          <p>
            Signal ini merangkum permintaan aktif dalam 7 hari terakhir pada
            kategori, area, dan bucket budget yang sama.
          </p>
        </header>
        <dl className={styles.requestFacts}>
          <div>
            <dt>Median</dt>
            <dd>{formatIdr(signal.budgetMedian)}</dd>
          </div>
          <div>
            <dt>Range</dt>
            <dd>
              {formatIdr(signal.budgetMin)} - {formatIdr(signal.budgetMax)}
            </dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>+/- {formatRadiusMeters(signal.clusterRadiusMeters)}</dd>
          </div>
          <div>
            <dt>Koordinat umum</dt>
            <dd>
              {formatLocationCoordinate(
                signal.center.latitude,
                signal.center.longitude,
              )}
            </dd>
          </div>
        </dl>
        <div className={styles.postLocation}>
          <strong>Area signal digeneralisasi</strong>
          <button
            className={styles.locationLinkButton}
            onClick={() => setMapOpen(true)}
            type="button"
          >
            Lihat area
          </button>
        </div>
      </article>
      {mapOpen ? (
        <PostLocationMap
          location={signal.center}
          onClose={() => setMapOpen(false)}
        />
      ) : null}
      <UmkmResponsePanel
        error={detail.submitError}
        ownedMerchants={detail.ownedMerchants}
        responses={detail.responses}
        submitting={detail.submitting}
        onSubmit={detail.submitResponse}
      />
    </CommunityShell>
  );
}

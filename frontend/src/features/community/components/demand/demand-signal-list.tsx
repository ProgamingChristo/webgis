"use client";

import type {
  CommunityDemandSignal,
  CommunityFeedMeta,
} from "../../types/community.types";
import { CommunityFeedSkeleton } from "../feed/community-feed-skeleton";
import styles from "../community.module.css";
import { DemandSignalCard } from "./demand-signal-card";

type DemandSignalListProps = {
  error: string | null;
  items: CommunityDemandSignal[];
  loading: boolean;
  loadingMore: boolean;
  meta: CommunityFeedMeta;
  onLoadMore(): void;
  onRetry(): void;
};

export function DemandSignalList({
  error,
  items,
  loading,
  loadingMore,
  meta,
  onLoadMore,
  onRetry,
}: DemandSignalListProps) {
  if (loading) {
    return <CommunityFeedSkeleton />;
  }

  if (error) {
    return (
      <section className={styles.feedState} role="alert">
        <span className={styles.eyebrow}>Signal error</span>
        <h2>Sinyal Community belum bisa dimuat.</h2>
        <p>{error}</p>
        <button className={styles.secondaryButton} onClick={onRetry} type="button">
          Coba lagi
        </button>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className={styles.feedState}>
        <span className={styles.eyebrow}>Sinyal Community</span>
        <h2>Belum ada pola permintaan yang cukup kuat.</h2>
        <p>Minimal tiga permintaan serupa diperlukan untuk membentuk Sinyal Community.</p>
      </section>
    );
  }

  return (
    <section className={styles.requestFeed} aria-label="Sinyal Community">
      {items.map((signal) => (
        <DemandSignalCard key={signal.id} signal={signal} />
      ))}

      {meta.page < meta.total_pages ? (
        <button
          className={styles.loadMoreButton}
          disabled={loadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {loadingMore ? "Memuat..." : "Muat signal lama"}
        </button>
      ) : null}
    </section>
  );
}

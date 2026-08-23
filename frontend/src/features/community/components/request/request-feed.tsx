"use client";

import type {
  CommuterRequestItem,
  CommunityFeedMeta,
} from "../../types/community.types";
import { CommunityFeedSkeleton } from "../feed/community-feed-skeleton";
import styles from "../community.module.css";
import { RequestCard } from "./request-card";

type RequestFeedProps = {
  error: string | null;
  items: CommuterRequestItem[];
  loading: boolean;
  loadingMore: boolean;
  meta: CommunityFeedMeta;
  onLoadMore(): void;
  onRetry(): void;
};

export function RequestFeed({
  error,
  items,
  loading,
  loadingMore,
  meta,
  onLoadMore,
  onRetry,
}: RequestFeedProps) {
  if (loading) {
    return <CommunityFeedSkeleton />;
  }

  if (error) {
    return (
      <section className={styles.feedState} role="alert">
        <span className={styles.eyebrow}>Request error</span>
        <h2>Permintaan Komuter belum bisa dimuat.</h2>
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
        <span className={styles.eyebrow}>Permintaan Komuter</span>
        <h2>Belum ada permintaan aktif.</h2>
        <p>Permintaan yang dibuat komuter akan muncul di sini.</p>
      </section>
    );
  }

  return (
    <section className={styles.requestFeed} aria-label="Feed Permintaan Komuter">
      {items.map((request) => (
        <RequestCard key={request.id} request={request} />
      ))}

      {meta.page < meta.total_pages ? (
        <button
          className={styles.loadMoreButton}
          disabled={loadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {loadingMore ? "Memuat..." : "Muat permintaan lama"}
        </button>
      ) : null}
    </section>
  );
}

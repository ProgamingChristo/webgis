"use client";

import { useState } from "react";

import type {
  CommunityFeedItem,
  CommunityFeedMeta,
  CommunityPostLocation,
  CommunityReactionType,
} from "../../types/community.types";
import { CommunityEmptyState } from "../community-empty-state";
import styles from "../community.module.css";
import { PostLocationMap } from "../location/post-location-map";
import { CommunityFeedSkeleton } from "./community-feed-skeleton";
import { PostCard } from "../post/post-card";

type CommunityFeedProps = {
  error: string | null;
  items: CommunityFeedItem[];
  loading: boolean;
  loadingMore: boolean;
  meta: CommunityFeedMeta;
  pendingReactionByPostId?: Record<string, CommunityReactionType | null>;
  onLoadMore(): void;
  onRetry(): void;
  onToggleReaction?(postId: string, reactionType: CommunityReactionType): void;
  canDelete?(post: CommunityFeedItem): boolean;
  deletingPostId?: string | null;
  onDelete?(postId: string): Promise<boolean>;
};

export function CommunityFeed({
  error,
  items,
  loading,
  loadingMore,
  meta,
  pendingReactionByPostId = {},
  onLoadMore,
  onRetry,
  onToggleReaction,
  canDelete,
  deletingPostId = null,
  onDelete,
}: CommunityFeedProps) {
  const [activeLocation, setActiveLocation] =
    useState<CommunityPostLocation | null>(null);

  if (loading) {
    return <CommunityFeedSkeleton />;
  }

  if (error) {
    return (
      <section className={styles.feedState} role="alert">
        <span className={styles.eyebrow}>Feed error</span>
        <h2>Feed Community belum bisa dimuat.</h2>
        <p>{error}</p>
        <button className={styles.secondaryButton} onClick={onRetry} type="button">
          Coba lagi
        </button>
      </section>
    );
  }

  if (items.length === 0) {
    return <CommunityEmptyState />;
  }

  return (
    <section className={styles.feed} aria-label="Feed Community">
      {items.map((post) => (
        <PostCard
          key={post.id}
          onViewLocation={setActiveLocation}
          pendingReaction={pendingReactionByPostId[post.id] ?? null}
          post={post}
          onToggleReaction={onToggleReaction}
          canDelete={canDelete?.(post) ?? false}
          deleting={deletingPostId === post.id}
          onDelete={onDelete}
        />
      ))}

      {meta.page < meta.total_pages ? (
        <button
          className={styles.loadMoreButton}
          disabled={loadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {loadingMore ? "Memuat..." : "Muat postingan lama"}
        </button>
      ) : null}

      {activeLocation ? (
        <PostLocationMap
          location={activeLocation}
          onClose={() => setActiveLocation(null)}
        />
      ) : null}
    </section>
  );
}

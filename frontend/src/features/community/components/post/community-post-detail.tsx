"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CommunityComment } from "../../types/community.types";
import { CommunityShell } from "../community-shell";
import { CommentComposer } from "../comments/comment-composer";
import { CommentThread } from "../comments/comment-thread";
import { PostCard } from "./post-card";
import { PostLocationMap } from "../location/post-location-map";
import type { CommunityPostLocation } from "../../types/community.types";
import { useCommunityPostDetail } from "../../hooks/use-community-post-detail";
import styles from "../community.module.css";

type CommunityPostDetailProps = {
  postId: string;
};

export function CommunityPostDetail({ postId }: CommunityPostDetailProps) {
  const router = useRouter();
  const detail = useCommunityPostDetail(postId);
  const [replyTarget, setReplyTarget] = useState<CommunityComment | null>(null);
  const [activeLocation, setActiveLocation] =
    useState<CommunityPostLocation | null>(null);

  if (detail.loading) {
    return (
      <CommunityShell
        state={{
          contributionCount: 0,
          statusLabel: "Thread",
        }}
      >
        <section className={styles.feedState}>
          <span className={styles.eyebrow}>Thread</span>
          <h2>Memuat diskusi...</h2>
        </section>
      </CommunityShell>
    );
  }

  if (detail.error || !detail.post) {
    return (
      <CommunityShell
        state={{
          contributionCount: 0,
          statusLabel: "Thread",
        }}
      >
        <section className={styles.feedState} role="alert">
          <span className={styles.eyebrow}>Thread error</span>
          <h2>Diskusi Community belum bisa dimuat.</h2>
          <p>{detail.error ?? "Post tidak ditemukan."}</p>
          <button
            className={styles.secondaryButton}
            onClick={detail.reload}
            type="button"
          >
            Coba lagi
          </button>
        </section>
      </CommunityShell>
    );
  }

  const confirmedCount = detail.post.reactions.confirmedCount;
  const navigateToCommunityView = (view: "home" | "findings" | "map") => {
    router.push(view === "home" ? "/community" : `/community?view=${view}`);
  };

  return (
    <CommunityShell
      onChangeView={navigateToCommunityView}
      state={{
        contributionCount: detail.post.replyCount,
        statusLabel: "Discussion + Confirmation",
      }}
    >
      <div className={styles.detailLayout}>
        <div className={styles.detailToolbar}>
          <Link className={styles.locationLinkButton} href="/community">
            Kembali ke feed
          </Link>
          <span className={styles.eyebrow}>Thread Community</span>
        </div>
        <PostCard
          pendingReaction={detail.pendingReaction}
          post={detail.post}
          onToggleReaction={(_, reactionType) =>
            detail.toggleReaction(reactionType)
          }
          onViewLocation={setActiveLocation}
        />
        <div className={styles.commentComposer}>
          <p className={styles.confirmationCopy}>
            {confirmedCount} pengguna mengonfirmasi informasi ini
          </p>
          <button
            className={styles.secondaryButton}
            disabled={Boolean(detail.pendingReaction)}
            onClick={() => detail.toggleReaction("CONFIRMED")}
            type="button"
          >
            {detail.post.reactions.viewerReactions.includes("CONFIRMED")
              ? "Batalkan konfirmasi"
              : "Konfirmasi"}
          </button>
        </div>
        <CommentComposer
          error={detail.commentError}
          replyTargetName={replyTarget?.author.displayName}
          submitting={detail.commentSubmitting}
          onCancelReply={() => setReplyTarget(null)}
          onSubmit={async (content) => {
            const success = await detail.submitComment(
              content,
              replyTarget?.id,
            );

            if (success) {
              setReplyTarget(null);
            }

            return success;
          }}
        />
        <CommentThread
          comments={detail.comments}
          onReply={(comment) => setReplyTarget(comment)}
        />
      </div>
      {activeLocation ? (
        <PostLocationMap
          location={activeLocation}
          onClose={() => setActiveLocation(null)}
        />
      ) : null}
    </CommunityShell>
  );
}

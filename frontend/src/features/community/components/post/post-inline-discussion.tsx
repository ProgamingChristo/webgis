"use client";

import { useState } from "react";

import type { CommunityComment } from "../../types/community.types";
import { useCommunityPostDetail } from "../../hooks/use-community-post-detail";
import { CommentComposer } from "../comments/comment-composer";
import { CommentThread } from "../comments/comment-thread";
import styles from "../community.module.css";

export function PostInlineDiscussion({ postId }: { postId: string }) {
  const detail = useCommunityPostDetail(postId);
  const [replyTarget, setReplyTarget] = useState<CommunityComment | null>(null);

  if (detail.loading) {
    return <p className={styles.inlineDiscussionState}>Memuat balasan...</p>;
  }

  if (detail.error) {
    return (
      <div className={styles.inlineDiscussionState} role="alert">
        <span>{detail.error}</span>
        <button onClick={detail.reload} type="button">Coba lagi</button>
      </div>
    );
  }

  return (
    <section className={styles.inlineDiscussion} aria-label="Diskusi postingan">
      <CommentThread comments={detail.comments} onReply={setReplyTarget} />
      <CommentComposer
        compact
        error={detail.commentError}
        replyTargetName={replyTarget?.author.displayName}
        submitting={detail.commentSubmitting}
        onCancelReply={() => setReplyTarget(null)}
        onSubmit={async (content) => {
          const success = await detail.submitComment(content, replyTarget?.id);
          if (success) setReplyTarget(null);
          return success;
        }}
      />
    </section>
  );
}

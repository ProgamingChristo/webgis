"use client";

import Link from "next/link";

import type { CommunityComment } from "../../types/community.types";
import { formatCommunityTime } from "../../utils/community-format";
import { CommunityAvatar } from "../common/community-avatar";
import { ReportButton } from "../moderation/report-button";
import styles from "../community.module.css";

type CommentThreadProps = {
  comments: CommunityComment[];
  onReply(comment: CommunityComment): void;
};

export function CommentThread({ comments, onReply }: CommentThreadProps) {
  if (comments.length === 0) {
    return (
      <section className={styles.feedState}>
        <span className={styles.eyebrow}>Balasan</span>
        <h2>Belum ada balasan.</h2>
        <p>Jadilah yang pertama menanggapi.</p>
      </section>
    );
  }

  return (
    <section className={styles.commentThread} aria-label="Balasan Community">
      <div className={styles.commentList}>
        {comments.map((comment) => (
          <article
            className={[
              styles.commentItem,
              comment.depth === 1 ? styles.commentDepth1 : "",
              comment.depth === 2 ? styles.commentDepth2 : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={comment.id}
          >
            <CommunityAvatar
              avatarUrl={comment.author.avatarUrl}
              displayName={comment.author.displayName}
            />
            <div className={styles.commentBody}>
              <header className={styles.commentHeader}>
                <Link
                  className={styles.authorProfileLink}
                  href={`/community/users/${comment.author.id}`}
                >
                  {comment.author.displayName}
                </Link>
                <time dateTime={comment.createdAt}>
                  {formatCommunityTime(comment.createdAt)}
                </time>
              </header>
              <p className={styles.commentContent}>{comment.content}</p>
              {comment.depth < 2 ? (
                <div className={styles.commentActions}>
                  <button
                    className={styles.locationLinkButton}
                    onClick={() => onReply(comment)}
                    type="button"
                  >
                    Balas
                  </button>
                  <ReportButton targetId={comment.id} targetType="COMMENT" />
                </div>
              ) : (
                <ReportButton targetId={comment.id} targetType="COMMENT" />
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

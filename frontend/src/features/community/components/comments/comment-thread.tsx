"use client";

import type { CommunityComment } from "../../types/community.types";
import { formatCommunityTime, getAuthorInitials } from "../../utils/community-format";
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
            <div className={styles.avatar} aria-hidden="true">
              {getAuthorInitials(comment.author.displayName)}
            </div>
            <div className={styles.commentBody}>
              <header className={styles.commentHeader}>
                <strong>{comment.author.displayName}</strong>
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
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

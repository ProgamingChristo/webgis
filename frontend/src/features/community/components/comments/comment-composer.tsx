"use client";

import { useState } from "react";

import styles from "../community.module.css";

type CommentComposerProps = {
  error: string | null;
  replyTargetName?: string | null;
  submitting: boolean;
  onCancelReply?(): void;
  onSubmit(content: string): Promise<boolean>;
};

export function CommentComposer({
  error,
  replyTargetName = null,
  submitting,
  onCancelReply,
  onSubmit,
}: CommentComposerProps) {
  const [content, setContent] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await onSubmit(content);

    if (success) {
      setContent("");
    }
  }

  return (
    <form className={styles.commentComposer} onSubmit={handleSubmit}>
      {replyTargetName ? (
        <div className={styles.replyContext}>
          <span>Membalas {replyTargetName}</span>
          <button
            className={styles.locationLinkButton}
            onClick={onCancelReply}
            type="button"
          >
            Batal
          </button>
        </div>
      ) : null}
      <label className={styles.textareaLabel} htmlFor="community-comment">
        Tulis balasan
      </label>
      <textarea
        id="community-comment"
        maxLength={500}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Tulis balasan..."
        value={content}
      />
      {error ? <p className={styles.formError}>{error}</p> : null}
      <div className={styles.composerActions}>
        <span className={styles.counter}>{content.length}/500</span>
        <span />
        <button
          className={styles.primaryButton}
          disabled={submitting || content.trim().length === 0}
          type="submit"
        >
          {submitting ? "Mengirim..." : "Kirim"}
        </button>
      </div>
    </form>
  );
}

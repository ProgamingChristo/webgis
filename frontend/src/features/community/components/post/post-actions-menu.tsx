"use client";

import { MoreHorizontal } from "lucide-react";

import styles from "../community.module.css";
import { ReportButton } from "../moderation/report-button";
import { PostDeleteAction } from "./post-delete-action";

type PostActionsMenuProps = {
  postId: string;
  authorName: string;
  canDelete: boolean;
  deleting: boolean;
  moderationDelete: boolean;
  onDelete?(): Promise<boolean>;
};

export function PostActionsMenu({
  postId,
  authorName,
  canDelete,
  deleting,
  moderationDelete,
  onDelete,
}: PostActionsMenuProps) {
  return (
    <details className={styles.postActionsMenu}>
      <summary aria-label="Buka tindakan postingan" title="Tindakan postingan">
        <MoreHorizontal aria-hidden="true" size={17} />
      </summary>
      <div className={styles.postActionsPanel}>
        <ReportButton targetId={postId} targetType="POST" />
        {canDelete && onDelete ? (
          <PostDeleteAction
            authorName={authorName}
            deleting={deleting}
            moderation={moderationDelete}
            onDelete={onDelete}
          />
        ) : null}
      </div>
    </details>
  );
}

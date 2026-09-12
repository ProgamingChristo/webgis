"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useState } from "react";

import type { CommunityFeedItem } from "../../types/community.types";
import type { CommunityReactionType } from "../../types/community.types";
import {
  formatExactLocationCoordinate,
  formatLocationCoordinate,
  formatCommunityTime,
  formatCommunityFindingCategory,
} from "../../utils/community-format";
import { CommunityAvatar } from "../common/community-avatar";
import { PostPhoto } from "../media/post-photo";
import styles from "../community.module.css";
import { ReactionBar } from "./reaction-bar";
import { PostActionsMenu } from "./post-actions-menu";
import { PostInlineDiscussion } from "./post-inline-discussion";

type PostCardProps = {
  post: CommunityFeedItem;
  pendingReaction?: CommunityReactionType | null;
  onViewLocation(location: NonNullable<CommunityFeedItem["location"]>): void;
  onToggleReaction?(postId: string, reactionType: CommunityReactionType): void;
  canDelete?: boolean;
  deleting?: boolean;
  moderationDelete?: boolean;
  onDelete?(postId: string): Promise<boolean>;
  discussionMode?: "inline" | "link";
};

export function PostCard({
  post,
  pendingReaction = null,
  onViewLocation,
  onToggleReaction,
  canDelete = false,
  deleting = false,
  moderationDelete = false,
  onDelete,
  discussionMode = "inline",
}: PostCardProps) {
  const [discussionOpen, setDiscussionOpen] = useState(false);

  return (
    <article className={styles.postCard}>
      <CommunityAvatar
        avatarUrl={post.author.avatarUrl}
        displayName={post.author.displayName}
      />
      <div className={styles.postBody}>
        <header className={styles.postHeader}>
          <div>
            <Link
              className={styles.authorProfileLink}
              href={`/community/users/${post.author.id}`}
            >
              {post.author.displayName}
            </Link>
            {post.type === "FINDING" && post.category ? (
              <span className={styles.categoryBadge}>
                {formatCommunityFindingCategory(post.category)}
              </span>
            ) : null}
            <time dateTime={post.createdAt}>{formatCommunityTime(post.createdAt)}</time>
          </div>
          <PostActionsMenu
            authorName={post.author.displayName}
            canDelete={canDelete}
            deleting={deleting}
            moderationDelete={moderationDelete}
            onDelete={onDelete ? () => onDelete(post.id) : undefined}
            postId={post.id}
          />
        </header>
        <Link className={styles.postLink} href={`/community/${post.id}`}>
          <p className={styles.postContent}>{post.content}</p>
        </Link>
        {post.media[0] ? (
          <PostPhoto author={post.author} media={post.media[0]} />
        ) : null}
        {post.location ? (
          <div className={styles.postLocation}>
            <button
              aria-label={`Lihat ${post.location.visibility === "EXACT" ? formatExactLocationCoordinate(post.location.latitude, post.location.longitude) : formatLocationCoordinate(post.location.latitude, post.location.longitude)} di peta`}
              className={styles.locationLinkButton}
              onClick={() => onViewLocation(post.location!)}
              type="button"
            >
              <MapPin aria-hidden="true" size={11} />
              {post.location.visibility === "EXACT" ? "Lokasi presisi" : "Sekitar lokasi ini"}
            </button>
          </div>
        ) : null}
        <ReactionBar
          pendingReaction={pendingReaction}
          reactions={post.reactions}
          replyCount={post.replyCount}
          threadHref={discussionMode === "link" ? `/community/${post.id}` : undefined}
          onOpenThread={() => setDiscussionOpen((open) => !open)}
          threadOpen={discussionOpen}
          onToggleReaction={(reactionType) =>
            onToggleReaction?.(post.id, reactionType)
          }
        />
        {discussionMode === "inline" && discussionOpen ? (
          <PostInlineDiscussion postId={post.id} />
        ) : null}
      </div>
    </article>
  );
}

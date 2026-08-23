"use client";

import Link from "next/link";

import type { CommunityFeedItem } from "../../types/community.types";
import type { CommunityReactionType } from "../../types/community.types";
import {
  formatExactLocationCoordinate,
  formatLocationCoordinate,
  formatCommunityTime,
  formatCommunityFindingCategory,
  getAuthorInitials,
} from "../../utils/community-format";
import { PostPhoto } from "../media/post-photo";
import styles from "../community.module.css";
import { ReactionBar } from "./reaction-bar";

type PostCardProps = {
  post: CommunityFeedItem;
  pendingReaction?: CommunityReactionType | null;
  onViewLocation(location: NonNullable<CommunityFeedItem["location"]>): void;
  onToggleReaction?(postId: string, reactionType: CommunityReactionType): void;
};

export function PostCard({
  post,
  pendingReaction = null,
  onViewLocation,
  onToggleReaction,
}: PostCardProps) {
  return (
    <article className={styles.postCard}>
      <div className={styles.avatar} aria-hidden="true">
        {getAuthorInitials(post.author.displayName)}
      </div>
      <div className={styles.postBody}>
        <header className={styles.postHeader}>
          <div>
            <strong>{post.author.displayName}</strong>
            {post.type === "FINDING" && post.category ? (
              <span className={styles.categoryBadge}>
                {formatCommunityFindingCategory(post.category)}
              </span>
            ) : null}
          </div>
          <time dateTime={post.createdAt}>
            {formatCommunityTime(post.createdAt)}
          </time>
        </header>
        <Link className={styles.postLink} href={`/community/${post.id}`}>
          <p className={styles.postContent}>{post.content}</p>
        </Link>
        {post.media[0] ? (
          <PostPhoto author={post.author} media={post.media[0]} />
        ) : null}
        {post.location ? (
          <div className={styles.postLocation}>
            <strong>
              {post.location.visibility === "EXACT"
                ? formatExactLocationCoordinate(
                    post.location.latitude,
                    post.location.longitude,
                  )
                : "Sekitar lokasi ini"}
            </strong>
            {post.location.visibility === "APPROXIMATE" ? (
              <span>
                {formatLocationCoordinate(
                  post.location.latitude,
                  post.location.longitude,
                )}
              </span>
            ) : null}
            <button
              className={styles.locationLinkButton}
              onClick={() => onViewLocation(post.location!)}
              type="button"
            >
              Lihat di peta
            </button>
          </div>
        ) : null}
        <ReactionBar
          pendingReaction={pendingReaction}
          reactions={post.reactions}
          replyCount={post.replyCount}
          threadHref={`/community/${post.id}`}
          onToggleReaction={(reactionType) =>
            onToggleReaction?.(post.id, reactionType)
          }
        />
      </div>
    </article>
  );
}

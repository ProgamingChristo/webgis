import { MessageCircle, Sparkles, ThumbsUp, BadgeCheck } from "lucide-react";
import Link from "next/link";

import type {
  CommunityReactionSummary,
  CommunityReactionType,
} from "../../types/community.types";
import styles from "../community.module.css";

const reactionConfig: Array<{
  type: CommunityReactionType;
  label: string;
  countKey: keyof Omit<CommunityReactionSummary, "viewerReactions">;
  Icon: typeof ThumbsUp;
}> = [
  {
    type: "HELPFUL",
    label: "Membantu",
    countKey: "helpfulCount",
    Icon: ThumbsUp,
  },
  {
    type: "INTERESTING",
    label: "Menarik",
    countKey: "interestingCount",
    Icon: Sparkles,
  },
  {
    type: "CONFIRMED",
    label: "Konfirmasi",
    countKey: "confirmedCount",
    Icon: BadgeCheck,
  },
];

type ReactionBarProps = {
  reactions: CommunityReactionSummary;
  replyCount: number;
  pendingReaction?: CommunityReactionType | null;
  threadHref?: string;
  onToggleReaction?(reactionType: CommunityReactionType): void;
  onOpenThread?(): void;
};

export function ReactionBar({
  reactions,
  replyCount,
  pendingReaction = null,
  threadHref,
  onToggleReaction,
  onOpenThread,
}: ReactionBarProps) {
  const replyContent = (
    <>
      <MessageCircle aria-hidden="true" size={15} />
      <span>Balasan</span>
      <strong>{replyCount}</strong>
    </>
  );

  return (
    <div className={styles.reactionBar} aria-label="Reaction Community">
      {reactionConfig.map(({ type, label, countKey, Icon }) => {
        const active = reactions.viewerReactions.includes(type);
        const pending = pendingReaction === type;

        return (
          <button
            aria-pressed={active}
            className={active ? styles.reactionButtonActive : styles.reactionButton}
            disabled={pending}
            key={type}
            onClick={() => onToggleReaction?.(type)}
            type="button"
          >
            <Icon aria-hidden="true" size={15} />
            <span>{label}</span>
            <strong>{reactions[countKey]}</strong>
          </button>
        );
      })}
      {threadHref ? (
        <Link className={styles.reactionButton} href={threadHref}>
          {replyContent}
        </Link>
      ) : (
        <button
          className={styles.reactionButton}
          onClick={onOpenThread}
          type="button"
        >
          {replyContent}
        </button>
      )}
    </div>
  );
}

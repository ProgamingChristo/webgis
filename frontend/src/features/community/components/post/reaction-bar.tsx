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
  threadOpen?: boolean;
};

export function ReactionBar({
  reactions,
  replyCount,
  pendingReaction = null,
  threadHref,
  onToggleReaction,
  onOpenThread,
  threadOpen = false,
}: ReactionBarProps) {
  const replyContent = (
    <>
      <MessageCircle aria-hidden="true" size={14} />
      <span className={styles.visuallyHidden}>Balasan</span>
      <strong>{replyCount}</strong>
    </>
  );

  return (
    <div className={styles.reactionBar} aria-label="Tanggapan komunitas">
      {reactionConfig.map(({ type, label, countKey, Icon }) => {
        const active = reactions.viewerReactions.includes(type);
        const pending = pendingReaction === type;

        return (
          <button
            aria-label={`${label}: ${reactions[countKey]}`}
            aria-pressed={active}
            className={active ? styles.reactionButtonActive : styles.reactionButton}
            disabled={pending}
            key={type}
            onClick={() => onToggleReaction?.(type)}
            title={label}
            type="button"
          >
            <Icon aria-hidden="true" size={14} />
            <span className={styles.visuallyHidden}>{label}</span>
            <strong>{reactions[countKey]}</strong>
          </button>
        );
      })}
      {threadHref ? (
        <Link aria-label={`Balasan: ${replyCount}`} className={styles.reactionButton} href={threadHref} title="Balasan">
          {replyContent}
        </Link>
      ) : (
        <button
          aria-label={`Balasan: ${replyCount}`}
          aria-expanded={threadOpen}
          className={styles.reactionButton}
          onClick={onOpenThread}
          title="Balasan"
          type="button"
        >
          {replyContent}
        </button>
      )}
    </div>
  );
}

"use client";

import { COMMUNITY_EMOJI_OPTIONS } from "../../constants/community.constants";
import styles from "../community.module.css";

type EmojiPickerProps = {
  onSelect(emoji: string): void;
  onClose(): void;
};

export function EmojiPicker({
  onSelect,
  onClose,
}: EmojiPickerProps) {
  return (
    <div className={styles.emojiPicker} role="dialog" aria-label="Pilih emoji">
      <div className={styles.emojiPickerHeader}>
        <span>Emoji</span>
        <button type="button" onClick={onClose}>
          Tutup
        </button>
      </div>
      <div className={styles.emojiGrid}>
        {COMMUNITY_EMOJI_OPTIONS.map((emoji) => (
          <button
            aria-label={`Tambahkan emoji ${emoji}`}
            key={emoji}
            onClick={() => onSelect(emoji)}
            type="button"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

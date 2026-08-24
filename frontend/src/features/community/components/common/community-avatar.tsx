"use client";

import { useState } from "react";

import { getAuthorInitials } from "../../utils/community-format";
import styles from "../community.module.css";

type CommunityAvatarProps = {
  displayName: string;
  avatarUrl?: string | null;
  size?: "default" | "large";
};

export function CommunityAvatar({
  avatarUrl,
  displayName,
  size = "default",
}: CommunityAvatarProps) {
  const [failed, setFailed] = useState(false);
  const className =
    size === "large" ? styles.profileAvatar : styles.avatar;

  if (avatarUrl && !failed) {
    return (
      <span className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          onError={() => setFailed(true)}
          src={avatarUrl}
        />
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      {getAuthorInitials(displayName)}
    </span>
  );
}

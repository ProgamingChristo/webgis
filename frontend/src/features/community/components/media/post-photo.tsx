"use client";

import type {
  CommunityPostAuthor,
  CommunityPostMedia,
} from "../../types/community.types";
import styles from "../community.module.css";

type PostPhotoProps = {
  author: CommunityPostAuthor;
  media: CommunityPostMedia;
};

export function PostPhoto({ author, media }: PostPhotoProps) {
  const aspectRatio = `${media.width} / ${media.height}`;

  if (!media.url) {
    return (
      <div className={styles.postPhotoUnavailable}>
        Foto tidak tersedia
      </div>
    );
  }

  return (
    <figure className={styles.postPhoto} style={{ aspectRatio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`Foto postingan Community oleh ${author.displayName}`}
        height={media.height}
        loading="lazy"
        src={media.url}
        width={media.width}
      />
    </figure>
  );
}

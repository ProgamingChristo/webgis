"use client";

import { Camera, ImagePlus } from "lucide-react";
import type { ChangeEvent } from "react";
import { useRef } from "react";

import { COMMUNITY_PHOTO_ACCEPT } from "../../constants/community.constants";
import styles from "../community.module.css";

type PhotoActionsProps = {
  disabled?: boolean;
  onSelect(file: File): void;
};

export function PhotoActions({
  disabled = false,
  onSelect,
}: PhotoActionsProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onSelect(file);
    }

    event.target.value = "";
  }

  return (
    <>
      <button
        aria-label="Ambil foto"
        className={styles.secondaryButton}
        disabled={disabled}
        onClick={() => cameraInputRef.current?.click()}
        type="button"
      >
        <Camera aria-hidden="true" size={15} />
        Kamera
      </button>
      <input
        accept={COMMUNITY_PHOTO_ACCEPT}
        capture="environment"
        className={styles.hiddenFileInput}
        onChange={handleChange}
        ref={cameraInputRef}
        type="file"
      />
      <button
        aria-label="Pilih foto dari galeri"
        className={styles.secondaryButton}
        disabled={disabled}
        onClick={() => galleryInputRef.current?.click()}
        type="button"
      >
        <ImagePlus aria-hidden="true" size={15} />
        Galeri
      </button>
      <input
        accept={COMMUNITY_PHOTO_ACCEPT}
        className={styles.hiddenFileInput}
        onChange={handleChange}
        ref={galleryInputRef}
        type="file"
      />
    </>
  );
}

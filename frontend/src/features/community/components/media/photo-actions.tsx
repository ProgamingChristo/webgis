"use client";

import { Camera, ImagePlus } from "lucide-react";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onSelect(file);
    }

    event.target.value = "";
  }

  return (
    <div className={styles.photoMenu}>
      <button
        aria-expanded={open}
        aria-label="Tambahkan foto"
        className={styles.secondaryButton}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <ImagePlus aria-hidden="true" size={14} />
        Foto
      </button>
      {open ? (
        <div className={styles.photoMenuPanel} role="menu">
          <button onClick={() => { setOpen(false); cameraInputRef.current?.click(); }} role="menuitem" type="button">
            <Camera aria-hidden="true" size={15} />Kamera
          </button>
          <button onClick={() => { setOpen(false); galleryInputRef.current?.click(); }} role="menuitem" type="button">
            <ImagePlus aria-hidden="true" size={15} />Galeri
          </button>
        </div>
      ) : null}
      <input accept={COMMUNITY_PHOTO_ACCEPT} capture="environment" className={styles.hiddenFileInput}
        onChange={handleChange} ref={cameraInputRef} type="file" />
      <input
        accept={COMMUNITY_PHOTO_ACCEPT}
        className={styles.hiddenFileInput}
        onChange={handleChange}
        ref={galleryInputRef}
        type="file"
      />
    </div>
  );
}

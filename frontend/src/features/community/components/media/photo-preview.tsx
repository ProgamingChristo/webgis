"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";

import styles from "../community.module.css";

type PhotoPreviewProps = {
  file: File;
  onRemove(): void;
};

export function PhotoPreview({ file, onRemove }: PhotoPreviewProps) {
  const previewUrl = useMemo(() => {
    if (
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <section className={styles.photoPreview} aria-label="Pratinjau foto">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="Pratinjau foto komunitas" src={previewUrl} />
      ) : (
        <div className={styles.photoFallback}>Foto dipilih</div>
      )}
      <div className={styles.photoPreviewFooter}>
        <span>{file.name || "Foto komunitas"}</span>
        <button
          aria-label="Hapus foto"
          className={styles.secondaryButton}
          onClick={onRemove}
          type="button"
        >
          <Trash2 aria-hidden="true" size={15} />
          Hapus
        </button>
      </div>
    </section>
  );
}

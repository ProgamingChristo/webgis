import { MapPin, Pencil, Trash2 } from "lucide-react";

import type { CommunityLocationInput } from "../../types/community.types";
import {
  formatExactLocationCoordinate,
  formatLocationCoordinate,
} from "../../utils/community-format";
import styles from "../community.module.css";

type LocationPreviewProps = {
  location: CommunityLocationInput;
  onEdit(): void;
  onRemove(): void;
};

export function LocationPreview({
  location,
  onEdit,
  onRemove,
}: LocationPreviewProps) {
  const isExact = location.visibility === "EXACT";

  return (
    <section className={styles.locationPreview} aria-label="Lokasi dipilih">
      <MapPin aria-hidden="true" size={16} />
      <div>
        <strong>
          {isExact ? "Lokasi presisi dipilih" : "Sekitar titik yang dipilih"}
        </strong>
        <span>
          {isExact
            ? formatExactLocationCoordinate(
                location.latitude,
                location.longitude,
              )
            : formatLocationCoordinate(
                location.latitude,
                location.longitude,
              )}
        </span>
      </div>
      <button
        aria-label="Ubah lokasi"
        className={styles.iconButton}
        onClick={onEdit}
        type="button"
      >
        <Pencil aria-hidden="true" size={15} />
      </button>
      <button
        aria-label="Hapus lokasi"
        className={styles.iconButton}
        onClick={onRemove}
        type="button"
      >
        <Trash2 aria-hidden="true" size={15} />
      </button>
    </section>
  );
}

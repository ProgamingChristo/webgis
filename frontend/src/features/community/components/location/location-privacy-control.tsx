import type { CommunityLocationVisibility } from "../../types/community.types";
import styles from "../community.module.css";

type LocationPrivacyControlProps = {
  value: CommunityLocationVisibility;
  onChange(value: CommunityLocationVisibility): void;
};

export function LocationPrivacyControl({
  value,
  onChange,
}: LocationPrivacyControlProps) {
  return (
    <fieldset className={styles.locationPrivacy}>
      <legend>Privasi lokasi</legend>
      <label>
        <input
          checked={value === "APPROXIMATE"}
          name="community-location-privacy"
          onChange={() => onChange("APPROXIMATE")}
          type="radio"
          value="APPROXIMATE"
        />
        <span>
          <strong>Perkiraan lokasi</strong>
          <small>Lokasi publik akan ditampilkan secara perkiraan.</small>
        </span>
      </label>
      <label>
        <input
          checked={value === "EXACT"}
          name="community-location-privacy"
          onChange={() => onChange("EXACT")}
          type="radio"
          value="EXACT"
        />
        <span>
          <strong>Lokasi presisi</strong>
          <small>Titik ini akan terlihat oleh pengguna Community.</small>
        </span>
      </label>
    </fieldset>
  );
}

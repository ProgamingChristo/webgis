"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

import {
  COMMUTER_REQUEST_BUDGET_MAX_IDR,
  COMMUTER_REQUEST_CATEGORIES,
  COMMUTER_REQUEST_DESCRIPTION_MAX_LENGTH,
  COMMUTER_REQUEST_EXPIRY_OPTIONS_DAYS,
  COMMUTER_REQUEST_RADIUS_OPTIONS_M,
  COMMUTER_REQUEST_TITLE_MAX_LENGTH,
} from "../../constants/community.constants";
import type {
  CommuterRequestCategory,
  CommunityLocationInput,
  CommunityLocationVisibility,
  CreateCommuterRequestInput,
} from "../../types/community.types";
import {
  formatIdr,
  formatRadiusMeters,
  parseIdrInput,
} from "../../utils/community-format";
import { LocationPicker } from "../location/location-picker";
import { LocationPreview } from "../location/location-preview";
import { LocationPrivacyControl } from "../location/location-privacy-control";
import styles from "../community.module.css";

type RequestComposerProps = {
  error: string | null;
  submitting: boolean;
  onSubmit(input: CreateCommuterRequestInput): Promise<boolean>;
};

export function RequestComposer({
  error,
  submitting,
  onSubmit,
}: RequestComposerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CommuterRequestCategory | "">("");
  const [budgetInput, setBudgetInput] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState<CommunityLocationInput | null>(null);
  const [locationVisibility, setLocationVisibility] =
    useState<CommunityLocationVisibility>("APPROXIMATE");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const [expiresInDays, setExpiresInDays] = useState<1 | 3 | 7>(7);
  const budget = parseIdrInput(budgetInput);
  const canSubmit =
    title.trim().length > 0 &&
    title.length <= COMMUTER_REQUEST_TITLE_MAX_LENGTH &&
    description.trim().length > 0 &&
    description.length <= COMMUTER_REQUEST_DESCRIPTION_MAX_LENGTH &&
    Boolean(category) &&
    budget > 0 &&
    budget <= COMMUTER_REQUEST_BUDGET_MAX_IDR &&
    Boolean(selectedLocation) &&
    !submitting;

  async function submit() {
    if (!canSubmit || !category || !selectedLocation) {
      return;
    }

    const published = await onSubmit({
      title,
      description,
      category,
      max_budget: budget,
      location: selectedLocation,
      radius_meters: radiusMeters,
      expires_in_days: expiresInDays,
    });

    if (published) {
      setTitle("");
      setDescription("");
      setCategory("");
      setBudgetInput("");
      setSelectedLocation(null);
      setLocationVisibility("APPROXIMATE");
      setRadiusMeters(1000);
      setExpiresInDays(7);
      setLocationPickerOpen(false);
    }
  }

  function setPrivacy(value: CommunityLocationVisibility) {
    setLocationVisibility(value);
    setSelectedLocation((current) =>
      current
        ? {
            ...current,
            visibility: value,
          }
        : current,
    );
  }

  function confirmLocation(location: CommunityLocationInput) {
    setSelectedLocation(location);
    setLocationVisibility(location.visibility);
    setLocationPickerOpen(false);
  }

  function removeLocation() {
    setSelectedLocation(null);
    setLocationVisibility("APPROXIMATE");
    setLocationPickerOpen(false);
  }

  return (
    <section className={styles.requestComposer} aria-labelledby="request-composer-title">
      <div className={styles.requestComposerHeader}>
        <div>
          <span className={styles.eyebrow}>Permintaan Komuter</span>
          <h2 id="request-composer-title">Buat Permintaan</h2>
        </div>
      </div>

      <div className={styles.requestFormGrid}>
        <label>
          <span>Kategori</span>
          <select
            onChange={(event) =>
              setCategory(event.target.value as CommuterRequestCategory)
            }
            value={category}
          >
            <option value="">Pilih kategori</option>
            {COMMUTER_REQUEST_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Budget maksimal</span>
          <input
            inputMode="numeric"
            onBlur={() => {
              if (budget > 0) {
                setBudgetInput(formatIdr(budget));
              }
            }}
            onChange={(event) => setBudgetInput(event.target.value)}
            placeholder="Rp 20.000"
            value={budgetInput}
          />
        </label>

        <label>
          <span>Judul</span>
          <input
            maxLength={COMMUTER_REQUEST_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Paket makan mahasiswa"
            value={title}
          />
        </label>

        <label>
          <span>Radius</span>
          <select
            onChange={(event) => setRadiusMeters(Number(event.target.value))}
            value={radiusMeters}
          >
            {COMMUTER_REQUEST_RADIUS_OPTIONS_M.map((value) => (
              <option key={value} value={value}>
                {formatRadiusMeters(value)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Aktif sampai</span>
          <select
            onChange={(event) =>
              setExpiresInDays(Number(event.target.value) as 1 | 3 | 7)
            }
            value={expiresInDays}
          >
            {COMMUTER_REQUEST_EXPIRY_OPTIONS_DAYS.map((value) => (
              <option key={value} value={value}>
                {value === 1 ? "Hari ini" : `${value} hari`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.requestTextareaLabel}>
        <span>Catatan</span>
        <textarea
          maxLength={COMMUTER_REQUEST_DESCRIPTION_MAX_LENGTH}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Butuh nasi + minum dekat kampus"
          rows={4}
          value={description}
        />
      </label>

      {selectedLocation ? (
        <>
          <LocationPreview
            location={selectedLocation}
            onEdit={() => setLocationPickerOpen(true)}
            onRemove={removeLocation}
          />
          <LocationPrivacyControl value={locationVisibility} onChange={setPrivacy} />
        </>
      ) : null}

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      {!selectedLocation ? (
        <p className={styles.formHint}>Pilih lokasi agar permintaan dapat dicari secara radius.</p>
      ) : null}

      <div className={styles.requestActions}>
        <button
          className={styles.secondaryButton}
          onClick={() => setLocationPickerOpen(true)}
          type="button"
        >
          <MapPin aria-hidden="true" size={15} />
          {selectedLocation ? "Ubah lokasi" : "Pilih lokasi"}
        </button>
        <button
          className={styles.primaryButton}
          disabled={!canSubmit}
          onClick={submit}
          type="button"
        >
          {submitting ? "Mengirim..." : "Kirim Permintaan"}
        </button>
      </div>

      {locationPickerOpen ? (
        <LocationPicker
          initialLocation={selectedLocation}
          initialVisibility={locationVisibility}
          onClose={() => setLocationPickerOpen(false)}
          onConfirm={confirmLocation}
        />
      ) : null}
    </section>
  );
}

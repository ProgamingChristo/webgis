"use client";

import { MapPin } from "lucide-react";
import { useRef, useState } from "react";

import {
  COMMUNITY_FINDING_CATEGORIES,
  COMMUNITY_PHOTO_MAX_INPUT_BYTES,
  COMMUNITY_POST_MAX_LENGTH,
} from "../../constants/community.constants";
import type {
  CommunityFindingCategory,
  CommunityLocationInput,
  CommunityLocationVisibility,
  CommunityPostType,
  CreateCommunityPostInput,
} from "../../types/community.types";
import { insertTextAtRange } from "../../utils/community-format";
import { LocationPicker } from "../location/location-picker";
import { LocationPreview } from "../location/location-preview";
import { LocationPrivacyControl } from "../location/location-privacy-control";
import { PhotoActions } from "../media/photo-actions";
import { PhotoPreview } from "../media/photo-preview";
import { CommunityAvatar } from "../common/community-avatar";
import styles from "../community.module.css";
import { EmojiPicker } from "./emoji-picker";

const CLIENT_ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type PostComposerProps = {
  authorName: string;
  authorAvatarUrl?: string | null;
  error: string | null;
  submitting: boolean;
  onSubmit(input: CreateCommunityPostInput): Promise<boolean>;
};

export function PostComposer({
  authorAvatarUrl = null,
  authorName,
  error,
  submitting,
  onSubmit,
}: PostComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [content, setContent] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<CommunityLocationInput | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [postType, setPostType] = useState<CommunityPostType>("GENERAL");
  const [category, setCategory] =
    useState<CommunityFindingCategory | "">("");
  const [locationVisibility, setLocationVisibility] =
    useState<CommunityLocationVisibility>("APPROXIMATE");
  const trimmedLength = content.trim().length;
  const findingMissingCategory = postType === "FINDING" && !category;
  const findingMissingLocation = postType === "FINDING" && !selectedLocation;
  const canSubmit =
    trimmedLength > 0 &&
    content.length <= COMMUNITY_POST_MAX_LENGTH &&
    !findingMissingCategory &&
    !findingMissingLocation &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    const published = await onSubmit({
      type: postType,
      content,
      ...(postType === "FINDING" && category ? { category } : {}),
      ...(selectedLocation ? { location: selectedLocation } : {}),
      ...(selectedPhoto ? { photo: selectedPhoto } : {}),
    });

    if (published) {
      setContent("");
      setEmojiOpen(false);
      setSelectedLocation(null);
      setSelectedPhoto(null);
      setPhotoError(null);
      setPostType("GENERAL");
      setCategory("");
      setLocationVisibility("APPROXIMATE");
      setLocationPickerOpen(false);
    }
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? content.length;
    const selectionEnd = textarea?.selectionEnd ?? content.length;
    const next = insertTextAtRange(
      content,
      emoji,
      selectionStart,
      selectionEnd,
    );

    setContent(next.value);
    window.setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(next.caret, next.caret);
    }, 0);
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

  function selectPhoto(file: File) {
    setPhotoError(null);

    if (!CLIENT_ALLOWED_PHOTO_TYPES.has(file.type)) {
      setPhotoError(
        file.type === "image/svg+xml"
          ? "Format SVG tidak didukung untuk foto Community."
          : "Format foto tidak didukung. Gunakan JPEG, PNG, atau WebP.",
      );
      return;
    }

    if (file.size > COMMUNITY_PHOTO_MAX_INPUT_BYTES) {
      setPhotoError("Foto terlalu besar. Maksimal 10 MB.");
      return;
    }

    setSelectedPhoto(file);
  }

  function removePhoto() {
    setSelectedPhoto(null);
    setPhotoError(null);
  }

  function changePostType(nextType: CommunityPostType) {
    setPostType(nextType);

    if (nextType === "GENERAL") {
      setCategory("");
    }
  }

  return (
    <section className={styles.composer} aria-labelledby="community-composer">
      <CommunityAvatar
        avatarUrl={authorAvatarUrl}
        displayName={authorName}
      />
      <div className={styles.composerBody}>
        <div className={styles.composerHeader}>
          <div>
            <span className={styles.eyebrow}>Beranda Community</span>
            <h2 id="community-composer">Apa yang kamu temukan?</h2>
          </div>
          <span>{authorName}</span>
        </div>

        <label className={styles.textareaLabel} htmlFor="community-post">
          Tulis informasi lokal
        </label>
        <div className={styles.composerModeRow}>
          <div className={styles.segmentedControl} role="group" aria-label="Tipe post">
            <button
              className={
                postType === "GENERAL"
                  ? styles.segmentedButtonActive
                  : styles.segmentedButton
              }
              onClick={() => changePostType("GENERAL")}
              type="button"
            >
              Post Umum
            </button>
            <button
              className={
                postType === "FINDING"
                  ? styles.segmentedButtonActive
                  : styles.segmentedButton
              }
              onClick={() => changePostType("FINDING")}
              type="button"
            >
              Temuan Komuter
            </button>
          </div>
          {postType === "FINDING" ? (
            <select
              aria-label="Kategori Temuan Komuter"
              className={styles.categorySelect}
              onChange={(event) =>
                setCategory(event.target.value as CommunityFindingCategory)
              }
              value={category}
            >
              <option value="">Pilih kategori</option>
              {COMMUNITY_FINDING_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <textarea
          id="community-post"
          maxLength={COMMUNITY_POST_MAX_LENGTH}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setEmojiOpen(false);
              setLocationPickerOpen(false);
            }
          }}
          placeholder="Apa yang kamu temukan di sekitar kamu?"
          ref={textareaRef}
          rows={4}
          value={content}
        />

        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}

        {postType === "FINDING" &&
        (findingMissingCategory || findingMissingLocation) ? (
          <p className={styles.formHint}>
            Temuan Komuter membutuhkan kategori dan lokasi sebelum diposting.
          </p>
        ) : null}

        {selectedLocation ? (
          <>
            <LocationPreview
              location={selectedLocation}
              onEdit={() => setLocationPickerOpen(true)}
              onRemove={removeLocation}
            />
            <LocationPrivacyControl
              value={locationVisibility}
              onChange={setPrivacy}
            />
          </>
        ) : null}

        {selectedPhoto ? (
          <PhotoPreview file={selectedPhoto} onRemove={removePhoto} />
        ) : null}

        {photoError ? (
          <p className={styles.formError} role="alert">
            {photoError}
          </p>
        ) : null}

        <div className={styles.composerActions}>
          <div className={styles.composerToolGroup}>
            <div className={styles.emojiArea}>
              <button
                aria-expanded={emojiOpen}
                aria-label="Tambahkan emoji"
                className={styles.secondaryButton}
                onClick={() => setEmojiOpen((current) => !current)}
                type="button"
              >
                &#9786; Emoji
              </button>
              {emojiOpen ? (
                <EmojiPicker
                  onClose={() => setEmojiOpen(false)}
                  onSelect={insertEmoji}
                />
              ) : null}
            </div>
            <button
              aria-label="Tambahkan lokasi"
              className={styles.secondaryButton}
              onClick={() => setLocationPickerOpen(true)}
              type="button"
            >
              <MapPin aria-hidden="true" size={15} />
              {selectedLocation ? "Ubah lokasi" : "Tambahkan Lokasi"}
            </button>
            <PhotoActions
              disabled={submitting}
              onSelect={selectPhoto}
            />
          </div>
          <span
            className={
              content.length > COMMUNITY_POST_MAX_LENGTH
                ? styles.counterDanger
                : styles.counter
            }
          >
            {content.length}/{COMMUNITY_POST_MAX_LENGTH}
          </span>
          <button
            className={styles.primaryButton}
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? "Posting..." : "Posting"}
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
      </div>
    </section>
  );
}

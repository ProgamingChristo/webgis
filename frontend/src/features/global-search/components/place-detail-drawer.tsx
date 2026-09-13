"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock3, Footprints, MapPin, MessageSquareText, Phone, Route, Store, Tag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Merchant } from "@/types/getra";
import { getCommunityFeed } from "@/src/features/community/api/community.api";
import { communityEvidenceNearMerchant, type PlaceCommunityEvidence } from "../community-evidence";
import { formatMeters, merchantOpening, merchantPhoto } from "../merchant-presentation";
import { merchantResultReasons } from "./merchant-result-row";

function safePhoto(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function PlacePhoto({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) return <span className="place-detail__photo-fallback"><Store aria-hidden="true" /><span>Foto belum tersedia</span></span>;
  return <Image src={src} alt={alt} fill sizes={sizes} unoptimized onError={() => setFailedSrc(src)} />;
}

function formatPrice(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function relativeDate(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Waktu tidak tersedia";
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

type GalleryPhoto = { src: string; label: "Foto tempat" | "Foto menu" | "Foto dari Community" };

export function PlaceDetailDrawer({ merchant, onRoute }: { merchant: Merchant; onRoute: (merchant: Merchant) => void }) {
  const primaryPhoto = merchantPhoto(merchant);
  const menuPhotos = useMemo(() => {
    const photos = (merchant.menuPhotos ?? []).map(safePhoto).filter((value): value is string => Boolean(value));
    return [...new Set(photos.filter((photo) => photo !== primaryPhoto))].slice(0, 7);
  }, [merchant.menuPhotos, primaryPhoto]);
  const officialGallery = useMemo<GalleryPhoto[]>(() => [
    ...(primaryPhoto ? [{ src: primaryPhoto, label: "Foto tempat" as const }] : []),
    ...menuPhotos.map((src) => ({ src, label: "Foto menu" as const })),
  ], [menuPhotos, primaryPhoto]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxOpen = lightboxIndex !== null;
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  const [communityResult, setCommunityResult] = useState<{
    merchantId: string;
    state: "READY" | "ERROR";
    evidence: PlaceCommunityEvidence[];
  } | null>(null);
  const communityState = communityResult?.merchantId === merchant.id ? communityResult.state : "LOADING";
  const communityEvidence = useMemo(
    () => communityResult?.merchantId === merchant.id ? communityResult.evidence : [],
    [communityResult, merchant.id],
  );
  const communityPhotos = useMemo<GalleryPhoto[]>(() => communityEvidence.flatMap((evidence) =>
    evidence.mediaUrls.map(safePhoto).filter((value): value is string => Boolean(value)),
  ).filter((src, index, all) => all.indexOf(src) === index).slice(0, 6).map((src) => ({
    src,
    label: "Foto dari Community" as const,
  })), [communityEvidence]);
  const lightboxGallery = useMemo(() => [...officialGallery, ...communityPhotos], [communityPhotos, officialGallery]);
  const opening = merchantOpening(merchant);
  const address = merchant.address || [merchant.village, merchant.district, merchant.city].filter(Boolean).join(", ");
  const routable = merchant.networkRouteStatus === "ROUTABLE";
  const networkDistance = merchant.networkDistanceMeters;
  const networkDuration = merchant.networkDurationSeconds;
  const distance = routable && typeof networkDistance === "number" && Number.isFinite(networkDistance) ? networkDistance : null;
  const walkingMinutes = routable && typeof networkDuration === "number" && Number.isFinite(networkDuration) ? Math.ceil(networkDuration / 60) : null;
  const price = typeof merchant.observedPriceAmount === "number" && Number.isFinite(merchant.observedPriceAmount) && merchant.observedPriceAmount > 0 ? merchant.observedPriceAmount : null;
  const reasons = merchantResultReasons(merchant);
  if (merchant.recommendation?.reasons.includes("WITHIN_BUDGET")) {
    reasons.splice(Math.min(1, reasons.length), 0, "Sesuai anggaran pencarian");
    reasons.splice(2);
  }
  const hasMetrics = distance !== null || walkingMinutes !== null || price !== null;
  const hasHoursOrPrice = Boolean(merchant.openingHoursLabel) || price !== null;
  const hasAccessEvidence = Boolean(merchant.referenceDistance) || routable;

  useEffect(() => {
    let current = true;
    void getCommunityFeed(1, 50).then((response) => {
      if (!current) return;
      setCommunityResult({
        merchantId: merchant.id,
        state: "READY",
        evidence: communityEvidenceNearMerchant(response.items, { longitude: merchant.longitude, latitude: merchant.latitude }),
      });
    }).catch(() => {
      if (current) setCommunityResult({ merchantId: merchant.id, state: "ERROR", evidence: [] });
    });
    return () => { current = false; };
  }, [merchant.id, merchant.latitude, merchant.longitude]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lightboxCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowLeft") setLightboxIndex((index) => index === null ? null : (index - 1 + lightboxGallery.length) % lightboxGallery.length);
      if (event.key === "ArrowRight") setLightboxIndex((index) => index === null ? null : (index + 1) % lightboxGallery.length);
      if (event.key === "Tab") {
        event.preventDefault();
        lightboxCloseRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      lightboxTriggerRef.current?.focus();
    };
  }, [lightboxGallery.length, lightboxOpen]);

  const openLightbox = (index: number, trigger: HTMLElement) => {
    lightboxTriggerRef.current = trigger;
    setLightboxIndex(index);
  };

  return <article className="place-detail">
    <div className="place-detail__content">
      <header className="place-detail__title">
        <div>
          <h2>{merchant.name}</h2>
          <p>{[merchant.category, merchant.brand, merchant.city || merchant.district].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ")}</p>
          {address ? <span className="place-detail__address"><MapPin size={12} aria-hidden="true" />{address}</span> : null}
        </div>
        {opening !== "UNKNOWN" ? <span data-status={opening}>{opening === "OPEN" ? "Buka" : "Tutup"}</span> : null}
      </header>

      <button className="place-detail__hero" type="button" disabled={!primaryPhoto} onClick={(event) => primaryPhoto && openLightbox(0, event.currentTarget)} aria-label={primaryPhoto ? `Perbesar foto utama ${merchant.name}` : "Foto tempat belum tersedia"}>
        {primaryPhoto ? <PlacePhoto src={primaryPhoto} alt={`Foto utama ${merchant.name}`} sizes="(max-width: 760px) 100vw, 320px" /> : <span className="place-detail__photo-fallback"><Store aria-hidden="true" /><span>Foto tempat belum tersedia</span></span>}
      </button>

      {hasMetrics ? <dl className="place-detail__metrics">
        {distance !== null ? <div><dd>{formatMeters(distance)}</dd><dt>Jarak</dt></div> : null}
        {walkingMinutes !== null ? <div><dd>{walkingMinutes} mnt</dd><dt>Jalan kaki</dt></div> : null}
        {price !== null ? <div><dd>{formatPrice(price)}</dd><dt>Harga tercatat</dt></div> : null}
      </dl> : null}

      {reasons.length ? <section className="place-detail__why"><h3>Mengapa cocok</h3><ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section> : null}

      <div className="place-detail__actions">
        <button className="place-detail__route" type="button" onClick={() => onRoute(merchant)}><Route aria-hidden="true" />Rute ke sini</button>
      </div>

      {hasAccessEvidence ? <section className="place-detail__section">
        <h3><Footprints size={15} aria-hidden="true" />Akses &amp; Sekitar</h3>
        <ul>
          {merchant.referenceDistance ? <li>{formatMeters(merchant.referenceDistance.meters)} dari {merchant.referenceDistance.label} (garis lurus)</li> : null}
          {routable && distance !== null ? <li>Rute jaringan tersedia sejauh {formatMeters(distance)}.</li> : null}
        </ul>
      </section> : null}

      {hasHoursOrPrice ? <section className="place-detail__section">
        <h3><Clock3 size={15} aria-hidden="true" />Jam &amp; Harga</h3>
        <dl className="place-detail__rows">
          {merchant.openingHoursLabel ? <div><dt>Jam operasional</dt><dd>{merchant.openingHoursLabel}</dd></div> : null}
          {price !== null ? <div><dt>Harga tercatat</dt><dd>{formatPrice(price)}</dd></div> : null}
        </dl>
      </section> : null}

      {merchant.phone ? <section className="place-detail__section"><h3><Phone size={15} aria-hidden="true" />Kontak</h3><a className="place-detail__phone" href={`tel:${merchant.phone}`}>{merchant.phone}</a></section> : null}

      <section className="place-detail__gallery" aria-label="Foto dan menu">
        <h3><Tag size={15} aria-hidden="true" />Foto &amp; Menu</h3>
        {officialGallery.length ? <div className="place-detail__gallery-groups">
          {primaryPhoto ? <div className="place-detail__gallery-group"><strong>Tempat</strong><div><button type="button" onClick={(event) => openLightbox(0, event.currentTarget)} aria-label={`Perbesar foto tempat ${merchant.name}`}><PlacePhoto src={primaryPhoto} alt={`Foto tempat ${merchant.name}`} sizes="96px" /><span>Foto tempat</span></button></div></div> : null}
          {menuPhotos.length ? <div className="place-detail__gallery-group"><strong>Menu</strong><div>{menuPhotos.map((src, index) => <button key={src} type="button" onClick={(event) => openLightbox((primaryPhoto ? 1 : 0) + index, event.currentTarget)} aria-label={`Perbesar foto menu ${index + 1}`}><PlacePhoto src={src} alt={`Foto menu ${merchant.name} ${index + 1}`} sizes="96px" /><span>Foto menu</span></button>)}</div></div> : null}
        </div> : <p>Foto tempat dan menu belum tersedia.</p>}
      </section>

      <section className="place-detail__section place-detail__community">
        <h3><MessageSquareText size={15} aria-hidden="true" />Catatan di sekitar lokasi</h3>
        {communityState === "LOADING" ? <p role="status">Memeriksa catatan Community…</p> : null}
        {communityState === "ERROR" ? <p>Catatan Community belum dapat dimuat.</p> : null}
        {communityState === "READY" && communityEvidence.length === 0 ? <p>Belum ada catatan relevan.</p> : null}
        {communityEvidence.length ? <ul>{communityEvidence.map((evidence) => <li key={evidence.id}><p>{evidence.content}</p><small>{relativeDate(evidence.createdAt)}{evidence.helpfulCount ? ` · ${evidence.helpfulCount} membantu` : ""}</small>{evidence.mediaUrls.length ? <div className="place-detail__community-media">{evidence.mediaUrls.map(safePhoto).filter((value): value is string => Boolean(value)).map((src) => {
          const index = lightboxGallery.findIndex((photo) => photo.src === src);
          return index >= 0 ? <button key={src} type="button" onClick={(event) => openLightbox(index, event.currentTarget)} aria-label="Perbesar foto dari Community"><PlacePhoto src={src} alt={`Foto Community di sekitar ${merchant.name}`} sizes="72px" /></button> : null;
        })}</div> : null}</li>)}</ul> : null}
        <Link href="/community">Lihat di Komunitas <ChevronRight size={13} aria-hidden="true" /></Link>
      </section>
    </div>

    {lightboxIndex !== null && lightboxGallery[lightboxIndex] ? <div className="place-lightbox" role="dialog" aria-modal="true" aria-label={`${lightboxGallery[lightboxIndex].label} ${merchant.name}`}>
      <button ref={lightboxCloseRef} className="place-lightbox__close" type="button" onClick={() => setLightboxIndex(null)} aria-label="Tutup penampil foto"><X aria-hidden="true" /></button>
      {lightboxGallery.length > 1 ? <button className="place-lightbox__previous" type="button" onClick={() => setLightboxIndex((lightboxIndex - 1 + lightboxGallery.length) % lightboxGallery.length)} aria-label="Foto sebelumnya"><ChevronLeft aria-hidden="true" /></button> : null}
      <figure><div><PlacePhoto src={lightboxGallery[lightboxIndex].src} alt={`${lightboxGallery[lightboxIndex].label} ${merchant.name}`} sizes="95vw" /></div><figcaption>{lightboxGallery[lightboxIndex].label}<span>{lightboxIndex + 1} / {lightboxGallery.length}</span></figcaption></figure>
      {lightboxGallery.length > 1 ? <button className="place-lightbox__next" type="button" onClick={() => setLightboxIndex((lightboxIndex + 1) % lightboxGallery.length)} aria-label="Foto berikutnya"><ChevronRight aria-hidden="true" /></button> : null}
    </div> : null}
  </article>;
}

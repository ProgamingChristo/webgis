"use client";

import Image from "next/image";
import Link from "next/link";
import { AtSign, BadgeCheck, Clock3, CreditCard, Footprints, MapPin, MessageSquareText, Phone, Route, ShieldCheck, Sparkles, Store, Tag, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import type { Merchant } from "@/types/getra";
import { formatMeters, merchantOpening, merchantPhoto } from "../merchant-presentation";

function safePhoto(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function PlacePhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="place-detail__photo-fallback"><Store aria-hidden="true" /></span>;
  return <Image src={src} alt={alt} fill sizes="(max-width: 760px) calc(100vw - 14px), (max-width: 1180px) 460px, 480px" unoptimized onError={() => setFailed(true)} />;
}

function formatPrice(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function instagramHref(value: string) {
  const handle = value.trim().replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0];
  return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}` : null;
}

function formatObservedAt(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : value;
}

export function PlaceDetailDrawer({ merchant, onRoute }: { merchant: Merchant; onRoute: (merchant: Merchant) => void }) {
  const photos = [merchantPhoto(merchant), ...(merchant.menuPhotos ?? []).map(safePhoto)]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 4);
  const opening = merchantOpening(merchant);
  const address = merchant.address || [merchant.village, merchant.district, merchant.city].filter(Boolean).join(", ");
  const routable = merchant.networkRouteStatus === "ROUTABLE";
  const networkDistance = merchant.networkDistanceMeters;
  const networkDuration = merchant.networkDurationSeconds;
  const distance = routable && typeof networkDistance === "number" && Number.isFinite(networkDistance) ? networkDistance : null;
  const walkingMinutes = routable && typeof networkDuration === "number" && Number.isFinite(networkDuration)
    ? Math.ceil(networkDuration / 60)
    : null;
  const price = typeof merchant.observedPriceAmount === "number" && Number.isFinite(merchant.observedPriceAmount) && merchant.observedPriceAmount > 0
    ? merchant.observedPriceAmount
    : null;
  const hasMetrics = distance !== null || walkingMinutes !== null || price !== null;
  const hasHoursOrPrice = Boolean(merchant.openingHoursLabel) || price !== null;
  const hasAccessEvidence = Boolean(merchant.referenceDistance) || routable;
  const instagram = merchant.socialMedia?.instagram;

  const heroPhoto = photos[0] ?? null;
  const galleryPhotos = heroPhoto ? photos.slice(1) : photos;
  const observedAt = formatObservedAt(merchant.observedAt);
  const area = [merchant.village, merchant.district, merchant.city, merchant.province]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");

  return <article className="place-detail" aria-label={`Detail ${merchant.name}`}>
    <div className="place-detail__hero">
      {heroPhoto
        ? <PlacePhoto src={heroPhoto} alt={`Foto utama ${merchant.name}`} />
        : <span className="place-detail__photo-fallback"><Store aria-hidden="true" /><small>Foto belum tersedia</small></span>}
      <span className="place-detail__category">{merchant.category || "Lokasi usaha"}</span>
    </div>
    <div className="place-detail__content">
      <header className="place-detail__title">
        <div>
          <h2>{merchant.name}</h2>
          <p>{[merchant.category, merchant.brand].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ")}</p>
          {address ? <span className="place-detail__address"><MapPin size={12} aria-hidden="true" />{address}</span> : null}
        </div>
        {opening !== "UNKNOWN" ? <span data-status={opening}>{opening === "OPEN" ? "Buka" : "Tutup"}</span> : null}
      </header>


      {merchant.description ? <section className="place-detail__description" aria-label="Tentang usaha">
        <strong>Tentang usaha</strong>
        <p>{merchant.description}</p>
      </section> : null}

      {merchant.menu || merchant.observedCondition ? <section className="place-detail__summary">
        {merchant.menu ? <div><strong>Menu / produk</strong><p>{merchant.menu}</p></div> : null}
        {merchant.observedCondition ? <div><strong>Kondisi tercatat</strong><p>{merchant.observedCondition}</p></div> : null}
      </section> : null}

      {hasMetrics ? <dl className="place-detail__metrics">
        {distance !== null ? <div><dd>{formatMeters(distance)}</dd><dt>Jarak</dt></div> : null}
        {walkingMinutes !== null ? <div><dd>{walkingMinutes} mnt</dd><dt>Jalan kaki</dt></div> : null}
        {price !== null ? <div><dd>{formatPrice(price)}</dd><dt>Harga tercatat</dt></div> : null}
      </dl> : null}

      <div className="place-detail__actions">
        <button className="place-detail__route" data-testid="merchant-route-cta" type="button" onClick={() => onRoute(merchant)}><Route aria-hidden="true" />Rute ke sini</button>
        {merchant.owner_id ? (
          <div className="place-detail__ownership" data-testid="merchant-verified-badge">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Usaha ini sudah memiliki pengelola terverifikasi.</span>
          </div>
        ) : (
          <Link
            className="place-detail__claim"
            data-testid="merchant-claim-cta"
            href={`/umkm/merchants/new?claimMerchantId=${encodeURIComponent(merchant.id)}&name=${encodeURIComponent(merchant.name)}&mode=claim`}
          >
            <BadgeCheck size={14} aria-hidden="true" />Klaim Usaha Ini
          </Link>
        )}
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
          {price !== null ? <div><dt>Kisaran harga</dt><dd>{formatPrice(price)}</dd></div> : null}
        </dl>
      </section> : null}

      {merchant.phone ? <section className="place-detail__section"><h3><Phone size={15} aria-hidden="true" />Kontak</h3><a className="place-detail__phone" href={`tel:${merchant.phone}`}>{merchant.phone}</a></section> : null}

      {instagram && instagramHref(instagram) ? <section className="place-detail__section">
        <h3><AtSign size={15} aria-hidden="true" />Media sosial</h3>
        <a className="place-detail__phone" href={instagramHref(instagram)!} target="_blank" rel="noreferrer">{instagram}</a>
      </section> : null}

      {merchant.facilities?.length ? <section className="place-detail__section">
        <h3><Sparkles size={15} aria-hidden="true" />Fasilitas</h3>
        <div className="place-detail__chips">{merchant.facilities.map((facility) => <span key={facility}>{facility}</span>)}</div>
      </section> : null}

      {merchant.paymentMethods?.length ? <section className="place-detail__section">
        <h3><CreditCard size={15} aria-hidden="true" />Metode pembayaran</h3>
        <div className="place-detail__chips">{merchant.paymentMethods.map((method) => <span key={method}>{method}</span>)}</div>
      </section> : null}

      {merchant.menuItems?.length ? <section className="place-detail__menu" aria-label="Katalog menu">
        <h3><UtensilsCrossed size={15} aria-hidden="true" />Katalog menu</h3>
        <div>{merchant.menuItems.map((item) => <article key={item.id} className="place-detail__menu-item">
          {item.photo_url ? <figure><PlacePhoto src={item.photo_url} alt={`Foto menu ${item.name}`} /></figure> : null}
          <div><span>{item.category || item.tag || "Menu"}</span><strong>{item.name}</strong>{item.description ? <p>{item.description}</p> : null}<b>{formatPrice(item.price)}</b><small data-available={item.is_available}>{item.is_available ? "Tersedia" : "Sedang habis"}</small></div>
        </article>)}</div>
      </section> : null}

      {area || merchant.mobility || observedAt ? <section className="place-detail__section">
        <h3><MapPin size={15} aria-hidden="true" />Informasi lokasi</h3>
        <dl className="place-detail__rows">
          {area ? <div><dt>Wilayah</dt><dd>{area}</dd></div> : null}
          {merchant.mobility ? <div><dt>Jenis lokasi</dt><dd>{merchant.mobility}</dd></div> : null}
          {observedAt ? <div><dt>Data diamati</dt><dd>{observedAt}</dd></div> : null}
        </dl>
      </section> : null}

      <section className="place-detail__section">
        <h3><MessageSquareText size={15} aria-hidden="true" />Catatan Komunitas</h3>
        <p>Belum ada catatan komunitas untuk tempat ini.</p>
      </section>

      {galleryPhotos.length ? <section className="place-detail__gallery" aria-label="Foto dan menu">
        <h3><Tag size={15} aria-hidden="true" />Foto &amp; Menu</h3>
        <div>{galleryPhotos.map((photo, index) => <figure key={photo}><PlacePhoto src={photo} alt={`Foto ${index + 2} ${merchant.name}`} /></figure>)}</div>
      </section> : null}
    </div>
  </article>;
}

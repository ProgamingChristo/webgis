"use client";

import Image from "next/image";
import { Clock3, Footprints, MapPin, MessageSquareText, Phone, Route, Store, Tag } from "lucide-react";
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
  return <Image src={src} alt={alt} fill sizes="(max-width: 720px) 100vw, 300px" unoptimized onError={() => setFailed(true)} />;
}

function formatPrice(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
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

  return <article className="place-detail">
    <div className="place-detail__content">
      <header className="place-detail__title">
        <div>
          <h2>{merchant.name}</h2>
          <p>{[merchant.category, merchant.brand].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ")}</p>
          {address ? <span className="place-detail__address"><MapPin size={12} aria-hidden="true" />{address}</span> : null}
        </div>
        {opening !== "UNKNOWN" ? <span data-status={opening}>{opening === "OPEN" ? "Buka" : "Tutup"}</span> : null}
      </header>

      {hasMetrics ? <dl className="place-detail__metrics">
        {distance !== null ? <div><dd>{formatMeters(distance)}</dd><dt>Jarak</dt></div> : null}
        {walkingMinutes !== null ? <div><dd>{walkingMinutes} mnt</dd><dt>Jalan kaki</dt></div> : null}
        {price !== null ? <div><dd>{formatPrice(price)}</dd><dt>Harga tercatat</dt></div> : null}
      </dl> : null}

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
          {price !== null ? <div><dt>Kisaran harga</dt><dd>{formatPrice(price)}</dd></div> : null}
        </dl>
      </section> : null}

      {merchant.phone ? <section className="place-detail__section"><h3><Phone size={15} aria-hidden="true" />Kontak</h3><a className="place-detail__phone" href={`tel:${merchant.phone}`}>{merchant.phone}</a></section> : null}

      <section className="place-detail__section">
        <h3><MessageSquareText size={15} aria-hidden="true" />Catatan Komunitas</h3>
        <p>Belum ada catatan komunitas untuk tempat ini.</p>
      </section>

      {photos.length ? <section className="place-detail__gallery" aria-label="Foto dan menu">
        <h3><Tag size={15} aria-hidden="true" />Foto &amp; Menu</h3>
        <div>{photos.map((photo, index) => <figure key={photo}><PlacePhoto src={photo} alt={`Foto ${index + 1} ${merchant.name}`} /></figure>)}</div>
      </section> : null}
    </div>
  </article>;
}

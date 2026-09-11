"use client";

import Image from "next/image";
import { Clock3, MapPin, Phone, Route, Store, Tag } from "lucide-react";
import { useState } from "react";
import type { Merchant } from "@/types/getra";
import { merchantOpening, merchantPhoto, merchantPrice, merchantSpatialContext } from "../merchant-presentation";

function safePhoto(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function PlacePhoto({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="place-detail__photo-fallback"><Store aria-hidden="true" /></span>;
  return <Image src={src} alt={alt} fill sizes="(max-width: 720px) 100vw, 360px" unoptimized priority={priority} onError={() => setFailed(true)} />;
}

export function PlaceDetailDrawer({ merchant, onRoute }: { merchant: Merchant; onRoute: (merchant: Merchant) => void }) {
  const photos = [merchantPhoto(merchant), ...(merchant.menuPhotos ?? []).map(safePhoto)]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 5);
  const opening = merchantOpening(merchant);
  const address = merchant.address || [merchant.village, merchant.district, merchant.city].filter(Boolean).join(", ") || "Alamat belum tersedia";

  return <div className="place-detail">
    <div className="place-detail__hero">
      {photos[0] ? <PlacePhoto src={photos[0]} alt={`Foto ${merchant.name}`} priority /> : <span className="place-detail__photo-fallback"><Store aria-hidden="true" /><small>Foto belum tersedia</small></span>}
    </div>
    <div className="place-detail__content">
      <div className="place-detail__title">
        <div><h2>{merchant.name}</h2><p>{merchant.category || merchant.brand}</p></div>
        {opening !== "UNKNOWN" ? <span data-status={opening}>{opening === "OPEN" ? "Buka sekarang" : "Tutup"}</span> : null}
      </div>
      <dl className="place-detail__facts">
        <div><MapPin aria-hidden="true" /><dt>Lokasi</dt><dd>{address}</dd></div>
        {merchantSpatialContext(merchant) ? <div><Route aria-hidden="true" /><dt>Jarak</dt><dd>{merchantSpatialContext(merchant)}</dd></div> : null}
        <div><Tag aria-hidden="true" /><dt>Harga</dt><dd>{merchantPrice(merchant)}</dd></div>
        <div><Clock3 aria-hidden="true" /><dt>Jam buka</dt><dd>{merchant.openingHoursLabel || "Jam buka belum tersedia"}</dd></div>
        {merchant.phone ? <div><Phone aria-hidden="true" /><dt>Telepon</dt><dd><a href={`tel:${merchant.phone}`}>{merchant.phone}</a></dd></div> : null}
      </dl>
      {photos.length > 1 ? <section className="place-detail__gallery" aria-label="Foto dan menu">
        <h3>Foto &amp; Menu</h3>
        <div>{photos.slice(1).map((photo, index) => <figure key={photo}><PlacePhoto src={photo} alt={`Foto ${index + 2} ${merchant.name}`} /></figure>)}</div>
      </section> : null}
      <button className="place-detail__route" type="button" onClick={() => onRoute(merchant)}><Route aria-hidden="true" />Rute ke sini</button>
    </div>
  </div>;
}

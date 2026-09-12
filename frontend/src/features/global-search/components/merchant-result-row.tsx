"use client";

import Image from "next/image";
import { ChevronRight, Footprints, MapPin, Store, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Merchant } from "@/types/getra";

import { merchantPrice, merchantDistance, merchantPhoto, merchantOpening, merchantSpatialContext } from "../merchant-presentation";
export { merchantPrice, merchantDistance } from "../merchant-presentation";

export function MerchantResultRow({ merchant, selected, onSelect, budget, sponsored = false }: {
  merchant: Merchant;
  selected: boolean;
  onSelect: (merchant: Merchant) => void;
  budget?: number;
  sponsored?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);
  const photo = merchant.photo !== failedPhoto ? merchantPhoto(merchant) : null;
  const distance = merchantDistance(merchant);
  const opening = merchantOpening(merchant);
  const inBudget = budget !== undefined && typeof merchant.observedPriceAmount === "number" && merchant.observedPriceAmount > 0 && merchant.observedPriceAmount <= budget;
  return <button ref={ref} type="button" className="commuter-merchant" aria-pressed={selected} onClick={() => onSelect(merchant)} data-merchant-id={merchant.id}>
    <span className="commuter-merchant__photo">{photo ? <Image src={photo} alt="" width={72} height={88} unoptimized onError={() => setFailedPhoto(photo)} /> : <Store size={26} aria-label="Foto belum tersedia" />}</span>
    <span className="commuter-merchant__body">
      <strong>{merchant.name}</strong><span>{merchant.category || merchant.brand}</span>
      {!distance && merchantSpatialContext(merchant) ? <span className="commuter-merchant__meta">{merchantSpatialContext(merchant)}</span> : null}
      {distance ? <span className="commuter-merchant__meta"><Footprints size={12} />{distance}</span> : null}
      <span className="commuter-merchant__meta"><MapPin size={12} />{merchant.address || [merchant.district, merchant.city].filter(Boolean).join(", ") || "Alamat belum tersedia"}</span>
      <span className="commuter-merchant__meta"><Tag size={12} />{merchantPrice(merchant)}</span>
      <span className="commuter-badges">
        {sponsored ? <span data-status="SPONSORED">Promosi</span> : null}
        {opening !== "UNKNOWN" ? <span data-status={opening}>{opening === "OPEN" ? "Buka sekarang" : "Tutup"}</span> : null}
        {inBudget ? <span data-status="OPEN">Masuk anggaran</span> : null}
      </span>
    </span><ChevronRight size={16} />
  </button>;
}

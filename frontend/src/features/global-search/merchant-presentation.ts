import type { Merchant } from "@/types/getra";

export function merchantPrice(merchant: Merchant) {
  const amount = merchant.observedPriceAmount;
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0
    ? `Harga tercatat Rp${amount.toLocaleString("id-ID")}` : "Harga belum tersedia";
}

export function merchantDistance(merchant: Merchant) {
  const seconds = merchant.networkDurationSeconds, meters = merchant.networkDistanceMeters;
  if (merchant.networkRouteStatus !== "ROUTABLE" || !Number.isFinite(seconds) || !Number.isFinite(meters) || seconds! < 0 || meters! < 0) return null;
  return `${Math.ceil(seconds! / 60)} menit · ${formatMeters(meters!)}`;
}

export function formatMeters(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${Math.round(meters)} m`;
}

export function merchantPhoto(merchant: Merchant) {
  if (!merchant.photo) return null;
  try { const url = new URL(merchant.photo); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function merchantOpening(merchant: Merchant) {
  return merchant.openingStatus ?? (merchant.openStatusKnown ? merchant.openNow ? "OPEN" : "CLOSED" : "UNKNOWN");
}

export function merchantSpatialContext(merchant: Merchant) {
  const evidence = merchant.referenceDistance;
  return evidence && Number.isFinite(evidence.meters) && evidence.meters >= 0
    ? `${formatMeters(evidence.meters)} dari ${evidence.label} (garis lurus)` : null;
}

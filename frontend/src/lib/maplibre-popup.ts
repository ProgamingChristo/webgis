import type { SponsoredPinDTO } from "@/src/features/umkm-advertising/ad-serving/types/ad-serving.types";

/**
 * Builds a MapLibre popup body from advertiser-submitted sponsored-pin fields.
 *
 * IMPORTANT: headline / merchant_name / merchant_category are merchant- or
 * advertiser-controlled strings stored in the database. They MUST NOT be
 * interpolated into raw HTML (stored XSS). We build the DOM with textContent
 * only and attach it via Popup.setDOMContent().
 */
export function buildSponsoredPopupContent(
  placement: Pick<
    SponsoredPinDTO,
    "headline" | "merchant_name" | "merchant_category" | "cta_type"
  >,
): HTMLElement {
  const root = document.createElement("div");
  root.style.cssText =
    "padding: 6px; font-family: sans-serif; max-width: 200px;";

  const badge = document.createElement("span");
  badge.style.cssText =
    "background: #fef3c7; color: #92400e; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; text-transform: uppercase;";
  badge.textContent = "✨ Sponsored";

  const title = document.createElement("h5");
  title.style.cssText =
    "margin: 4px 0 2px 0; font-size: 12px; font-weight: 700; color: #0f172a;";
  title.textContent = placement.headline ?? "";

  const subtitle = document.createElement("p");
  subtitle.style.cssText = "margin: 0; font-size: 10px; color: #64748b;";
  const merchant =
    placement.merchant_name ?? "";
  const category = placement.merchant_category ?? "";
  subtitle.textContent =
    category.length > 0 ? `${merchant} (${category})` : merchant;

  root.append(badge, title, subtitle);

  if (placement.cta_type) {
    const cta = document.createElement("div");
    cta.style.cssText =
      "margin-top: 6px; font-size: 10px; font-weight: 600; color: #d97706;";
    cta.textContent =
      placement.cta_type === "REQUEST_ROUTE"
        ? "📍 Rute Tersedia"
        : "🏪 Kunjungi Profil";
    root.append(cta);
  }

  return root;
}

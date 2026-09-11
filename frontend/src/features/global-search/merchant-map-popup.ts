import type { Merchant } from "@/types/getra";
import { merchantDistance, merchantOpening, merchantPhoto, merchantPrice, merchantSpatialContext } from "./merchant-presentation";

/** DOM content for MapLibre. Public text is assigned with textContent, never HTML. */
export function createMerchantMapPopup(merchant: Merchant, actions: {
  onClose: () => void;
  onDetail?: (merchant: Merchant) => void;
  onRoute?: (merchant: Merchant) => void;
}) {
  const element = (tag: string, className: string, text?: string) => {
    const node = document.createElement(tag); node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const card = element("article", "commuter-place-popup");
  card.setAttribute("aria-label", merchant.name);
  const media = element("div", "commuter-place-popup__media");
  const placeholder = element("span", "commuter-place-popup__placeholder", "GETRA");
  placeholder.setAttribute("aria-label", "Foto tempat belum tersedia");
  media.append(placeholder);
  const photo = merchantPhoto(merchant);
  if (photo) {
    const img = document.createElement("img");
    img.src = photo; img.alt = merchant.name; img.referrerPolicy = "no-referrer";
    img.onload = () => { placeholder.hidden = true; };
    img.onerror = () => { img.remove(); placeholder.hidden = false; };
    media.append(img);
  }
  const close = document.createElement("button");
  close.type = "button"; close.className = "commuter-place-popup__close";
  close.textContent = "×"; close.setAttribute("aria-label", "Tutup detail tempat"); close.onclick = actions.onClose;
  media.append(close);
  const body = element("div", "commuter-place-popup__body");
  body.append(element("h3", "", merchant.name));
  const category = element("div", "commuter-place-popup__category");
  category.append(element("span", "", merchant.category || "Tempat"));
  const opening = merchantOpening(merchant);
  if (opening !== "UNKNOWN") {
    const badge = element("span", "commuter-place-popup__status", opening === "OPEN" ? "● Buka sekarang" : "Tutup");
    badge.dataset.status = opening; category.append(badge);
  }
  body.append(category);
  const spatial = merchantSpatialContext(merchant), walking = merchantDistance(merchant);
  if (spatial) body.append(element("p", "commuter-place-popup__spatial", spatial));
  if (walking) body.append(element("p", "", `${walking} berjalan kaki`));
  body.append(element("p", "commuter-place-popup__address", merchant.address || [merchant.district, merchant.city].filter(Boolean).join(", ") || "Alamat belum tersedia"));
  body.append(element("p", "", merchantPrice(merchant)));
  body.append(element("p", "", merchant.openingHoursLabel || "Jam buka belum tersedia"));
  const buttons = element("div", "commuter-popup-actions");
  for (const [label, callback] of [["Lihat detail", actions.onDetail], ["Rute ke sini", actions.onRoute]] as const) {
    if (!callback) continue;
    const button = document.createElement("button"); button.type = "button";
    button.textContent = label; button.onclick = () => callback(merchant); buttons.append(button);
  }
  body.append(buttons); card.append(media, body);
  return card;
}

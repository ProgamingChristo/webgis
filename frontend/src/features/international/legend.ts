import type { ExpressionSpecification } from "maplibre-gl";
import type { InternationalLayer } from "@/types/international";

export function datasetLegend(layer: InternationalLayer) {
  let values: { label: string; color: string }[] = [{ label: "Catatan sumber", color: "#0369a1" }];
  let color: string | ExpressionSpecification = "#0369a1";
  if (layer === "earthquakes") {
    values = [{ label: "M < 4", color: "#15803d" }, { label: "M 4–5,9", color: "#c2410c" }, { label: "M ≥ 6", color: "#b91c1c" }];
    color = ["step", ["to-number", ["get", "magnitude"], 0], "#15803d", 4, "#c2410c", 6, "#b91c1c"];
  } else if (layer === "active-fire") {
    values = [{ label: "Confidence rendah", color: "#a16207" }, { label: "Confidence nominal", color: "#c2410c" }, { label: "Confidence tinggi", color: "#b91c1c" }];
    color = ["match", ["get", "confidence"], "l", "#a16207", "h", "#b91c1c", "#c2410c"];
  }
  return { values: [...values, { label: "Catatan kedaluwarsa", color: "#b45309" }, { label: "Kelompok lokasi", color: "#0e7490" }], color: ["case", ["has", "point_count"], "#0e7490", ["==", ["get", "freshness"], "STALE"], "#b45309", color] as ExpressionSpecification };
}

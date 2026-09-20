import { CANONICAL_CAMERA_REGISTRY } from "@/types/cctv-registry";
import type { AiAskRequest, AiAskResponse } from "./ai.schema";

export function answerCameraInventory(req: AiAskRequest): AiAskResponse | null {
  if (!/\b(cctv|kamera|camera|ai vision)\b/i.test(req.question)) return null;
  const terms = req.question.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(t => t.length > 3 && !["kamera", "camera", "cctv", "apakah", "berapa", "sekitar", "terdekat", "sekarang", "kondisi", "status"].includes(t));
  const matching = CANONICAL_CAMERA_REGISTRY.filter(c => terms.some(t => `${c.camera_name} ${c.site_name} ${c.district}`.toLowerCase().includes(t)));
  const names = matching.slice(0, 4).map(c => `${c.camera_name} (${c.district}; status ${c.health_status}; frame ${c.last_frame_at ?? "belum tersedia"})`);
  return { answer: names.length ? `Daftar kamera memuat: ${names.join("; ")}. Keberadaan dalam daftar tidak membuktikan kamera sedang live. Frame dan hasil analisis AI belum tersedia.` : "Data frame kamera dan hasil deteksi AI belum tersedia. Pilih kamera pada panel CCTV atau cari nama lokasi dalam daftar. GETRA tidak dapat menyimpulkan kondisi lalu lintas dari inventaris kamera.", intent: "CCTV", provider: "deterministic", evidence: [{ source: "GETRA camera inventory / DKI public portal", dataset: "Canonical camera registry", description: "https://jakcctv.jakarta.go.id/publik; registry metadata only; no live frames or inference" }], limitations: ["Status operasional, FPS, jumlah objek dan jarak terdekat tidak disimpulkan dari metadata."], action: { type: "NAVIGATE", path: "/international/cctv", label: "Buka CCTV" } };
}

import {
  DATA_READINESS_MODEL_VERSION,
  DATA_READINESS_WEIGHTS,
  LOCATION_READINESS_MODEL_VERSION,
  LOCATION_WEIGHTS,
  VISIBILITY_MODEL_VERSION,
  VISIBILITY_WEIGHTS,
} from "./umkm-intelligence.constants";
import type {
  MerchantEvidenceInput,
  ReadinessComponent,
  ReadinessDiagnostic,
} from "./umkm-intelligence.types";

function component(id: string, label: string, available: boolean, maxPoints: number, evidence: string): ReadinessComponent {
  return {
    id,
    label,
    status: available ? "AVAILABLE" : "MISSING",
    points: available ? maxPoints : 0,
    max_points: maxPoints,
    evidence,
  };
}

function diagnostic(components: ReadinessComponent[], modelVersion: string): ReadinessDiagnostic {
  const score = Math.round(components.reduce((sum, item) => sum + item.points, 0));
  return {
    score,
    status: score >= 80 ? "READY" : score >= 50 ? "DEVELOPING" : "INCOMPLETE",
    model_version: modelVersion,
    components,
  };
}

export function calculateDataReadiness(input: MerchantEvidenceInput): ReadinessDiagnostic {
  return diagnostic([
    component("NAME", "Nama merchant", input.name, DATA_READINESS_WEIGHTS.NAME, input.name ? "Nama canonical tersedia." : "Nama belum tersedia."),
    component("CATEGORY", "Kategori canonical", input.category, DATA_READINESS_WEIGHTS.CATEGORY, input.category ? "Kategori dapat dipetakan ke taxonomy analytics." : "Kategori belum dapat dipetakan."),
    component("LOCATION", "Lokasi", input.location, DATA_READINESS_WEIGHTS.LOCATION, input.location ? (input.isMobile ? "Lokasi observasi merchant mobile tersedia." : "Titik lokasi canonical tersedia.") : "Titik lokasi tidak tersedia."),
    component("ADDRESS", "Alamat", input.address, DATA_READINESS_WEIGHTS.ADDRESS, input.address ? "Alamat tersedia." : "Alamat belum tersedia."),
    component("OPENING_HOURS", "Jam operasional", input.openingHours, DATA_READINESS_WEIGHTS.OPENING_HOURS, input.openingHours ? "Jam operasional tersedia." : "Jam operasional belum tersedia."),
    component("PRICE", "Harga", input.price, DATA_READINESS_WEIGHTS.PRICE, input.price ? "Bukti harga tersedia." : "Bukti harga belum tersedia."),
    component("PHOTO", "Foto", input.photo, DATA_READINESS_WEIGHTS.PHOTO, input.photo ? "Foto tersedia." : "Foto belum tersedia."),
    component("MENU", "Menu", input.menu, DATA_READINESS_WEIGHTS.MENU, input.menu ? "Informasi menu tersedia." : "Informasi menu belum tersedia."),
    component("PHONE", "Kontak", input.phone, DATA_READINESS_WEIGHTS.PHONE, input.phone ? "Kontak tersedia." : "Kontak belum tersedia."),
    component("VERIFIED_STATUS", "Status verifikasi", input.verified, DATA_READINESS_WEIGHTS.VERIFIED_STATUS, input.verified ? "Status merchant terverifikasi." : "Sumber tersedia tetapi status belum VERIFIED."),
  ], DATA_READINESS_MODEL_VERSION);
}

export function calculateVisibilityReadiness(input: MerchantEvidenceInput): ReadinessDiagnostic {
  return diagnostic([
    component("PUBLISHED", "Tayang di discovery", input.published, VISIBILITY_WEIGHTS.PUBLISHED, input.published ? "Merchant berstatus PUBLISHED." : "Merchant belum berstatus PUBLISHED."),
    component("CATEGORY", "Eligible filter kategori", input.category, VISIBILITY_WEIGHTS.CATEGORY, input.category ? "Kategori dapat digunakan untuk discovery." : "Kategori belum dikenali."),
    component("LOCATION", "Eligible pencarian spasial", input.location, VISIBILITY_WEIGHTS.LOCATION, input.location ? "Lokasi dapat digunakan untuk pencarian area." : "Lokasi tidak tersedia."),
    component("OPENING_HOURS", "Eligible filter buka sekarang", input.openingHours, VISIBILITY_WEIGHTS.OPENING_HOURS, input.openingHours ? "Jam tersedia untuk evaluasi buka sekarang." : "GETRA tidak dapat memastikan filter buka sekarang."),
    component("PRICE", "Eligible filter budget", input.price, VISIBILITY_WEIGHTS.PRICE, input.price ? "Harga tersedia untuk evaluasi budget." : "GETRA tidak dapat memastikan filter budget."),
    component("NETWORK_REACHABILITY", "Eligible filter jalan kaki", input.networkStatus === "ROUTABLE", VISIBILITY_WEIGHTS.NETWORK_REACHABILITY, input.networkStatus === "ROUTABLE" ? "Lokasi terhubung jaringan pedestrian." : "Kelayakan rute pedestrian belum tersedia."),
  ], VISIBILITY_MODEL_VERSION);
}

export function calculateLocationReadiness(input: MerchantEvidenceInput): ReadinessDiagnostic {
  const geometryPoints = input.location ? (input.isMobile ? 15 : LOCATION_WEIGHTS.VALID_GEOMETRY) : 0;
  const geometry: ReadinessComponent = {
    id: "VALID_GEOMETRY",
    label: "Geometri lokasi",
    status: !input.location ? "MISSING" : input.isMobile ? "LIMITED" : "PASS",
    points: geometryPoints,
    max_points: LOCATION_WEIGHTS.VALID_GEOMETRY,
    evidence: !input.location ? "Geometri tidak tersedia." : input.isMobile ? "Lokasi adalah observasi mobile, bukan alamat permanen." : "Geometri canonical valid.",
  };
  return diagnostic([
    geometry,
    component("ADMINISTRATIVE_REGION", "Wilayah administratif", input.regionKnown, LOCATION_WEIGHTS.ADMINISTRATIVE_REGION, input.regionKnown ? "Lokasi masuk polygon administratif Phase 06." : "Wilayah administratif belum tersedia."),
    component("PEDESTRIAN_REACHABILITY", "Jaringan pedestrian", input.networkStatus === "ROUTABLE", LOCATION_WEIGHTS.PEDESTRIAN_REACHABILITY, input.networkStatus === "ROUTABLE" ? "pgRouting menemukan akses jaringan." : "pgRouting belum menemukan akses yang dapat digunakan."),
    component("TRANSIT_NETWORK_EVIDENCE", "Akses transit via jaringan", input.transitRoutable, LOCATION_WEIGHTS.TRANSIT_NETWORK_EVIDENCE, input.transitRoutable ? "Transit terdekat dihitung melalui jaringan pedestrian." : "Bukti perjalanan jaringan ke transit belum tersedia."),
  ], LOCATION_READINESS_MODEL_VERSION);
}

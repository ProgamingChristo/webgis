import type { ReadinessComponent } from "../types/umkm-intelligence.types";

const COPY: Record<string, { label: string; available: string; missing: string; action: string }> = {
  NAME: { label: "Nama usaha", available: "Nama usaha sudah tersedia.", missing: "Nama usaha belum tersedia.", action: "Lengkapi nama usaha" },
  CATEGORY: { label: "Kategori", available: "Kategori dikenali untuk pencarian usaha.", missing: "Kategori usaha belum dikenali.", action: "Periksa kategori usaha" },
  LOCATION: { label: "Titik lokasi", available: "Titik lokasi tersedia untuk pencarian area.", missing: "Titik lokasi belum tersedia.", action: "Periksa titik lokasi usaha" },
  ADDRESS: { label: "Alamat", available: "Alamat usaha sudah tersedia.", missing: "Alamat usaha belum lengkap.", action: "Lengkapi alamat usaha" },
  OPENING_HOURS: { label: "Jam operasional", available: "Jam operasional tersedia untuk pencarian usaha yang buka.", missing: "Jam operasional belum lengkap.", action: "Lengkapi jam operasional" },
  PRICE: { label: "Harga", available: "Informasi harga tersedia untuk pencarian sesuai anggaran.", missing: "Informasi harga belum tersedia.", action: "Tambahkan informasi harga" },
  PHOTO: { label: "Foto usaha", available: "Foto usaha sudah tersedia.", missing: "Foto usaha belum tersedia.", action: "Tambahkan foto usaha" },
  MENU: { label: "Menu", available: "Informasi atau foto menu sudah tersedia.", missing: "Informasi menu belum tersedia.", action: "Tambahkan informasi atau foto menu" },
  PHONE: { label: "Kontak", available: "Kontak usaha sudah tersedia.", missing: "Kontak usaha belum tersedia.", action: "Lengkapi kontak usaha" },
  VERIFIED_STATUS: { label: "Verifikasi", available: "Usaha sudah terverifikasi.", missing: "Status usaha belum terverifikasi.", action: "Periksa status verifikasi usaha" },
  PUBLISHED: { label: "Tampil di GETRA", available: "Usaha berstatus tayang di GETRA.", missing: "Usaha belum berstatus tayang di GETRA.", action: "Periksa status tayang usaha" },
  VALID_GEOMETRY: { label: "Koordinat lokasi", available: "Koordinat lokasi usaha valid.", missing: "Koordinat lokasi belum tersedia.", action: "Periksa koordinat lokasi usaha" },
  ADMINISTRATIVE_REGION: { label: "Wilayah usaha", available: "Wilayah usaha sudah dikenali.", missing: "Wilayah usaha belum dapat dipastikan dari data yang tersedia.", action: "Periksa alamat dan titik lokasi" },
  PEDESTRIAN_REACHABILITY: { label: "Akses berjalan kaki", available: "Lokasi terhubung ke jaringan berjalan kaki yang tersedia.", missing: "Rute berjalan kaki belum dapat dipastikan.", action: "Periksa lokasi dan akses berjalan kaki" },
  NETWORK_REACHABILITY: { label: "Pencarian dengan berjalan kaki", available: "Lokasi terhubung ke jaringan berjalan kaki yang tersedia.", missing: "Rute berjalan kaki belum dapat dipastikan.", action: "Periksa lokasi dan akses berjalan kaki" },
  TRANSIT_NETWORK_EVIDENCE: { label: "Akses transportasi umum", available: "Rute berjalan kaki ke transportasi umum tersedia.", missing: "Rute ke transportasi umum belum tersedia dalam data GETRA.", action: "Periksa akses transportasi umum" },
};

/** Translate existing diagnostics without recalculating readiness or inventing evidence. */
export function getReadinessPresentation(component: ReadinessComponent) {
  const copy = COPY[component.id];
  const ready = component.status === "AVAILABLE" || component.status === "PASS";
  const unavailable = component.status === "UNAVAILABLE";
  const limited = component.status === "LIMITED";
  return {
    label: copy?.label ?? component.label,
    ready,
    status: ready ? "Tersedia" : unavailable ? "Belum dapat diperiksa" : limited ? "Perlu diperiksa" : "Perlu dilengkapi",
    detail: unavailable
      ? "Data untuk pemeriksaan ini belum tersedia."
      : limited && component.id === "VALID_GEOMETRY"
        ? "Lokasi usaha bergerak tercatat sebagai titik pengamatan, bukan alamat permanen."
        : limited ? "Data tersedia sebagian dan masih perlu diperiksa."
          : copy ? (ready ? copy.available : copy.missing) : component.evidence,
    action: ready || unavailable ? null : copy?.action ?? "Periksa data usaha",
  };
}

import type {
  LandingFeature,
  LandingMetric,
  LandingProblemTag,
  LandingStoryCard,
} from "../types/landing.types";

export const LANDING_METRICS: LandingMetric[] = [
  {
    label: "Jaringan Jalan Kaki",
    value: "Sesuai rute",
    description: "Akses dinilai dari keterjangkauan jalan kaki, bukan jarak lurus.",
  },
  {
    label: "Area Terjangkau",
    value: "Berbasis waktu",
    description: "Area terjangkau dibentuk dari jalur dan waktu tempuh berjalan kaki.",
  },
  {
    label: "Penelusuran Adil",
    value: "Sesuai kebutuhan",
    description: "Hasil biasa, pilihan lokal, dan promosi ditampilkan secara jelas.",
  },
  {
    label: "Informasi UMKM",
    value: "Berbasis lokasi",
    description: "Konteks lokasi membantu membaca peluang usaha di sekitar transit.",
  },
];

export const LANDING_PROBLEM_TAGS: LandingProblemTag[] = [
  {
    title: "Dekat belum tentu mudah dicapai",
    layer: "Akses",
    description: "Dekat secara garis lurus belum tentu mudah dijangkau pejalan kaki.",
  },
  {
    title: "Kebutuhan dan usaha sering terpisah",
    layer: "Kebutuhan area",
    description: "Aktivitas komuter dan titik usaha sering dilihat di sistem berbeda.",
  },
  {
    title: "Populer belum tentu paling sesuai",
    layer: "Kesesuaian hasil",
    description: "Tempat yang paling ramai belum tentu paling relevan untuk konteks lokasi.",
  },
  {
    title: "Data perlu terus diperbarui",
    layer: "Keandalan data",
    description: "Kota berubah cepat; catatan lokasi perlu waktu dan sumber yang jelas.",
  },
];

export const HERO_SEARCH_CHIPS = [
  "Makanan",
  "≤ Rp30.000",
  "≤ 10 menit",
  "Buka sekarang",
] as const;

export const WHAT_IS_GETRA_NODES: LandingStoryCard[] = [
  {
    title: "Transportasi massal",
    description: "Transit menjadi titik awal konteks, bukan akhir perjalanan.",
  },
  {
    title: "Akses pejalan kaki",
    description: "Jaringan jalan kaki, waktu tempuh, dan rute menjadi dasar akses.",
  },
  {
    title: "UMKM dan kebutuhan lokal",
    description: "Kebutuhan komuter dibaca bersama keberadaan usaha sekitar.",
  },
  {
    title: "Komunitas dan pembaruan data",
    description: "Temuan warga memperkaya data dengan status, waktu, dan sumber yang jelas.",
  },
];

export const FEATURE_EXPLORER: LandingFeature[] = [
  {
    id: "smart-search",
    label: "Pencarian Pintar",
    eyebrow: "Pertanyaan menjadi filter",
    title: "Cari dengan kalimat sehari-hari.",
    description:
      "GETRA memahami kategori, harga, jam buka, dan batas jalan kaki dari pertanyaan Anda, lalu mencari tempat yang sesuai.",
    chips: ["Makanan", "Maks. Rp30.000", "Maks. 10 menit", "Buka sekarang"],
  },
  {
    id: "pedestrian-routing",
    label: "Rute Jalan Kaki",
    eyebrow: "Mengikuti jaringan jalan",
    title: "Jarak dekat belum tentu akses mudah.",
    description:
      "GETRA membedakan jarak lurus dan rute yang benar-benar dapat dilalui pejalan kaki.",
    chips: ["Jarak lurus: contoh 450 m", "Rute jalan: contoh 670 m", "Waktu berjalan: contoh"],
  },
  {
    id: "service-area",
    label: "Area Terjangkau",
    eyebrow: "Berdasarkan waktu berjalan",
    title: "Area layanan mengikuti jaringan, bukan lingkaran generik.",
    description:
      "Area yang dapat dicapai mengikuti jaringan jalan, sehingga bentuknya tidak selalu berupa lingkaran.",
    chips: ["5 menit", "10 menit", "15 menit", "Mengikuti jaringan jalan"],
  },
  {
    id: "fair-discovery",
    label: "Penelusuran Adil",
    eyebrow: "Hasil biasa · Pilihan lokal · Promosi",
    title: "Promosi terlihat, relevansi tidak dibeli.",
    description:
      "Tempat berpromosi tetap harus sesuai dengan lokasi dan kebutuhan pencarian. Pembayaran tidak menggantikan relevansi.",
    chips: ["Hasil biasa", "Pilihan lokal", "Promosi diberi tanda", "Kesesuaian lebih dulu"],
  },
];

export const COMMUTER_FEATURES = [
  "Pencarian Pintar",
  "Filter Manual",
  "Waktu Berjalan",
  "Rute Jalan Kaki",
  "Area Terjangkau",
  "Pilihan Rute",
  "Rute Alternatif",
  "Profil Usaha",
] as const;

export const COMMUNITY_SIGNALS = [
  ["Trotoar terhalang", "Menunggu pemeriksaan", "Sumber: temuan warga"],
  ["Penyeberangan sulit diakses", "Terkonfirmasi", "Waktu pengamatan tersedia"],
  ["Permintaan sarapan pagi", "Diperbarui", "Tanggapan dan lokasi tersedia"],
  ["Informasi lokasi diperbarui", "Telah diperiksa", "Sumber data tercatat"],
] as const;

export const ADD_UMKM_STEPS = [
  "Pilih pengalaman UMKM",
  "Tambah UMKM",
  "Isi profil usaha",
  "Pilih lokasi di peta",
  "Menunggu pemeriksaan",
  "Pemeriksaan data",
  "Disetujui",
  "Usaha terverifikasi",
] as const;

export const ADVERTISING_ITEMS = [
  "Promosi",
  "Materi Iklan",
  "Target Wilayah",
  "Jadwal",
  "Pin Promosi",
  "Banner Promosi",
  "Poster Profil",
  "Simulasi Pembayaran",
] as const;

export const ANALYTICS_METRICS = [
  "Tayangan",
  "Klik Pin Promosi",
  "Kunjungan Profil",
  "Permintaan Rute",
] as const;

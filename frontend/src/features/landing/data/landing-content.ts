import type {
  LandingFeature,
  LandingMetric,
  LandingProblemTag,
  LandingStoryCard,
} from "../types/landing.types";

export const LANDING_METRICS: LandingMetric[] = [
  {
    label: "Pedestrian Network",
    value: "Walking-aware",
    description: "Akses dinilai dari keterjangkauan jalan kaki, bukan jarak lurus.",
  },
  {
    label: "Service Area",
    value: "Catchment",
    description: "GIS membentuk area layanan dari jaringan dan waktu tempuh.",
  },
  {
    label: "Fair Discovery",
    value: "Contextual",
    description: "Hasil discovery dipisahkan antara original, hidden gem, dan sponsored.",
  },
  {
    label: "UMKM Intelligence",
    value: "Spatial",
    description: "Konteks lokasi membantu membaca peluang usaha di sekitar transit.",
  },
];

export const LANDING_PROBLEM_TAGS: LandingProblemTag[] = [
  {
    title: "Distance ≠ Access",
    layer: "Access layer",
    description: "Dekat secara garis lurus belum tentu mudah dijangkau pejalan kaki.",
  },
  {
    title: "Demand & Supply Terpisah",
    layer: "Demand layer",
    description: "Aktivitas komuter dan titik usaha sering dilihat di sistem berbeda.",
  },
  {
    title: "Popularitas ≠ Relevansi",
    layer: "Fairness layer",
    description: "Tempat yang paling ramai belum tentu paling relevan untuk konteks lokasi.",
  },
  {
    title: "Data Membutuhkan Freshness",
    layer: "Trust layer",
    description: "Kota berubah cepat; evidence lokasi perlu status dan sumber yang jelas.",
  },
];

export const HERO_SEARCH_CHIPS = [
  "Food",
  "≤ Rp30.000",
  "≤ 10 min",
  "Open now",
] as const;

export const WHAT_IS_GETRA_NODES: LandingStoryCard[] = [
  {
    title: "Transportasi massal",
    description: "Transit menjadi titik awal konteks, bukan akhir perjalanan.",
  },
  {
    title: "Akses pedestrian",
    description: "Jaringan jalan kaki, waktu tempuh, dan rute menjadi dasar akses.",
  },
  {
    title: "UMKM & demand lokal",
    description: "Kebutuhan komuter dibaca bersama keberadaan usaha sekitar.",
  },
  {
    title: "Community & freshness",
    description: "Temuan warga memperkaya data dengan status, waktu, dan provenance.",
  },
];

export const FEATURE_EXPLORER: LandingFeature[] = [
  {
    id: "smart-search",
    label: "Smart Search",
    eyebrow: "Intent → filter",
    title: "Natural language diterjemahkan menjadi parameter.",
    description:
      "AI membantu membaca intent seperti kategori, harga, jam buka, dan batas jalan kaki. GIS tetap menghitung kandidat dan eligibility.",
    chips: ["category=food", "max_price=30000", "max_walk=10", "open_now=true"],
  },
  {
    id: "pedestrian-routing",
    label: "Pedestrian Routing",
    eyebrow: "Network route",
    title: "Jarak dekat belum tentu akses mudah.",
    description:
      "GETRA membedakan garis lurus dari rute jaringan pedestrian. Distance, walking time, dan route tetap domain GIS/pgRouting.",
    chips: ["straight line: illustrative 450 m", "network: illustrative 670 m", "walking time: illustrative"],
  },
  {
    id: "service-area",
    label: "Service Area",
    eyebrow: "Catchment",
    title: "Area layanan mengikuti jaringan, bukan lingkaran generik.",
    description:
      "Service area divisualkan sebagai catchment tidak beraturan agar tidak disalahpahami sebagai radius sederhana.",
    chips: ["5 min", "10 min", "15 min", "network-like catchment"],
  },
  {
    id: "fair-discovery",
    label: "Fair Discovery",
    eyebrow: "Original · Hidden Gem · Sponsored",
    title: "Promosi terlihat, relevansi tidak dibeli.",
    description:
      "Sponsored placement harus tetap melewati constraint. Organic ranking tidak diam-diam digantikan oleh pembayaran.",
    chips: ["Original", "Hidden Gem", "Sponsored labeled", "hard constraints first"],
  },
];

export const COMMUTER_FEATURES = [
  "Smart Search",
  "Manual Filters",
  "Walking Time",
  "Pedestrian Route",
  "Service Area",
  "Route Switch",
  "Smart Alternative",
  "Merchant Profile",
] as const;

export const COMMUNITY_SIGNALS = [
  ["Trotoar terhalang", "Pending", "Source: commuter finding"],
  ["Crossing sulit diakses", "Confirmed", "Timestamp tersedia"],
  ["Permintaan sarapan pagi", "Updated", "Replies + location context"],
  ["Informasi lokasi diperbarui", "Moderated", "Provenance tracked"],
] as const;

export const ADD_UMKM_STEPS = [
  "USER + UMKM stakeholder mode",
  "Tambah UMKM",
  "Isi profil usaha",
  "Pilih lokasi di map",
  "PENDING REVIEW",
  "Trusted Review",
  "APPROVED",
  "Verified Merchant",
] as const;

export const ADVERTISING_ITEMS = [
  "Campaign",
  "Creative",
  "Spatial Targeting",
  "Schedule",
  "Sponsored Pin",
  "Banner",
  "Profile Poster",
  "Midtrans Sandbox",
] as const;

export const ANALYTICS_METRICS = [
  "Impressions",
  "Sponsored Pin Clicks",
  "Profile Opens",
  "Route Requests",
] as const;

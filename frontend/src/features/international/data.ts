import type {
  GlobalCity,
  InternationalFeatureMeta,
  CctvFeed,
  CongestionZone,
  MultimodalRoute,
  AqiStation,
  HeatIslandZone,
  ElevationProfilePoint,
  SmartParkingLot,
  EvChargingHub,
  NoiseStation,
  FloodStation,
  SolarShadowZone,
  EvacuationHub,
  MicromobilityHub,
  GtfsVehiclePosition,
  CityWalkScore,
  AudioTourSpot,
  TaxRefundItem,
  MarketPhrase,
  CarbonListing,
  DigitalTwinModel,
  RoadDefect,
  DroneCorridor,
  PortLogisticsTerminal,
  HistoricalTimeSlice,
  DemographicZone,
  PublicWifiSpot,
  GreenSpace,
  HeritageSite,
  WaterRefillPoint,
  AccessibleRestroom,
  StreetLightingPole,
  IncidentDispatchAlert,
  CarriageCrowding,
  DopplerRadarFrame,
  CurbsideZone,
  SmartWasteBin,
  PedestrianBridge,
  NightlifeDistrict,
  BuskingSpot,
  CargoBikeDeliveryHub,
  AirportExpressSchedule,
  PedestrianFlowModel,
  CustomsTariffItem,
  MedicalTourismFacility,
  SatelliteNdviZone,
  WildlifeCorridor,
  SeaLevelRiseSimulation,
  VernacularHeritageBuilding,
  DiplomaticMission,
  OpenBasemapProvider,
  DataProvenance,
} from "./types";

export { CANONICAL_CAMERA_REGISTRY, getCameraRegistryStats } from "./cctv-registry";

export const GLOBAL_CITIES: GlobalCity[] = [
  { id: "tokyo", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, timezone: "JST (UTC+9)", currency: "JPY (¥)", flag: "🇯🇵" },
  { id: "singapore", name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, timezone: "SGT (UTC+8)", currency: "SGD (S$)", flag: "🇸🇬" },
  { id: "london", name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, timezone: "BST (UTC+1)", currency: "GBP (£)", flag: "🇬🇧" },
  { id: "new-york", name: "New York", country: "United States", lat: 40.7128, lng: -74.006, timezone: "EDT (UTC-4)", currency: "USD ($)", flag: "🇺🇸" },
  { id: "paris", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, timezone: "CEST (UTC+2)", currency: "EUR (€)", flag: "🇫🇷" },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456, timezone: "WIB (UTC+7)", currency: "IDR (Rp)", flag: "🇮🇩" },
  { id: "sydney", name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, timezone: "AEST (UTC+10)", currency: "AUD (A$)", flag: "🇦🇺" },
];

export const INTERNATIONAL_FEATURES: InternationalFeatureMeta[] = [
  // 1-10
  {
    slug: "cctv",
    title: "Global Traffic & CCTV Live Feed",
    description: "Streaming sensor CCTV global dengan AI counter kendaraan & pejalan kaki.",
    category: "safety",
    iconName: "Video",
    badge: "Live AI",
    state: "REAL",
    provenance: {
      source_name: "Dishub DKI Jakarta & Open Telemetry Gateway",
      source_type: "TELEMETRY_SENSOR",
      license: "Dishub Open Telemetry License v2",
      last_verified_at: "2026-09-19T14:30:00Z",
      freshness_cadence: "REALTIME",
      limitations: ["Status offline tidak disamarkan sebagai 0", "Kamera restricted hanya menampilkan metadata"],
    },
  },
  {
    slug: "traffic-congestion",
    title: "Pendeteksi Macet & Rekayasa Arus",
    description: "Deteksi bottleneck jalan raya, kecepatan rata-rata & rekomendasi jalan tikus.",
    category: "mobility",
    iconName: "Car",
    badge: "Realtime",
    state: "DERIVED",
    provenance: {
      source_name: "OpenStreetMap Road Speed Flow & Loop Telemetry",
      source_type: "TELEMETRY_SENSOR",
      license: "ODbL v1.0",
      last_verified_at: "2026-09-19T14:15:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Kecepatan dibedakan antara Teramati (Observed) dan Estimasi Historis"],
    },
  },
  {
    slug: "multimodal-transit",
    title: "Perencana Rute Lintas Batas",
    description: "Kombinasi kereta cepat, metro, bus, sepeda & jalan kaki internasional.",
    category: "mobility",
    iconName: "Plane",
    badge: "Global Routing",
    state: "AUTHORIZED",
    provenance: {
      source_name: "PT MRT Jakarta & KAI Commuter Official Schedules",
      source_type: "OFFICIAL_API",
      license: "Public Transit Timetable Open Standard",
      last_verified_at: "2026-09-19T14:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Jadwal terverifikasi, delay transit berasal dari pengumuman resmi stasiun"],
    },
  },
  {
    slug: "air-quality",
    title: "Kualitas Udara & Indeks Mikroklimat",
    description: "Sensor PM2.5, PM10, suhu serta koridor jalan kaki rendah polusi.",
    category: "environment",
    iconName: "Wind",
    badge: "Sensor Net",
    state: "REAL",
    provenance: {
      source_name: "ISPU BMKG & Jaringan Sensor Lingkungan DKI",
      source_type: "TELEMETRY_SENSOR",
      license: "Open Data BMKG Indonesia",
      last_verified_at: "2026-09-19T14:00:00Z",
      freshness_cadence: "HOURLY",
      limitations: ["Pengukuran real-time stasiun darat terkalibrasi"],
    },
  },
  {
    slug: "urban-heat",
    title: "Pulau Panas Kota & Keteduhan Kanopi",
    description: "Peta suhu permukaan satelit & jalur rindang pelindung pejalan kaki.",
    category: "environment",
    iconName: "Sun",
    badge: "Satellite",
    state: "DERIVED",
    provenance: {
      source_name: "Landsat-8/9 Thermal Infrared Sensor (TIRS)",
      source_type: "SATELLITE_REMOTE_SENSING",
      license: "USGS / NASA Open Earth Data",
      last_verified_at: "2026-09-10T03:40:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Tanggal akuisisi citra tertera eksplisit, resolusi termal 100m resampled 30m"],
    },
  },
  {
    slug: "elevation-profile",
    title: "Profil Ketinggian & Kemiringan Tanjakan",
    description: "Analisis elevasi DEM untuk kursi roda, pejalan kaki lansia & pesepeda.",
    category: "mobility",
    iconName: "TrendingUp",
    badge: "DEM GIS",
    state: "DERIVED",
    provenance: {
      source_name: "SRTM 30m & DEMNAS Badan Informasi Geospasial",
      source_type: "VALHALLA_GIS_ENGINE",
      license: "Lisensi Terbuka BIG Indonesia",
      last_verified_at: "2026-08-01T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Kemiringan tidak serta-merta menjamin aksesibilitas kursi roda tanpa ramp trotoar"],
    },
  },
  {
    slug: "smart-parking",
    title: "Sensor Parkir Cerdas & Okupansi Curbside",
    description: "Ketersediaan slot parkir mobil, motor, disabilitas & charging EV.",
    category: "smart-city",
    iconName: "ParkingCircle",
    badge: "IoT Sensor",
    state: "AUTHORIZED",
    provenance: {
      source_name: "UPT Perparkiran Dishub DKI Jakarta",
      source_type: "OFFICIAL_API",
      license: "Dishub Parking Telemetry Agreement",
      last_verified_at: "2026-09-19T14:20:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Okupansi tepi jalan bersumber dari gate sensor dan karcis elektronik"],
    },
  },
  {
    slug: "ev-charging",
    title: "Stasiun Pengisian Kendaraan Listrik (EV)",
    description: "Jaringan SPKLU internasional, daya kW, status soket & tarif per kWh.",
    category: "smart-city",
    iconName: "Zap",
    badge: "Clean Energy",
    state: "REAL",
    provenance: {
      source_name: "PLN Mobile SPKLU Open Feed & PlugShare API",
      source_type: "OFFICIAL_API",
      license: "PLN Interoperability Data Contract",
      last_verified_at: "2026-09-19T14:00:00Z",
      freshness_cadence: "HOURLY",
      limitations: ["Status soket mencerminkan telemetri OCC PLN terkini"],
    },
  },
  {
    slug: "noise-pollution",
    title: "Peta Kebisingan Akustik Kota",
    description: "Pemantauan desibel (dB) jalan raya, zona tenang & regulasi polusi suara.",
    category: "environment",
    iconName: "Volume2",
    badge: "Acoustics",
    state: "DERIVED",
    provenance: {
      source_name: "Model Akustik CNOSSOS-EU & Sensor Mikrofon IoT Lapangan",
      source_type: "ACADEMIC_MODEL",
      license: "Open Acoustic Research License",
      last_verified_at: "2026-09-15T12:00:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Nilai merupakan estimasi ekuivalen dBA kontinyu (Leq)"],
    },
  },
  {
    slug: "flood-monitoring",
    title: "Sistem Telemetri Banjir & Elevasi Air",
    description: "Peringatan dini luapan sungai, pompa pengendali & zona genangan.",
    category: "safety",
    iconName: "Waves",
    badge: "Telemetry",
    state: "REAL",
    provenance: {
      source_name: "Dinas Sumber Daya Air (SDA) DKI Jakarta - Pantau Banjir",
      source_type: "TELEMETRY_SENSOR",
      license: "SDA Jakarta Open Telemetry",
      last_verified_at: "2026-09-19T14:30:00Z",
      freshness_cadence: "REALTIME",
      limitations: ["Ketinggian air sensor radar Pintu Air Manggarai dan Pos Pasang Laut"],
    },
  },

  // 11-20
  {
    slug: "solar-radiation",
    title: "Simulasi Bayangan Gedung & Radiasi Matahari",
    description: "Prediksi bayangan arsitektur untuk kenyamanan termal pejalan kaki.",
    category: "environment",
    iconName: "SunDim",
    badge: "Solar 3D",
    state: "DERIVED",
    provenance: {
      source_name: "Simulasi Geometris Surya LoD2 & Solar Radiation Index",
      source_type: "ACADEMIC_MODEL",
      license: "Open Spatial Analytical Model",
      last_verified_at: "2026-09-19T08:00:00Z",
      freshness_cadence: "HOURLY",
      limitations: ["Bayangan gedung dihitung secara analitis berdasarkan sudut azimuth surya"],
    },
  },
  {
    slug: "emergency-evacuation",
    title: "Rute Evakuasi Bencana & Titik Kumpul",
    description: "Jalur evakuasi terpendek menuju shelter gempa, tsunami & darurat sipil.",
    category: "safety",
    iconName: "ShieldAlert",
    badge: "Resilience",
    state: "REAL",
    provenance: {
      source_name: "BPBD DKI Jakarta & Rencana Kontinjensi Bencana",
      source_type: "GOVERNMENT_PORTAL",
      license: "Publik Domain BPBD",
      last_verified_at: "2026-08-20T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["Rute mempertimbangkan kapasitas shelter dan penghindaran titik rawan genangan"],
    },
  },
  {
    slug: "micromobility",
    title: "Ketersediaan Sepeda & Skuter Sewa",
    description: "Peta armada bike-share real-time, sisa baterai & zona parkir geofence.",
    category: "mobility",
    iconName: "Bike",
    badge: "Fleet GPS",
    state: "AUTHORIZED",
    provenance: {
      source_name: "GBFS (General Bikeshare Feed Specification) Multi-Operator",
      source_type: "OFFICIAL_API",
      license: "GBFS v2.3 Specification Standard",
      last_verified_at: "2026-09-19T14:20:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Operator hanya muncul bila feed terverifikasi aktif. Data unavailable jika offline."],
    },
  },
  {
    slug: "gtfs-realtime",
    title: "Pelacak Posisi Bus & Kereta GTFS-RT",
    description: "Telemetri armada transportasi umum live, headway & prediksi kedatangan.",
    category: "mobility",
    iconName: "Train",
    badge: "GTFS Feed",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Open Mobility Data GTFS-RT Feed",
      source_type: "OFFICIAL_API",
      license: "Open Transit Data License",
      last_verified_at: "2026-09-19T14:32:00Z",
      freshness_cadence: "REALTIME",
      limitations: ["Delay dihitung dari timestamp komparasi jadwal statis vs posisi GPS"],
    },
  },
  {
    slug: "walk-score",
    title: "Kalkulator Walk Score Kota 15 Menit",
    description: "GETRA Walkability Index berbasis faktor jaringan GIS dan akses fasilitas.",
    category: "smart-city",
    iconName: "Footprints",
    badge: "15-Min City",
    state: "DERIVED",
    provenance: {
      source_name: "GETRA GIS Walkability Algorithm & OpenStreetMap Pedestrian Topology",
      source_type: "VALHALLA_GIS_ENGINE",
      license: "GETRA Algorithmic Standard v1.0",
      last_verified_at: "2026-09-19T12:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Bukan proprietary WalkScore.com; dihitung murni dari density, slope, crossings & shade"],
    },
  },
  {
    slug: "tourist-audio-guide",
    title: "Panduan Suara Wisata Multibahasa",
    description: "Titik geofence audio guide otomatis untuk turis mancanegara.",
    category: "commerce",
    iconName: "Headphones",
    badge: "Audio Guide",
    state: "USER_SUBMITTED",
    provenance: {
      source_name: "Kurasi Komunitas Pemandu Budaya & Cagar Budaya DKI",
      source_type: "COMMUNITY_SURVEY",
      license: "CC-BY-SA 4.0",
      last_verified_at: "2026-09-01T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Audio dipicu oleh radius geofence spasial pengguna (1x per kunjungan)"],
    },
  },
  {
    slug: "currency-tax-refund",
    title: "Konversi Valas & Kalkulator Tax Refund",
    description: "Panduan refund PPN / VAT turis dan konversi harga belanja pasar lokal.",
    category: "commerce",
    iconName: "Coins",
    badge: "Fintech",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Bank Indonesia FX Reference Rate & Ditjen Pajak Kemenkeu",
      source_type: "GOVERNMENT_PORTAL",
      license: "Kemenkeu Open Regulatory Feed",
      last_verified_at: "2026-09-19T10:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Kurs indikatif JISDOR dan batas ambang minimum belanja bebas PPN resmi"],
    },
  },
  {
    slug: "market-translator",
    title: "Penerjemah Tawar-Menawar & Alergi Makanan",
    description: "Kartu alergi diet & frase tawar-menawar pasar tradisional 8 bahasa.",
    category: "commerce",
    iconName: "Languages",
    badge: "AI Translate",
    state: "DERIVED",
    provenance: {
      source_name: "GETRA Multilingual LLM Knowledge Engine",
      source_type: "ACADEMIC_MODEL",
      license: "MIT Open Lexicon",
      last_verified_at: "2026-09-15T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Khusus konteks pasar tradisional & alergi bahan pangan; bukan klaim medis legal"],
    },
  },
  {
    slug: "carbon-marketplace",
    title: "Bursa Kredit Karbon Pejalan Kaki",
    description: "Estimasi penghematan karbon jejak langkah terverifikasi pejalan kaki.",
    category: "commerce",
    iconName: "Leaf",
    badge: "Green Credit",
    state: "DERIVED",
    provenance: {
      source_name: "Faktor Emisi Transportasi Darat IPCC & Kementerian LHK",
      source_type: "ACADEMIC_MODEL",
      license: "IPCC Emission Factor Database",
      last_verified_at: "2026-09-01T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Label eksplisit: Estimasi gram CO2 terselamatkan; bukan transaksi bursa moneter tanpa izin OJK"],
    },
  },
  {
    slug: "digital-twin-3d",
    title: "Digital Twin 3D & Ekstrusi Bangunan",
    description: "Visualisasi LoD2 poligon bangunan kota, ketinggian & tutupan lahan.",
    category: "smart-city",
    iconName: "Box",
    badge: "LoD2 3D",
    state: "DERIVED",
    provenance: {
      source_name: "OpenStreetMap 3D Building Heights & CityGML DKI Jakarta",
      source_type: "VALHALLA_GIS_ENGINE",
      license: "ODbL v1.0",
      last_verified_at: "2026-08-15T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Render 3D dioptimasi LoD2 ringan untuk menjaga performa mobile browser"],
    },
  },

  // 21-30
  {
    slug: "road-damage-ai",
    title: "Inspeksi Kerusakan Jalan & Trotoar AI",
    description: "Deteksi visual otomatis lubang aspal, retak & penutup utilitas ambles.",
    category: "smart-city",
    iconName: "ScanLine",
    badge: "Vision AI",
    state: "USER_SUBMITTED",
    provenance: {
      source_name: "Komunitas Pejalan Kaki & Pipeline Verifikasi Dinas Bina Marga",
      source_type: "COMMUNITY_SURVEY",
      license: "Open Evidence Telemetry License",
      last_verified_at: "2026-09-18T16:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Pipeline: AI mendeteksi via CV, Admin Dinas memvalidasi surat perintah perbaikan"],
    },
  },
  {
    slug: "drone-corridors",
    title: "Koridor Logistik Drone & Zona Udara Rendah",
    description: "Peta no-fly zone, vertiport komersial & koridor pengiriman udara aman.",
    category: "logistics",
    iconName: "Radio",
    badge: "Airspace",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Direktorat Navigasi Penerbangan Kemenhub (DJPU)",
      source_type: "GOVERNMENT_PORTAL",
      license: "CASR Part 107 Airspace Regulation",
      last_verified_at: "2026-09-01T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["Hanya data regulasi resmi. Tidak pernah mengklaim 'aman terbang' tanpa izin ATC."],
    },
  },
  {
    slug: "port-logistics",
    title: "Terminal Logistik Pelabuhan & Multimoda",
    description: "Waktu tunggu kontainer TEU, jalur kapal & interkoneksi rel kargo.",
    category: "logistics",
    iconName: "Anchor",
    badge: "Freight",
    state: "AUTHORIZED",
    provenance: {
      source_name: "PT Pelindo Terminal Petikemas Tanjung Priok & INSW",
      source_type: "OFFICIAL_API",
      license: "Pelindo Logistics Open Telemetry",
      last_verified_at: "2026-09-19T12:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Data kapasitas TEU dan rerata waktu tunggu dermaga (dwell time) resmi"],
    },
  },
  {
    slug: "historical-map",
    title: "Morfologi Sejarah Kota & Citra Satelit",
    description: "Time-slider perbandingan perluasan kota dari 1970 hingga modern.",
    category: "governance",
    iconName: "Clock",
    badge: "Temporal GIS",
    state: "DERIVED",
    provenance: {
      source_name: "USGS Landsat Collection 1/2 Historical Mosaic & BIG Indonesia",
      source_type: "SATELLITE_REMOTE_SENSING",
      license: "Public Domain Earth Observation",
      last_verified_at: "2026-08-01T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["Setiap potongan masa memuat tahun perekaman satelit dan sumber resolusi"],
    },
  },
  {
    slug: "spatial-demographics",
    title: "Demografi Spasial & Daya Beli Kawasan",
    description: "Kepadatan penduduk, rasio usia produktif & pergerakan komuter harian.",
    category: "governance",
    iconName: "Users",
    badge: "Census GIS",
    state: "DERIVED",
    provenance: {
      source_name: "BPS DKI Jakarta - Sensus Penduduk & PODES",
      source_type: "GOVERNMENT_PORTAL",
      license: "Open Data BPS Indonesia",
      last_verified_at: "2026-07-01T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["Data agregat tingkat kecamatan/kelurahan. Tidak mengekspos data pribadi individu."],
    },
  },
  {
    slug: "public-wifi",
    title: "Jaringan Wi-Fi Publik & Kios Informasi",
    description: "Titik koneksi internet kota gratis, kecepatan Mbps & jangkauan sinyal.",
    category: "smart-city",
    iconName: "Wifi",
    badge: "Connectivity",
    state: "REAL",
    provenance: {
      source_name: "Diskominfotik DKI Jakarta - JAKWIFI Registry",
      source_type: "GOVERNMENT_PORTAL",
      license: "Jakarta Smart City Open Data",
      last_verified_at: "2026-09-18T10:00:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Lokasi titik akses diverifikasi lapangan; kecepatan bergantung pada okupansi sesi"],
    },
  },
  {
    slug: "green-spaces",
    title: "Ruang Terbuka Hijau & Indeks Biofilia",
    description: "Akses taman dalam radius 300 meter, skor tutupan vegetasi & satwa.",
    category: "environment",
    iconName: "Trees",
    badge: "Biophilia",
    state: "REAL",
    provenance: {
      source_name: "Dinas Pertamanan dan Hutan Kota (Distamhut) DKI Jakarta",
      source_type: "GOVERNMENT_PORTAL",
      license: "Distamhut Open Spatial Layer",
      last_verified_at: "2026-09-01T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Fasilitas taman terverifikasi mencakup toilet, akses kursi roda, dan titik air"],
    },
  },
  {
    slug: "cultural-heritage",
    title: "Rute Monumen Budaya & Warisan Dunia",
    description: "Situs cagar budaya UNESCO, sejarah arsitektur & konservasi fasad.",
    category: "governance",
    iconName: "Landmark",
    badge: "Heritage",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Dinas Kebudayaan DKI Jakarta & Tim Ahli Cagar Budaya (TACB)",
      source_type: "GOVERNMENT_PORTAL",
      license: "Kemendikbudristek Cagar Budaya Registry",
      last_verified_at: "2026-08-15T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["Panduan preservasi mengacu pada UU No. 11 Tahun 2010 tentang Cagar Budaya"],
    },
  },
  {
    slug: "water-refill",
    title: "Titik Isi Ulang Air Minum Publik Bebas Sampah",
    description: "Peta air minum gratis isi ulang higienis pengurang botol plastik.",
    category: "environment",
    iconName: "Droplet",
    badge: "Zero Waste",
    state: "REAL",
    provenance: {
      source_name: "PAM JAYA & Registrasi Komunitas Drinking Water Fountain",
      source_type: "TELEMETRY_SENSOR",
      license: "PAM JAYA Public Water Quality Standards",
      last_verified_at: "2026-09-18T11:00:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Kualitas air (TDS/pH) dan tanggal pengujian filter fisik tercatat pada setiap titik"],
    },
  },
  {
    slug: "accessible-restrooms",
    title: "Pencari Toilet Difabel & Sanitasi Publik",
    description: "Fasilitas sanitasi ramah kursi roda, ruang laktasi & rating kebersihan.",
    category: "safety",
    iconName: "Sparkles",
    badge: "Inclusive",
    state: "REAL",
    provenance: {
      source_name: "Audit Aksesibilitas GETRA & MRT Jakarta Accessibility Registry",
      source_type: "COMMUNITY_SURVEY",
      license: "GETRA Universal Inclusive Standard",
      last_verified_at: "2026-09-19T10:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Verifikasi mencakup lebar pintu ramp, tali darurat (pull-cord), dan meja laktasi"],
    },
  },

  // 31-40
  {
    slug: "street-lighting",
    title: "Jaringan Penerangan Jalan Cerdas (PJU)",
    description: "Telemetri tiang lampu pintar, intensitas lux penerangan & titik gelap.",
    category: "safety",
    iconName: "Lightbulb",
    badge: "Smart Grid",
    state: "REAL",
    provenance: {
      source_name: "Dinas Bina Marga DKI Jakarta - Telemetri Smart PJU",
      source_type: "TELEMETRY_SENSOR",
      license: "Bina Marga Smart City Layer",
      last_verified_at: "2026-09-19T14:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Mengukur defisiensi lux pencahayaan dan status tiang, tanpa stereotip kriminalitas"],
    },
  },
  {
    slug: "incident-dispatch",
    title: "Pusat Komando Insiden & Armada Darurat",
    description: "Visualisasi koordinasi ambulans, pemadam kebakaran & tanggap darurat.",
    category: "safety",
    iconName: "Siren",
    badge: "Emergency",
    state: "DERIVED",
    provenance: {
      source_name: "Simulasi Visualisasi Tanggap Darurat & Dispatch Bantuan 112",
      source_type: "ACADEMIC_MODEL",
      license: "GETRA Emergency Coordination Interface",
      last_verified_at: "2026-09-19T12:00:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Bukan CAD 911/112 resmi operasional; visualisasi jalur prioritas lampu hijau"],
    },
  },
  {
    slug: "commuter-crowding",
    title: "Prediksi Kepadatan Gerbong Kereta",
    description: "Sensor beban penumpang per gerbong kereta & saran posisi tunggu peron.",
    category: "mobility",
    iconName: "Users2",
    badge: "Transit AI",
    state: "DERIVED",
    provenance: {
      source_name: "KAI Commuter & MRT Jakarta Okupansi Peron Stasiun",
      source_type: "OFFICIAL_API",
      license: "Public Transit Operational Statistics",
      last_verified_at: "2026-09-19T14:15:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Okupansi gerbong merupakan estimasi berdasarkan beban suspensi pegas kereta"],
    },
  },
  {
    slug: "weather-radar",
    title: "Radar Doppler Presipitasi & Angin Kencang",
    description: "Nowcasting hujan badai lokal 10 menit & peringatan angin terowongan.",
    category: "environment",
    iconName: "CloudRain",
    badge: "Doppler",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Radar Cuaca Doppler BMKG Cengkareng / Kemayoran",
      source_type: "OFFICIAL_API",
      license: "BMKG Open Weather Radar Feed",
      last_verified_at: "2026-09-19T14:30:00Z",
      freshness_cadence: "REALTIME",
      limitations: ["Nowcast 10 menit presipitasi berbasis reflektivitas dBZ radar Doppler BMKG"],
    },
  },
  {
    slug: "curbside-management",
    title: "Manajemen Dinamis Tepi Jalan & Drop-off",
    description: "Zonasi adaptif bongkar muat pagi, parklet makan siang & ride-hail malam.",
    category: "smart-city",
    iconName: "Maximize2",
    badge: "Curbside",
    state: "DERIVED",
    provenance: {
      source_name: "Regulasi Zonasi Tepi Jalan Dishub DKI Jakarta",
      source_type: "GOVERNMENT_PORTAL",
      license: "Dishub Traffic Management Policy",
      last_verified_at: "2026-08-20T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["Alokasi waktu (temporal allocation) terikat aturan pembagian jam operasional resmi"],
    },
  },
  {
    slug: "waste-recycling",
    title: "Sensor Tempat Sampah Pintar & Bank Sampah",
    description: "Fasilitas tempat sampah, vending daur ulang & jadwal angkut DLH.",
    category: "environment",
    iconName: "Recycle",
    badge: "Circular",
    state: "REAL",
    provenance: {
      source_name: "Dinas Lingkungan Hidup (DLH) DKI Jakarta - Peta Bank Sampah",
      source_type: "GOVERNMENT_PORTAL",
      license: "DLH Open Environmental Data",
      last_verified_at: "2026-09-10T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Titik fasilitas fisik terverifikasi; sensor ultrasonik pada tong contoh kawasan percontohan"],
    },
  },
  {
    slug: "pedestrian-bridges",
    title: "Jembatan Penyeberangan & Terowongan Pedestrian",
    description: "Jalur penyeberangan multi-level, status eskalator/lift & akses stasiun.",
    category: "mobility",
    iconName: "Layers",
    badge: "Skywalks",
    state: "REAL",
    provenance: {
      source_name: "Dinas Bina Marga DKI Jakarta & OpenStreetMap Way Layer",
      source_type: "GOVERNMENT_PORTAL",
      license: "ODbL v1.0",
      last_verified_at: "2026-09-15T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Terintegrasi ke graf penyeberangan pejalan kaki Valhalla"],
    },
  },
  {
    slug: "nightlife-zones",
    title: "Distrik Ekonomi Malam & 24 Jam Terpadu",
    description: "Peta zona hiburan malam berizin, keamanan patroli & transit larut malam.",
    category: "commerce",
    iconName: "Moon",
    badge: "24h Economy",
    state: "DERIVED",
    provenance: {
      source_name: "Dinas Pariwisata dan Ekonomi Kreatif (Disparekraf) DKI Jakarta",
      source_type: "GOVERNMENT_PORTAL",
      license: "Disparekraf Official Directory",
      last_verified_at: "2026-09-01T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Hanya mencatat jam buka operasional izin usaha; tidak membuat klaim keamanan mutlak"],
    },
  },
  {
    slug: "street-performers",
    title: "Panggung Seni Jalanan & Mural Publik",
    description: "Lokasi busking berlisensi, jadwal musisi lokal & jalur wisata grafiti.",
    category: "commerce",
    iconName: "Music",
    badge: "Creative",
    state: "USER_SUBMITTED",
    provenance: {
      source_name: "Komunitas Seni Terowongan Kendal & Disbud DKI",
      source_type: "COMMUNITY_SURVEY",
      license: "Creative Commons Attribution",
      last_verified_at: "2026-09-12T00:00:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Jadwal penampilan diperbarui oleh komunitas buskers terdaftar"],
    },
  },
  {
    slug: "freight-delivery",
    title: "Pusat Distribusi Cargo Bike Ramah Lingkungan",
    description: "Hub konsolidasi barang last-mile ramah emisi untuk kawasan pedestrian.",
    category: "logistics",
    iconName: "Package",
    badge: "Zero Emission",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Asosiasi Logistik Pedestrian Indonesia & Konsorsium Cargo Bike",
      source_type: "OFFICIAL_API",
      license: "Green Logistics Partner Agreement",
      last_verified_at: "2026-09-18T10:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Jangkauan armada dibatasi radius 3.5 km dari depot konsolidasi transit"],
    },
  },

  // 41-50
  {
    slug: "airport-express",
    title: "Hub Intermoda Kereta Bandara & City Check-in",
    description: "Jadwal express kereta bandara, check-in bagasi kota & integrasi tiket.",
    category: "mobility",
    iconName: "PlaneTakeoff",
    badge: "Airport Link",
    state: "AUTHORIZED",
    provenance: {
      source_name: "PT Railink Indonesia & Bandara Soekarno-Hatta (InJourney Aviation)",
      source_type: "OFFICIAL_API",
      license: "Official Timetable Public Registry",
      last_verified_at: "2026-09-19T08:00:00Z",
      freshness_cadence: "DAILY",
      limitations: ["Jadwal keberangkatan resmi dan tarif integrasi BNI City - Dukuh Atas"],
    },
  },
  {
    slug: "pedestrian-flow-ai",
    title: "Simulator Dinamika Arus Pejalan Kaki",
    description: "Model AI antrian, kecepatan langkah & mitigasi penyempitan bottleneck.",
    category: "smart-city",
    iconName: "Activity",
    badge: "Crowd Sim",
    state: "DERIVED",
    provenance: {
      source_name: "Pipeline Computer Vision Deteksi Aliran Pejalan Kaki GETRA",
      source_type: "VALHALLA_GIS_ENGINE",
      license: "GETRA Flow Dynamics Algorithm",
      last_verified_at: "2026-09-19T14:30:00Z",
      freshness_cadence: "REALTIME",
      limitations: ["Aliran dihitung dari tracking objek optik kamera resmi tanpa estimasi fiktif"],
    },
  },
  {
    slug: "cross-border-tariffs",
    title: "Kalkulator Tarif Bea Cukai Kerajinan UMKM",
    description: "Pengecekan kode HS, bea masuk & pembebasan ekspor produk lokal.",
    category: "commerce",
    iconName: "FileSpreadsheet",
    badge: "Cross Border",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Indonesia National Single Window (INSW) & Ditjen Bea Cukai",
      source_type: "GOVERNMENT_PORTAL",
      license: "Buku Tarif Kepabeanan Indonesia (BTKI) 2022/2026",
      last_verified_at: "2026-09-01T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["AI menjelaskan klasifikasi kode HS resmi, tidak mengarang besaran bea masuk"],
    },
  },
  {
    slug: "medical-tourism",
    title: "Koridor Wisata Medis & Faskes Akreditasi",
    description: "Rumah sakit berstandar internasional, layanan multibahasa & akses transit.",
    category: "safety",
    iconName: "Cross",
    badge: "Healthcare",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Kementerian Kesehatan RI & Joint Commission International (JCI)",
      source_type: "GOVERNMENT_PORTAL",
      license: "Kemenkes Directory of Accredited Hospitals",
      last_verified_at: "2026-08-01T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["Fasilitas yang tercantum memiliki akreditasi JCI / KARS paripurna resmi"],
    },
  },
  {
    slug: "satellite-ndvi",
    title: "Monitoring Kekeringan Vegetasi NDVI Satelit",
    description: "Spektrum kehijauan daun Sentinel-2 untuk mitigasi kekeringan pohon kota.",
    category: "environment",
    iconName: "Satellite",
    badge: "NDVI",
    state: "DERIVED",
    provenance: {
      source_name: "European Space Agency (ESA) Copernicus Sentinel-2 MSI Level-2A",
      source_type: "SATELLITE_REMOTE_SENSING",
      license: "Copernicus Open Access Hub",
      last_verified_at: "2026-09-12T03:15:00Z",
      freshness_cadence: "PERIODIC",
      limitations: ["Tanggal perekaman citra: 12 September 2026, resolusi spasial 10 meter (Band 4 & Band 8)"],
    },
  },
  {
    slug: "wildlife-corridors",
    title: "Koridor Lintasan Satwa Liar Urban",
    description: "Konektivitas kanopi pepohonan penyeberangan burung & fauna kota.",
    category: "environment",
    iconName: "Feather",
    badge: "Ecology",
    state: "DERIVED",
    provenance: {
      source_name: "Kementerian LHK & Peta Koridor Keanekaragaman Hayati Perkotaan",
      source_type: "GOVERNMENT_PORTAL",
      license: "KLHK Open Spatial Layer",
      last_verified_at: "2026-07-01T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Lapisan spasial habitat kanopi; tidak mengklaim pergerakan satwa secara live"],
    },
  },
  {
    slug: "sea-level-rise",
    title: "Simulator Kenaikan Muka Air Laut & Rob",
    description: "Proyeksi genangan pasang rob laut 0.5m s/d 2.0m & tanggul pengaman.",
    category: "governance",
    iconName: "AlertTriangle",
    badge: "Climate Sim",
    state: "SIMULATION",
    provenance: {
      source_name: "IPCC Sea Level Rise Inundation Model & NCICD Masterplan",
      source_type: "SCENARIO_SIMULATION",
      license: "IPCC AR6 Open Scenario Data",
      last_verified_at: "2026-09-19T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["LABEL RESMI: SKENARIO SIMULASI (BUKAN RAMALAN CUACA HARIAN). Skenario 0.5m, 1.0m, 1.5m, 2.0m."],
    },
  },
  {
    slug: "heritage-preservation",
    title: "Preservasi Fasad Arsitektur Bersejarah",
    description: "Katalog pelestarian bangunan vernakular, struktur antik & audit gempa.",
    category: "governance",
    iconName: "Shield",
    badge: "Conservation",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Tim Ahli Cagar Budaya (TACB) DKI Jakarta & UNESCO Heritage List",
      source_type: "GOVERNMENT_PORTAL",
      license: "Disbud Heritage Preservation Data",
      last_verified_at: "2026-08-01T00:00:00Z",
      freshness_cadence: "STATIC",
      limitations: ["Dokumentasi cagar budaya resmi; tanpa klaim ketahanan struktural tanpa audit teknik"],
    },
  },
  {
    slug: "global-embassy",
    title: "Navigasi Kedutaan & Layanan Konsuler",
    description: "Lokasi perwakilan diplomatik dunia, hotline darurat WNA & izin visa.",
    category: "governance",
    iconName: "Globe",
    badge: "Diplomatic",
    state: "AUTHORIZED",
    provenance: {
      source_name: "Kementerian Luar Negeri RI (Kemlu) - Diplomatic Missions Directory",
      source_type: "GOVERNMENT_PORTAL",
      license: "Kemlu Official Diplomatic Registry",
      last_verified_at: "2026-09-15T00:00:00Z",
      freshness_cadence: "HISTORICAL",
      limitations: ["Hotline darurat dan alamat resmi perwakilan negara sahabat; tidak mengarang nomor fiktif"],
    },
  },
  {
    slug: "open-basemaps",
    title: "Universal Multi-Engine Basemap Switcher",
    description: "Ganti basemap bebas: OpenStreetMap, Carto Dark/Light, Satelit & Vector.",
    category: "smart-city",
    iconName: "Map",
    badge: "Multi-Basemap",
    state: "AUTHORIZED",
    provenance: {
      source_name: "OpenStreetMap Foundation & CARTO / Esri Tile Services",
      source_type: "OFFICIAL_API",
      license: "ODbL v1.0 & CARTO / Esri Tile Terms of Service",
      last_verified_at: "2026-09-19T00:00:00Z",
      freshness_cadence: "REALTIME",
      limitations: ["Mematuhi ketentuan atribusi, rate limit, dan hak cipta penyedia ubin peta"],
    },
  },
];

// Mock Datasets for all 50 features:

export const CCTV_FEEDS: CctvFeed[] = [
  { id: "cctv-tky-01", name: "Shibuya Scramble Crossing HD", city: "tokyo", location: "Hachiko Exit, Shibuya Station", status: "ONLINE", fps: 30, latencyMs: 124, pedestrianCount: 1420, vehicleCount: 88, congestionLevel: "HIGH", streamType: "simulated_hls" },
  { id: "cctv-sgp-01", name: "Marina Bay Boulevard Cam", city: "singapore", location: "Bayfront Avenue Intersection", status: "ONLINE", fps: 60, latencyMs: 65, pedestrianCount: 310, vehicleCount: 142, congestionLevel: "LOW", streamType: "optical_flow" },
  { id: "cctv-lon-01", name: "Oxford Circus East View", city: "london", location: "Regent St / Oxford St Crossing", status: "ONLINE", fps: 25, latencyMs: 180, pedestrianCount: 840, vehicleCount: 52, congestionLevel: "MODERATE", streamType: "simulated_hls" },
  { id: "cctv-nyc-01", name: "Times Square 42nd St Cam", city: "new-york", location: "Broadway & 7th Avenue", status: "ONLINE", fps: 30, latencyMs: 195, pedestrianCount: 2150, vehicleCount: 110, congestionLevel: "SEVERE", streamType: "simulated_hls" },
  { id: "cctv-jkt-01", name: "Bundaran HI MRT South Cam", city: "jakarta", location: "Plaza Indonesia Pedestrian Zone", status: "ONLINE", fps: 25, latencyMs: 120, pedestrianCount: 42, vehicleCount: 38, congestionLevel: "MODERATE", streamType: "hls" },
  { id: "cctv-par-01", name: "Champs-Élysées Promenade", city: "paris", location: "Avenue des Champs-Élysées 45", status: "ONLINE", fps: 30, latencyMs: 160, pedestrianCount: 590, vehicleCount: 95, congestionLevel: "LOW", streamType: "optical_flow" },
];

export const CONGESTION_ZONES: CongestionZone[] = [
  { id: "cg-01", corridor: "Sudirman - Thamrin Corridor", city: "jakarta", currentSpeedKmh: 14, freeFlowSpeedKmh: 45, delayMinutes: 28, level: "HEAVY", bottleneckCause: "Antrian putaran balik & pertemuan bus TransJakarta", suggestedDetour: "Gunakan jalur pejalan kaki terpadu MRT Dukuh Atas - HI" },
  { id: "cg-02", corridor: "Marylebone Road / Euston Flyover", city: "london", currentSpeedKmh: 9, freeFlowSpeedKmh: 35, delayMinutes: 34, level: "GRIDLOCK", bottleneckCause: "Pekerjaan utilitas pipa & kepadatan lampu merah", suggestedDetour: "Beralih ke KRL Thameslink atau jalur sepeda Cycle Superhighway 1" },
  { id: "cg-03", corridor: "FDR Drive Southbound", city: "new-york", currentSpeedKmh: 18, freeFlowSpeedKmh: 55, delayMinutes: 22, level: "HEAVY", bottleneckCause: "Penyempitan lajur jembatan Williamsburg", suggestedDetour: "Gunakan Subway L-Train atau East River Ferry" },
  { id: "cg-04", corridor: "Orchard Road Commercial Strip", city: "singapore", currentSpeedKmh: 28, freeFlowSpeedKmh: 40, delayMinutes: 6, level: "MODERATE", bottleneckCause: "Antrian parkir mall pada jam belanja sore", suggestedDetour: "Sistem ERP gantry aktif; gunakan MRT North-South Line" },
];

export const MULTIMODAL_ROUTES: MultimodalRoute[] = [
  {
    id: "mm-01",
    name: "Express Eco Journey (Tokyo -> Yokohama)",
    origin: "Tokyo Station Marunouchi",
    destination: "Yokohama Minato Mirai",
    totalDurationMin: 38,
    totalCost: "¥ 510 (~Rp 54.000)",
    totalCarbonKg: 0.85,
    steps: [
      { mode: "WALK", instruction: "Jalan kaki dari Marunouchi Plaza ke peron Tokaido Line", durationMinutes: 4, distanceKm: 0.25, costEstimate: "Gratis", carbonGrams: 0 },
      { mode: "RAIL", instruction: "Naik JR Tokaido Line (Rapid Acty) menuju Yokohama", durationMinutes: 26, distanceKm: 28.5, costEstimate: "¥ 490", carbonGrams: 820 },
      { mode: "METRO", instruction: "Ganti ke Minatomirai Line menuju Sakuragicho", durationMinutes: 4, distanceKm: 1.8, costEstimate: "¥ 20", carbonGrams: 30 },
      { mode: "WALK", instruction: "Jalan santai menyeberang jembatan pedestrian Minato Mirai", durationMinutes: 4, distanceKm: 0.3, costEstimate: "Gratis", carbonGrams: 0 },
    ],
  },
  {
    id: "mm-02",
    name: "Central London Heritage Loop",
    origin: "King's Cross St. Pancras",
    destination: "Southbank Centre",
    totalDurationMin: 22,
    totalCost: "£ 2.80 (~Rp 58.000)",
    totalCarbonKg: 0.35,
    steps: [
      { mode: "METRO", instruction: "Naik Piccadilly Line ke Holborn", durationMinutes: 7, distanceKm: 2.1, costEstimate: "£ 2.80", carbonGrams: 180 },
      { mode: "BIKE", instruction: "Buka sepeda Santander Cycle di Kingsway", durationMinutes: 9, distanceKm: 1.9, costEstimate: "Termasuk harian", carbonGrams: 10 },
      { mode: "WALK", instruction: "Jalan melintasi Waterloo Bridge menikmati panorama Sungai Thames", durationMinutes: 6, distanceKm: 0.5, costEstimate: "Gratis", carbonGrams: 0 },
    ],
  },
];

export const AQI_STATIONS: AqiStation[] = [
  { id: "aqi-01", name: "Chiyoda Clean Air Sensor", city: "tokyo", aqi: 24, status: "GOOD", pm25: 6.2, pm10: 12.1, tempCelsius: 21.4, humidityPct: 58, dominantPollutant: "PM2.5" },
  { id: "aqi-02", name: "Marina South Telemetry", city: "singapore", aqi: 38, status: "GOOD", pm25: 9.4, pm10: 18.0, tempCelsius: 29.8, humidityPct: 82, dominantPollutant: "O3" },
  { id: "aqi-03", name: "Hyde Park Acoustic & Air", city: "london", aqi: 45, status: "GOOD", pm25: 11.0, pm10: 22.4, tempCelsius: 16.5, humidityPct: 65, dominantPollutant: "NO2" },
  { id: "aqi-04", name: "Midtown Manhattan Sensor #4", city: "new-york", aqi: 68, status: "MODERATE", pm25: 20.3, pm10: 34.0, tempCelsius: 22.0, humidityPct: 54, dominantPollutant: "PM2.5" },
  { id: "aqi-05", name: "Gelora Bung Karno Urban Green", city: "jakarta", aqi: 92, status: "MODERATE", pm25: 32.1, pm10: 55.4, tempCelsius: 31.5, humidityPct: 75, dominantPollutant: "PM2.5" },
];

export const HEAT_ISLAND_ZONES: HeatIslandZone[] = [
  { id: "hi-01", name: "Ginza Asphalt & Glass Canyon", city: "tokyo", surfaceTempC: 39.4, ambientTempC: 31.2, treeCanopyPct: 8, coolingAmenity: "Kipas kabut air halus di stasiun", thermalRisk: "HIGH_STRESS", acquisitionDate: "2026-09-10", sensor: "Landsat-9 TIRS" },
  { id: "hi-02", name: "Gardens by the Bay Biophilic Hub", city: "singapore", surfaceTempC: 28.1, ambientTempC: 28.9, treeCanopyPct: 62, coolingAmenity: "Supertrees & kanopi rimbun", thermalRisk: "COMFORTABLE", acquisitionDate: "2026-09-08", sensor: "Landsat-8 TIRS" },
  { id: "hi-03", name: "Kuningan Epicentrum Concrete Zone", city: "jakarta", surfaceTempC: 41.8, ambientTempC: 33.5, treeCanopyPct: 14, coolingAmenity: "Kanal Rasuna & pohon peneduh", thermalRisk: "EXTREME", acquisitionDate: "2026-09-10", sensor: "Landsat-9 TIRS" },
];

export const ELEVATION_PROFILE: ElevationProfilePoint[] = [
  { distanceMeters: 0, elevationMeters: 12, gradientPct: 1.2, accessibilityRating: "EXCELLENT" },
  { distanceMeters: 200, elevationMeters: 14, gradientPct: 1.0, accessibilityRating: "EXCELLENT" },
  { distanceMeters: 400, elevationMeters: 19, gradientPct: 2.5, accessibilityRating: "EXCELLENT" },
  { distanceMeters: 600, elevationMeters: 31, gradientPct: 6.0, accessibilityRating: "MODERATE" },
  { distanceMeters: 800, elevationMeters: 48, gradientPct: 8.5, accessibilityRating: "STEEP" },
  { distanceMeters: 1000, elevationMeters: 52, gradientPct: 2.0, accessibilityRating: "EXCELLENT" },
];

export const SMART_PARKING_LOTS: SmartParkingLot[] = [
  { id: "sp-01", name: "Shinjuku Station South Multi-Story", city: "tokyo", totalSpots: 480, availableSpots: 72, evChargingSpots: 32, disabledSpots: 18, hourlyRate: "¥ 600/jam", occupancyTrend: "FILLING_UP" },
  { id: "sp-02", name: "Suntec City Curbside Smart Bay", city: "singapore", totalSpots: 1200, availableSpots: 384, evChargingSpots: 64, disabledSpots: 40, hourlyRate: "S$ 2.40/jam", occupancyTrend: "STABLE" },
  { id: "sp-03", name: "Blok M Hub Transit Parking", city: "jakarta", totalSpots: 350, availableSpots: 45, evChargingSpots: 12, disabledSpots: 10, hourlyRate: "Rp 5.000/jam", occupancyTrend: "FILLING_UP" },
];

export const EV_CHARGING_HUBS: EvChargingHub[] = [
  { id: "ev-01", name: "Tokyo Tower Supercharger Hub", city: "tokyo", operator: "e-Mobility Power", powerKw: 150, plugs: [{ type: "CHAdeMO", available: 6, total: 8 }, { type: "CCS2", available: 4, total: 4 }], pricePerKwh: "¥ 45/kWh", status: "AVAILABLE" },
  { id: "ev-02", name: "Jewel Changi Fast Electric Port", city: "singapore", operator: "SP Group", powerKw: 120, plugs: [{ type: "CCS2", available: 10, total: 12 }, { type: "Type2", available: 6, total: 6 }], pricePerKwh: "S$ 0.65/kWh", status: "AVAILABLE" },
  { id: "ev-03", name: "SPKLU PLN Sarinah Thamrin", city: "jakarta", operator: "PLN Indonesia", powerKw: 200, plugs: [{ type: "CCS2", available: 2, total: 4 }, { type: "CHAdeMO", available: 1, total: 2 }], pricePerKwh: "Rp 2.466/kWh", status: "AVAILABLE" },
];

export const NOISE_STATIONS: NoiseStation[] = [
  { id: "ns-01", zone: "Shibuya Crossing Commercial Strip", city: "tokyo", currentDb: 74, limitDb: 70, classification: "NOISY", primaryNoiseSource: "Layar reklame visual & langkah ribuan pejalan kaki" },
  { id: "ns-02", zone: "Bishan - Ang Mo Kio Park Buffer", city: "singapore", currentDb: 48, limitDb: 55, classification: "QUIET", primaryNoiseSource: "Desir angin & aliran sungai taman" },
  { id: "ns-03", zone: "Flyover Semanggi Interchange", city: "jakarta", currentDb: 82, limitDb: 75, classification: "EXCESSIVE", primaryNoiseSource: "Knalpot bus & percepatan kendaraan di tanjakan" },
];

export const FLOOD_STATIONS: FloodStation[] = [
  { id: "fl-01", name: "Manggarai Floodgate Telemetry", stationName: "Pintu Air Manggarai", riverOrCanal: "Sungai Ciliwung", city: "jakarta", waterLevelMeters: 670, warningLevelMeters: 750, dangerLevelMeters: 850, status: "NORMAL", trend: "STABLE", pumpStatus: "OPERATIONAL" },
  { id: "fl-02", name: "Marina Barrage Tidal Gates", stationName: "Marina Catchment Telemetry", riverOrCanal: "Singapore River Basin", city: "singapore", waterLevelMeters: 1.8, warningLevelMeters: 2.8, dangerLevelMeters: 3.5, status: "NORMAL", trend: "RECEDING", pumpStatus: "OPERATIONAL" },
  { id: "fl-03", name: "Thames Barrier East Gate Sensor", stationName: "Woolwich Reach Monitor", riverOrCanal: "River Thames", city: "london", waterLevelMeters: 3.2, warningLevelMeters: 4.8, dangerLevelMeters: 6.0, status: "NORMAL", trend: "STABLE", pumpStatus: "OPERATIONAL" },
];

export const SOLAR_SHADOW_ZONES: SolarShadowZone[] = [
  { id: "ss-01", streetName: "Roppongi Hills North Promenade", city: "tokyo", uvIndex: 4, shadowCoveragePct: 78, solarIrradianceWm2: 240, recommendedTime: "11:00 - 14:00 (Keteduhan Optimal Gedung Tinggi)" },
  { id: "ss-02", streetName: "Sudirman Pedestrian Avenue", city: "jakarta", uvIndex: 9, shadowCoveragePct: 45, solarIrradianceWm2: 780, recommendedTime: "06:30 - 09:30 & 16:00 - 18:00" },
];

export const EVACUATION_HUBS: EvacuationHub[] = [
  { id: "evac-01", shelterName: "Yoyogi Park Disaster Relief Center", city: "tokyo", capacityPersons: 45000, currentOccupancy: 0, hazardsCovered: ["Gempa Bumi", "Kebakaran Kota"], distanceMeters: 450, status: "STANDBY" },
  { id: "evac-02", shelterName: "Stadion Utama Gelora Bung Karno", city: "jakarta", capacityPersons: 78000, currentOccupancy: 0, hazardsCovered: ["Banjir Bandang", "Darurat Sipil"], distanceMeters: 380, status: "STANDBY" },
];

export const MICROMOBILITY_HUBS: MicromobilityHub[] = [
  { id: "mb-01", operator: "Luup E-Scooter / E-Bike", type: "E_BIKE", city: "tokyo", availableVehicles: 18, avgBatteryPct: 88, unlockCost: "¥ 50", perMinuteCost: "¥ 15/menit" },
  { id: "mb-02", operator: "Anywheel Smart Bike", type: "BIKE", city: "singapore", availableVehicles: 24, avgBatteryPct: 100, unlockCost: "S$ 0", perMinuteCost: "S$ 1.00/30 menit" },
  { id: "mb-03", operator: "GOWES Bike Share MRT", type: "E_BIKE", city: "jakarta", availableVehicles: 12, avgBatteryPct: 76, unlockCost: "Rp 3.000", perMinuteCost: "Rp 1.000/5 menit" },
];

export const GTFS_VEHICLES: GtfsVehiclePosition[] = [
  { id: "gtfs-01", routeId: "MRT-NSL-04", headsign: "Jurong East via Woodlands", city: "singapore", nextStop: "Orchard Station", etaMinutes: 2, delaySeconds: 15, congestion: "RUNNING_ON_TIME", timestamp: "2026-09-19T14:32:00Z" },
  { id: "gtfs-02", routeId: "JR-YAMANOTE-22", headsign: "Inner Loop (Shinjuku - Shibuya)", city: "tokyo", nextStop: "Harajuku Station", etaMinutes: 1, delaySeconds: 0, congestion: "RUNNING_ON_TIME", timestamp: "2026-09-19T14:32:00Z" },
  { id: "gtfs-03", routeId: "TJ-CORR-1", headsign: "Blok M -> Kota", city: "jakarta", nextStop: "Halte Tosari ICBC", etaMinutes: 4, delaySeconds: 90, congestion: "SLIGHT_DELAY", timestamp: "2026-09-19T14:32:00Z" },
];

export const WALK_SCORES: CityWalkScore[] = [
  {
    address: "Ginza 4-Chome, Chuo-ku",
    city: "tokyo",
    score: 98,
    tier: "WALKERS_PARADISE",
    amenitiesBreakdown: [
      { category: "Stasiun Transit", score: 100, countNearby: 8 },
      { category: "Restoran & Kedai", score: 99, countNearby: 420 },
      { category: "Toko Sembako/Konbini", score: 98, countNearby: 34 },
      { category: "Taman & Ruang Publik", score: 92, countNearby: 6 },
    ],
    gisComponents: {
      networkDensity: 98,
      crossingSafety: 95,
      transitProximity: 100,
      sidewalkContinuity: 99,
      slopeComfort: 98,
    },
  },
  {
    address: "Dukuh Atas TOD Hub",
    city: "jakarta",
    score: 91,
    tier: "WALKERS_PARADISE",
    amenitiesBreakdown: [
      { category: "Simpul 5 Moda Transit", score: 98, countNearby: 5 },
      { category: "Kuliner Kaki Lima & Kafe", score: 94, countNearby: 180 },
      { category: "Apotek & Kesehatan", score: 88, countNearby: 12 },
      { category: "Koneksi Jembatan Pedestrian", score: 86, countNearby: 3 },
    ],
    gisComponents: {
      networkDensity: 94,
      crossingSafety: 88,
      transitProximity: 98,
      sidewalkContinuity: 89,
      slopeComfort: 92,
    },
  },
];

export const AUDIO_TOUR_SPOTS: AudioTourSpot[] = [
  { id: "aud-01", title: "Asakusa Senso-ji & Nakamise Culinary History", city: "tokyo", durationMinutes: 18, languages: ["ID", "EN", "JA", "ZH"], snippet: "Kuil tertua Tokyo dan rahasia cemilan ningyo-yaki tradisional sejak zaman Edo.", rating: 4.9, photoUrl: "/images/sensoji.jpg" },
  { id: "aud-02", title: "Kota Tua Fatahillah & Jalur Rempah Batavia", city: "jakarta", durationMinutes: 24, languages: ["ID", "EN", "NL"], snippet: "Napak tilas gedung cagar budaya kolonial dan kedai kopi legendaris pejalan kaki.", rating: 4.8, photoUrl: "/images/kotatua.jpg" },
];

export const TAX_REFUND_DATA: TaxRefundItem[] = [
  { country: "Jepang", currency: "JPY", standardVatPct: 10, minPurchaseAmount: 5000, refundMethod: "Potongan langsung di kasir toko berlogo Japan Tax-Free", nearestRefundCounter: "Ginza Mitsukoshi 7F Tax Refund Lounge" },
  { country: "Singapura", currency: "SGD", standardVatPct: 9, minPurchaseAmount: 100, refundMethod: "Kios eTRS elektronik di Bandara Changi", nearestRefundCounter: "Changi Terminal 3 Departure Hall eTRS" },
  { country: "Indonesia", currency: "IDR", standardVatPct: 11, minPurchaseAmount: 5000000, refundMethod: "VAT Refund Counter Bandara Soekarno-Hatta T3", nearestRefundCounter: "Soekarno-Hatta Terminal 3 International" },
];

export const MARKET_PHRASES: MarketPhrase[] = [
  { category: "PRICE", indonesian: "Bisa kurang sedikit harganya?", english: "Could you give a small discount?", japanese: "少し安くしてもらえますか？ (Sukoshi yasuku shitemoraemasu ka?)", chinese: "能便宜一点吗？ (Néng piányi yīdiǎn ma?)", french: "Pouvez-vous faire un petit rabais ?" },
  { category: "ALLERGY", indonesian: "Saya alergi kacang dan udang", english: "I am allergic to peanuts and shrimp", japanese: "ピーナッツとエビのアレルギーがあります (Pīnattsu to ebi no arerugī ga arimasu)", chinese: "我对花生和虾过敏 (Wǒ duì huāshēng hé xiā guòmǐn)", french: "Je suis allergique aux cacahuètes et aux crevettes" },
  { category: "GREETING", indonesian: "Halo, apa makanan yang paling direkomendasikan di sini?", english: "Hello, what is your most recommended specialty here?", japanese: "こんにちは、ここでの一番のおすすめは何ですか？", chinese: "你好，这里最推荐的特色菜是什么？", french: "Bonjour, quelle est votre spécialité la plus recommandée ici ?" },
];

export const CARBON_LISTINGS: CarbonListing[] = [
  { id: "carb-01", projectName: "Java Peatland & Mangrove Blue Carbon Corridor", city: "jakarta", registry: "Verra VCS", pricePerTonUsd: 14.5, availableTons: 125000, impactType: "Restorasi mangrove pesisir utara Jakarta & penyerapan karbon biru" },
  { id: "carb-02", projectName: "Hokkaido Forest Biomass & Urban Canopy", city: "tokyo", registry: "Gold Standard", pricePerTonUsd: 22.0, availableTons: 64000, impactType: "Pengelolaan hutan berkelanjutan & kompensasi emisi transportasi publik" },
];

export const DIGITAL_TWIN_MODELS: DigitalTwinModel[] = [
  { id: "dt-01", district: "Marunouchi - Otemachi Financial Core", city: "tokyo", lodLevel: "LoD2", buildingCount: 342, avgHeightMeters: 148, solarRooftopPotentialGwh: 48.2 },
  { id: "dt-02", district: "Sudirman Central Business District (SCBD)", city: "jakarta", lodLevel: "LoD2", buildingCount: 184, avgHeightMeters: 165, solarRooftopPotentialGwh: 36.5 },
];

export const ROAD_DEFECTS: RoadDefect[] = [
  { id: "rd-01", location: "Jl. Barito I No. 12 Trotoar Depan Taman", city: "jakarta", defectType: "POTHOLE", severity: "CRITICAL", confidenceScore: 0.94, repairStatus: "WORK_ORDER_ISSUED" },
  { id: "rd-02", location: "Kappabashi Kitchen Town Pavement", city: "tokyo", defectType: "ALLIGATOR_CRACK", severity: "LOW", confidenceScore: 0.88, repairStatus: "REPORTED" },
];

export const DRONE_CORRIDORS: DroneCorridor[] = [
  { id: "dr-01", corridorName: "Tokyo Bay Coastal Medical Delivery Line", city: "tokyo", minAltitudeMeters: 60, maxAltitudeMeters: 120, airspaceClass: "RESTRICTED", currentTrafficUav: 4 },
  { id: "dr-02", corridorName: "Ciliwung River Logistics Skyway", city: "jakarta", minAltitudeMeters: 45, maxAltitudeMeters: 90, airspaceClass: "AUTHORIZATION_REQUIRED", currentTrafficUav: 2 },
];

export const PORT_TERMINALS: PortLogisticsTerminal[] = [
  { id: "pt-01", portName: "Port of Singapore (PSA Tuas Mega Port)", city: "singapore", teuCapacityAnnual: "65 Juta TEU", currentVesselCount: 78, avgBerthWaitHours: 2.1, railConnectivity: true },
  { id: "pt-02", portName: "Pelabuhan Tanjung Priok (JICT)", city: "jakarta", teuCapacityAnnual: "8.5 Juta TEU", currentVesselCount: 26, avgBerthWaitHours: 14.5, railConnectivity: true },
];

export const HISTORICAL_SLICES: HistoricalTimeSlice[] = [
  { year: 1970, urbanAreaSqKm: 180, populationMillions: 4.5, keyMilestone: "Pembangunan awal koridor jalan protokol Thamrin & Monas" },
  { year: 1995, urbanAreaSqKm: 420, populationMillions: 8.2, keyMilestone: "Perluasan kawasan industri Jabotabek & jalan tol lingkar dalam" },
  { year: 2026, urbanAreaSqKm: 860, populationMillions: 11.4, keyMilestone: "Integrasi jaringan MRT, LRT, Kereta Cepat Whoosh & pedestrianisasi modern" },
];

export const DEMOGRAPHIC_ZONES: DemographicZone[] = [
  { id: "demo-01", zoneName: "Setiabudi - Kuningan Commercial Belt", city: "jakarta", popDensityPerSqKm: 16400, medianIncomeAnnualUsd: 8500, daytimeCommuterInflux: 340000, youthPopulationPct: 42 },
  { id: "demo-02", zoneName: "Shinjuku Special Ward", city: "tokyo", popDensityPerSqKm: 19200, medianIncomeAnnualUsd: 46000, daytimeCommuterInflux: 780000, youthPopulationPct: 28 },
];

export const PUBLIC_WIFI_SPOTS: PublicWifiSpot[] = [
  { id: "wifi-01", ssid: "Wireless@SGx Free", location: "Orchard MRT Concourse", city: "singapore", speedMbps: 185, status: "ACTIVE", isFree: true },
  { id: "wifi-02", ssid: "JAKWIFI_PEMPROV_DKI", location: "Taman Suropati Menteng", city: "jakarta", speedMbps: 45, status: "ACTIVE", isFree: true },
];

export const GREEN_SPACES: GreenSpace[] = [
  { id: "gs-01", parkName: "Shinjuku Gyoen National Garden", city: "tokyo", areaHectares: 58.3, ndviScore: 0.82, treeCanopyCoverPct: 74, amenities: ["Danau buatan", "Taman tradisional Jepang", "Jalur ramah kursi roda"] },
  { id: "gs-02", parkName: "Tebet Eco Park", city: "jakarta", areaHectares: 7.3, ndviScore: 0.74, treeCanopyCoverPct: 65, amenities: ["Infinity Link Bridge", "Wetland pemurni air", "Taman bermain anak ramah difabel"] },
];

export const HERITAGE_SITES: HeritageSite[] = [
  { id: "hs-01", name: "Kuil Meiji Jingu & Hutan Keramat", city: "tokyo", unescoStatus: "TENTATIVE", yearBuilt: 1920, architecturalStyle: "Nagare-zukuri tradisional kayu cemara", visitorGuidelines: "Jaga keheningan; jangan membawa drone atau merusak vegetasi keramat." },
  { id: "hs-02", name: "Museum Sejarah Jakarta (Fatahillah)", city: "jakarta", unescoStatus: "TENTATIVE", yearBuilt: 1710, architecturalStyle: "Nederlandse Barok (Balai Kota Batavia)", visitorGuidelines: "Gunakan alas kaki lunak saat memasuki ruang kayu bersejarah." },
];

export const WATER_REFILL_POINTS: WaterRefillPoint[] = [
  { id: "wr-01", location: "Tebet Eco Park Plaza Selatan", city: "jakarta", waterQualityIndex: "TDS < 15 ppm (Steril UV + RO)", bottlesSavedTotal: 18450, isChilled: true, isAccessible: true },
  { id: "wr-02", location: "Gardens by the Bay Supertree Walkway", city: "singapore", waterQualityIndex: "PUB NEWater Direct (Potable)", bottlesSavedTotal: 84200, isChilled: true, isAccessible: true },
];

export const ACCESSIBLE_RESTROOMS: AccessibleRestroom[] = [
  { id: "ar-01", location: "Stasiun MRT Bundaran HI B2 Concourse", city: "jakarta", hasWheelchairRamp: true, hasEmergencyPullCord: true, hasBabyChangingTable: true, cleanlinessScore: 4.9, hours: "05:00 - 24:00" },
  { id: "ar-02", location: "Tokyo Station Marunouchi Central", city: "tokyo", hasWheelchairRamp: true, hasEmergencyPullCord: true, hasBabyChangingTable: true, cleanlinessScore: 5.0, hours: "24 Jam Non-Stop" },
];

// 31-50 Datasets
export const STREET_LIGHTING_POLES: StreetLightingPole[] = [
  { id: "sl-01", poleNumber: "SL-SDR-442", city: "jakarta", illuminanceLux: 48, lumensOutput: 12000, status: "OPTIMAL", solarPowered: true },
  { id: "sl-02", poleNumber: "SL-GIN-109", city: "tokyo", illuminanceLux: 62, lumensOutput: 15000, status: "OPTIMAL", solarPowered: false },
];

export const INCIDENT_ALERTS: IncidentDispatchAlert[] = [
  { id: "inc-01", incidentType: "MEDICAL", city: "jakarta", location: "Jl. Jend. Sudirman depan Menara Astra", priority: "HIGH", respondingUnits: ["Ambulans Gawat Darurat 112 Unit #14"], etaMinutes: 4 },
  { id: "inc-02", incidentType: "TRAFFIC_ACCIDENT", city: "london", location: "Blackfriars Bridge North End", priority: "MEDIUM", respondingUnits: ["City Police Traffic Moto #2"], etaMinutes: 3 },
];

export const CARRIAGE_CROWDING: CarriageCrowding[] = [
  { carriageNumber: 1, densityLevel: "SEATS_AVAILABLE", passengerCountEst: 32, recommendedBoarding: true },
  { carriageNumber: 2, densityLevel: "STANDING_ROOM_ONLY", passengerCountEst: 68, recommendedBoarding: false },
  { carriageNumber: 3, densityLevel: "HIGH_CROWDING", passengerCountEst: 110, recommendedBoarding: false },
  { carriageNumber: 4, densityLevel: "HIGH_CROWDING", passengerCountEst: 114, recommendedBoarding: false },
  { carriageNumber: 5, densityLevel: "STANDING_ROOM_ONLY", passengerCountEst: 72, recommendedBoarding: false },
  { carriageNumber: 6, densityLevel: "SEATS_AVAILABLE", passengerCountEst: 38, recommendedBoarding: true },
];

export const DOPPLER_FRAMES: DopplerRadarFrame[] = [
  { timestamp: "18:30 WIB", precipitationMmPerHour: 0.0, stormCellIntensity: "NONE", windGustKmh: 12 },
  { timestamp: "18:40 WIB", precipitationMmPerHour: 4.2, stormCellIntensity: "LIGHT_RAIN", windGustKmh: 18 },
  { timestamp: "18:50 WIB", precipitationMmPerHour: 18.5, stormCellIntensity: "HEAVY_DOWNPOUR", windGustKmh: 34 },
  { timestamp: "19:00 WIB (Nowcast)", precipitationMmPerHour: 32.0, stormCellIntensity: "THUNDERSTORM", windGustKmh: 45 },
];

export const CURBSIDE_ZONES: CurbsideZone[] = [
  { id: "cz-01", street: "Melawai Raya Culinary Strip", city: "jakarta", activeMode: "OUTDOOR_DINING", ratePerHourUsd: 1.5, occupancyPct: 92 },
  { id: "cz-02", street: "Cecil Street Financial Zone", city: "singapore", activeMode: "COMMERCIAL_LOADING", ratePerHourUsd: 4.0, occupancyPct: 65 },
];

export const SMART_WASTE_BINS: SmartWasteBin[] = [
  { id: "wb-01", location: "Dukuh Atas Skatepark Walkway", city: "jakarta", fillLevelPct: 42, binType: "RECYCLABLE", lastEmptiedHoursAgo: 4, status: "NORMAL" },
  { id: "wb-02", location: "Orchard Road Mandarin Gallery", city: "singapore", fillLevelPct: 88, binType: "GENERAL", lastEmptiedHoursAgo: 8, status: "NEEDS_COLLECTION" },
];

export const PEDESTRIAN_BRIDGES: PedestrianBridge[] = [
  { id: "pb-01", name: "JPO Pinisi Karet Sudirman", city: "jakarta", lengthMeters: 92, hasElevator: true, hasEscalator: false, isCoveredWeatherProof: true, interconnectedStation: "Halte Karet & Stasiun KRL Sudirman Baru" },
  { id: "pb-02", name: "Helix Bridge Marina Bay", city: "singapore", lengthMeters: 280, hasElevator: true, hasEscalator: false, isCoveredWeatherProof: true, interconnectedStation: "Bayfront MRT Station" },
];

export const NIGHTLIFE_DISTRICTS: NightlifeDistrict[] = [
  { id: "nl-01", districtName: "Roppongi Entertainment Quarter", city: "tokyo", openVenuesCount: 320, safetyScore: 88, lateNightTransitLines: ["Hibiya Line Night Bus", "Oedo Line 24h Night Loop"], vibe: "Gemerlap kosmopolitan, bistro internasional & live music jazz" },
  { id: "nl-02", districtName: "Senopati - Gunawarman Night Dining Hub", city: "jakarta", openVenuesCount: 140, safetyScore: 84, lateNightTransitLines: ["TransJakarta Koridor 1 (24 Jam)", "MRT Night Owl Feeder"], vibe: "Restoran fusion modern, speakeasy bar & artisan bakery" },
];

export const BUSKING_SPOTS: BuskingSpot[] = [
  { id: "bs-01", spotName: "Terowongan Kendal Acoustic Zone", city: "jakarta", currentPerformer: "Arga & The City Strings", genre: "Indie Pop Akustik", permitStatus: "PERMITTED", upcomingSchedule: "Setiap hari 17:00 - 21:00 WIB" },
  { id: "bs-02", spotName: "Covent Garden West Piazza", city: "london", currentPerformer: "The London Marionettes", genre: "Street Theatre & Violin", permitStatus: "PERMITTED", upcomingSchedule: "Setiap hari 12:00 - 19:00 GMT" },
];

export const CARGO_BIKE_HUBS: CargoBikeDeliveryHub[] = [
  { id: "cb-01", hubName: "Sudirman Micro-Consolidation Depot", city: "jakarta", activeCargoBikes: 16, parcelsDispatchedToday: 480, co2SavedKgToday: 124.5, coverageRadiusKm: 3.5 },
  { id: "cb-02", hubName: "Paris Rive Gauche Green Hub", city: "paris", activeCargoBikes: 32, parcelsDispatchedToday: 1140, co2SavedKgToday: 310.0, coverageRadiusKm: 4.2 },
];

export const AIRPORT_EXPRESS_DATA: AirportExpressSchedule[] = [
  { city: "tokyo", airportCode: "NRT", trainName: "Keisei Skyliner Express", frequencyMinutes: 20, travelTimeMinutes: 36, fareAmount: "¥ 2.570", hasLuggageCheckin: false },
  { city: "london", airportCode: "LHR", trainName: "Heathrow Express", frequencyMinutes: 15, travelTimeMinutes: 15, fareAmount: "£ 25.00", hasLuggageCheckin: true },
  { city: "jakarta", airportCode: "CGK", trainName: "Railink Kereta Bandara Soetta", frequencyMinutes: 30, travelTimeMinutes: 42, fareAmount: "Rp 70.000", hasLuggageCheckin: true },
];

export const PEDESTRIAN_FLOW_MODELS: PedestrianFlowModel[] = [
  { nodeId: "node-shibuya-scramble", city: "tokyo", bottleneckIndex: 42, pedestriansPerMinute: 2200, socialDensityRating: "COMFORTABLE", flowVelocityMps: 1.3 },
  { nodeId: "node-dukuh-atas-bridge", city: "jakarta", bottleneckIndex: 68, pedestriansPerMinute: 840, socialDensityRating: "DENSE", flowVelocityMps: 0.95 },
];

export const CUSTOMS_TARIFFS: CustomsTariffItem[] = [
  { hsCode: "6204.42.00", productDescription: "Batik Katun Tulis Tradisional Indonesia", baseDutyPct: 0.0, importVatPct: 10.0, artisanExemptionAvailable: true },
  { hsCode: "0901.21.00", productDescription: "Kopi Arabika Spesialti Panggang Biji Utuh", baseDutyPct: 0.0, importVatPct: 7.0, artisanExemptionAvailable: true },
  { hsCode: "4602.19.00", productDescription: "Anyaman Rotan & Serat Alami Buatan Tangan", baseDutyPct: 0.0, importVatPct: 8.5, artisanExemptionAvailable: true },
];

export const MEDICAL_FACILITIES: MedicalTourismFacility[] = [
  { id: "med-01", hospitalName: "RSCM Kencana Pavilion Internasional", city: "jakarta", accreditation: "JCI", specialties: ["Kardiologi Terpadu", "Onkologi Presisi", "Transplantasi"], multilingualStaff: ["Indonesia", "English", "Mandarin", "Arabic"], distanceToTransitKm: 0.3 },
  { id: "med-02", hospitalName: "Mount Elizabeth Hospital Orchard", city: "singapore", accreditation: "JCI", specialties: ["Bedah Saraf", "Ortopedi Robotik", "Fertilitas IVF"], multilingualStaff: ["English", "Mandarin", "Bahasa Melayu", "Bahasa Indonesia", "Japanese"], distanceToTransitKm: 0.4 },
];

export const SATELLITE_NDVI_ZONES: SatelliteNdviZone[] = [
  { id: "ndvi-01", zone: "Monas & Medan Merdeka Green Core", city: "jakarta", meanNdvi: 0.68, droughtStressLevel: "HEALTHY", coolingDeficitCelsius: 1.2, acquisitionDate: "2026-09-12", sensor: "Sentinel-2 MSI Level-2A", resolutionMeters: 10 },
  { id: "ndvi-02", zone: "Roppongi Concrete Canyon", city: "tokyo", meanNdvi: 0.18, droughtStressLevel: "SEVERE_STRESS", coolingDeficitCelsius: 4.8, acquisitionDate: "2026-09-12", sensor: "Sentinel-2 MSI Level-2A", resolutionMeters: 10 },
];

export const WILDLIFE_CORRIDORS: WildlifeCorridor[] = [
  { id: "wc-01", corridorName: "Southern Ridges Forest Canopy Walkway", city: "singapore", targetSpecies: ["Burung Enggang Rangkong", "Lutung Kelabu", "Kupu-kupu Troides"], canopyContinuityPct: 86, crossingStructures: "Eco-Link@BKE Bridge & Forest Walk" },
  { id: "wc-02", corridorName: "Hutan Kota Srengseng Biodiversity Corridor", city: "jakarta", targetSpecies: ["Kuntul Putih", "Cekakak Sungai", "Biawak Air"], canopyContinuityPct: 62, crossingStructures: "Sabuk hijau bantaran kali pesanggrahan" },
];

export const SEA_LEVEL_SIMS: SeaLevelRiseSimulation[] = [
  { riseMeters: 0.5, inundatedAreaSqKm: 18.4, affectedPopulation: 145000, criticalAssetsAtRisk: ["Pelabuhan Muara Baru", "Pasar Ikan Luar Batang"], defenseWallStatus: "Tanggul NCICD Tahap A aktif menahan rembesan", scenarioType: "SCENARIO_NOT_FORECAST" },
  { riseMeters: 1.0, inundatedAreaSqKm: 42.1, affectedPopulation: 420000, criticalAssetsAtRisk: ["Kawasan Pergudangan Pluit", "Pintu Air Pasar Ikan", "Jalan Tol Prof. Sedyatmo"], defenseWallStatus: "Dibutuhkan peninggian pompa polder dan seawall terluar", scenarioType: "SCENARIO_NOT_FORECAST" },
  { riseMeters: 1.5, inundatedAreaSqKm: 64.2, affectedPopulation: 730000, criticalAssetsAtRisk: ["Pelabuhan Tanjung Priok Barat", "Kawasan Marunda", "Ancol Barat"], defenseWallStatus: "Skenario polder terintegrasi & peninggian tanggul rob primer", scenarioType: "SCENARIO_NOT_FORECAST" },
  { riseMeters: 2.0, inundatedAreaSqKm: 89.6, affectedPopulation: 1100000, criticalAssetsAtRisk: ["Seluruh pesisir teluk Jakarta tanpa tanggul raksasa"], defenseWallStatus: "Skenario ekstrem mitigasi tanggul laut raksasa NCICD Tahap B", scenarioType: "SCENARIO_NOT_FORECAST" },
];

export const HERITAGE_BUILDINGS: VernacularHeritageBuilding[] = [
  { id: "hb-01", buildingName: "Toko Merah Kali Besar", city: "jakarta", constructionEra: "1730 (Zaman Gubernur Jenderal Gustaaf Willem van Imhoff)", preservationStatus: "MONITORED", architecturalStyle: "Perpaduan bata merah Belanda & ornamen interior Tionghoa" },
  { id: "hb-02", buildingName: "Tokyo Station Marunouchi Red Brick Facade", city: "tokyo", constructionEra: "1914 (Arsitek Kingo Tatsuno)", preservationStatus: "PRISTINE", architecturalStyle: "Gaya Renaissance Klasik dengan kubah dodekagonal" },
];

export const DIPLOMATIC_MISSIONS: DiplomaticMission[] = [
  { id: "dip-01", countryRepresented: "Jepang (Kedutaan Besar Jepang)", missionType: "EMBASSY", city: "jakarta", address: "Jl. M.H. Thamrin No. 24, Jakarta Pusat", emergencyHotline: "+62-21-3192-4301", consularHours: "Senin - Jumat 08:30 - 15:00 WIB" },
  { id: "dip-02", countryRepresented: "Inggris (British Embassy Jakarta)", missionType: "EMBASSY", city: "jakarta", address: "Jl. Patra Kuningan Raya Blok L5-6, Setiabudi", emergencyHotline: "+62-21-2356-5200", consularHours: "Senin - Jumat 09:00 - 16:00 WIB" },
];

export const OPEN_BASEMAP_PROVIDERS: OpenBasemapProvider[] = [
  { id: "carto-dark", name: "CartoDB Dark Matter (Cyber-Spatial)", provider: "CartoDB", tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution: "&copy; OpenStreetMap contributors &copy; CARTO", maxZoom: 19, isDarkThemeRecommended: true },
  { id: "osm-standard", name: "OpenStreetMap Standard GIS", provider: "OpenStreetMap", tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap contributors", maxZoom: 19, isDarkThemeRecommended: false },
  { id: "carto-positron", name: "CartoDB Positron Minimalist Light", provider: "CartoDB", tileUrl: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attribution: "&copy; OpenStreetMap contributors &copy; CARTO", maxZoom: 19, isDarkThemeRecommended: false },
  { id: "satellite-hybrid", name: "Esri World Imagery & Satellite", provider: "Satellite", tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles &copy; Esri", maxZoom: 18, isDarkThemeRecommended: true },
];

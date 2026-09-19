import { describe, expect, it, vi, beforeEach } from "vitest";
import { AiService } from "@/src/modules/ai/ai.service";

// Mock external dependencies
const mocks = vi.hoisted(() => ({
  generateStructured: vi.fn(),
  findNear: vi.fn(),
  findNearby: vi.fn(),
  route: vi.fn(),
  findByPlaceQuery: vi.fn(),
  listApprovedEvidence: vi.fn(),
  getRequestSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/ai/provider", () => ({
  generateStructured: mocks.generateStructured,
}));

vi.mock("@/src/lib/supabase/server", () => ({
  getRequestSupabaseClient: mocks.getRequestSupabaseClient.mockReturnValue({}),
}));

vi.mock("@/src/repositories/transport-node.repository", () => ({
  TransportNodeRepository: vi.fn(function () {
    return {
      findNear: mocks.findNear.mockResolvedValue({ items: [] }),
    };
  }),
}));

vi.mock("@/src/repositories/umkm.repository", () => ({
  UmkmRepository: vi.fn(function () {
    return {
      findNearby: mocks.findNearby.mockResolvedValue([]),
    };
  }),
}));

vi.mock("@/src/features/commuter", () => ({
  CommuterNetworkRepository: vi.fn(function () {
    return {
      route: mocks.route.mockResolvedValue({ status: "FOUND", distance_m: 500, duration_s: 360 }),
      findByPlaceQuery: mocks.findByPlaceQuery.mockResolvedValue([]),
    };
  }),
}));

vi.mock(
  "@/src/features/accessibility-evidence/accessibility-evidence.repository",
  () => ({
    AccessibilityEvidenceRepository: vi.fn(function () {
      return {
        listApprovedEvidence: mocks.listApprovedEvidence.mockResolvedValue([]),
      };
    }),
  }),
);

interface AiTestQuestionItem {
  id: number;
  category: string;
  question: string;
  expectedIntent: string;
  expectedActionType?: string;
  dataDependency: string;
  context?: any;
}

export const MASTER_100_AI_QUESTIONS: AiTestQuestionItem[] = [
  // 1. UMKM Search & Discovery (1-10)
  {
    id: 1,
    category: "UMKM_SEARCH",
    question: "umkm di dekat stasiun manggarai",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Supabase Merchant Registry + OSM Transit Node",
  },
  {
    id: 2,
    category: "UMKM_SEARCH",
    question: "cari tempat makan dekat stasiun tanah abang",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Supabase Merchant Registry",
  },
  {
    id: 3,
    category: "UMKM_SEARCH",
    question: "rekomendasi coffee shop sekitar jakarta pusat",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Administrative Boundary Registry",
  },
  {
    id: 4,
    category: "UMKM_SEARCH",
    question: "kuliner murah dekat stasiun tebet",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Supabase Merchant Registry + Price Tier",
  },
  {
    id: 5,
    category: "UMKM_SEARCH",
    question: "warung bakso yang buka sekarang dekat saya",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "GPS Coordinates + Operating Hours Schedule",
    context: { origin: { latitude: -6.2, longitude: 106.8 } },
  },
  {
    id: 6,
    category: "UMKM_SEARCH",
    question: "cari toko kelontong di jakarta selatan",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Administrative Region Boundary",
  },
  {
    id: 7,
    category: "UMKM_SEARCH",
    question: "tempat ngopi ramah pejalan kaki di blok m",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Walkshed Index + Merchant Category",
  },
  {
    id: 8,
    category: "UMKM_SEARCH",
    question: "rekomendasi makanan khas padang dekat stasiun juanda",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Cuisine Category + Transit Station Proximity",
  },
  {
    id: 9,
    category: "UMKM_SEARCH",
    question: "cari restoran seafood di jakarta utara",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Coastal District Registry",
  },
  {
    id: 10,
    category: "UMKM_SEARCH",
    question: "umkm jajanan pasar dekat stasiun cikini",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Transit Station Proximity + Culinary Taxonomy",
  },

  // 2. Routing & Navigation (11-20)
  {
    id: 11,
    category: "ROUTING",
    question: "rute jalan kaki dari stasiun manggarai ke pasar rumput",
    expectedIntent: "WALKING_ROUTE",
    expectedActionType: "CALCULATE_ROUTE",
    dataDependency: "Valhalla GIS Routing Engine (Pedestrian Graph)",
  },
  {
    id: 12,
    category: "ROUTING",
    question: "bagaimana cara ke monas jalan kaki",
    expectedIntent: "WALKING_ROUTE",
    expectedActionType: "CALCULATE_ROUTE",
    dataDependency: "Valhalla GIS Routing Engine",
    context: { origin: { latitude: -6.175, longitude: 106.82 } },
  },
  {
    id: 13,
    category: "ROUTING",
    question: "rute tercepat naik motor ke sarinah",
    expectedIntent: "WALKING_ROUTE",
    expectedActionType: "CALCULATE_ROUTE",
    dataDependency: "Valhalla GIS Motorcycle Network",
    context: { origin: { latitude: -6.19, longitude: 106.82 } },
  },
  {
    id: 14,
    category: "ROUTING",
    question: "pandu saya jalan kaki ke halte terdekat",
    expectedIntent: "WALKING_ROUTE",
    dataDependency: "Pedestrian Network + Transit Node",
    context: { origin: { latitude: -6.2, longitude: 106.8 } },
  },
  {
    id: 15,
    category: "ROUTING",
    question: "berapa lama rute jalan kaki ke stasiun tanah abang",
    expectedIntent: "WALKING_ROUTE",
    expectedActionType: "CALCULATE_ROUTE",
    dataDependency: "Valhalla Pedestrian Speed Model (4.5 km/h)",
    context: { origin: { latitude: -6.18, longitude: 106.81 } },
  },
  {
    id: 16,
    category: "ROUTING",
    question: "rute alternatif menghindari tanjakan curam",
    expectedIntent: "WALKING_ROUTE",
    dataDependency: "SRTM/Copernicus Digital Elevation Model (DEM)",
  },
  {
    id: 17,
    category: "ROUTING",
    question: "navigasi ke grand indonesia dari bundaran hi",
    expectedIntent: "WALKING_ROUTE",
    expectedActionType: "PREPARE_ROUTE",
    dataDependency: "Valhalla Pedestrian Graph",
  },
  {
    id: 18,
    category: "ROUTING",
    question: "rute ramah kursi roda ke halte busway",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Accessibility Evidence + Curb Ramp Layers",
  },
  {
    id: 19,
    category: "ROUTING",
    question: "rute jalan kaki dari stasiun sudirman ke dukuh atas",
    expectedIntent: "WALKING_ROUTE",
    expectedActionType: "CALCULATE_ROUTE",
    dataDependency: "Transit Hub Interconnection Skywalk Layer",
  },
  {
    id: 20,
    category: "ROUTING",
    question: "arah rute jalan kaki ke stasiun gondangdia",
    expectedIntent: "WALKING_ROUTE",
    expectedActionType: "CALCULATE_ROUTE",
    dataDependency: "Valhalla GIS Routing Engine",
    context: { origin: { latitude: -6.185, longitude: 106.83 } },
  },

  // 3. Transit & Multimodal Nodes (21-30)
  {
    id: 21,
    category: "TRANSIT",
    question: "stasiun krl paling dekat dari sini",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "KAI Commuter Static GTFS + Spatial Index",
    context: { origin: { latitude: -6.21, longitude: 106.84 } },
  },
  {
    id: 22,
    category: "TRANSIT",
    question: "halte transjakarta terdekat di sekitar monas",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "TransJakarta BRT Network Registry",
  },
  {
    id: 23,
    category: "TRANSIT",
    question: "transit terdekat dari sarinah",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "Multimodal Transit Hub Registry",
  },
  {
    id: 24,
    category: "TRANSIT",
    question: "stasiun mrt terdekat dari bundaran hi",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "MRT Jakarta North-South Line GTFS",
  },
  {
    id: 25,
    category: "TRANSIT",
    question: "stasiun transit terdekat",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "Commuter Station Network",
    context: { origin: { latitude: -6.2, longitude: 106.8 } },
  },
  {
    id: 26,
    category: "TRANSIT",
    question: "halte transit paling dekat ke blok m",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "Blok M Transit Hub Graph",
  },
  {
    id: 27,
    category: "TRANSIT",
    question: "stasiun transit terdekat manggarai",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "Manggarai Central Railway Station Graph",
  },
  {
    id: 28,
    category: "TRANSIT",
    question: "transit point terdekat stasiun sudirman",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "Dukuh Atas TOD Multimodal Layer",
  },
  {
    id: 29,
    category: "TRANSIT",
    question: "stasiun transit terdekat dari cawang",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "LRT Jabodebek + KRL Interchange",
  },
  {
    id: 30,
    category: "TRANSIT",
    question: "halte bus terdekat",
    expectedIntent: "NEAREST_TRANSIT",
    dataDependency: "Microtransit / Feeder TransJakarta",
    context: { origin: { latitude: -6.18, longitude: 106.82 } },
  },

  // 4. CCTV & Road Monitoring (31-40)
  {
    id: 31,
    category: "CCTV",
    question: "tampilkan cctv bundaran hi",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "DKI CCTV Registry (Central Jakarta)",
  },
  {
    id: 32,
    category: "CCTV",
    question: "lihat live camera di jakarta pusat",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "DKI Dishub Stream Registry",
  },
  {
    id: 33,
    category: "CCTV",
    question: "ada cctv di jakarta selatan?",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "South Jakarta Camera Registry",
  },
  {
    id: 34,
    category: "CCTV",
    question: "kamera pemantauan lalu lintas sudirman",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "Sudirman Corridor CCTV Feed",
  },
  {
    id: 35,
    category: "CCTV",
    question: "pantau cctv simpang monas",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "Monas Junction Public Camera Feed",
  },
  {
    id: 36,
    category: "CCTV",
    question: "kamera cctv dishub jakarta barat",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "West Jakarta Dishub Authorized Registry",
  },
  {
    id: 37,
    category: "CCTV",
    question: "live stream cctv jakarta timur",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "East Jakarta Camera Feed",
  },
  {
    id: 38,
    category: "CCTV",
    question: "cek cctv lalu lintas blok m",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "Blok M Terminal Camera Registry",
  },
  {
    id: 39,
    category: "CCTV",
    question: "cctv pemantau pedestrian thamrin",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "MH Thamrin Pedestrian CCTV Feed",
  },
  {
    id: 40,
    category: "CCTV",
    question: "daftar kamera cctv aktif dki jakarta",
    expectedIntent: "CCTV",
    expectedActionType: "NAVIGATE",
    dataDependency: "DKI 6-District Canonical Camera Registry",
  },

  // 5. Map, Landmark & Roundabout (41-50)
  {
    id: 41,
    category: "MAP_LANDMARK",
    question: "dimana bundaran hi?",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Jakarta Spatial Landmark Gazetteer",
  },
  {
    id: 42,
    category: "MAP_LANDMARK",
    question: "lokasi monumen nasional",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Monas POI Coordinates (-6.1754, 106.8272)",
  },
  {
    id: 43,
    category: "MAP_LANDMARK",
    question: "tampilkan sarinah di peta",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Sarinah Commercial Focal Point",
  },
  {
    id: 44,
    category: "MAP_LANDMARK",
    question: "fokuskan peta ke gelora bung karno",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "GBK Senayan Sports Complex Boundary",
  },
  {
    id: 45,
    category: "MAP_LANDMARK",
    question: "posisi kota tua jakarta",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Kota Tua Heritage District Boundary",
  },
  {
    id: 46,
    category: "MAP_LANDMARK",
    question: "di mana letak taman dukuh atas",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Dukuh Atas TOD Public Park Polygon",
  },
  {
    id: 47,
    category: "MAP_LANDMARK",
    question: "tampilkan lapangan banteng",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Lapangan Banteng Historical Park",
  },
  {
    id: 48,
    category: "MAP_LANDMARK",
    question: "lokasi plaza indonesia di peta",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Plaza Indonesia Footprint & Coordinates",
  },
  {
    id: 49,
    category: "MAP_LANDMARK",
    question: "fokus ke kawasan blok m",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Blok M Hub Spatial Footprint",
  },
  {
    id: 50,
    category: "MAP_LANDMARK",
    question: "posisi stasiun gambir",
    expectedIntent: "SEARCH_PLACE",
    expectedActionType: "FOCUS_PLACE",
    dataDependency: "Gambir Intercity Rail Station Point",
  },

  // 6. Promotion & Advertising (51-60)
  {
    id: 51,
    category: "PROMOTION",
    question: "bagaimana cara pasang iklan di getra?",
    expectedIntent: "PROMOTION_CREATE",
    expectedActionType: "NAVIGATE",
    dataDependency: "Promotion Workspace (/umkm/advertising)",
  },
  {
    id: 52,
    category: "PROMOTION",
    question: "cara membuat kampanye promosi toko",
    expectedIntent: "PROMOTION_CREATE",
    expectedActionType: "NAVIGATE",
    dataDependency: "Campaign Builder Service",
  },
  {
    id: 53,
    category: "PROMOTION",
    question: "berapa tarif promosi umkm getra?",
    expectedIntent: "PROMOTION_PAYMENT",
    dataDependency: "Fair Discovery Ad Rate Matrix",
  },
  {
    id: 54,
    category: "PROMOTION",
    question: "bagaimana mengatur wilayah sasaran promosi?",
    expectedIntent: "PROMOTION_TARGETING",
    dataDependency: "Spatial Radius Targeting Model",
  },
  {
    id: 55,
    category: "PROMOTION",
    question: "cara mengatur jadwal tayang iklan",
    expectedIntent: "PROMOTION_SCHEDULE",
    dataDependency: "Campaign Schedule Registry",
  },
  {
    id: 56,
    category: "PROMOTION",
    question: "bagaimana preview uji penayangan iklan?",
    expectedIntent: "PROMOTION_PREVIEW",
    dataDependency: "Sponsored Disclosure Rendering Engine",
  },
  {
    id: 57,
    category: "PROMOTION",
    question: "status pembayaran midtrans sandbox",
    expectedIntent: "PAYMENT_STATUS",
    dataDependency: "Midtrans Webhook Settlement Handler",
  },
  {
    id: 58,
    category: "PROMOTION",
    question: "bagaimana cara melihat invoice promosi?",
    expectedIntent: "PROMOTION_INVOICE",
    dataDependency: "Electronic Receipt & Invoice Service",
  },
  {
    id: 59,
    category: "PROMOTION",
    question: "kenapa promosi saya belum tayang?",
    expectedIntent: "PROMOTION_SETUP",
    dataDependency: "Ad Serving Validation Engine",
  },
  {
    id: 60,
    category: "PROMOTION",
    question: "bagaimana melihat statistik analitik promosi?",
    expectedIntent: "PROMOTION_ANALYTICS",
    dataDependency: "Campaign Impressions & Click Metrics",
  },

  // 7. Accessibility & Special Needs (61-70)
  {
    id: 61,
    category: "ACCESSIBILITY",
    question: "apakah ada trotoar ramah kursi roda di thamrin?",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Wheelchair Accessibility Observation Layer",
  },
  {
    id: 62,
    category: "ACCESSIBILITY",
    question: "kondisi guiding block di trotoar sudirman",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Tactile Paving Verification Survey",
  },
  {
    id: 63,
    category: "ACCESSIBILITY",
    question: "fasilitas disabilitas di stasiun manggarai",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Transit Station Accessibility Audit",
  },
  {
    id: 64,
    category: "ACCESSIBILITY",
    question: "titik aksesibilitas rampa di sekitar monas",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Curb Ramp Infrastructure Registry",
  },
  {
    id: 65,
    category: "ACCESSIBILITY",
    question: "jalur difabel ramah kursi roda",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Accessible Pedestrian Graph",
  },
  {
    id: 66,
    category: "ACCESSIBILITY",
    question: "kondisi trotoar rusak di jalan",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Civic Road Damage Evidence",
  },
  {
    id: 67,
    category: "ACCESSIBILITY",
    question: "hambatan akses pejalan kaki menuju halte",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Pedestrian Barrier Survey",
  },
  {
    id: 68,
    category: "ACCESSIBILITY",
    question: "titik aksesibilitas lift stasiun",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Vertical Transit Accessibility Audit",
  },
  {
    id: 69,
    category: "ACCESSIBILITY",
    question: "fasilitas akses ramah disabilitas",
    expectedIntent: "ACCESSIBILITY",
    dataDependency: "Inclusion Points of Interest",
  },
  {
    id: 70,
    category: "ACCESSIBILITY",
    question: "lihat lapisan aksesibilitas di peta",
    expectedIntent: "ACCESSIBILITY",
    expectedActionType: "SWITCH_MAP_MODE",
    dataDependency: "GETRA Mapbox Accessibility Layer",
  },

  // 8. Community & Citizen Reports (71-75)
  {
    id: 71,
    category: "COMMUNITY",
    question: "bagaimana cara membuat postingan di komunitas?",
    expectedIntent: "COMMUNITY_OBSERVATION",
    expectedActionType: "NAVIGATE",
    dataDependency: "Community Feed Service (/community)",
  },
  {
    id: 72,
    category: "COMMUNITY",
    question: "cara membuat laporan warga mengenai fasilitas publik",
    expectedIntent: "COMMUNITY_OBSERVATION",
    expectedActionType: "NAVIGATE",
    dataDependency: "Citizen Observation Submission Pipeline",
  },
  {
    id: 73,
    category: "COMMUNITY",
    question: "bagaimana cara report post yang melanggar?",
    expectedIntent: "COMMUNITY_REPORT",
    dataDependency: "Moderation Queue & Flagging System",
  },
  {
    id: 74,
    category: "COMMUNITY",
    question: "bagaimana melihat aktivitas terbaru warga di area ini?",
    expectedIntent: "ACTIVITY_FEED",
    dataDependency: "Location-Bound Activity Stream",
  },
  {
    id: 75,
    category: "COMMUNITY",
    question: "laporkan postingan komunitas keliru",
    expectedIntent: "COMMUNITY_REPORT",
    dataDependency: "Community Governance & Admin Review",
  },

  // 9. Environment, AQI, Flood & Urban Heat (76-80)
  {
    id: 76,
    category: "ENVIRONMENT",
    question: "bagaimana kualitas udara aqi di jakarta saat ini?",
    expectedIntent: "ENVIRONMENT",
    expectedActionType: "NAVIGATE",
    dataDependency: "Air Quality Telemetry Stations (PM2.5 / PM10)",
  },
  {
    id: 77,
    category: "ENVIRONMENT",
    question: "pantau tinggi muka air pintu air manggarai",
    expectedIntent: "ENVIRONMENT",
    expectedActionType: "NAVIGATE",
    dataDependency: "Flood Hydrological Stations & Sluice Gate Telemetry",
  },
  {
    id: 78,
    category: "ENVIRONMENT",
    question: "radiasi matahari dan jalur terlindung bayangan gedung",
    expectedIntent: "ENVIRONMENT",
    dataDependency: "3D Solar Shadow Simulation Model",
  },
  {
    id: 79,
    category: "ENVIRONMENT",
    question: "pemantauan kenaikan muka air laut dan banjir rob",
    expectedIntent: "ENVIRONMENT",
    dataDependency: "IPCC AR6 Sea Level Inundation Scenario (0.5m-2.0m)",
  },
  {
    id: 80,
    category: "ENVIRONMENT",
    question: "tutupan pohon dan vegetasi ndvi satelit",
    expectedIntent: "ENVIRONMENT",
    dataDependency: "Sentinel-2 MSI / Landsat Spectral NDVI Data",
  },

  // 10. Traffic Congestion & Road Conditions (81-85)
  {
    id: 81,
    category: "TRAFFIC",
    question: "bagaimana kondisi kemacetan jalan sudirman saat ini?",
    expectedIntent: "TRAFFIC",
    expectedActionType: "NAVIGATE",
    dataDependency: "Observed vs Estimated CCTV Traffic Model",
  },
  {
    id: 82,
    category: "TRAFFIC",
    question: "cek arus lalu lintas di bundaran hi",
    expectedIntent: "TRAFFIC",
    expectedActionType: "NAVIGATE",
    dataDependency: "Real-time Vehicle & Pedestrian Flow Observations",
  },
  {
    id: 83,
    category: "TRAFFIC",
    question: "apakah ada kepadatan jalan di sekitar tanah abang?",
    expectedIntent: "TRAFFIC",
    expectedActionType: "NAVIGATE",
    dataDependency: "Road Network Speed Telemetry Baseline",
  },
  {
    id: 84,
    category: "TRAFFIC",
    question: "kondisi antrean kendaraan di simpang thamrin",
    expectedIntent: "TRAFFIC",
    expectedActionType: "NAVIGATE",
    dataDependency: "Intersection Queue Length Telemetry",
  },
  {
    id: 85,
    category: "TRAFFIC",
    question: "kecepatan lalu lintas rata-rata di koridor jalan raya",
    expectedIntent: "TRAFFIC",
    expectedActionType: "NAVIGATE",
    dataDependency: "Authoritative Traffic Provider Aggregation",
  },

  // 11. Admin & Platform Governance (86-90)
  {
    id: 86,
    category: "ADMIN",
    question: "apa saja fitur pada dashboard admin getra?",
    expectedIntent: "ADMIN",
    dataDependency: "RBAC Admin Panel (/admin)",
  },
  {
    id: 87,
    category: "ADMIN",
    question: "bagaimana proses persetujuan admin untuk pendaftaran umkm?",
    expectedIntent: "ADMIN",
    dataDependency: "Merchant Review Workflow & Curation State",
  },
  {
    id: 88,
    category: "ADMIN",
    question: "apa wewenang kurator kurasi admin getra?",
    expectedIntent: "ADMIN",
    dataDependency: "Administrative Authorization Security Policy",
  },
  {
    id: 89,
    category: "ADMIN",
    question: "menu admin dan verifikasi kepemilikan usaha",
    expectedIntent: "ADMIN",
    dataDependency: "Admin Queue Management & Security Log",
  },
  {
    id: 90,
    category: "ADMIN",
    question: "bagaimana admin meninjau laporan warga di sistem?",
    expectedIntent: "ADMIN",
    dataDependency: "Admin Moderation Registry",
  },

  // 12. UMKM Owner Verification & Claim (91-95)
  {
    id: 91,
    category: "OWNER",
    question: "bagaimana cara klaim kepemilikan usaha saya?",
    expectedIntent: "UMKM_CLAIM",
    dataDependency: "Merchant Claim Workflow & Legal Evidence Upload",
  },
  {
    id: 92,
    category: "OWNER",
    question: "status pengajuan verifikasi umkm saya kenapa masih pending?",
    expectedIntent: "UMKM_STATUS",
    dataDependency: "Merchant Submission Review Status (PENDING/APPROVED)",
  },
  {
    id: 93,
    category: "OWNER",
    question: "siapa yang berhak kepemilikan usaha mengubah data merchant?",
    expectedIntent: "UMKM_CLAIM",
    dataDependency: "Verified Merchant Ownership RBAC Rule",
  },
  {
    id: 94,
    category: "OWNER",
    question: "bagaimana cara edit usaha yang sudah terdaftar?",
    expectedIntent: "UMKM_EDIT",
    dataDependency: "Owner Workspace Merchant Profile Editor",
  },
  {
    id: 95,
    category: "OWNER",
    question: "bagaimana memasukkan lokasi usaha dengan gps?",
    expectedIntent: "UMKM_LOCATION",
    dataDependency: "Device Geolocation API + Map Pin Placement",
  },

  // 13. Multi-Step Complex Tasks (96-98)
  {
    id: 96,
    category: "MULTI_STEP",
    question: "carikan tempat kopi dekat stasiun manggarai yang buka sekarang punya harga murah lalu buatkan rute jalan kaki",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Multi-Step Pipeline: Transit Resolution -> UMKM Search -> Price Filter -> GIS Routing",
  },
  {
    id: 97,
    category: "MULTI_STEP",
    question: "carikan warung makan dekat stasiun tanah abang",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Transit Place Resolution + Culinary Discovery",
  },
  {
    id: 98,
    category: "MULTI_STEP",
    question: "carikan toko roti dekat stasiun tebet",
    expectedIntent: "MERCHANT_SEARCH",
    expectedActionType: "APPLY_SEARCH_CRITERIA",
    dataDependency: "Transit Node Discovery + Bakery POI Match",
  },

  // 14. Ambiguous Queries, Security & Graceful Handling (99-100)
  {
    id: 99,
    category: "SECURITY_GUARDRAILS",
    question: "buatkan koordinat dummy toko saya",
    expectedIntent: "SAFETY_GUARDRAIL",
    dataDependency: "Truthfulness Protocol (No synthetic coordinates / fake entities)",
  },
  {
    id: 100,
    category: "GRACEFUL_HANDLING",
    question: "pertanyaan aneh tanpa konteks jelas xyz123",
    expectedIntent: "UNKNOWN",
    dataDependency: "Graceful Failure Handling with Constructive Guidance",
  },
];

describe("GETRA AI Section 58 — Master 100-Question Library Benchmark", () => {
  let service: AiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AiService("Bearer TEST_TOKEN_MASTER_100");
    mocks.generateStructured.mockResolvedValue(null);
  });

  it("verifies the question library contains exactly 100 questions", () => {
    expect(MASTER_100_AI_QUESTIONS.length).toBe(100);
  });

  MASTER_100_AI_QUESTIONS.forEach((item) => {
    it(`[#${item.id}] [${item.category}] ${item.question}`, async () => {
      const response = await service.handleAskRequest({
        question: item.question,
        active_experience: "GENERAL",
        context: item.context,
      });

      // 1. Verify intent resolution matches expectation
      expect(response.intent).toBe(item.expectedIntent);

      // 2. If expected action type is specified, verify action matches
      if (item.expectedActionType) {
        expect(response.action.type).toBe(item.expectedActionType);
      }

      // 3. Verify answer is non-empty, truthful, and contains no raw hallucinations
      expect(response.answer).toBeDefined();
      expect(response.answer.length).toBeGreaterThan(10);
      expect(response.answer).not.toContain("undefined");
      expect(response.answer).not.toContain("NaN");

      // 4. Verify suggestion chips are generated for continuous interaction
      expect(Array.isArray(response.suggestion_chips)).toBe(true);
      expect(response.suggestion_chips.length).toBeGreaterThan(0);
    });
  });
});

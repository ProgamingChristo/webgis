export interface TransitHub {
  id: string;
  name: string;
  category: "MRT" | "KRL" | "LRT" | "BRT" | "INTEGRATED";
  coordinates: [number, number]; // [lng, lat]
  lines: string[];
  description: string;
  dailyPassengers: number;
  accessibleElevator: boolean;
  connectedMerchantsCount: number;
  nearbyMerchants: Array<{
    id: string;
    name: string;
    category: string;
    distanceMeters: number;
    walkingMinutes: number;
    address: string;
    coordinates: [number, number];
  }>;
}

export interface AccessibilityCorridor {
  id: string;
  name: string;
  subdistrict: string;
  overallScore: number; // 0 - 100
  tactilePavingQuality: "Lengkap" | "Sebagian" | "Tidak Ada";
  curbRampsQuality: "Standar PUPR" | "Sebagian" | "Curam";
  sidewalkWidthMeters: number;
  obstacleLevel: "Rendah" | "Sedang" | "Tinggi";
  wheelchairRecommended: boolean;
  activeBarriersCount: number;
}

export interface EcoCommuteTrip {
  id: string;
  label: string;
  origin: string;
  destination: string;
  distanceMeters: number;
  walkingMinutes: number;
  co2SavedGramsVsCar: number;
  co2SavedGramsVsMotor: number;
  caloriesBurnedKcal: number;
}

export interface SafetyCorridor {
  id: string;
  name: string;
  zone: string;
  safetyScore: number; // 0 - 100
  lightingIndex: "Sangat Terang" | "Terang" | "Cukup" | "Minim";
  nightCommerceActive: boolean;
  policePostDistanceMeters: number;
  cctvCoverage: boolean;
  recommendation: string;
}

export interface DirectoryMerchant {
  id: string;
  name: string;
  category: "Kuliner" | "Kopi & Minuman" | "Jajanan" | "Kebutuhan Harian" | "Jasa";
  cuisine?: string;
  priceTier: "Rp" | "RpRp" | "RpRpRp";
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  openingHours: string;
  paymentMethods: string[];
  address: string;
  nearestStation: string;
  distanceFromStationMeters: number;
  verified: boolean;
  coordinates: [number, number];
}

export interface FlashDeal {
  id: string;
  merchantId: string;
  merchantName: string;
  title: string;
  discountDescription: string;
  code: string;
  minSpend: number;
  expiresInHours: number;
  remainingVouchers: number;
  stationNear: string;
  distanceMeters: number;
}

export interface CulinaryTrail {
  id: string;
  title: string;
  theme: string;
  totalDistanceKm: number;
  estimatedMinutes: number;
  stopsCount: number;
  highlightFood: string[];
  description: string;
  stops: Array<{
    step: number;
    merchantName: string;
    dishName: string;
    distanceFromPrevMeters: number;
    description: string;
  }>;
}

export interface B2BSupplier {
  id: string;
  marketName: string;
  location: string;
  specialty: string[];
  distanceToStudyCenterMeters: number;
  ecoDeliveryAvailable: boolean;
  bulkDiscountAvailable: boolean;
  contactPerson: string;
}

export interface FoodDesertArea {
  subdistrict: string;
  residentialPopulation: number;
  within400mRatio: number; // 0 - 100%
  within800mRatio: number; // 0 - 100%
  foodAccessIndex: number; // 0 - 100
  riskLevel: "Rendah" | "Sedang" | "Tinggi";
  priorityAction: string;
}

export interface SidewalkAssetSegment {
  segmentId: string;
  streetName: string;
  lengthMeters: number;
  widthMeters: number;
  condition: "Baik" | "Rusak Ringan" | "Rusak Berat";
  tactilePaving: boolean;
  treeShadingRatio: number;
  crosswalkCount: number;
}

export interface RoadClosureScenario {
  id: string;
  title: string;
  cause: "Car-Free Day" | "Konstruksi MRT" | "Acara Kenegaraan" | "Pekerjaan Utilitas";
  affectedCorridor: string;
  pedestrianDetourAvgMeters: number;
  merchantFootfallImpact: string;
  recommendedAlleyRoutes: string[];
}

export interface InclusivityMetric {
  category: string;
  score: number;
  pupCompliant: boolean;
  benchmarkTarget: number;
  recommendation: string;
}

export interface FootTrafficPoint {
  corridor: string;
  hour: string;
  pedestrianVolumePerHour: number;
  crowdLevel: "Rendah" | "Sedang" | "Padat" | "Puncak";
}

export interface TodIndexStation {
  stationName: string;
  transitModesCount: number;
  dailyBoardingAvg: number;
  walkabilityScore: number;
  todScore: number; // 0 - 100
  rank: number;
  investmentTier: "Sangat Tinggi" | "Tinggi" | "Menengah";
  retailOccupancyRate: number;
}

export interface MarketGapItem {
  stationZone: string;
  missingCategory: string;
  estimatedUnmetDemand: string;
  nearbyCompetitorCount: number;
  viabilityScore: number; // 0 - 100
  recommendedAction: string;
}

export interface MerchantInsightSummary {
  merchantId: string;
  weeklyCatchmentPedestrians: number;
  peakHour: string;
  avgCustomerWalkDistanceMeters: number;
  competitorsIn500m: number;
  marketShareEstimate: string;
  growthOpportunity: string;
}

export interface CommunityQuest {
  id: string;
  title: string;
  xpReward: number;
  category: "Aksesibilitas" | "Verifikasi UMKM" | "Kondisi Jalan" | "Foto Menu";
  targetCount: number;
  completedCount: number;
  description: string;
  badgeUnlock: string;
}

export interface PedestrianHazardReport {
  id: string;
  category: "Trotoar Rusak" | "Guiding Block Terputus" | "Tutup Manhole Hilang" | "Parkir Liar di Trotoar" | "Lampu Jalan Padam";
  locationName: string;
  severity: "Rendah" | "Sedang" | "Kritis";
  description: string;
  timestamp: string;
  status: "Diterima" | "Dalam Pemeriksaan" | "Selesai";
}

export interface SystemServiceStatus {
  name: string;
  serviceType: "DATABASE" | "ROUTING" | "AI" | "PAYMENT" | "MAP_TILES";
  status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  latencyMs: number;
  uptime90d: number;
  description: string;
}

export interface OpenGeoDataset {
  id: string;
  title: string;
  format: "GeoJSON" | "CSV" | "Shapefile";
  featuresCount: number;
  coverageArea: string;
  lastUpdated: string;
  license: string;
  downloadFilename: string;
  schemaFields: string[];
}

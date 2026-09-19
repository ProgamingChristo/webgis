export type GlobalCityId = "tokyo" | "singapore" | "london" | "new-york" | "paris" | "jakarta" | "sydney";

export interface GlobalCity {
  id: GlobalCityId;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  currency: string;
  flag: string;
}

export type InternationalFeatureCategory =
  | "smart-city"
  | "mobility"
  | "environment"
  | "safety"
  | "commerce"
  | "logistics"
  | "governance";

export interface InternationalFeatureMeta {
  slug: string;
  title: string;
  description: string;
  category: InternationalFeatureCategory;
  iconName: string;
  badge: string;
  featuredCity?: GlobalCityId;
}

// 1. CCTV
export interface CctvFeed {
  id: string;
  name: string;
  city: GlobalCityId;
  location: string;
  status: "ONLINE" | "INTERMITTENT" | "MAINTENANCE";
  fps: number;
  latencyMs: number;
  pedestrianCount: number;
  vehicleCount: number;
  congestionLevel: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  streamType: "simulated_hls" | "optical_flow";
  resolution?: string;
  protocol?: string;
}

// 2. Traffic Congestion
export interface CongestionZone {
  id: string;
  corridor: string;
  city: GlobalCityId;
  currentSpeedKmh: number;
  freeFlowSpeedKmh: number;
  delayMinutes: number;
  level: "FREE" | "MODERATE" | "HEAVY" | "GRIDLOCK";
  bottleneckCause: string;
  suggestedDetour: string;
}

// 3. Multimodal
export interface MultimodalStep {
  mode: "WALK" | "METRO" | "BUS" | "RAIL" | "BIKE" | "FLIGHT";
  instruction: string;
  durationMinutes: number;
  distanceKm: number;
  costEstimate: string;
  carbonGrams: number;
}

export interface MultimodalRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  totalDurationMin: number;
  totalCost: string;
  totalCarbonKg: number;
  steps: MultimodalStep[];
}

// 4. AQI Microclimate
export interface AqiStation {
  id: string;
  name: string;
  city: GlobalCityId;
  aqi: number;
  status: "GOOD" | "MODERATE" | "UNHEALTHY_SENSITIVE" | "UNHEALTHY" | "HAZARDOUS";
  pm25: number;
  pm10: number;
  tempCelsius: number;
  humidityPct: number;
  dominantPollutant: string;
}

// 5. Urban Heat Island
export interface HeatIslandZone {
  id: string;
  name: string;
  city: GlobalCityId;
  surfaceTempC: number;
  ambientTempC: number;
  treeCanopyPct: number;
  coolingAmenity: string;
  thermalRisk: "COMFORTABLE" | "MILD_STRESS" | "HIGH_STRESS" | "EXTREME";
}

// 6. Elevation Profile
export interface ElevationProfilePoint {
  distanceMeters: number;
  elevationMeters: number;
  gradientPct: number;
  accessibilityRating: "EXCELLENT" | "MODERATE" | "STEEP" | "ASSISTANCE_REQUIRED";
}

// 7. Smart Parking
export interface SmartParkingLot {
  id: string;
  name: string;
  city: GlobalCityId;
  totalSpots: number;
  availableSpots: number;
  evChargingSpots: number;
  disabledSpots: number;
  hourlyRate: string;
  occupancyTrend: "FILLING_UP" | "STABLE" | "EMPTYING";
}

// 8. EV Charging
export interface EvChargingHub {
  id: string;
  name: string;
  city: GlobalCityId;
  operator: string;
  powerKw: number;
  plugs: { type: "CCS2" | "CHAdeMO" | "Type2" | "Tesla"; available: number; total: number }[];
  pricePerKwh: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
}

// 9. Noise Pollution
export interface NoiseStation {
  id: string;
  zone: string;
  city: GlobalCityId;
  currentDb: number;
  limitDb: number;
  classification: "QUIET" | "MODERATE" | "NOISY" | "EXCESSIVE";
  primaryNoiseSource: string;
}

// 10. Flood Monitoring
export interface FloodStation {
  id: string;
  name?: string;
  stationName: string;
  riverOrCanal: string;
  city: GlobalCityId;
  waterLevelMeters: number;
  warningLevelMeters: number;
  dangerLevelMeters: number;
  status: "NORMAL" | "ALERT_3" | "ALERT_2" | "ALERT_1";
  trend: "RISING" | "STABLE" | "RECEDING";
}

// 11. Solar Radiation
export interface SolarShadowZone {
  id: string;
  streetName: string;
  city: GlobalCityId;
  uvIndex: number;
  shadowCoveragePct: number;
  solarIrradianceWm2: number;
  recommendedTime: string;
}

// 12. Emergency Evacuation
export interface EvacuationHub {
  id: string;
  shelterName: string;
  city: GlobalCityId;
  capacityPersons: number;
  currentOccupancy: number;
  hazardsCovered: string[];
  distanceMeters: number;
  status: "ACTIVE" | "STANDBY";
}

// 13. Micromobility
export interface MicromobilityHub {
  id: string;
  operator: string;
  type: "BIKE" | "E_BIKE" | "E_SCOOTER";
  city: GlobalCityId;
  availableVehicles: number;
  avgBatteryPct: number;
  unlockCost: string;
  perMinuteCost: string;
}

// 14. GTFS Realtime
export interface GtfsVehiclePosition {
  id: string;
  routeId: string;
  headsign: string;
  city: GlobalCityId;
  nextStop: string;
  etaMinutes: number;
  delaySeconds: number;
  congestion: "RUNNING_ON_TIME" | "SLIGHT_DELAY" | "MAJOR_DELAY";
}

// 15. Walk Score
export interface CityWalkScore {
  address: string;
  city: GlobalCityId;
  score: number;
  tier: "WALKERS_PARADISE" | "VERY_WALKABLE" | "SOMEWHAT_WALKABLE" | "CAR_DEPENDENT";
  amenitiesBreakdown: { category: string; score: number; countNearby: number }[];
}

// 16. Tourist Audio Guide
export interface AudioTourSpot {
  id: string;
  title: string;
  city: GlobalCityId;
  durationMinutes: number;
  languages: string[];
  snippet: string;
  rating: number;
  photoUrl: string;
}

// 17. Currency & Tax Refund
export interface TaxRefundItem {
  country: string;
  currency: string;
  standardVatPct: number;
  minPurchaseAmount: number;
  refundMethod: string;
  nearestRefundCounter: string;
}

// 18. Market Translator
export interface MarketPhrase {
  category: "GREETING" | "PRICE" | "ALLERGY" | "QUANTITY" | "DIRECTION";
  indonesian: string;
  english: string;
  japanese: string;
  chinese: string;
  french: string;
}

// 19. Carbon Marketplace
export interface CarbonListing {
  id: string;
  projectName: string;
  city: GlobalCityId;
  registry: "Verra VCS" | "Gold Standard" | "PBB CDM";
  pricePerTonUsd: number;
  availableTons: number;
  impactType: string;
}

// 20. 3D Digital Twin
export interface DigitalTwinModel {
  id: string;
  district: string;
  city: GlobalCityId;
  lodLevel: "LoD1" | "LoD2" | "LoD3";
  buildingCount: number;
  avgHeightMeters: number;
  solarRooftopPotentialGwh: number;
}

// 21. Road Damage AI
export interface RoadDefect {
  id: string;
  location: string;
  city: GlobalCityId;
  defectType: "POTHOLE" | "ALLIGATOR_CRACK" | "DEPRESSION" | "DAMAGED_MANHOLE";
  severity: "LOW" | "MEDIUM" | "CRITICAL";
  confidenceScore: number;
  repairStatus: "REPORTED" | "WORK_ORDER_ISSUED" | "REPAIRED";
}

// 22. Drone Corridor
export interface DroneCorridor {
  id: string;
  corridorName: string;
  city: GlobalCityId;
  minAltitudeMeters: number;
  maxAltitudeMeters: number;
  airspaceClass: "G_UNCONTROLLED" | "RESTRICTED" | "AUTHORIZATION_REQUIRED";
  currentTrafficUav: number;
}

// 23. Port Logistics
export interface PortLogisticsTerminal {
  id: string;
  portName: string;
  city: GlobalCityId;
  teuCapacityAnnual: string;
  currentVesselCount: number;
  avgBerthWaitHours: number;
  railConnectivity: boolean;
}

// 24. Historical Map
export interface HistoricalTimeSlice {
  year: number;
  urbanAreaSqKm: number;
  populationMillions: number;
  keyMilestone: string;
}

// 25. Spatial Demographics
export interface DemographicZone {
  id: string;
  zoneName: string;
  city: GlobalCityId;
  popDensityPerSqKm: number;
  medianIncomeAnnualUsd: number;
  daytimeCommuterInflux: number;
  youthPopulationPct: number;
}

// 26. Public Wi-Fi
export interface PublicWifiSpot {
  id: string;
  ssid: string;
  location: string;
  city: GlobalCityId;
  speedMbps: number;
  status: "ACTIVE" | "LIMITED" | "DOWN";
  isFree: boolean;
}

// 27. Green Spaces
export interface GreenSpace {
  id: string;
  parkName: string;
  city: GlobalCityId;
  areaHectares: number;
  ndviScore: number;
  treeCanopyCoverPct: number;
  amenities: string[];
}

// 28. Cultural Heritage
export interface HeritageSite {
  id: string;
  name: string;
  city: GlobalCityId;
  unescoStatus: "INSPIRED" | "LISTED" | "TENTATIVE";
  yearBuilt: number;
  architecturalStyle: string;
  visitorGuidelines: string;
}

// 29. Water Refill
export interface WaterRefillPoint {
  id: string;
  location: string;
  city: GlobalCityId;
  waterQualityIndex: string;
  bottlesSavedTotal: number;
  isChilled: boolean;
  isAccessible: boolean;
}

// 30. Accessible Restroom
export interface AccessibleRestroom {
  id: string;
  location: string;
  city: GlobalCityId;
  hasWheelchairRamp: boolean;
  hasEmergencyPullCord: boolean;
  hasBabyChangingTable: boolean;
  cleanlinessScore: number;
  hours: string;
}

// 31-50 Additional Types
export interface StreetLightingPole {
  id: string;
  poleNumber: string;
  city: GlobalCityId;
  illuminanceLux: number;
  lumensOutput: number;
  status: "OPTIMAL" | "DIMMED" | "FAULTY";
  solarPowered: boolean;
}

export interface IncidentDispatchAlert {
  id: string;
  incidentType: "MEDICAL" | "TRAFFIC_ACCIDENT" | "FIRE" | "INFRASTRUCTURE_FAILURE";
  city: GlobalCityId;
  location: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  respondingUnits: string[];
  etaMinutes: number;
}

export interface CarriageCrowding {
  carriageNumber: number;
  densityLevel: "SEATS_AVAILABLE" | "STANDING_ROOM_ONLY" | "HIGH_CROWDING" | "FULL";
  passengerCountEst: number;
  recommendedBoarding: boolean;
}

export interface DopplerRadarFrame {
  timestamp: string;
  precipitationMmPerHour: number;
  stormCellIntensity: "NONE" | "LIGHT_RAIN" | "HEAVY_DOWNPOUR" | "THUNDERSTORM";
  windGustKmh: number;
}

export interface CurbsideZone {
  id: string;
  street: string;
  city: GlobalCityId;
  activeMode: "COMMERCIAL_LOADING" | "OUTDOOR_DINING" | "TAXI_PICKUP" | "MICRO_MOBILITY";
  ratePerHourUsd: number;
  occupancyPct: number;
}

export interface SmartWasteBin {
  id: string;
  location: string;
  city: GlobalCityId;
  fillLevelPct: number;
  binType: "GENERAL" | "RECYCLABLE" | "ORGANIC" | "E_WASTE";
  lastEmptiedHoursAgo: number;
  status: "NORMAL" | "NEEDS_COLLECTION" | "OVERFLOW_RISK";
}

export interface PedestrianBridge {
  id: string;
  name: string;
  city: GlobalCityId;
  lengthMeters: number;
  hasElevator: boolean;
  hasEscalator: boolean;
  isCoveredWeatherProof: boolean;
  interconnectedStation: string;
}

export interface NightlifeDistrict {
  id: string;
  districtName: string;
  city: GlobalCityId;
  openVenuesCount: number;
  safetyScore: number;
  lateNightTransitLines: string[];
  vibe: string;
}

export interface BuskingSpot {
  id: string;
  spotName: string;
  city: GlobalCityId;
  currentPerformer?: string;
  genre?: string;
  permitStatus: "PERMITTED" | "OPEN_ACCESS" | "AUDITION_REQUIRED";
  upcomingSchedule: string;
}

export interface CargoBikeDeliveryHub {
  id: string;
  hubName: string;
  city: GlobalCityId;
  activeCargoBikes: number;
  parcelsDispatchedToday: number;
  co2SavedKgToday: number;
  coverageRadiusKm: number;
}

export interface AirportExpressSchedule {
  city: GlobalCityId;
  airportCode: string;
  trainName: string;
  frequencyMinutes: number;
  travelTimeMinutes: number;
  fareAmount: string;
  hasLuggageCheckin: boolean;
}

export interface PedestrianFlowModel {
  nodeId: string;
  city: GlobalCityId;
  bottleneckIndex: number; // 0-100
  pedestriansPerMinute: number;
  socialDensityRating: "COMFORTABLE" | "DENSE" | "CRUSH_RISK";
  flowVelocityMps: number;
}

export interface CustomsTariffItem {
  hsCode: string;
  productDescription: string;
  baseDutyPct: number;
  importVatPct: number;
  artisanExemptionAvailable: boolean;
}

export interface MedicalTourismFacility {
  id: string;
  hospitalName: string;
  city: GlobalCityId;
  accreditation: "JCI" | "ISO" | "ACHS";
  specialties: string[];
  multilingualStaff: string[];
  distanceToTransitKm: number;
}

export interface SatelliteNdviZone {
  id: string;
  zone: string;
  city: GlobalCityId;
  meanNdvi: number;
  droughtStressLevel: "HEALTHY" | "MILD_STRESS" | "SEVERE_STRESS";
  coolingDeficitCelsius: number;
}

export interface WildlifeCorridor {
  id: string;
  corridorName: string;
  city: GlobalCityId;
  targetSpecies: string[];
  canopyContinuityPct: number;
  crossingStructures: string;
}

export interface SeaLevelRiseSimulation {
  riseMeters: number;
  inundatedAreaSqKm: number;
  affectedPopulation: number;
  criticalAssetsAtRisk: string[];
  defenseWallStatus: string;
}

export interface VernacularHeritageBuilding {
  id: string;
  buildingName: string;
  city: GlobalCityId;
  constructionEra: string;
  preservationStatus: "PRISTINE" | "MONITORED" | "AT_RISK";
  architecturalStyle: string;
}

export interface DiplomaticMission {
  id: string;
  countryRepresented: string;
  missionType: "EMBASSY" | "CONSULATE_GENERAL" | "TRADE_OFFICE";
  city: GlobalCityId;
  address: string;
  emergencyHotline: string;
  consularHours: string;
}

export interface OpenBasemapProvider {
  id: string;
  name: string;
  provider: "OpenStreetMap" | "CartoDB" | "Stamen" | "MapLibre" | "Satellite";
  tileUrl: string;
  attribution: string;
  maxZoom: number;
  isDarkThemeRecommended: boolean;
}

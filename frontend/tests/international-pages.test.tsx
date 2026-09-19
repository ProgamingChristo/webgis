import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/international",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// Mock Auth and Stakeholder Providers
vi.mock("@/src/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    context: null,
    loading: false,
    session: null,
  }),
}));

vi.mock("@/src/components/providers/StakeholderProvider", () => ({
  useStakeholder: () => ({
    activeExperience: "GENERAL",
    setActiveExperience: vi.fn(),
  }),
}));

import {
  InternationalPortalView,
  CctvView,
  TrafficCongestionView,
  MultimodalTransitView,
  MicromobilityView,
  GtfsRealtimeView,
  CommuterCrowdingView,
  PedestrianBridgesView,
  AirportExpressView,
  AqiView,
  UrbanHeatView,
  ElevationProfileView,
  NoisePollutionView,
  FloodMonitoringView,
  SolarRadiationView,
  WeatherRadarView,
  WasteRecyclingView,
  SatelliteNdviView,
  WildlifeCorridorsView,
  SeaLevelRiseView,
  SmartParkingView,
  EvChargingView,
  WalkScoreView,
  DigitalTwinView,
  RoadDamageAiView,
  DroneCorridorsView,
  PublicWifiView,
  StreetLightingView,
  CurbsideManagementView,
  PedestrianFlowAiView,
  OpenBasemapsView,
  TouristAudioGuideView,
  CurrencyTaxRefundView,
  MarketTranslatorView,
  CarbonMarketplaceView,
  NightlifeZonesView,
  StreetPerformersView,
  FreightDeliveryView,
  CustomsTariffsView,
  EmergencyEvacuationView,
  PortLogisticsView,
  HistoricalMapView,
  SpatialDemographicsView,
  GreenSpacesView,
  CulturalHeritageView,
  WaterRefillView,
  AccessibleRestroomsView,
  IncidentDispatchView,
  MedicalTourismView,
  HeritagePreservationView,
  GlobalEmbassyView,
  INTERNATIONAL_FEATURES,
  GLOBAL_CITIES,
} from "@/src/features/international";

import InternationalPortalPage from "../app/international/page";
import InternationalFeaturePage, { generateStaticParams } from "../app/international/[slug]/page";

describe("GETRA International GIS & Smart City Suite (50 Features)", () => {
  it("verifies that all 50 features are cataloged and distinct", () => {
    expect(INTERNATIONAL_FEATURES.length).toBe(50);
    const slugs = new Set(INTERNATIONAL_FEATURES.map((f) => f.slug));
    expect(slugs.size).toBe(50);
    expect(GLOBAL_CITIES.length).toBe(7);
  });

  it("verifies generateStaticParams returns all 50 slugs", () => {
    const params = generateStaticParams();
    expect(params.length).toBe(50);
    expect(params.map((p) => p.slug)).toContain("cctv");
    expect(params.map((p) => p.slug)).toContain("open-basemaps");
  });

  it("renders InternationalPortalView with hero, metrics, and search input", () => {
    const html = renderToStaticMarkup(<InternationalPortalView />);
    expect(html).toContain("Portal Smart City &amp; WebGIS Internasional");
    expect(html).toContain("50 Modul");
    expect(html).toContain("Tokyo");
    expect(html).toContain("Jakarta");
  });

  // Group 1: Mobility
  it("renders CctvView with live stream simulator and AI counters", () => {
    const html = renderToStaticMarkup(<CctvView />);
    expect(html).toContain("Global Traffic &amp; Pedestrian CCTV Live Stream");
    expect(html).toContain("Shibuya Scramble Crossing");
    expect(html).toContain("Pedestrian Detected");
  });

  it("renders TrafficCongestionView with corridor bottleneck metrics", () => {
    const html = renderToStaticMarkup(<TrafficCongestionView />);
    expect(html).toContain("Pendeteksi Macet &amp; Rekayasa Arus Cerdas");
    expect(html).toContain("Sudirman - Thamrin Corridor");
  });

  it("renders MultimodalTransitView with step-by-step route itinerary", () => {
    const html = renderToStaticMarkup(<MultimodalTransitView />);
    expect(html).toContain("Perencana Rute Lintas Batas Global");
    expect(html).toContain("Express Eco Journey");
  });

  it("renders MicromobilityView with bike and scooter fleet data", () => {
    const html = renderToStaticMarkup(<MicromobilityView />);
    expect(html).toContain("Ketersediaan Sepeda &amp; Skuter Listrik Global");
    expect(html).toContain("Luup E-Scooter");
  });

  it("renders GtfsRealtimeView with vehicle delays and ETA", () => {
    const html = renderToStaticMarkup(<GtfsRealtimeView />);
    expect(html).toContain("Pelacak Posisi Bus &amp; Kereta Live Feed");
    expect(html).toContain("MRT-NSL-04");
  });

  it("renders CommuterCrowdingView with carriage occupancy", () => {
    const html = renderToStaticMarkup(<CommuterCrowdingView />);
    expect(html).toContain("Prediksi Kepadatan Gerbong Kereta Live");
    expect(html).toContain("Gerbong #1");
  });

  it("renders PedestrianBridgesView with skywalk dimensions", () => {
    const html = renderToStaticMarkup(<PedestrianBridgesView />);
    expect(html).toContain("Jembatan Penyeberangan Orang &amp; Skywalk Interkoneksi");
    expect(html).toContain("JPO Pinisi Karet Sudirman");
  });

  it("renders AirportExpressView with frequency and in-town check-in", () => {
    const html = renderToStaticMarkup(<AirportExpressView />);
    expect(html).toContain("Hub Kereta Bandara &amp; City Check-in Internasional");
    expect(html).toContain("Keisei Skyliner Express");
  });

  // Group 2: Environment
  it("renders AqiView with pollutant breakdowns", () => {
    const html = renderToStaticMarkup(<AqiView />);
    expect(html).toContain("Kualitas Udara &amp; Rute Rendah Emisi Global");
    expect(html).toContain("Chiyoda Clean Air Sensor");
  });

  it("renders UrbanHeatView with surface temperature metrics", () => {
    const html = renderToStaticMarkup(<UrbanHeatView />);
    expect(html).toContain("Pulau Panas Perkotaan (Urban Heat Island)");
    expect(html).toContain("Ginza Asphalt &amp; Glass Canyon");
  });

  it("renders ElevationProfileView with gradient percentage", () => {
    const html = renderToStaticMarkup(<ElevationProfileView />);
    expect(html).toContain("Profil Elevasi &amp; Kemiringan Tanjakan Trotoar");
    expect(html).toContain("Gradien:");
  });

  it("renders NoisePollutionView with acoustic decibel ratings", () => {
    const html = renderToStaticMarkup(<NoisePollutionView />);
    expect(html).toContain("Peta Kebisingan Akustik &amp; Koridor Tenang");
    expect(html).toContain("Shibuya Crossing Commercial Strip");
  });

  it("renders FloodMonitoringView with telemetry water levels", () => {
    const html = renderToStaticMarkup(<FloodMonitoringView />);
    expect(html).toContain("Pemantauan Banjir &amp; Elevasi Muka Air Realtime");
    expect(html).toContain("Pintu Air Manggarai");
  });

  it("renders SolarRadiationView with shadow coverage metrics", () => {
    const html = renderToStaticMarkup(<SolarRadiationView />);
    expect(html).toContain("Radiasi Matahari &amp; Jalur Terlindung Bayangan");
    expect(html).toContain("Roppongi Hills North Promenade");
  });

  it("renders WeatherRadarView with Doppler nowcast frames", () => {
    const html = renderToStaticMarkup(<WeatherRadarView />);
    expect(html).toContain("Radar Doppler Presipitasi &amp; Angin Terowongan");
  });

  it("renders WasteRecyclingView with fill levels", () => {
    const html = renderToStaticMarkup(<WasteRecyclingView />);
    expect(html).toContain("Sensor Tempat Sampah Pintar &amp; Bank Sampah Sirkular");
  });

  it("renders SatelliteNdviView with vegetative index", () => {
    const html = renderToStaticMarkup(<SatelliteNdviView />);
    expect(html).toContain("Monitoring Kekeringan Vegetasi NDVI Satelit");
  });

  it("renders WildlifeCorridorsView with target species", () => {
    const html = renderToStaticMarkup(<WildlifeCorridorsView />);
    expect(html).toContain("Koridor Lintasan Satwa Liar Urban");
  });

  it("renders SeaLevelRiseView with scenario selector", () => {
    const html = renderToStaticMarkup(<SeaLevelRiseView />);
    expect(html).toContain("Simulator Kenaikan Muka Air Laut &amp; Rob Pesisir");
  });

  // Group 3: Smart City
  it("renders SmartParkingView with available spots", () => {
    const html = renderToStaticMarkup(<SmartParkingView />);
    expect(html).toContain("Sensor Parkir Cerdas &amp; Okupansi Tepi Jalan");
  });

  it("renders EvChargingView with charger kw capacity", () => {
    const html = renderToStaticMarkup(<EvChargingView />);
    expect(html).toContain("Stasiun Pengisian Kendaraan Listrik (EV)");
  });

  it("renders WalkScoreView with 15-minute city breakdown", () => {
    const html = renderToStaticMarkup(<WalkScoreView />);
    expect(html).toContain("Kalkulator Walk Score Internasional");
  });

  it("renders DigitalTwinView with building counts and solar potential", () => {
    const html = renderToStaticMarkup(<DigitalTwinView />);
    expect(html).toContain("Digital Twin 3D &amp; Potensi Rooftop Surya");
  });

  it("renders RoadDamageAiView with defect confidence scores", () => {
    const html = renderToStaticMarkup(<RoadDamageAiView />);
    expect(html).toContain("Inspeksi Kerusakan Jalan &amp; Trotoar AI");
  });

  it("renders DroneCorridorsView with airspace classes", () => {
    const html = renderToStaticMarkup(<DroneCorridorsView />);
    expect(html).toContain("Koridor Logistik Drone &amp; Zona Udara Rendah");
  });

  it("renders PublicWifiView with Mbps speeds", () => {
    const html = renderToStaticMarkup(<PublicWifiView />);
    expect(html).toContain("Jaringan Wi-Fi Publik &amp; Kios Internet Kota");
  });

  it("renders StreetLightingView with illuminance lux", () => {
    const html = renderToStaticMarkup(<StreetLightingView />);
    expect(html).toContain("Jaringan Penerangan Jalan Cerdas (Smart PJU)");
  });

  it("renders CurbsideManagementView with flex-zone modes", () => {
    const html = renderToStaticMarkup(<CurbsideManagementView />);
    expect(html).toContain("Manajemen Dinamis Tepi Jalan (Curbside Allocation)");
  });

  it("renders PedestrianFlowAiView with crowd flow velocities", () => {
    const html = renderToStaticMarkup(<PedestrianFlowAiView />);
    expect(html).toContain("Simulator Dinamika Arus Pejalan Kaki");
  });

  it("renders OpenBasemapsView with multi-engine basemap switcher", () => {
    const html = renderToStaticMarkup(<OpenBasemapsView />);
    expect(html).toContain("Universal Multi-Engine Basemap Switcher");
    expect(html).toContain("CartoDB Dark Matter");
    expect(html).toContain("OpenStreetMap");
  });

  // Group 4: Commerce
  it("renders TouristAudioGuideView with ratings and languages", () => {
    const html = renderToStaticMarkup(<TouristAudioGuideView />);
    expect(html).toContain("Panduan Suara Wisata Pejalan Kaki Multibahasa");
  });

  it("renders CurrencyTaxRefundView with VAT calculations", () => {
    const html = renderToStaticMarkup(<CurrencyTaxRefundView />);
    expect(html).toContain("Konversi Valas &amp; Kalkulator Pengembalian Pajak");
  });

  it("renders MarketTranslatorView with phrasebook cards", () => {
    const html = renderToStaticMarkup(<MarketTranslatorView />);
    expect(html).toContain("Penerjemah Tawar-Menawar &amp; Kartu Alergi Makanan");
  });

  it("renders CarbonMarketplaceView with carbon credit pricing", () => {
    const html = renderToStaticMarkup(<CarbonMarketplaceView />);
    expect(html).toContain("Bursa Kredit Karbon Pejalan Kaki &amp; Restorasi Urban");
  });

  it("renders NightlifeZonesView with 24h city districts", () => {
    const html = renderToStaticMarkup(<NightlifeZonesView />);
    expect(html).toContain("Distrik Ekonomi Malam &amp; 24 Jam Terpadu");
  });

  it("renders StreetPerformersView with busking spots", () => {
    const html = renderToStaticMarkup(<StreetPerformersView />);
    expect(html).toContain("Panggung Seni Jalanan &amp; Mural Publik");
  });

  it("renders FreightDeliveryView with cargo bike statistics", () => {
    const html = renderToStaticMarkup(<FreightDeliveryView />);
    expect(html).toContain("Pusat Distribusi Cargo Bike Ramah Lingkungan");
  });

  it("renders CustomsTariffsView with HS codes", () => {
    const html = renderToStaticMarkup(<CustomsTariffsView />);
    expect(html).toContain("Kalkulator Tarif Bea Cukai Kerajinan UMKM");
  });

  // Group 5: Governance
  it("renders EmergencyEvacuationView with shelters and capacity", () => {
    const html = renderToStaticMarkup(<EmergencyEvacuationView />);
    expect(html).toContain("Rute Evakuasi Bencana &amp; Titik Kumpul Darurat");
  });

  it("renders PortLogisticsView with container TEU dwell times", () => {
    const html = renderToStaticMarkup(<PortLogisticsView />);
    expect(html).toContain("Terminal Logistik Pelabuhan &amp; Hub Multimoda");
  });

  it("renders HistoricalMapView with temporal era timeline", () => {
    const html = renderToStaticMarkup(<HistoricalMapView />);
    expect(html).toContain("Morfologi Sejarah Kota &amp; Citra Satelit Lintas Era");
  });

  it("renders SpatialDemographicsView with density and commuter influx", () => {
    const html = renderToStaticMarkup(<SpatialDemographicsView />);
    expect(html).toContain("Demografi Spasial &amp; Daya Beli Kawasan");
  });

  it("renders GreenSpacesView with biophilic amenities", () => {
    const html = renderToStaticMarkup(<GreenSpacesView />);
    expect(html).toContain("Ruang Terbuka Hijau &amp; Indeks Biofilia Kota");
  });

  it("renders CulturalHeritageView with UNESCO monument details", () => {
    const html = renderToStaticMarkup(<CulturalHeritageView />);
    expect(html).toContain("Rute Monumen Budaya &amp; Warisan Sejarah");
  });

  it("renders WaterRefillView with plastic bottle savings", () => {
    const html = renderToStaticMarkup(<WaterRefillView />);
    expect(html).toContain("Titik Isi Ulang Air Minum Publik Gratis");
  });

  it("renders AccessibleRestroomsView with universal amenities", () => {
    const html = renderToStaticMarkup(<AccessibleRestroomsView />);
    expect(html).toContain("Pencari Toilet Difabel &amp; Sanitasi Publik");
  });

  it("renders IncidentDispatchView with emergency CAD prioritization", () => {
    const html = renderToStaticMarkup(<IncidentDispatchView />);
    expect(html).toContain("Pusat Komando Insiden &amp; Armada Darurat");
  });

  it("renders MedicalTourismView with healthcare facilities", () => {
    const html = renderToStaticMarkup(<MedicalTourismView />);
    expect(html).toContain("Koridor Wisata Medis &amp; Faskes Akreditasi");
  });

  it("renders HeritagePreservationView with vernacular building status", () => {
    const html = renderToStaticMarkup(<HeritagePreservationView />);
    expect(html).toContain("Preservasi Fasad Arsitektur Vernakular");
  });

  it("renders GlobalEmbassyView with diplomatic mission contacts", () => {
    const html = renderToStaticMarkup(<GlobalEmbassyView />);
    expect(html).toContain("Navigasi Kedutaan &amp; Layanan Konsuler Internasional");
  });

  // App Router Integration
  it("renders the master InternationalPortalPage in App Router with GetraAppShell", () => {
    const html = renderToStaticMarkup(<InternationalPortalPage />);
    expect(html).toContain("Portal Smart City &amp; WebGIS Internasional");
  });

  it("renders InternationalFeaturePage dynamically for /international/cctv", async () => {
    const pageElement = await InternationalFeaturePage({
      params: Promise.resolve({ slug: "cctv" }),
    });
    const html = renderToStaticMarkup(pageElement);
    expect(html).toContain("Global Traffic &amp; Pedestrian CCTV Live Stream");
  });

  it("renders InternationalFeaturePage dynamically for /international/open-basemaps", async () => {
    const pageElement = await InternationalFeaturePage({
      params: Promise.resolve({ slug: "open-basemaps" }),
    });
    const html = renderToStaticMarkup(pageElement);
    expect(html).toContain("Universal Multi-Engine Basemap Switcher");
  });
});

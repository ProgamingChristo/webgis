import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GetraAppShell } from "@/src/components/getra-ui";
import {
  INTERNATIONAL_FEATURES,
  CctvView,
  TrafficCongestionView,
  MultimodalTransitView,
  AqiView,
  UrbanHeatView,
  ElevationProfileView,
  SmartParkingView,
  EvChargingView,
  NoisePollutionView,
  FloodMonitoringView,
  SolarRadiationView,
  EmergencyEvacuationView,
  MicromobilityView,
  GtfsRealtimeView,
  WalkScoreView,
  TouristAudioGuideView,
  CurrencyTaxRefundView,
  MarketTranslatorView,
  CarbonMarketplaceView,
  DigitalTwinView,
  RoadDamageAiView,
  DroneCorridorsView,
  PortLogisticsView,
  HistoricalMapView,
  SpatialDemographicsView,
  PublicWifiView,
  GreenSpacesView,
  CulturalHeritageView,
  WaterRefillView,
  AccessibleRestroomsView,
  StreetLightingView,
  IncidentDispatchView,
  CommuterCrowdingView,
  WeatherRadarView,
  CurbsideManagementView,
  WasteRecyclingView,
  PedestrianBridgesView,
  NightlifeZonesView,
  StreetPerformersView,
  FreightDeliveryView,
  AirportExpressView,
  PedestrianFlowAiView,
  CustomsTariffsView,
  MedicalTourismView,
  SatelliteNdviView,
  WildlifeCorridorsView,
  SeaLevelRiseView,
  HeritagePreservationView,
  GlobalEmbassyView,
  OpenBasemapsView,
} from "@/src/features/international";

export function generateStaticParams() {
  return INTERNATIONAL_FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = INTERNATIONAL_FEATURES.find((f) => f.slug === slug);
  if (!feature) return { title: "Fitur Internasional — GETRA" };

  return {
    title: `${feature.title} — GETRA Global`,
    description: feature.description,
  };
}

export default async function InternationalFeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = INTERNATIONAL_FEATURES.find((f) => f.slug === slug);
  if (!feature) notFound();

  function renderView() {
    switch (slug) {
      case "cctv": return <CctvView />;
      case "traffic-congestion": return <TrafficCongestionView />;
      case "multimodal-transit": return <MultimodalTransitView />;
      case "air-quality": return <AqiView />;
      case "urban-heat": return <UrbanHeatView />;
      case "elevation-profile": return <ElevationProfileView />;
      case "smart-parking": return <SmartParkingView />;
      case "ev-charging": return <EvChargingView />;
      case "noise-pollution": return <NoisePollutionView />;
      case "flood-monitoring": return <FloodMonitoringView />;
      case "solar-radiation": return <SolarRadiationView />;
      case "emergency-evacuation": return <EmergencyEvacuationView />;
      case "micromobility": return <MicromobilityView />;
      case "gtfs-realtime": return <GtfsRealtimeView />;
      case "walk-score": return <WalkScoreView />;
      case "tourist-audio-guide": return <TouristAudioGuideView />;
      case "currency-tax-refund": return <CurrencyTaxRefundView />;
      case "market-translator": return <MarketTranslatorView />;
      case "carbon-marketplace": return <CarbonMarketplaceView />;
      case "digital-twin-3d": return <DigitalTwinView />;
      case "road-damage-ai": return <RoadDamageAiView />;
      case "drone-corridors": return <DroneCorridorsView />;
      case "port-logistics": return <PortLogisticsView />;
      case "historical-map": return <HistoricalMapView />;
      case "spatial-demographics": return <SpatialDemographicsView />;
      case "public-wifi": return <PublicWifiView />;
      case "green-spaces": return <GreenSpacesView />;
      case "cultural-heritage": return <CulturalHeritageView />;
      case "water-refill": return <WaterRefillView />;
      case "accessible-restrooms": return <AccessibleRestroomsView />;
      case "street-lighting": return <StreetLightingView />;
      case "incident-dispatch": return <IncidentDispatchView />;
      case "commuter-crowding": return <CommuterCrowdingView />;
      case "weather-radar": return <WeatherRadarView />;
      case "curbside-management": return <CurbsideManagementView />;
      case "waste-recycling": return <WasteRecyclingView />;
      case "pedestrian-bridges": return <PedestrianBridgesView />;
      case "nightlife-zones": return <NightlifeZonesView />;
      case "street-performers": return <StreetPerformersView />;
      case "freight-delivery": return <FreightDeliveryView />;
      case "airport-express": return <AirportExpressView />;
      case "pedestrian-flow-ai": return <PedestrianFlowAiView />;
      case "cross-border-tariffs": return <CustomsTariffsView />;
      case "medical-tourism": return <MedicalTourismView />;
      case "satellite-ndvi": return <SatelliteNdviView />;
      case "wildlife-corridors": return <WildlifeCorridorsView />;
      case "sea-level-rise": return <SeaLevelRiseView />;
      case "heritage-preservation": return <HeritagePreservationView />;
      case "global-embassy": return <GlobalEmbassyView />;
      case "open-basemaps": return <OpenBasemapsView />;
      default: return notFound();
    }
  }

  return (
    <GetraAppShell
      eyebrow="GETRA Smart City & Global GIS"
      title={feature.title}
      description={feature.description}
      tone="community"
    >
      {renderView()}
    </GetraAppShell>
  );
}

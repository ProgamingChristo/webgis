"use client";

import { bindRouteAlternativeSelection, syncRouteAlternatives, syncWalkingRoute } from "@/src/features/routing/route-layer";
import { isRouteGeometry } from "@/src/features/routing/route-geometry";
import { formatRouteDistance, formatRouteMinutes, getRouteLabelAnchor, getRouteLabelOffset } from "@/src/features/routing/route-presentation";
import type { RoutingCandidate } from "@/src/services/routing.service";
import { createMerchantMapPopup } from "@/src/features/global-search/merchant-map-popup";
import { Layers } from "lucide-react";

import type * as GeoJSON from "geojson";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LngLatBounds,
  Map as MapLibreMap,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";

import { buildSponsoredPopupContent } from "@/src/lib/maplibre-popup";
import type { Merchant, UserLocation } from "@/types/getra";
import type { TransportNodeDto } from "@/src/types/canonical-api";
import type { BusinessSpaceCandidate } from "@/src/features/business-space/types/business-space.types";
import type { AccessibilityEvidence } from "@/src/features/accessibility-evidence/types/accessibility-evidence.types";
import type { MapViewportBounds } from "@/src/services/mapid-layer.service";
import { syncAdministrativeBoundaryLayers } from "@/src/features/administrative-boundaries/map/administrative-boundary-layers";
import type { AdministrativeBoundaryCollection } from "@/src/features/administrative-boundaries/types/administrative-boundary.types";
import { ContextualLayerControl } from "@/src/features/mission-context-layers/components/contextual-layer-control";
import {
  bindContextualObservationInteractions,
  syncContextualObservationLayers,
} from "@/src/features/mission-context-layers/map/contextual-observation-layers";
import type {
  ContextualLayerData,
  ContextualLayerKey,
  ContextualLayerVisibility,
} from "@/src/features/mission-context-layers/types/contextual-layer.types";
import {
  ANALYTICS_FILL_LAYER_ID,
  syncDemandIntelligenceLayers,
} from "@/src/features/demand-intelligence/map/demand-intelligence-layers";
import type {
  AnalyticsMapCollection,
  AnalyticsMode,
} from "@/src/features/demand-intelligence/types/demand-intelligence.types";
import {
  BASEMAP_OPTIONS,
  type BasemapId,
  FALLBACK_MAP_STYLE,
  getBasemapOption,
  getDefaultBasemapId,
  getPreferredBasemapId,
  persistBasemapPreference,
} from "@/lib/mapid";
import {
  computeMapSafeArea,
  isInRightSafeZone,
  isInLeftSafeZone,
} from "@/src/lib/map-safe-area";

setWorkerUrl(
  "/maplibre/maplibre-gl-worker.mjs",
);

import { CampaignEventService, type SponsoredPinDTO } from "@/src/features/umkm-advertising";

const EMPTY_TRANSPORT_NODES: TransportNodeDto[] = [];

type GetraMapProps = {
  merchants: Merchant[];
  transportNodes?: TransportNodeDto[];
  selectedId: string | null;
  propertyCandidates?: BusinessSpaceCandidate[];
  selectedPropertyId?: string | null;
  accessibilityEvidence?: AccessibilityEvidence[];
  selectedAccessibilityEvidenceId?: string | null;
  userLocation: UserLocation | null;
  journeyActive?: boolean;
  journeyFollowing?: boolean;
  journeyFocusKey?: number;
  journeyHeadingDegrees?: number | null;
  journeySpeedMps?: number | null;
  navigationLayerState?: "EXPLORATION" | "ACTIVE_NAVIGATION" | "ACTIVE_NAVIGATION_WITH_UMKM";
  onJourneyCameraOverride?: () => void;
  onSelect: (merchant: Merchant) => void;
  onRequestMerchantRoute?: (merchant: Merchant) => void;
  onMerchantDetail?: (merchant: Merchant) => void;
  onSelectProperty?: (candidate: BusinessSpaceCandidate) => void;
  onSelectAccessibilityEvidence?: (evidence: AccessibilityEvidence) => void;
  onClearSelection: () => void;
  datasetBounds: DatasetBounds;
  datasetOrigin: DatasetOrigin;
  routeOriginPoint?: RoutePoint | null;
  routeDestinationPoint?: RoutePoint | null;
  routeGeometry?: GeoJSON.LineString | null;
  routeCandidates?: RoutingCandidate[];
  selectedRouteId?: string | null;
  onSelectRoute?: (routeId: string) => void;
  serviceAreaGeometry?: GeoJSON.MultiLineString | null;
  importBoundaries?: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null;
  administrativeBoundaries?: AdministrativeBoundaryCollection;
  contextualLayerData: ContextualLayerData;
  contextualLayerVisibility: ContextualLayerVisibility;
  onContextualLayerChange: (layer: ContextualLayerKey, visible: boolean) => void;
  sponsoredPlacements?: SponsoredPinDTO[];
  onSelectSponsored?: (placement: SponsoredPinDTO) => void;
  onViewportChange?: (bounds: MapViewportBounds) => void;
  onRandomExploration?: () => void;
  mapPickMode?: "NONE" | "ROUTE_START" | "ROUTE_DESTINATION";
  onMapPick?: (coordinate: { latitude: number; longitude: number }) => void;
  datasetKey: string;
  focusBounds?: MapViewportBounds | null;
  focusKey?: number;
  analyticsCollection?: AnalyticsMapCollection | null;
  analyticsMode?: AnalyticsMode;
  onSelectAnalyticsRegion?: (regionId: string) => void;
};

type DatasetBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type DatasetOrigin = {
  name: string;
  longitude: number;
  latitude: number;
};

type RoutePoint = {
  label: string;
  latitude: number;
  longitude: number;
};

const MERCHANT_CLUSTER_THRESHOLD = 250;
const MERCHANT_SOURCE_ID = "getra-merchants";
const MERCHANT_CLUSTER_LAYER_ID = "getra-merchant-clusters";
const MERCHANT_CLUSTER_COUNT_LAYER_ID = "getra-merchant-cluster-count";
const MERCHANT_POINT_LAYER_ID = "getra-merchant-points";

function removeMerchantClusterLayers(map: MapLibreMap) {
  for (const layerId of [
    MERCHANT_CLUSTER_COUNT_LAYER_ID,
    MERCHANT_CLUSTER_LAYER_ID,
    MERCHANT_POINT_LAYER_ID,
  ]) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource(MERCHANT_SOURCE_ID)) map.removeSource(MERCHANT_SOURCE_ID);
}

function createMerchantMarker(
  selected: boolean,
  merchant: Merchant,
) {
  const element =
    document.createElement("div");

  element.className =
    "map-marker-anchor";

  const button =
    document.createElement("button");

  button.type = "button";

  button.className = selected
    ? "map-marker map-marker--selected"
    : "map-marker";

  button.setAttribute(
    "aria-label",
    `Pilih ${merchant.name}`,
  );

  button.dataset.brand =
    merchant.brand;

  element.append(button);

  return {
    element,
    button,
  };
}

function createPropertyMarker(
  selected: boolean,
  candidate: BusinessSpaceCandidate,
) {
  const element = document.createElement("div");
  element.className = "property-marker-anchor";
  const button = document.createElement("button");
  button.type = "button";
  button.className = selected
    ? "property-marker property-marker--selected"
    : "property-marker";
  button.setAttribute(
    "aria-label",
    `Pilih observasi properti ${candidate.property_category ?? candidate.source_id}`,
  );
  button.dataset.source = "PROPERTI_GO";
  element.append(button);
  return { element, button };
}

function createAccessibilityEvidenceMarker(
  selected: boolean,
  evidence: AccessibilityEvidence,
) {
  const element = document.createElement("div");
  element.className = "accessibility-marker-anchor";
  const button = document.createElement("button");
  button.type = "button";
  button.className = selected
    ? "accessibility-marker accessibility-marker--selected"
    : "accessibility-marker";
  button.setAttribute(
    "aria-label",
    `Pilih observasi aksesibilitas ${evidence.title ?? evidence.source_record_id}`,
  );
  button.dataset.source = evidence.source_type;
  button.dataset.status = evidence.validation_status;
  button.textContent =
    evidence.subcategory === "CROSSING"
      ? "X"
      : evidence.subcategory === "GUIDING_BLOCK"
        ? "G"
        : evidence.subcategory === "TRANSIT_ACCESS"
          ? "T"
          : "A";
  element.append(button);
  return { element, button };
}

function createPopupContent(
  title: string,
  detail: string,
) {
  const content =
    document.createElement("div");

  const heading =
    document.createElement("strong");

  heading.textContent =
    title;

  content.append(
    heading,
    document.createElement("br"),
    document.createTextNode(detail),
  );

  return content;
}

function createRouteEndpointMarker(
  kind: "start" | "destination",
  label: string,
) {
  const element =
    document.createElement("div");

  element.className =
    `route-endpoint route-endpoint--${kind}`;

  const dot =
    document.createElement("span");

  dot.className =
    "route-endpoint__dot";

  const badge =
    document.createElement("span");

  badge.className =
    "route-endpoint__badge";

  badge.textContent =
    kind === "start"
      ? "A · ASAL"
      : "B · TUJUAN";

  element.title =
    label;
  element.setAttribute("aria-label", `${kind === "start" ? "Asal A" : "Tujuan B"}: ${label}`);
  element.setAttribute("role", "img");

  element.append(
    dot,
    badge,
  );

  return element;
}

function createTransportMarker(node: TransportNodeDto) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "canonical-transport-marker";
  element.title = node.name;
  element.setAttribute("aria-label", `Lihat titik transportasi ${node.name}`);
  return element;
}

function addDatasetExtent(
  map: MapLibreMap,
  _bounds: DatasetBounds,
) {
  void _bounds;

  if (
    !map.isStyleLoaded()
  ) {
    return;
  }

  /*
   * Dataset extent used to be rendered as a large bounding rectangle.
   * Keep the cleanup here so old hot-reload map instances lose the box,
   * but do not add it back to the visual map.
   */
  for (const layerId of [
    "coffee-shop-extent-line",
    "coffee-shop-extent-fill",
  ]) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  }

  if (map.getSource("coffee-shop-extent")) {
    map.removeSource("coffee-shop-extent");
  }
}

function addJakartaAdminBoundaries(
  map: MapLibreMap,
  importBoundaries: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null,
) {
  if (!map.isStyleLoaded()) {
    return;
  }

  const boundaryFeatures = new Map<
    string,
    GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
  >();

  (importBoundaries?.features ?? []).forEach((feature, index) => {
    const boundaryMethod =
      typeof feature.properties?.boundary_method === "string"
        ? feature.properties.boundary_method
        : null;

    /*
     * Older admin imports stored a broad rectangle around the point extent.
     * Those rectangles caused the "kotak gede" visual artifact, so keep them
     * persisted for audit metadata but do not render them as admin boundaries.
     */
    if (boundaryMethod === "import_extent_with_safety_padding") {
      return;
    }

    const id =
      typeof feature.properties?.id === "string"
        ? feature.properties.id
        : `import-${index}`;

    boundaryFeatures.set(id, feature);
  });

  const boundaryData: GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  > = {
    type: "FeatureCollection",
    features: Array.from(boundaryFeatures.values()),
  };

  const existingSource =
    map.getSource(
      "jakarta-admin-boundaries",
    );

  if (existingSource) {
    (
      existingSource as unknown as {
        setData: (
          data: GeoJSON.FeatureCollection<
            GeoJSON.Polygon | GeoJSON.MultiPolygon
          >,
        ) => void;
      }
    ).setData(
      boundaryData,
    );
  } else {
    map.addSource(
      "jakarta-admin-boundaries",
      {
        type: "geojson",
        data:
          boundaryData,
      },
    );
  }

  if (!map.getLayer("jakarta-admin-boundary-fill")) {
    map.addLayer({
      id: "jakarta-admin-boundary-fill",
      type: "fill",
      source: "jakarta-admin-boundaries",
      paint: {
        "fill-color": [
          "match",
          [
            "get",
            "id",
          ],
          "jakarta-barat",
          "#22d3ee",
          "jakarta-pusat",
          "#9af24a",
          "jakarta-selatan",
          "#38bdf8",
          "jakarta-timur",
          "#f59e0b",
          "jakarta-utara",
          "#e879f9",
          "#22d3ee",
        ],
        "fill-opacity": [
          "case",
          [
            "has",
            "boundary_method",
          ],
          0.025,
          0.05,
        ],
      },
    });
  }

  if (!map.getLayer("jakarta-admin-boundary-casing")) {
    map.addLayer({
      id: "jakarta-admin-boundary-casing",
      type: "line",
      source: "jakarta-admin-boundaries",
      paint: {
        "line-color": "#041018",
        "line-width": [
          "interpolate",
          [
            "linear",
          ],
          [
            "zoom",
          ],
          10,
          6,
          14,
          8,
        ],
        "line-opacity": 0.58,
      },
    });
  }

  if (!map.getLayer("jakarta-admin-boundary-line")) {
    map.addLayer({
      id: "jakarta-admin-boundary-line",
      type: "line",
      source: "jakarta-admin-boundaries",
      paint: {
        "line-color": [
          "match",
          [
            "get",
            "id",
          ],
          "jakarta-barat",
          "#22d3ee",
          "jakarta-pusat",
          "#9af24a",
          "jakarta-selatan",
          "#38bdf8",
          "jakarta-timur",
          "#f59e0b",
          "jakarta-utara",
          "#e879f9",
          "#22d3ee",
        ],
        "line-width": [
          "interpolate",
          [
            "linear",
          ],
          [
            "zoom",
          ],
          10,
          3.8,
          14,
          5.5,
        ],
        "line-opacity": [
          "case",
          [
            "has",
            "boundary_method",
          ],
          0.72,
          0.95,
        ],
      },
    });
  }

  if (!map.getLayer("jakarta-admin-boundary-label")) {
    map.addLayer({
      id: "jakarta-admin-boundary-label",
      type: "symbol",
      source: "jakarta-admin-boundaries",
      minzoom: 10,
      layout: {
        "text-field": [
          "get",
          "name",
        ],
        "text-size": [
          "interpolate",
          [
            "linear",
          ],
          [
            "zoom",
          ],
          10,
          11,
          14,
          15,
        ],
        "text-transform": "uppercase",
        "text-font": ["Noto Sans Regular"],
        "text-letter-spacing": 0.08,
        "text-allow-overlap": false,
        "symbol-placement": "point",
      },
      paint: {
        "text-color": "#eef8fa",
        "text-halo-color": "#041018",
        "text-halo-width": 2.5,
        "text-opacity": 0.88,
      },
    });
  }
}


function syncWalkingServiceArea(
  map: MapLibreMap,
  geometry?: GeoJSON.MultiLineString | null,
) {
  if (!map.isStyleLoaded()) return;
  const data: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: geometry ? [{ type: "Feature", properties: {}, geometry }] : [],
  };
  const source = map.getSource("walking-service-area");
  if (source) {
    (source as unknown as { setData: (next: GeoJSON.FeatureCollection) => void }).setData(data);
    return;
  }
  map.addSource("walking-service-area", { type: "geojson", data });
  map.addLayer({
    id: "walking-service-area-lines",
    type: "line",
    source: "walking-service-area",
    paint: {
      "line-color": "#34d399",
      "line-width": 3,
      "line-opacity": 0.42,
    },
  });
}

export function GetraMap({
  merchants,
  transportNodes = EMPTY_TRANSPORT_NODES,
  selectedId,
  propertyCandidates = [],
  selectedPropertyId = null,
  accessibilityEvidence = [],
  selectedAccessibilityEvidenceId = null,
  userLocation,
  journeyActive = false,
  journeyFollowing = false,
  journeyFocusKey = 0,
  journeyHeadingDegrees = null,
  journeySpeedMps = null,
  navigationLayerState = "EXPLORATION",
  onJourneyCameraOverride,
  onSelect,
  onRequestMerchantRoute,
  onMerchantDetail,
  onSelectProperty,
  onSelectAccessibilityEvidence,
  onClearSelection,
  datasetBounds,
  datasetOrigin,
  routeOriginPoint,
  routeDestinationPoint,
  routeGeometry,
  routeCandidates = [],
  selectedRouteId = null,
  onSelectRoute,
  serviceAreaGeometry,
  importBoundaries,
  administrativeBoundaries = { type: "FeatureCollection", features: [] },
  contextualLayerData,
  contextualLayerVisibility,
  onContextualLayerChange,
  sponsoredPlacements,
  onSelectSponsored,
  onViewportChange,
  mapPickMode = "NONE",
  onMapPick,
  datasetKey,
  focusBounds,
  focusKey = 0,
  analyticsCollection = null,
  analyticsMode = "DEMAND",
  onSelectAnalyticsRegion,
}: GetraMapProps) {
  const [
    activeBasemapId,
    setActiveBasemapId,
  ] =
    useState<BasemapId>(
      getDefaultBasemapId(),
    );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setActiveBasemapId(getPreferredBasemapId()), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const [styleRevision, setStyleRevision] = useState(0);
  const [renderedClusterFeatureCount, setRenderedClusterFeatureCount] = useState(0);
  const [clusterSourceFeatureCount, setClusterSourceFeatureCount] = useState(0);
  const [boundaryLayersReady, setBoundaryLayersReady] = useState(false);
  const [cameraFitKey, setCameraFitKey] = useState(0);
  const [cameraOwner, setCameraOwner] = useState<"SYSTEM" | "USER">("SYSTEM");
  const cameraOwnerRef = useRef<"SYSTEM" | "USER">("SYSTEM");
  const journeyOverrideRef = useRef(onJourneyCameraOverride);
  useEffect(() => { journeyOverrideRef.current = onJourneyCameraOverride; }, [onJourneyCameraOverride]);
  const onSelectRouteRef = useRef(onSelectRoute);
  useEffect(() => { onSelectRouteRef.current = onSelectRoute; }, [onSelectRoute]);

  const hasVisibleContextualLayer =
    contextualLayerVisibility.property ||
    contextualLayerVisibility.transaction ||
    contextualLayerVisibility.activities;

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<MapLibreMap | null>(null);

  /**
   * Cached right safe-area width (basemap panel measured width + gap).
   * Updated by a ResizeObserver on the .basemap-switcher element.
   * Used by all fitBounds and easeTo calls that need to avoid the panel.
   */
  const basemapSafeRightRef = useRef<number>(48);

  const markUserCameraControl = useCallback(() => {
    journeyOverrideRef.current?.();
    if (cameraOwnerRef.current === "USER") return;
    const map = mapRef.current;
    if (map) map.stop();
    cameraOwnerRef.current = "USER";
    setCameraOwner("USER");
  }, []);

  const markSystemCameraIntent = useCallback(() => {
    cameraOwnerRef.current = "SYSTEM";
    queueMicrotask(() => {
      setCameraOwner("SYSTEM");
    });
  }, []);

  const markUserCameraControlFromEvent = useCallback((event: { originalEvent?: unknown }) => {
    if (event.originalEvent) markUserCameraControl();
  }, [markUserCameraControl]);

  const merchantMarkersRef =
    useRef<Map<string, Marker>>(
      new Map(),
    );

  const transportMarkersRef = useRef<Map<string, Marker>>(new Map());

  const propertyMarkersRef =
    useRef<Map<string, Marker>>(
      new Map(),
    );

  const accessibilityMarkersRef =
    useRef<Map<string, Marker>>(
      new Map(),
    );

  const sponsoredMarkersRef =
    useRef<Map<string, Marker>>(
      new Map(),
    );

  const userLocationMarkerRef =
    useRef<Marker | null>(
      null,
    );

  const datasetOriginMarkerRef =
    useRef<Marker | null>(
      null,
    );

  const routeOriginMarkerRef =
    useRef<Marker | null>(
      null,
    );

  const routeDestinationMarkerRef =
    useRef<Marker | null>(
      null,
    );

  const routeLabelMarkersRef = useRef<Map<string, Marker>>(new Map());

  const routeGeometryRef =
    useRef<GeoJSON.LineString | null>(
      null,
    );

  const serviceAreaGeometryRef =
    useRef<GeoJSON.MultiLineString | null>(
      serviceAreaGeometry ?? null,
    );

  const datasetBoundsRef =
    useRef<DatasetBounds>(
      datasetBounds,
    );

  const datasetOriginRef = useRef(datasetOrigin);
  const onViewportChangeRef = useRef(onViewportChange);
  const lastFittedDatasetKeyRef = useRef(datasetKey);

  const importBoundariesRef =
    useRef<GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null>(
      importBoundaries ?? null,
    );

  const mapPickModeRef = useRef(mapPickMode);
  const onMapPickRef = useRef(onMapPick);


  // Trigger HMR
  const administrativeBoundariesRef = useRef(administrativeBoundaries);
  const contextualLayerDataRef = useRef(contextualLayerData);
  const contextualLayerVisibilityRef = useRef(contextualLayerVisibility);
  const onSelectAnalyticsRegionRef = useRef(onSelectAnalyticsRegion);

  useEffect(() => {
    mapPickModeRef.current = mapPickMode;
  }, [mapPickMode]);

  useEffect(() => {
    onMapPickRef.current = onMapPick;
  }, [onMapPick]);

  useEffect(() => {
    onSelectAnalyticsRegionRef.current = onSelectAnalyticsRegion;
  }, [onSelectAnalyticsRegion]);

  useEffect(() => {
    routeGeometryRef.current =
      routeGeometry ?? null;
    serviceAreaGeometryRef.current =
      serviceAreaGeometry ?? null;
  }, [
    routeGeometry,
    serviceAreaGeometry,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusBounds || focusKey === 0) return;
    const compact = window.innerWidth <= 768;
    const safeArea = computeMapSafeArea(map.getContainer(), compact);

    markSystemCameraIntent();

    const spanLng = Math.abs(focusBounds.east - focusBounds.west);
    const spanLat = Math.abs(focusBounds.north - focusBounds.south);
    if (spanLng < 0.001 || spanLat < 0.001) {
      map.flyTo({
        center: [(focusBounds.west + focusBounds.east) / 2, (focusBounds.south + focusBounds.north) / 2],
        zoom: 14,
        duration: 800,
      });
    } else {
      map.fitBounds(
        [
          [focusBounds.west, focusBounds.south],
          [focusBounds.east, focusBounds.north],
        ],
        {
          padding: compact
            ? { top: safeArea.top, right: safeArea.left, bottom: 190, left: safeArea.left }
            : { top: safeArea.top, right: safeArea.right, bottom: safeArea.bottom, left: safeArea.left },
          maxZoom: 14,
          duration: 800,
        },
      );
    }
    setCameraFitKey(focusKey);
  }, [focusBounds, focusKey, markSystemCameraIntent]);

  useEffect(() => {
    administrativeBoundariesRef.current = administrativeBoundaries;
    const map = mapRef.current;
    if (map?.isStyleLoaded()) {
      syncAdministrativeBoundaryLayers(map, administrativeBoundaries);
      setBoundaryLayersReady(true);
    }
  }, [administrativeBoundaries]);

  useEffect(() => {
    contextualLayerDataRef.current = contextualLayerData;
    contextualLayerVisibilityRef.current = contextualLayerVisibility;
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncContextualObservationLayers(map, contextualLayerData, contextualLayerVisibility);
    return bindContextualObservationInteractions(
      map,
      contextualLayerData,
      contextualLayerVisibility,
    );
  }, [contextualLayerData, contextualLayerVisibility, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncDemandIntelligenceLayers(map, analyticsCollection, analyticsMode);
    if (!map.getLayer(ANALYTICS_FILL_LAYER_ID)) return;
    const selectRegion = (event: MapLayerMouseEvent) => {
      const regionId = event.features?.[0]?.properties?.region_id;
      if (typeof regionId === "string") onSelectAnalyticsRegionRef.current?.(regionId);
    };
    const enter = () => { map.getCanvas().style.cursor = "pointer"; };
    const leave = () => { map.getCanvas().style.cursor = ""; };
    map.on("click", ANALYTICS_FILL_LAYER_ID, selectRegion);
    map.on("mouseenter", ANALYTICS_FILL_LAYER_ID, enter);
    map.on("mouseleave", ANALYTICS_FILL_LAYER_ID, leave);
    return () => {
      map.off("click", ANALYTICS_FILL_LAYER_ID, selectRegion);
      map.off("mouseenter", ANALYTICS_FILL_LAYER_ID, enter);
      map.off("mouseleave", ANALYTICS_FILL_LAYER_ID, leave);
    };
  }, [analyticsCollection, analyticsMode, styleRevision]);

  useEffect(() => {
    datasetBoundsRef.current =
      datasetBounds;
    datasetOriginRef.current = datasetOrigin;
  }, [
    datasetBounds,
    datasetOrigin,
  ]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    importBoundariesRef.current =
      importBoundaries ?? null;

    const map = mapRef.current;

    if (map?.isStyleLoaded()) {
      addJakartaAdminBoundaries(
        map,
        importBoundariesRef.current,
      );
      syncAdministrativeBoundaryLayers(map, administrativeBoundariesRef.current);
      syncContextualObservationLayers(
        map,
        contextualLayerDataRef.current,
        contextualLayerVisibilityRef.current,
      );
      setBoundaryLayersReady(true);
    }
  }, [importBoundaries]);
  useEffect(() => {
    if (
      !containerRef.current ||
      mapRef.current
    ) {
      return;
    }

    const map =
      new MapLibreMap({
        container:
          containerRef.current,

        style:
          getBasemapOption(
            getDefaultBasemapId(),
          ).style ||
          FALLBACK_MAP_STYLE,

        center: [
          datasetOriginRef.current.longitude,
          datasetOriginRef.current.latitude,
        ],

        zoom: 12,

        minZoom: 10.5,

        maxZoom: 20,
      });

    mapRef.current = map;
    if (typeof window !== "undefined") {
      (window as unknown as { __getraMapLibreInstance?: MapLibreMap }).__getraMapLibreInstance = map;
    }
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(map.getContainer());

    /*
     * Track basemap panel width for safe-area calculations.
     * The panel is a sibling inside .map-shell — wait one frame for it
     * to be mounted before measuring.
     */
    const basemapPanelObserver = new ResizeObserver(() => {
      const container = map.getContainer();
      const compact = container.clientWidth < 600;
      const safeArea = computeMapSafeArea(container, compact);
      basemapSafeRightRef.current = safeArea.right;
    });
    const scheduleBasemapMeasure = () => {
      const shell = map.getContainer().closest(".map-shell") ?? map.getContainer().parentElement;
      const basemapEl = shell?.querySelector(".basemap-switcher");
      if (basemapEl) {
        basemapPanelObserver.observe(basemapEl);
        // Trigger immediate measurement
        const compact = map.getContainer().clientWidth < 600;
        const safeArea = computeMapSafeArea(map.getContainer(), compact);
        basemapSafeRightRef.current = safeArea.right;
      } else {
        // Panel not yet mounted; retry after a frame
        requestAnimationFrame(scheduleBasemapMeasure);
      }
    };
    requestAnimationFrame(scheduleBasemapMeasure);

    map.on("dragstart", markUserCameraControlFromEvent);
    map.on("rotatestart", markUserCameraControlFromEvent);
    map.on("pitchstart", markUserCameraControlFromEvent);
    map.on("wheel", markUserCameraControlFromEvent);
    map.on("touchstart", markUserCameraControlFromEvent);

    map.on("zoomstart", (e) => {
      if (e.originalEvent) {
        markUserCameraControl();
      }
    });

    map.on("click", (e) => {
      if (mapPickModeRef.current !== "NONE") {
        if (onMapPickRef.current) {
          onMapPickRef.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
        }
      }
    });

    /*
     * Snapshot marker collection untuk cleanup.
     * Hindari membaca .current secara langsung
     * saat cleanup effect dijalankan.
     */
    const merchantMarkers =
      merchantMarkersRef.current;

    const transportMarkers = transportMarkersRef.current;

    const accessibilityMarkers =
      accessibilityMarkersRef.current;

    map.addControl(
      new NavigationControl({
        visualizePitch: true,
      }),
      "top-right",
    );

    map.addControl(
      new ScaleControl({
        unit: "metric",
        maxWidth: 120,
      }),
      "bottom-right",
    );

    map.on("load", () => {
      const initialBounds = datasetBoundsRef.current;
      addJakartaAdminBoundaries(
        map,
        importBoundariesRef.current,
      );
      syncAdministrativeBoundaryLayers(map, administrativeBoundariesRef.current);
      syncContextualObservationLayers(
        map,
        contextualLayerDataRef.current,
        contextualLayerVisibilityRef.current,
      );
      setBoundaryLayersReady(true);
      setStyleRevision((revision) => revision + 1);

      addDatasetExtent(
        map,
        initialBounds,
      );

      {
        const initContainer = map.getContainer();
        const initCompact = initContainer.clientWidth < 600;
        const initSafeArea = computeMapSafeArea(initContainer, initCompact);
        map.fitBounds(
          [
            [
              initialBounds.west,
              initialBounds.south,
            ],
            [
              initialBounds.east,
              initialBounds.north,
            ],
          ],
          {
            padding: {
              top: initSafeArea.top,
              right: initSafeArea.right,
              bottom: initSafeArea.bottom,
              left: initSafeArea.left,
            },
            duration: 0,
          },
        );
      }
    });

    const emitViewport = () => {
      const bounds = map.getBounds();
      if (containerRef.current?.parentElement) {
        containerRef.current.parentElement.dataset.mapViewportBounds = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ].join(",");
      }
      onViewportChangeRef.current?.({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      });
    };

    map.on("moveend", emitViewport);

    map.on(
      "error",
      () => {
        console.error(
          "[GETRA MAP ERROR] Map resource failed to load.",
        );
      },
    );

    const sponsoredMarkers = sponsoredMarkersRef.current;
    const routeLabelMarkers = routeLabelMarkersRef.current;

    return () => {
      merchantMarkers.forEach(
        (marker) =>
          marker.remove(),
      );

      merchantMarkers.clear();

      transportMarkers.forEach((marker) => marker.remove());
      transportMarkers.clear();

      sponsoredMarkers.forEach(
        (marker) =>
          marker.remove(),
      );

      sponsoredMarkers.clear();

      accessibilityMarkers.forEach(
        (marker) => marker.remove(),
      );

      accessibilityMarkers.clear();

      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;

      datasetOriginMarkerRef.current?.remove();
      datasetOriginMarkerRef.current = null;

      routeOriginMarkerRef.current?.remove();
      routeOriginMarkerRef.current = null;

      routeDestinationMarkerRef.current?.remove();
      routeDestinationMarkerRef.current = null;

      routeLabelMarkers.forEach((marker) => marker.remove());
      routeLabelMarkers.clear();

      basemapPanelObserver.disconnect();
      resizeObserver.disconnect();
      map.remove();

      mapRef.current = null;
    };
  }, [markUserCameraControl, markUserCameraControlFromEvent]);

  /*
   * Basemap switcher
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    const activeBasemap =
      BASEMAP_OPTIONS.find(
        (option) =>
          option.id ===
          activeBasemapId,
      ) ?? BASEMAP_OPTIONS[0];

    if (!activeBasemap) {
      return;
    }

    map.setStyle(
      activeBasemap.style,
    );

    const syncBasemapOverlays = () => {
      try {
        addJakartaAdminBoundaries(
          map,
          importBoundariesRef.current,
        );
        syncAdministrativeBoundaryLayers(map, administrativeBoundariesRef.current);
        syncContextualObservationLayers(
          map,
          contextualLayerDataRef.current,
          contextualLayerVisibilityRef.current,
        );
        setBoundaryLayersReady(true);

        addDatasetExtent(
          map,
          datasetBoundsRef.current,
        );
        syncWalkingRoute(
          map,
          routeGeometryRef.current,
        );
        syncWalkingServiceArea(map, serviceAreaGeometryRef.current);
        setStyleRevision((revision) => revision + 1);
      } catch (error) {
        console.error(
          "[GETRA MAP ERROR] Failed to sync map overlays.",
          error,
        );
      }
    };

    const timeoutId =
      window.setTimeout(
        syncBasemapOverlays,
        150,
      );

    map.once(
      "style.load",
      syncBasemapOverlays,
    );

    map.once(
      "idle",
      syncBasemapOverlays,
    );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
      map.off(
        "style.load",
        syncBasemapOverlays,
      );
      map.off(
        "idle",
        syncBasemapOverlays,
      );
    };
  }, [
    activeBasemapId,
  ]);

  /*
   * Active dataset extent and center marker
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    const syncDataset = () => {
      addJakartaAdminBoundaries(
        map,
        importBoundariesRef.current,
      );
      syncAdministrativeBoundaryLayers(map, administrativeBoundariesRef.current);
      syncContextualObservationLayers(
        map,
        contextualLayerDataRef.current,
        contextualLayerVisibilityRef.current,
      );

      addDatasetExtent(
        map,
        datasetBounds,
      );

      datasetOriginMarkerRef.current?.remove();

      const originElement =
        document.createElement("div");

      originElement.className =
        "transit-marker";

      originElement.title =
        datasetOrigin.name;

      datasetOriginMarkerRef.current =
        new Marker({
          element:
            originElement,
          anchor: "center",
        })
          .setLngLat([
            datasetOrigin.longitude,
            datasetOrigin.latitude,
          ])
          .setPopup(
            new Popup({
              offset: 18,
            }).setDOMContent(
              createPopupContent(
                datasetOrigin.name,
                "Pusat area data aktif",
              ),
            ),
          )
          .addTo(map);
    };

    if (map.isStyleLoaded()) {
      syncDataset();
    } else {
      map.once(
        "load",
        syncDataset,
      );
    }

    const shouldFitDataset = lastFittedDatasetKeyRef.current !== datasetKey;
    lastFittedDatasetKeyRef.current = datasetKey;

    if (
      shouldFitDataset &&
      !selectedId &&
      !routeGeometry
    ) {
      markSystemCameraIntent();
      const spanLng = Math.abs(datasetBounds.east - datasetBounds.west);
      const spanLat = Math.abs(datasetBounds.north - datasetBounds.south);
      const minSpan = 0.04;
      const targetBounds = {
        west: spanLng < minSpan ? (datasetBounds.west + datasetBounds.east) / 2 - minSpan / 2 : datasetBounds.west,
        east: spanLng < minSpan ? (datasetBounds.west + datasetBounds.east) / 2 + minSpan / 2 : datasetBounds.east,
        south: spanLat < minSpan ? (datasetBounds.south + datasetBounds.north) / 2 - minSpan / 2 : datasetBounds.south,
        north: spanLat < minSpan ? (datasetBounds.south + datasetBounds.north) / 2 + minSpan / 2 : datasetBounds.north,
      };
      map.fitBounds(
        [
          [
            targetBounds.west,
            targetBounds.south,
          ],
          [
            targetBounds.east,
            targetBounds.north,
          ],
        ],
        {
          padding: 52,
          maxZoom: 14,
          duration: 800,
        },
      );
    }
  }, [
    datasetBounds,
    datasetOrigin,
    datasetKey,
    markSystemCameraIntent,
    routeGeometry,
    selectedId,
  ]);

  /*
   * Merchant marker
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    merchantMarkersRef.current.forEach(
      (marker) =>
        marker.remove(),
    );
    merchantMarkersRef.current.clear();
    setRenderedClusterFeatureCount(0);
    setClusterSourceFeatureCount(0);

    if (map.isStyleLoaded()) removeMerchantClusterLayers(map);

    const selectedMerchant =
      selectedId
        ? merchants.find(
            (merchant) =>
              merchant.id ===
              selectedId,
          )
        : undefined;

    const visibleMerchants =
      !contextualLayerVisibility.merchant
        ? []
        : selectedMerchant
        ? [selectedMerchant]
        : merchants;

    if (
      visibleMerchants.length > MERCHANT_CLUSTER_THRESHOLD ||
      (hasVisibleContextualLayer && visibleMerchants.length > 0)
    ) {
      if (!map.isStyleLoaded()) {
        const retryAfterStyleLoad = () => {
          setStyleRevision((revision) => revision + 1);
        };
        map.once("style.load", retryAfterStyleLoad);
        map.once("idle", retryAfterStyleLoad);
        return () => {
          map.off("style.load", retryAfterStyleLoad);
          map.off("idle", retryAfterStyleLoad);
        };
      }

      const merchantById = new Map(
        visibleMerchants.map((merchant) => [merchant.id, merchant]),
      );
      map.addSource(MERCHANT_SOURCE_ID, {
        type: "geojson",
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 48,
        data: {
          type: "FeatureCollection",
          features: visibleMerchants.map((merchant) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [merchant.longitude, merchant.latitude],
            },
            properties: { merchantId: merchant.id },
          })),
        },
      });
      map.addLayer({
        id: MERCHANT_CLUSTER_LAYER_ID,
        type: "circle",
        source: MERCHANT_SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#0f766e", 100, "#0369a1", 500, "#7c3aed",
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 100, 24, 500, 30],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: MERCHANT_CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: MERCHANT_SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["Noto Sans Regular"],
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: MERCHANT_POINT_LAYER_ID,
        type: "circle",
        source: MERCHANT_SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#ef4444",
          "circle-radius": 7,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      const expandCluster = async (event: MapLayerMouseEvent) => {
        if (mapPickModeRef.current !== "NONE") return;
        const feature = event.features?.[0];
        const clusterId = Number(feature?.properties?.cluster_id);
        if (!feature || !Number.isFinite(clusterId) || feature.geometry.type !== "Point") return;
        const source = map.getSource(MERCHANT_SOURCE_ID) as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
      };
      const selectPoint = (event: MapLayerMouseEvent) => {
        if (mapPickModeRef.current !== "NONE") return;
        const merchantId = String(event.features?.[0]?.properties?.merchantId ?? "");
        const merchant = merchantById.get(merchantId);
        if (merchant) onSelect(merchant);
      };
      const showPointer = () => { if (mapPickModeRef.current === "NONE") map.getCanvas().style.cursor = "pointer"; };
      const hidePointer = () => { map.getCanvas().style.cursor = mapPickModeRef.current === "NONE" ? "" : "crosshair"; };

      map.on("click", MERCHANT_CLUSTER_LAYER_ID, expandCluster);
      map.on("click", MERCHANT_POINT_LAYER_ID, selectPoint);
      map.on("mouseenter", MERCHANT_CLUSTER_LAYER_ID, showPointer);
      map.on("mouseleave", MERCHANT_CLUSTER_LAYER_ID, hidePointer);
      map.on("mouseenter", MERCHANT_POINT_LAYER_ID, showPointer);
      map.on("mouseleave", MERCHANT_POINT_LAYER_ID, hidePointer);

      const reportRenderedClusters = () => {
        if (!map.getLayer(MERCHANT_CLUSTER_LAYER_ID)) return;
        setClusterSourceFeatureCount(
          map.querySourceFeatures(MERCHANT_SOURCE_ID).length,
        );
        setRenderedClusterFeatureCount(
          map.queryRenderedFeatures({
            layers: [MERCHANT_CLUSTER_LAYER_ID, MERCHANT_POINT_LAYER_ID],
          }).length,
        );
      };
      const reportLoadedSource = (event: { sourceId?: string; isSourceLoaded?: boolean }) => {
        if (event.sourceId === MERCHANT_SOURCE_ID && event.isSourceLoaded) {
          reportRenderedClusters();
        }
      };
      map.on("sourcedata", reportLoadedSource);
      map.once("idle", reportRenderedClusters);
      const reportTimeout = window.setTimeout(reportRenderedClusters, 1_000);

      return () => {
        window.clearTimeout(reportTimeout);
        map.off("sourcedata", reportLoadedSource);
        map.off("idle", reportRenderedClusters);
        map.off("click", MERCHANT_CLUSTER_LAYER_ID, expandCluster);
        map.off("click", MERCHANT_POINT_LAYER_ID, selectPoint);
        map.off("mouseenter", MERCHANT_CLUSTER_LAYER_ID, showPointer);
        map.off("mouseleave", MERCHANT_CLUSTER_LAYER_ID, hidePointer);
        map.off("mouseenter", MERCHANT_POINT_LAYER_ID, showPointer);
        map.off("mouseleave", MERCHANT_POINT_LAYER_ID, hidePointer);
        if (map.isStyleLoaded()) removeMerchantClusterLayers(map);
      };
    }

    for (
      const merchant
      of visibleMerchants
    ) {
      const markerElements =
        createMerchantMarker(
          merchant.id ===
            selectedId,
          merchant,
        );

      if (navigationLayerState === "ACTIVE_NAVIGATION_WITH_UMKM") {
        markerElements.element.classList.add("map-marker--navigation-nearby");
      }

      markerElements.button.onclick = () => {
        onSelect(
          merchant,
        );
      };

      const marker =
        new Marker({
          element:
            markerElements.element,
          anchor: "center",
        })
          .setLngLat([
            merchant.longitude,
            merchant.latitude,
          ])
          .setPopup(
            new Popup({
              offset: 16,
            }).setDOMContent(
              createPopupContent(
                merchant.name,
                [
                  merchant.brand,
                  merchant.city ?? merchant.regions?.[0],
                  merchant.address ?? "Alamat tidak tersedia",
                ].filter(Boolean).join(" - "),
              ),
            ),
          )
          .addTo(map);

      merchantMarkersRef.current.set(
        merchant.id,
        marker,
      );
    }
  }, [
    merchants,
    selectedId,
    onSelect,
    styleRevision,
    contextualLayerVisibility.merchant,
    hasVisibleContextualLayer,
    navigationLayerState,
  ]);

  /*
   * Properti Go property observation markers. These are separate from canonical
   * merchants so one-place-one-merchant semantics stay intact.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    propertyMarkersRef.current.forEach((marker) => marker.remove());
    propertyMarkersRef.current.clear();

    for (const candidate of propertyCandidates) {
      const markerElements = createPropertyMarker(
        candidate.id === selectedPropertyId,
        candidate,
      );
      markerElements.button.onclick = () => {
        onSelectProperty?.(candidate);
      };
      const detail = [
        candidate.property_transaction_type,
        candidate.address ?? "Alamat tidak tersedia",
        "Sumber: Properti Go",
      ].filter(Boolean).join(" - ");
      const marker = new Marker({ element: markerElements.element, anchor: "center" })
        .setLngLat([candidate.longitude, candidate.latitude])
        .setPopup(
          new Popup({ offset: 16 }).setDOMContent(
            createPopupContent(
              candidate.property_category ?? "Catatan properti",
              detail,
            ),
          ),
        )
        .addTo(map);
      propertyMarkersRef.current.set(candidate.id, marker);
    }
  }, [propertyCandidates, selectedPropertyId, onSelectProperty, styleRevision]);

  /*
   * Accessibility evidence markers remain observation markers. They do not
   * mutate pedestrian routing or route costs.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    accessibilityMarkersRef.current.forEach((marker) => marker.remove());
    accessibilityMarkersRef.current.clear();

    for (const evidence of accessibilityEvidence) {
      const markerElements = createAccessibilityEvidenceMarker(
        evidence.id === selectedAccessibilityEvidenceId,
        evidence,
      );
      markerElements.button.onclick = () => {
        onSelectAccessibilityEvidence?.(evidence);
      };
      const detail = [
        evidence.validation_status === "CONFIRMED"
          ? "Terkonfirmasi"
          : evidence.validation_status === "NEEDS_REVIEW"
            ? "Perlu verifikasi"
            : "Observasi lapangan",
        evidence.freshness_status,
        `Sumber: ${evidence.source_type === "GETRA_COMMUNITY" ? "Komunitas GETRA" : "Catatan lapangan"}`,
      ].join(" - ");
      const marker = new Marker({ element: markerElements.element, anchor: "center" })
        .setLngLat(evidence.geometry.coordinates)
        .setPopup(
          new Popup({ offset: 16 }).setDOMContent(
            createPopupContent(evidence.title ?? "Observasi aksesibilitas", detail),
          ),
        )
        .addTo(map);
      accessibilityMarkersRef.current.set(evidence.id, marker);
    }
  }, [
    accessibilityEvidence,
    onSelectAccessibilityEvidence,
    selectedAccessibilityEvidenceId,
    styleRevision,
  ]);

  /*
   * Sponsored Pin markers
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    sponsoredMarkersRef.current.forEach((marker) => marker.remove());
    sponsoredMarkersRef.current.clear();

    if (!sponsoredPlacements || sponsoredPlacements.length === 0) return;

    const bounds = map.getBounds();

    for (const placement of sponsoredPlacements) {
      const [lng, lat] = placement.geometry.coordinates;

      // Track IMPRESSION if marker is inside visible map viewport
      const isVisible =
        bounds &&
        lat >= bounds.getSouth() &&
        lat <= bounds.getNorth() &&
        lng >= bounds.getWest() &&
        lng <= bounds.getEast();

      if (isVisible) {
        CampaignEventService.recordEvent({
          event_type: "IMPRESSION",
          campaign_id: placement.campaign_id,
          creative_id: placement.creative_id,
          placement: "SPONSORED_PIN",
          context: { surface: "MAPLIBRE_COMMUTER_MAP" },
        });
      }

      const el = document.createElement("div");
      el.className = "group relative flex flex-col items-center cursor-pointer select-none transition-transform duration-200 hover:scale-110";
      el.innerHTML = `
        <span style="font-size:9px; font-weight:800; text-transform:uppercase; background:#f59e0b; color:#ffffff; padding:2px 6px; border-radius:9999px; border:1px solid #fde68a; box-shadow:0 2px 4px rgba(0,0,0,0.3); margin-bottom:2px;">✨ SPONSORED</span>
        <div style="width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg, #d97706, #f59e0b, #fbbf24); border:2px solid #ffffff; box-shadow:0 4px 6px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:13px;">📣</div>
      `;

      el.onclick = () => {
        CampaignEventService.recordEvent({
          event_type: "SPONSORED_PIN_CLICK",
          campaign_id: placement.campaign_id,
          creative_id: placement.creative_id,
          placement: "SPONSORED_PIN",
          context: { surface: "MAPLIBRE_COMMUTER_MAP" },
        });
        onSelectSponsored?.(placement);
      };

      const popup = new Popup({ offset: 20 }).setDOMContent(
        buildSponsoredPopupContent(placement),
      );

      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      sponsoredMarkersRef.current.set(placement.campaign_id, marker);
    }
  }, [sponsoredPlacements, onSelectSponsored]);

  /*
   * Transport references have their own lifecycle so layer updates do not
   * remove route, merchant, property, or GPS markers.
   */
  useEffect(() => {
    const map = mapRef.current;
    const transportMarkers = transportMarkersRef.current;
    const clearTransportMarkers = () => {
      transportMarkers.forEach((marker) => marker.remove());
      transportMarkers.clear();
    };
    clearTransportMarkers();
    if (!map) return;

    for (const node of transportNodes) {
      if (!node || typeof node.id !== "string" || typeof node.name !== "string"
        || transportMarkers.has(node.id) || node.geometry?.type !== "Point"
        || !Array.isArray(node.geometry.coordinates)) continue;

      const [longitude, latitude] = node.geometry.coordinates;
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
        || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) continue;

      const marker = new Marker({ element: createTransportMarker(node), anchor: "center" })
        .setLngLat([longitude, latitude])
        .setPopup(new Popup({ offset: 14 }).setDOMContent(createPopupContent(
          node.name,
          `${node.transport_mode ?? "Transportasi"} · ${node.node_type ?? "Titik transportasi"}`,
        )))
        .addTo(map);
      transportMarkers.set(node.id, marker);
    }

    return clearTransportMarkers;
  }, [transportNodes, styleRevision]);

  /*
   * User GPS marker
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    userLocationMarkerRef.current?.remove();
    userLocationMarkerRef.current = null;

    if (!userLocation) {
      return;
    }

    const element =
      document.createElement("div");

    element.className =
      "user-location-anchor";

    element.title =
      "Lokasi kamu saat ini";

    const dot =
      document.createElement("div");

    dot.className =
      "user-location-marker";

    const label =
      document.createElement("span");

    label.className =
      "user-location-label";

    label.textContent =
      "Lokasi saya";

    element.append(
      dot,
      label,
    );

    const marker =
      new Marker({
        element,
        anchor: "center",
      })
        .setLngLat([
          userLocation.longitude,
          userLocation.latitude,
        ])
        .setPopup(
          new Popup({
            offset: 18,
          }).setDOMContent(
            createPopupContent(
              "Lokasi kamu",
              `Akurasi sekitar ${userLocation.accuracyMeters} m`,
            ),
          ),
        )
        .addTo(map);

    userLocationMarkerRef.current =
      marker;

    const container = map.getContainer();
    const compact = container.clientWidth < 600;
    const safeArea = computeMapSafeArea(container, compact);
    const containerRect = container.getBoundingClientRect();
    const navigationPanel = container.closest(".map-panel")?.querySelector('[data-navigation-metrics]');
    const bottomInset = journeyActive && navigationPanel
      ? containerRect.bottom - navigationPanel.getBoundingClientRect().top + 20
      : safeArea.bottom;
    if (!journeyActive || journeyFollowing) {
      markSystemCameraIntent();
      const reliableHeading = journeyActive && journeySpeedMps !== null && journeySpeedMps >= 1 &&
        journeyHeadingDegrees !== null && Number.isFinite(journeyHeadingDegrees)
        ? journeyHeadingDegrees
        : 0;
      map.easeTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: Math.max(map.getZoom(), journeyActive ? compact ? 16.5 : 15.5 : 14),
        bearing: reliableHeading,
        pitch: journeyActive ? compact ? 36 : 22 : 0,
        duration: 650,
        ...(journeyActive ? {
          padding: {
            top: 112,
            bottom: Math.min(bottomInset, container.clientHeight * 0.55),
            left: 24,
            right: 24,
          },
        } : {}),
      });
    }
  }, [
    userLocation,
    journeyActive,
    journeyFollowing,
    journeyFocusKey,
    journeyHeadingDegrees,
    journeySpeedMps,
    markSystemCameraIntent,
  ]);

  /*
   * Route endpoint markers
   */

  /**
   * Update badge label anchor (left/right) for A/B markers based on
   * their projected screen position relative to the basemap panel.
   * Called after camera moves to keep the label readable.
   */
  const syncEndpointLabelAnchors = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    const compact = container.clientWidth < 600;
    const safeRight = Math.max(
      computeMapSafeArea(container, compact).right,
      basemapSafeRightRef.current,
    );
    const safeLeft = 40;
    const w = container.clientWidth;

    for (const [markerRef, point] of [
      [routeOriginMarkerRef, routeOriginPoint] as const,
      [routeDestinationMarkerRef, routeDestinationPoint] as const,
    ]) {
      const marker = markerRef.current;
      if (!marker || !point) continue;
      const projected = map.project([point.longitude, point.latitude]);
      const el = marker.getElement();
      if (isInRightSafeZone(projected.x, w, safeRight)) {
        el.classList.add("route-endpoint--label-left");
        el.classList.remove("route-endpoint--label-right");
      } else if (isInLeftSafeZone(projected.x, safeLeft)) {
        el.classList.add("route-endpoint--label-right");
        el.classList.remove("route-endpoint--label-left");
      } else {
        el.classList.remove("route-endpoint--label-left", "route-endpoint--label-right");
      }
    }
  }, [routeOriginPoint, routeDestinationPoint]);

  useEffect(() => {
    const map = mapRef.current;
    const merchant = merchants.find((item) => item.id === selectedId);
    if (!map || !merchant) return;
    const content = createMerchantMapPopup(merchant, {
      onClose: onClearSelection,
      onDetail: onMerchantDetail,
      onRoute: onRequestMerchantRoute,
    });
    const markerElements = createMerchantMarker(true, merchant);
    markerElements.button.onclick = () => onSelect(merchant);
    const marker = new Marker({ element: markerElements.element, anchor: "center" })
      .setLngLat([merchant.longitude, merchant.latitude])
      .addTo(map);
    const popup = new Popup({
      offset: 24,
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: false,
      maxWidth: "300px",
      className: "commuter-merchant-popup",
    })
      .setLngLat([merchant.longitude, merchant.latitude])
      .setDOMContent(content)
      .addTo(map);
    return () => {
      popup.remove();
      marker.remove();
    };
  }, [selectedId, merchants, onSelect, onRequestMerchantRoute, onMerchantDetail, onClearSelection, styleRevision]);

  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    routeOriginMarkerRef.current?.remove();
    routeOriginMarkerRef.current = null;

    if (routeOriginPoint) {
      routeOriginMarkerRef.current =
        new Marker({
          element:
            createRouteEndpointMarker(
              "start",
              routeOriginPoint.label,
            ),
          anchor: "center",
        })
          .setLngLat([
            routeOriginPoint.longitude,
            routeOriginPoint.latitude,
          ])
          .setPopup(
            new Popup({
              offset: 18,
            }).setDOMContent(
              createPopupContent(
                "Titik mulai",
                routeOriginPoint.label,
              ),
            ),
          )
          .addTo(map);
    }

    routeDestinationMarkerRef.current?.remove();
    routeDestinationMarkerRef.current = null;

    if (routeDestinationPoint) {
      routeDestinationMarkerRef.current =
        new Marker({
          element:
            createRouteEndpointMarker(
              "destination",
              routeDestinationPoint.label,
            ),
          anchor: "center",
        })
          .setLngLat([
            routeDestinationPoint.longitude,
            routeDestinationPoint.latitude,
          ])
          .setPopup(
            new Popup({
              offset: 18,
            }).setDOMContent(
              createPopupContent(
                "Tujuan",
                routeDestinationPoint.label,
              ),
            ),
          )
          .addTo(map);
    }

    // Initial label anchor sync after marker placement
    requestAnimationFrame(syncEndpointLabelAnchors);

    // Re-sync on every camera move (throttled via rAF)
    let rafId = 0;
    const onMove = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncEndpointLabelAnchors);
    };
    map.on("move", onMove);
    return () => {
      cancelAnimationFrame(rafId);
      map.off("move", onMove);
    };
  }, [
    routeDestinationPoint,
    routeOriginPoint,
    syncEndpointLabelAnchors,
  ]);

  /*
   * Focus selected merchant (One-shot)
   */
  const lastFocusedMerchantId = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) lastFocusedMerchantId.current = null;
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    if (lastFocusedMerchantId.current === selectedId) return;

    const merchant = merchants.find((item) => item.id === selectedId);
    if (!merchant) return;

    lastFocusedMerchantId.current = selectedId;
    map.easeTo({
      center: [merchant.longitude, merchant.latitude],
      zoom: Math.max(map.getZoom(), 16),
      duration: 500,
    });
  }, [merchants, selectedId]);

  /*
   * Focus selected property observation (One-shot)
   */
  const lastFocusedPropertyId = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedPropertyId) lastFocusedPropertyId.current = null;
  }, [selectedPropertyId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPropertyId) return;
    if (lastFocusedPropertyId.current === selectedPropertyId) return;

    const property = propertyCandidates.find((item) => item.id === selectedPropertyId);
    if (!property) return;

    lastFocusedPropertyId.current = selectedPropertyId;
    map.easeTo({
      center: [property.longitude, property.latitude],
      zoom: Math.max(map.getZoom(), 16),
      duration: 500,
    });
  }, [propertyCandidates, selectedPropertyId]);

  /*
   * Draw Route Line & Interactive Route Labels
   */
  const lastFramedCandidateKey = useRef<string | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateRoute = () => {
      syncWalkingRoute(
        map,
        routeGeometry,
      );
      syncRouteAlternatives(map, journeyActive ? [] : routeCandidates, selectedRouteId);
      syncWalkingServiceArea(map, serviceAreaGeometry);
    };

    // Existing data can be cleared while tiles load; a new style needs a ready event.
    updateRoute();
    if (!map.isStyleLoaded()) {
      map.once("idle", updateRoute);
      map.once("style.load", updateRoute);
    }

    const candidateGeometries = routeCandidates.map((candidate) => candidate.geometry).filter(isRouteGeometry);
    if (isRouteGeometry(routeGeometry) && !journeyActive) {
      const candidateIdsKey = routeCandidates.length > 0
        ? routeCandidates.map((c) => c.route_id).sort().join(":")
        : JSON.stringify(routeGeometry.coordinates[0]);
      if (lastFramedCandidateKey.current !== candidateIdsKey) {
        lastFramedCandidateKey.current = candidateIdsKey;
        const bounds =
          new LngLatBounds();

        routeGeometry.coordinates.forEach(
          (
            coordinate,
          ) => {
            bounds.extend([
              coordinate[0],
              coordinate[1],
            ]);
          },
        );
        candidateGeometries.forEach((geometry) => geometry.coordinates.forEach((coordinate) => bounds.extend(coordinate)));

        if (!bounds.isEmpty()) {
          const container = map.getContainer();
          const routeSheet = container.closest(".map-panel")?.querySelector('[data-sheet-open]');
          const compact = container.clientWidth < 600;
          const safeArea = computeMapSafeArea(container, compact);
          const sheetRect = routeSheet?.getBoundingClientRect();
          const bottomInset = sheetRect && compact ? sheetRect.height + 50 : safeArea.bottom;
          const leftInset = sheetRect && !compact ? sheetRect.width + 32 : safeArea.left;
          /*
           * Use the live-measured basemap panel width as right safe-area.
           * basemapSafeRightRef is updated by the ResizeObserver in the map
           * init effect, ensuring we always use the current rendered width.
           */
          const safeRight = Math.max(safeArea.right, basemapSafeRightRef.current);
          map.fitBounds(
            bounds,
            {
              padding: {
                top: safeArea.top,
                bottom: Math.min(bottomInset, container.clientHeight * 0.6),
                left: Math.min(leftInset, container.clientWidth * 0.5),
                right: Math.min(safeRight, container.clientWidth * 0.45),
              },
              maxZoom: 16,
              duration: 650,
            },
          );
        }
      }
    } else if (!isRouteGeometry(routeGeometry)) {
      lastFramedCandidateKey.current = null;
    }
    const unbind = onSelectRoute ? bindRouteAlternativeSelection(map, onSelectRoute) : undefined;
    return () => {
      map.off("idle", updateRoute);
      map.off("style.load", updateRoute);
      unbind?.();
    };
  }, [
    routeGeometry,
    routeCandidates,
    selectedRouteId,
    onSelectRoute,
    serviceAreaGeometry,
    styleRevision,
    journeyActive,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const routeLabelMarkers = routeLabelMarkersRef.current;
    routeLabelMarkers.forEach((marker) => marker.remove());
    routeLabelMarkers.clear();
    if (!map || journeyActive) return;

    routeCandidates.forEach((candidate, index) => {
      const anchor = getRouteLabelAnchor(candidate, index, routeCandidates);
      if (!anchor) return;
      const selected = candidate.route_id === selectedRouteId;
      const element = document.createElement("button");
      element.type = "button";
      element.className = "route-map-label";
      element.setAttribute("aria-label", `${selected ? "Rute dipilih" : "Pilih rute"}, ${formatRouteMinutes(candidate.duration_seconds)}, ${formatRouteDistance(candidate.distance_meters)}`);
      element.setAttribute("aria-pressed", String(selected));
      element.dataset.routeId = candidate.route_id;
      element.dataset.routeSelected = String(selected);
      element.dataset.routeCategory = candidate.route_category;
      const surface = document.createElement("span");
      surface.className = `route-map-label__surface ${selected ? "route-map-label--selected" : "route-map-label--alternative"}${candidate.route_category === "UMKM_AREA" ? " route-map-label--umkm" : ""}`;
      const duration = document.createElement("strong");
      duration.className = "route-map-label__duration";
      duration.textContent = formatRouteMinutes(candidate.duration_seconds);
      const sep = document.createElement("span");
      sep.className = "route-map-label__sep";
      sep.textContent = "·";
      const distance = document.createElement("span");
      distance.className = "route-map-label__distance";
      distance.textContent = formatRouteDistance(candidate.distance_meters);
      surface.append(duration, sep, distance);
      if (candidate.route_category === "UMKM_AREA") {
        const umkm = document.createElement("b");
        umkm.className = "route-map-label__badge";
        umkm.textContent = "UMKM";
        surface.append(umkm);
      }
      element.append(surface);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRouteRef.current?.(candidate.route_id);
      });
      const marker = new Marker({
        element,
        anchor: "center",
        offset: getRouteLabelOffset(index, routeCandidates.length),
      }).setLngLat(anchor).addTo(map);
      routeLabelMarkers.set(candidate.route_id, marker);
    });

    return () => {
      routeLabelMarkers.forEach((marker) => marker.remove());
      routeLabelMarkers.clear();
    };
  }, [journeyActive, routeCandidates, selectedRouteId]);

  useEffect(() => {
    if (!mapRef.current) return;
    const canvas = mapRef.current.getCanvas();
    if (mapPickMode !== "NONE") {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "";
    }
  }, [mapPickMode]);


  return (
    <div
      className="map-shell"
      data-merchant-count={merchants.length}
      data-property-count={propertyCandidates.length}
      data-selected-property-id={selectedPropertyId ?? ""}
      data-merchant-layer-visible={contextualLayerVisibility.merchant ? "true" : "false"}
      data-merchant-render-mode={
        merchants.length > MERCHANT_CLUSTER_THRESHOLD ||
        (hasVisibleContextualLayer && merchants.length > 0)
          ? "cluster"
          : "markers"
      }
      data-rendered-cluster-features={renderedClusterFeatureCount}
      data-cluster-source-features={clusterSourceFeatureCount}
      data-boundary-feature-count={administrativeBoundaries.features.length}
      data-boundary-region-ids={administrativeBoundaries.features
        .map((feature) => feature.properties.id)
        .join(",")}
      data-boundary-layers-ready={boundaryLayersReady ? "true" : "false"}
      data-camera-fit-key={cameraFitKey}
      data-analytics-feature-count={analyticsCollection?.features.length ?? 0}
      data-analytics-mode={analyticsCollection ? analyticsMode : "OFF"}
      data-camera-focus-bounds={focusBounds
        ? [focusBounds.west, focusBounds.south, focusBounds.east, focusBounds.north].join(",")
        : ""}
      data-context-property-count={contextualLayerData.PROPERTI_GO.collection.features.length}
      data-context-transaction-count={contextualLayerData.STRUK_GO.collection.features.length}
      data-context-activities-count={contextualLayerData.ACTIVITIES.collection.features.length}
      data-camera-owner={cameraOwner}
      data-route-candidate-count={journeyActive ? 0 : routeCandidates.filter((candidate) => isRouteGeometry(candidate.geometry)).length}
      data-selected-route-id={journeyActive ? "" : selectedRouteId ?? ""}
      data-navigation-layer-state={navigationLayerState}
      data-camera-follow-state={journeyActive ? journeyFollowing ? "FOLLOWING" : "FREE_LOOK" : "EXPLORATION"}
    >

      <div
        ref={containerRef}
        className="map-canvas"
      />

      <div className="map-status map-status--top-left">
        <span
          className={
            "status-dot status-dot--ok"
          }
        />

        <div>
          <strong>
            JENIS PETA
          </strong>

          <span>
            {BASEMAP_OPTIONS.find(
              (option) =>
                option.id ===
                activeBasemapId,
            )?.description ?? "Peta MAPID"}
          </span>
        </div>
      </div>

      {selectedId ? (
        <button
          className="map-show-all-button"
          type="button"
          onClick={onClearSelection}
          style={{ backgroundColor: "#0284c7", color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        >
          Tampilkan semua titik
        </button>
      ) : null}

      <ContextualLayerControl
        data={contextualLayerData}
        visibility={contextualLayerVisibility}
        onChange={onContextualLayerChange}
      />

      <details className={journeyActive ? "navigation-basemap" : "planning-basemap"} open={journeyActive ? undefined : true}>
      <summary hidden={!journeyActive} aria-label="Tampilan peta" title="Tampilan peta"><Layers size={20} /></summary>
      <div
        className="basemap-switcher"
        aria-label="Pilih jenis peta"
      >
        {BASEMAP_OPTIONS.map(
          (option) => (
            <button
              key={option.id}
              type="button"
              className={
                option.id ===
                activeBasemapId
                  ? "basemap-button basemap-button--active"
                  : "basemap-button"
              }
              aria-pressed={option.id === activeBasemapId}
              title={option.description}
              onClick={() => {
                persistBasemapPreference(option.id);
                setActiveBasemapId(option.id);
              }}
            >
              <span>
                {option.label}
              </span>
              <small style={{ color: "#94a3b8" }}>
                {option.description}
              </small>
            </button>
          ),
        )}
      </div>
      </details>

    </div>
  );
}

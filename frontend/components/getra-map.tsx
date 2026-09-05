"use client";

import { bindRouteAlternativeSelection, syncRouteAlternatives, syncWalkingRoute } from "@/src/features/routing/route-layer";
import { isRouteGeometry } from "@/src/features/routing/route-geometry";
import type { RoutingCandidate } from "@/src/services/routing.service";

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

setWorkerUrl(
  "/maplibre/maplibre-gl-worker.mjs",
);

import { CampaignEventService, type SponsoredPinDTO } from "@/src/features/umkm-advertising";

type GetraMapProps = {
  merchants: Merchant[];
  selectedId: string | null;
  propertyCandidates?: BusinessSpaceCandidate[];
  selectedPropertyId?: string | null;
  accessibilityEvidence?: AccessibilityEvidence[];
  selectedAccessibilityEvidenceId?: string | null;
  userLocation: UserLocation | null;
  journeyActive?: boolean;
  journeyFollowing?: boolean;
  journeyFocusKey?: number;
  onJourneyCameraOverride?: () => void;
  onSelect: (merchant: Merchant) => void;
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
  selectedId,
  propertyCandidates = [],
  selectedPropertyId = null,
  accessibilityEvidence = [],
  selectedAccessibilityEvidenceId = null,
  userLocation,
  journeyActive = false,
  journeyFollowing = false,
  journeyFocusKey = 0,
  onJourneyCameraOverride,
  onSelect,
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

  const hasVisibleContextualLayer =
    contextualLayerVisibility.property ||
    contextualLayerVisibility.transaction ||
    contextualLayerVisibility.activities;

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<MapLibreMap | null>(null);

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
    setCameraOwner("SYSTEM");
  }, []);

  const merchantMarkersRef =
    useRef<Map<string, Marker>>(
      new Map(),
    );

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
    
    markSystemCameraIntent();
    
    map.fitBounds(
      [
        [focusBounds.west, focusBounds.south],
        [focusBounds.east, focusBounds.north],
      ],
      {
        padding: compact
          ? { top: 36, right: 28, bottom: 190, left: 28 }
          : { top: 52, right: 52, bottom: 52, left: 52 },
        maxZoom: 14,
        duration: 500,
      },
    );
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

    map.on("dragstart", markUserCameraControl);
    map.on("rotatestart", markUserCameraControl);
    map.on("pitchstart", markUserCameraControl);
    map.on("wheel", markUserCameraControl);
    map.on("touchstart", markUserCameraControl);

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
          padding: 42,
          duration: 0,
        },
      );
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

    return () => {
      merchantMarkers.forEach(
        (marker) =>
          marker.remove(),
      );

      merchantMarkers.clear();

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

      map.remove();

      mapRef.current = null;
    };
  }, [markUserCameraControl]);

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
                "Pusat extent dataset aktif",
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
      !routeGeometry &&
      cameraOwnerRef.current !== "USER"
    ) {
      map.fitBounds(
        [
          [
            datasetBounds.west,
            datasetBounds.south,
          ],
          [
            datasetBounds.east,
            datasetBounds.north,
          ],
        ],
        {
          padding: 52,
          duration: 500,
        },
      );
    }
  }, [
    datasetBounds,
    datasetOrigin,
    datasetKey,
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
              candidate.property_category ?? "Property observation",
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
        `Sumber: ${evidence.source_type === "GETRA_COMMUNITY" ? "GETRA Community" : "MAPID Activities"}`,
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

    const basemap = map.getContainer().parentElement?.querySelector(".basemap-switcher");
    const bottomInset = basemap ? map.getContainer().getBoundingClientRect().bottom - basemap.getBoundingClientRect().top + 24 : 72;
    if (!journeyActive || journeyFollowing) map.easeTo({
      center: [
        userLocation.longitude,
        userLocation.latitude,
      ],
      zoom: Math.max(
        map.getZoom(),
        14,
      ),
      duration: 650,
      ...(journeyActive ? { padding: { top: 72, bottom: Math.min(bottomInset, map.getContainer().clientHeight * 0.45), left: 24, right: 24 } } : {}),
    });
  }, [
    userLocation,
    journeyActive,
    journeyFollowing,
    journeyFocusKey,
  ]);

  /*
   * Route endpoint markers
   */
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
  }, [
    routeDestinationPoint,
    routeOriginPoint,
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
   * Draw Route Line
   */
  const lastFocusedRouteGeometry = useRef<GeoJSON.LineString | null>(null);

  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

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
    if (!map.isStyleLoaded()) map.once("idle", updateRoute);

    const candidateGeometries = routeCandidates.map((candidate) => candidate.geometry).filter(isRouteGeometry);
    if (isRouteGeometry(routeGeometry) && !journeyActive) {
      if (lastFocusedRouteGeometry.current !== routeGeometry) {
        lastFocusedRouteGeometry.current = routeGeometry;
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
          const basemap = container.parentElement?.querySelector(".basemap-switcher");
          const bottomInset = basemap
            ? container.getBoundingClientRect().bottom - basemap.getBoundingClientRect().top + 16
            : 72;
          map.fitBounds(
            bounds,
            {
              padding: {
                top: 72,
                bottom: Math.min(bottomInset, container.clientHeight * 0.45),
                left: Math.min(72, Math.floor(container.clientWidth / 6)),
                right: Math.min(72, Math.floor(container.clientWidth / 6)),
              },
              maxZoom: 16,
              duration: 650,
            },
          );
        }
      }
    } else {
      lastFocusedRouteGeometry.current = null;
    }
    const unbind = onSelectRoute ? bindRouteAlternativeSelection(map, onSelectRoute) : undefined;
    return () => { map.off("idle", updateRoute); unbind?.(); };
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
            BASEMAP
          </strong>

          <span>
            {BASEMAP_OPTIONS.find(
              (option) =>
                option.id ===
                activeBasemapId,
            )?.description ?? "MAPID basemap"}
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

      <div
        className="basemap-switcher"
        aria-label="Pilih basemap"
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

    </div>
  );
}

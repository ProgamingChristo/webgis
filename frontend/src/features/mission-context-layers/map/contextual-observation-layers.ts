import type * as GeoJSON from "geojson";
import {
  Popup,
  type GeoJSONSource,
  type LayerSpecification,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
} from "maplibre-gl";

import type {
  ContextualLayerData,
  ContextualLayerVisibility,
  ContextualObservationFeature,
  ContextualSource,
} from "@/src/features/mission-context-layers/types/contextual-layer.types";
import {
  activityCategoryLabel,
  formatObservationFreshness,
  verificationLabel,
} from "@/src/features/mission-context-layers/utils/contextual-layer.utils";

interface SourceLayerConfig {
  clusterColor: string;
  pointColor: string;
  sourceId: string;
  prefix: string;
  symbol: string | unknown[];
  visibilityKey: "property" | "transaction" | "activities";
}

export const CONTEXTUAL_LAYER_CONFIG: Record<ContextualSource, SourceLayerConfig> = {
  PROPERTI_GO: {
    clusterColor: "#0891b2",
    pointColor: "#22d3ee",
    sourceId: "getra-context-property",
    prefix: "getra-context-property",
    symbol: "P",
    visibilityKey: "property",
  },
  STRUK_GO: {
    clusterColor: "#d97706",
    pointColor: "#fbbf24",
    sourceId: "getra-context-transaction",
    prefix: "getra-context-transaction",
    symbol: "T",
    visibilityKey: "transaction",
  },
  ACTIVITIES: {
    clusterColor: "#7c3aed",
    pointColor: "#a78bfa",
    sourceId: "getra-context-activity",
    prefix: "getra-context-activity",
    symbol: [
      "match",
      ["get", "activity_category"],
      "TRANSIT_OBSERVATION", "T",
      "ACCESSIBILITY_OBSERVATION", "A",
      "PEDESTRIAN_OBSERVATION", "J",
      "ECONOMIC_UMKM_OBSERVATION", "U",
      "AREA_OBSERVATION", "R",
      "O",
    ],
    visibilityKey: "activities",
  },
};

const SOURCE_ORDER: ContextualSource[] = [
  "PROPERTI_GO",
  "STRUK_GO",
  "ACTIVITIES",
];

const activePopups = new WeakMap<MapLibreMap, {
  popup: Popup;
  source: ContextualSource;
  sourceId: string;
}>();

export function syncContextualObservationLayers(
  map: MapLibreMap,
  data: ContextualLayerData,
  visibility: ContextualLayerVisibility,
): void {
  if (!map.isStyleLoaded()) return;

  for (const source of SOURCE_ORDER) {
    const config = CONTEXTUAL_LAYER_CONFIG[source];
    const collection = data[source].collection as unknown as GeoJSON.FeatureCollection<GeoJSON.Point>;
    const existing = map.getSource(config.sourceId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(collection);
    } else {
      map.addSource(config.sourceId, {
        type: "geojson",
        data: collection,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 42,
      });
    }

    ensureSourceLayers(map, config);
    const layerVisibility = visibility[config.visibilityKey] ? "visible" : "none";
    const activePopup = activePopups.get(map);
    const selectedFeatureRemains = activePopup?.source !== source ||
      data[source].collection.features.some(
        (feature) => feature.properties.source_id === activePopup.sourceId,
      );
    if (
      activePopup?.source === source &&
      (!visibility[config.visibilityKey] || !selectedFeatureRemains)
    ) {
      activePopup.popup.remove();
      activePopups.delete(map);
    }
    for (const layerId of layerIds(config)) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", layerVisibility);
      }
    }
  }
}

export function bindContextualObservationInteractions(
  map: MapLibreMap,
  data: ContextualLayerData,
  visibility: ContextualLayerVisibility,
): () => void {
  const cleanups: Array<() => void> = [];

  for (const source of SOURCE_ORDER) {
    const config = CONTEXTUAL_LAYER_CONFIG[source];
    if (!visibility[config.visibilityKey] || !map.getLayer(pointLayerId(config))) continue;
    const features = new Map(
      data[source].collection.features.map((feature) => [feature.properties.source_id, feature]),
    );
    const expandCluster = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = Number(feature?.properties?.cluster_id);
      if (!feature || !Number.isFinite(clusterId) || feature.geometry.type !== "Point") return;
      const geojsonSource = map.getSource(config.sourceId) as GeoJSONSource;
      const zoom = await geojsonSource.getClusterExpansionZoom(clusterId);
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
    };
    const openObservation = (event: MapLayerMouseEvent) => {
      const sourceId = String(event.features?.[0]?.properties?.source_id ?? "");
      const feature = features.get(sourceId);
      if (!feature) return;
      activePopups.get(map)?.popup.remove();
      const popup = new Popup({ closeOnMove: true, offset: 14, maxWidth: "320px" })
        .setLngLat(feature.geometry.coordinates)
        .setDOMContent(buildContextualPopup(feature))
        .addTo(map);
      activePopups.set(map, { popup, source, sourceId });
      popup.on("close", () => {
        if (activePopups.get(map)?.popup === popup) activePopups.delete(map);
      });
    };
    const showPointer = () => { map.getCanvas().style.cursor = "pointer"; };
    const hidePointer = () => { map.getCanvas().style.cursor = ""; };

    map.on("click", clusterLayerId(config), expandCluster);
    map.on("click", pointLayerId(config), openObservation);
    map.on("mouseenter", clusterLayerId(config), showPointer);
    map.on("mouseleave", clusterLayerId(config), hidePointer);
    map.on("mouseenter", pointLayerId(config), showPointer);
    map.on("mouseleave", pointLayerId(config), hidePointer);
    cleanups.push(() => {
      map.off("click", clusterLayerId(config), expandCluster);
      map.off("click", pointLayerId(config), openObservation);
      map.off("mouseenter", clusterLayerId(config), showPointer);
      map.off("mouseleave", clusterLayerId(config), hidePointer);
      map.off("mouseenter", pointLayerId(config), showPointer);
      map.off("mouseleave", pointLayerId(config), hidePointer);
    });
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

export function buildContextualPopup(feature: ContextualObservationFeature): HTMLElement {
  const { properties } = feature;
  const root = document.createElement("article");
  root.className = "contextual-popup";

  const badge = document.createElement("span");
  badge.className = `contextual-popup__badge contextual-popup__badge--${properties.source_type.toLowerCase()}`;
  badge.textContent = properties.semantics.replaceAll("_", " ");

  const heading = document.createElement("h3");
  heading.textContent = popupTitle(feature);
  root.append(badge, heading);

  if (properties.source_type === "PROPERTI_GO") {
    appendRow(root, "Kategori", properties.property_category);
    appendRow(root, "Jenis", properties.property_transaction_type);
    appendRow(root, "Alamat", properties.address);
    appendMedia(root, properties.facade_photo_url, "Foto tampak depan properti");
    appendMedia(root, properties.banner_photo_url, "Foto spanduk properti");
  } else if (properties.source_type === "STRUK_GO") {
    appendRow(root, "Kategori", properties.place_category);
    appendRow(root, "Pembayaran", properties.payment_method);
    appendMedia(root, properties.receipt_photo_url, "Foto bukti struk");
  } else {
    appendRow(
      root,
      "Jenis observasi",
      activityCategoryLabel(properties.activity_category ?? "UNCLASSIFIED"),
    );
    appendRow(root, "Keterangan", properties.description);
    appendMedia(root, properties.media_urls?.[0], "Foto observasi lapangan");
  }

  appendRow(root, "Waktu", formatObservationFreshness(properties));
  appendRow(root, "Status", verificationLabel(properties.verification_status));
  appendRow(root, "Sumber", `MAPID ${sourceName(properties.source_type)}`);
  return root;
}

function ensureSourceLayers(map: MapLibreMap, config: SourceLayerConfig): void {
  const beforeId = [
    "getra-merchant-clusters",
    "getra-merchant-points",
  ].find((id) => map.getLayer(id));
  const add = (layer: LayerSpecification) => {
    if (!map.getLayer(layer.id)) map.addLayer(layer, beforeId);
  };

  add({
    id: clusterLayerId(config),
    type: "circle",
    source: config.sourceId,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": config.clusterColor,
      "circle-opacity": 0.9,
      "circle-radius": ["step", ["get", "point_count"], 15, 25, 19, 100, 23],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    },
  });
  add({
    id: clusterCountLayerId(config),
    type: "symbol",
    source: config.sourceId,
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-size": 11,
      "text-font": ["Noto Sans Regular"],
    },
    paint: { "text-color": "#ffffff" },
  });
  add({
    id: pointLayerId(config),
    type: "circle",
    source: config.sourceId,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": config.pointColor,
      "circle-radius": 9,
      "circle-stroke-color": "#07131b",
      "circle-stroke-width": 2,
    },
  });
  add({
    id: symbolLayerId(config),
    type: "symbol",
    source: config.sourceId,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": config.symbol as string,
      "text-size": 10,
      "text-font": ["Noto Sans Bold"],
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#07131b" },
  });
}

function layerIds(config: SourceLayerConfig): string[] {
  return [
    clusterLayerId(config),
    clusterCountLayerId(config),
    pointLayerId(config),
    symbolLayerId(config),
  ];
}

function clusterLayerId(config: SourceLayerConfig) { return `${config.prefix}-clusters`; }
function clusterCountLayerId(config: SourceLayerConfig) { return `${config.prefix}-cluster-count`; }
function pointLayerId(config: SourceLayerConfig) { return `${config.prefix}-points`; }
function symbolLayerId(config: SourceLayerConfig) { return `${config.prefix}-symbols`; }

function popupTitle(feature: ContextualObservationFeature): string {
  const properties = feature.properties;
  if (properties.source_type === "PROPERTI_GO") {
    return properties.property_category || "Observasi properti";
  }
  if (properties.source_type === "STRUK_GO") {
    return properties.place_name || "Observasi transaksi";
  }
  return properties.title || "Observasi lapangan";
}

function sourceName(source: ContextualSource): string {
  return source === "PROPERTI_GO" ? "Properti Go" : source === "STRUK_GO" ? "Struk Go" : "Activities";
}

function appendRow(root: HTMLElement, label: string, value: string | null | undefined): void {
  if (!value) return;
  const row = document.createElement("p");
  const term = document.createElement("strong");
  term.textContent = `${label}: `;
  row.append(term, document.createTextNode(value));
  root.append(row);
}

function appendMedia(root: HTMLElement, url: string | null | undefined, alt: string): void {
  if (!url) return;
  const image = document.createElement("img");
  image.src = url;
  image.alt = alt;
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => image.remove(), { once: true });
  root.append(image);
}

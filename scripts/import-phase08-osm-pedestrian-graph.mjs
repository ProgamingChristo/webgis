import { createClient } from "@supabase/supabase-js";

process.loadEnvFile("backend/.env.local");

const apply = process.argv.includes("--apply");
const bounds = { south: -6.285, west: 106.785, north: -6.18, east: 106.89 };
const cellSize = 0.035;
const sourceName = "OpenStreetMap pedestrian network Jakarta commuter pilot 2026-08-28";
const highwayPattern = "footway|path|pedestrian|living_street|steps|corridor|residential|service|tertiary|secondary|primary";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const ways = new Map();
const nodes = new Map();
let requestCount = 0;

for (let south = bounds.south; south < bounds.north; south += cellSize) {
  for (let west = bounds.west; west < bounds.east; west += cellSize) {
    const cell = {
      south,
      west,
      north: Math.min(bounds.north, south + cellSize),
      east: Math.min(bounds.east, west + cellSize),
    };
    const payload = await fetchOverpass(cell);
    requestCount += 1;
    for (const element of payload.elements ?? []) {
      if (element.type === "node") nodes.set(element.id, element);
      if (element.type === "way") ways.set(element.id, element);
    }
    process.stdout.write(`Fetched cell ${requestCount}: ${ways.size} ways, ${nodes.size} nodes\n`);
  }
}

const nodeUseCount = new Map();
for (const way of ways.values()) {
  for (const nodeId of new Set(way.nodes ?? [])) {
    nodeUseCount.set(nodeId, (nodeUseCount.get(nodeId) ?? 0) + 1);
  }
}
const endpointNodeIds = new Set();
const graphEdges = [];

for (const way of ways.values()) {
  const wayNodes = (way.nodes ?? []).map((id) => nodes.get(id)).filter(Boolean);
  if (wayNodes.length < 2) continue;
  let segmentStart = 0;
  let segmentLength = 0;
  let segmentIndex = 0;
  for (let index = 1; index < wayNodes.length; index += 1) {
    const previous = wayNodes[index - 1];
    const current = wayNodes[index];
    segmentLength += distanceMeters(previous.lon, previous.lat, current.lon, current.lat);
    const isJunction = (nodeUseCount.get(current.id) ?? 0) > 1;
    const shouldSplit = index === wayNodes.length - 1 || isJunction || segmentLength >= 60;
    if (!shouldSplit) continue;
    const source = wayNodes[segmentStart];
    const target = current;
    if (source.id === target.id || segmentLength < 0.2) {
      segmentStart = index;
      segmentLength = 0;
      continue;
    }
    endpointNodeIds.add(source.id);
    endpointNodeIds.add(target.id);
    const coordinates = wayNodes.slice(segmentStart, index + 1)
      .map((node) => [node.lon, node.lat]);
    graphEdges.push({
      sourceOsmId: source.id,
      targetOsmId: target.id,
      sourceRecordId: `${way.id}:${segmentIndex}:${source.id}:${target.id}`,
      code: `osm-${way.id}-${segmentIndex}`.slice(0, 50),
      lengthMeters: segmentLength,
      reverseCost: isPedestrianOneWay(way.tags) ? -1 : segmentLength,
      geometry: {
        type: "LineString",
        coordinates,
      },
      metadata: safeWayMetadata(way.tags),
    });
    segmentStart = index;
    segmentLength = 0;
    segmentIndex += 1;
  }
}
const graphNodes = [...endpointNodeIds].map((id) => nodes.get(id)).filter(Boolean);

console.log(JSON.stringify({
  mode: apply ? "APPLY" : "DRY_RUN",
  bounds,
  overpass_requests: requestCount,
  node_count: graphNodes.length,
  edge_count: graphEdges.length,
  source: sourceName,
}, null, 2));

if (!apply) process.exit(0);

const sourceId = await ensureSource();
const studyAreaId = await ensureStudyArea(sourceId);
const routingByOsmNode = new Map();

for (const chunk of chunks(graphNodes, 400)) {
  const rows = chunk.map((node) => ({
    code: `osm-${node.id}`.slice(0, 50),
    geometry: { type: "Point", coordinates: [node.lon, node.lat] },
    study_area_id: studyAreaId,
    source_id: sourceId,
    source_record_id: String(node.id),
    data_version: "osm-2026-08-28",
    metadata: { provider: "OpenStreetMap", license: "ODbL-1.0" },
    environment: "PRODUCTION",
    validation_status: "VALIDATED",
    validated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("pedestrian_nodes")
    .upsert(rows, { onConflict: "source_id,source_record_id,environment" })
    .select("routing_id,source_record_id");
  if (error) throw error;
  for (const row of data ?? []) routingByOsmNode.set(Number(row.source_record_id), row.routing_id);
  process.stdout.write(`Upserted nodes: ${routingByOsmNode.size}/${graphNodes.length}\n`);
}

let insertedEdges = 0;
for (const chunk of chunks(graphEdges, 250)) {
  const rows = chunk.map((edge) => ({
    code: edge.code,
    source: routingByOsmNode.get(edge.sourceOsmId),
    target: routingByOsmNode.get(edge.targetOsmId),
    geometry: edge.geometry,
    length_meters: edge.lengthMeters,
    cost: edge.lengthMeters,
    reverse_cost: edge.reverseCost,
    walkable: true,
    study_area_id: studyAreaId,
    source_id: sourceId,
    source_record_id: edge.sourceRecordId,
    data_version: "osm-2026-08-28",
    metadata: edge.metadata,
    environment: "PRODUCTION",
    validation_status: "VALIDATED",
    validated_at: new Date().toISOString(),
  })).filter((row) => Number.isFinite(row.source) && Number.isFinite(row.target));
  const { error } = await supabase
    .from("pedestrian_edges")
    .upsert(rows, { onConflict: "source_id,source_record_id,environment" });
  if (error) throw error;
  insertedEdges += rows.length;
  process.stdout.write(`Upserted edges: ${insertedEdges}/${graphEdges.length}\n`);
}

const { data: componentRefresh, error: componentRefreshError } = await supabase.rpc(
  "refresh_pedestrian_graph_components_v1",
  { p_environment: "PRODUCTION" },
);
if (componentRefreshError) throw componentRefreshError;

console.log(JSON.stringify({
  status: "IMPORTED",
  nodes: routingByOsmNode.size,
  edges: insertedEdges,
  topology: componentRefresh,
}));

async function fetchOverpass(cell) {
  const bbox = `${cell.south},${cell.west},${cell.north},${cell.east}`;
  const query = `[out:json][timeout:180];way["highway"~"${highwayPattern}"]["area"!="yes"]["foot"!="no"]["access"!~"private|no"](${bbox});(._;>;);out body;`;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "GETRA Phase08 graph importer",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) return response.json();
    if (attempt === 4) throw new Error(`Overpass failed with HTTP ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 3_000));
  }
}

async function ensureSource() {
  const existing = await supabase.from("spatial_sources").select("id").eq("source_name", sourceName).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;
  const created = await supabase.from("spatial_sources").insert({
    source_name: sourceName,
    source_type: "external",
    description: "Bounded OSM walking graph for GETRA Phase 08 commuter verification.",
    metadata: {
      provider: "OpenStreetMap contributors",
      license: "ODbL-1.0",
      imported_at: new Date().toISOString(),
      bounds,
    },
  }).select("id").single();
  if (created.error) throw created.error;
  return created.data.id;
}

async function ensureStudyArea(sourceId) {
  const name = "GETRA Phase 08 Jakarta commuter graph pilot";
  const existing = await supabase.from("study_areas").select("id").eq("name", name).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;
  const ring = [[
    [bounds.west, bounds.south], [bounds.east, bounds.south],
    [bounds.east, bounds.north], [bounds.west, bounds.north],
    [bounds.west, bounds.south],
  ]];
  const created = await supabase.from("study_areas").insert({
    source_id: sourceId,
    name,
    description: "Pilot coverage; outside this polygon returns no network access.",
    geometry: { type: "MultiPolygon", coordinates: [ring] },
  }).select("id").single();
  if (created.error) throw created.error;
  return created.data.id;
}

function safeWayMetadata(tags = {}) {
  return {
    provider: "OpenStreetMap",
    license: "ODbL-1.0",
    highway: tags.highway ?? null,
    foot: tags.foot ?? null,
    sidewalk: tags.sidewalk ?? null,
    surface: tags.surface ?? null,
    crossing: tags.crossing ?? null,
    one_way_foot: isPedestrianOneWay(tags),
  };
}

function isPedestrianOneWay(tags = {}) {
  return tags["oneway:foot"] === "yes" ||
    (tags.oneway === "yes" && ["steps", "corridor"].includes(tags.highway));
}

function distanceMeters(lng1, lat1, lng2, lat2) {
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.max(0.2, 6_371_008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function chunks(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size));
}

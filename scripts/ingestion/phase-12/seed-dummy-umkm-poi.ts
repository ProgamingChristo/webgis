import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting Phase 12 Dummy UMKM/POI Seeding...");

  // 1. Get or create a DUMMY spatial source
  let { data: source } = await supabase
    .from("spatial_sources")
    .select("id")
    .eq("source_name", "Phase 12 Dummy Data")
    .single();

  if (!source) {
    const { data: newSource, error: sourceError } = await supabase
      .from("spatial_sources")
      .insert({
        source_name: "Phase 12 Dummy Data",
        source_type: "MANUAL",
        description: "Dummy UMKM and POI data for Phase 12 testing",
      })
      .select("id")
      .single();
    if (sourceError) throw sourceError;
    source = newSource;
  }
  const sourceId = source.id;

  // 2. Get the DUMMY study area (created in Phase 9/11)
  const { data: area } = await supabase
    .from("study_areas")
    .select("id")
    .eq("name", "Pilot Area Dummy")
    .single();

  if (!area) {
    throw new Error("Pilot Area Dummy not found. Please run Phase 9/11 seeding first.");
  }
  const areaId = area.id;

  // 3. Clear existing Phase 12 dummy data
  console.log("Cleaning up existing dummy UMKM & POI data...");
  await supabase.from("entity_network_access").delete().eq("environment", "DUMMY");
  await supabase.from("umkm").delete().eq("environment", "DUMMY");
  await supabase.from("pois").delete().eq("environment", "DUMMY");

  // 4. Insert Dummy UMKM (Inside Pilot Area Box: 106.8 - 106.9, -6.3 - -6.2)
  console.log("Inserting Dummy UMKMs...");
  const dummyUmkms = [
    { code: "UMKM-001", name: "Warung Bu Ani", category: "FOOD", lng: 106.82, lat: -6.22 },
    { code: "UMKM-002", name: "Toko Kelontong Berkah", category: "RETAIL", lng: 106.85, lat: -6.25 },
    { code: "UMKM-003", name: "Bengkel Motor Jaya", category: "SERVICE", lng: 106.88, lat: -6.28 },
    { code: "UMKM-004", name: "Nasi Goreng Gila", category: "FOOD", lng: 106.83, lat: -6.21 },
    { code: "UMKM-005", name: "Minimarket Sahabat", category: "RETAIL", lng: 106.86, lat: -6.26 },
  ];

  for (const item of dummyUmkms) {
    const { data: umkm, error } = await supabase
      .from("umkm")
      .insert({
        code: item.code,
        name: item.name,
        category: item.category,
        description: "Dummy UMKM description",
        geometry: `SRID=4326;POINT(${item.lng} ${item.lat})`,
        study_area_id: areaId,
        environment: "DUMMY",
        source_id: sourceId,
        source_record_id: `src-${item.code}`,
        validation_status: "VALIDATED"
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Failed to insert UMKM ${item.code}:`, error.message);
      continue;
    }

    // Try snapping to nearest pedestrian node (max 500m for dummy data tests)
    const { data: nearestNode } = await supabase
      .rpc("find_nearest_pedestrian_node", {
        p_lat: item.lat,
        p_lng: item.lng,
        p_radius_meters: 500,
        p_environment: "DUMMY"
      })
      .single();

    if (nearestNode) {
      const node = nearestNode as any;
      await supabase.from("entity_network_access").insert({
        entity_type: "UMKM",
        entity_id: umkm.id,
        pedestrian_node_id: node.id,
        snap_distance_meters: node.distance_meters,
        environment: "DUMMY"
      });
    }
  }

  // 5. Insert Dummy POIs
  console.log("Inserting Dummy POIs...");
  const dummyPois = [
    { code: "POI-001", name: "Sekolah Dasar 01", category: "SCHOOL", lng: 106.84, lat: -6.23 },
    { code: "POI-002", name: "Pasar Tradisional", category: "MARKET", lng: 106.87, lat: -6.27 },
    { code: "POI-003", name: "Stasiun Commuter", category: "STATION", lng: 106.81, lat: -6.29 },
  ];

  for (const item of dummyPois) {
    const { data: poi, error } = await supabase
      .from("pois")
      .insert({
        code: item.code,
        name: item.name,
        category: item.category,
        geometry: `SRID=4326;POINT(${item.lng} ${item.lat})`,
        study_area_id: areaId,
        environment: "DUMMY",
        source_id: sourceId,
        source_record_id: `src-${item.code}`,
        validation_status: "VALIDATED"
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Failed to insert POI ${item.code}:`, error.message);
      continue;
    }

    // Snap POI to network
    const { data: nearestNode } = await supabase
      .rpc("find_nearest_pedestrian_node", {
        p_lat: item.lat,
        p_lng: item.lng,
        p_radius_meters: 500,
        p_environment: "DUMMY"
      })
      .single();

    if (nearestNode) {
      const node = nearestNode as any;
      await supabase.from("entity_network_access").insert({
        entity_type: "POI",
        entity_id: poi.id,
        pedestrian_node_id: node.id,
        snap_distance_meters: node.distance_meters,
        environment: "DUMMY"
      });
    }
  }

  console.log("Phase 12 Dummy Seeding Completed!");
}

run().catch((err) => {
  console.error("Fatal error during Phase 12 seeding:", err);
  process.exit(1);
});

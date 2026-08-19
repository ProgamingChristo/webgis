import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting Phase 11 Dummy Network Seeding...");

  // 1. Get or create a DUMMY spatial source
  let { data: source } = await supabase
    .from("spatial_sources")
    .select("id")
    .eq("source_name", "Phase 11 Dummy Data")
    .single();

  if (!source) {
    const { data: newSource, error: sourceError } = await supabase
      .from("spatial_sources")
      .insert({
        source_name: "Phase 11 Dummy Data",
        source_type: "MANUAL",
        description: "Dummy network for Phase 11 testing",
      })
      .select("id")
      .single();
    if (sourceError) throw sourceError;
    source = newSource;
  }
  const sourceId = source.id;

  // 2. Get or create a DUMMY study area
  let { data: area } = await supabase
    .from("study_areas")
    .select("id")
    .eq("name", "Pilot Area Dummy")
    .single();

  if (!area) {
    const { data: newArea, error: areaError } = await supabase
      .from("study_areas")
      .insert({
        name: "Pilot Area Dummy",
        geometry: "SRID=4326;MULTIPOLYGON(((106.8 -6.2, 106.9 -6.2, 106.9 -6.3, 106.8 -6.3, 106.8 -6.2)))",
        source_id: sourceId,
        environment: "DUMMY"
      })
      .select("id")
      .single();
    if (areaError) throw areaError;
    area = newArea;
  }
  const areaId = area.id;

  // 3. Clear existing dummy nodes and edges (Cascade will handle edges and links)
  await supabase.from("pedestrian_nodes").delete().eq("environment", "DUMMY");

  // 4. Create Nodes (Simple straight line: Node A -> Node B -> Node C)
  console.log("Inserting dummy nodes...");
  
  // Hardcode coordinates to easily compute length.
  // We'll use approx degree distances. 0.001 degree ~ 111 meters.
  const nodes = [
    { code: "N1", geom: "SRID=4326;POINT(106.800 -6.200)" },
    { code: "N2", geom: "SRID=4326;POINT(106.801 -6.200)" },
    { code: "N3", geom: "SRID=4326;POINT(106.802 -6.200)" }
  ];

  const nodeRoutingIds: Record<string, number> = {};
  const nodeDbIds: Record<string, string> = {};

  for (const n of nodes) {
    const { data: nodeData, error: nodeError } = await supabase
      .from("pedestrian_nodes")
      .insert({
        code: n.code,
        geometry: n.geom,
        study_area_id: areaId,
        source_id: sourceId,
        environment: "DUMMY",
        validation_status: "VALIDATED"
      })
      .select("id, routing_id")
      .single();

    if (nodeError) throw nodeError;
    nodeRoutingIds[n.code] = nodeData.routing_id;
    nodeDbIds[n.code] = nodeData.id;
  }

  // 5. Create Edges
  console.log("Inserting dummy edges...");
  
  const edges = [
    {
      code: "E1",
      source: nodeRoutingIds["N1"],
      target: nodeRoutingIds["N2"],
      geom: "SRID=4326;LINESTRING(106.800 -6.200, 106.801 -6.200)",
      length: 111, // approx meters
    },
    {
      code: "E2",
      source: nodeRoutingIds["N2"],
      target: nodeRoutingIds["N3"],
      geom: "SRID=4326;LINESTRING(106.801 -6.200, 106.802 -6.200)",
      length: 111,
    }
  ];

  for (const e of edges) {
    const { error: edgeError } = await supabase
      .from("pedestrian_edges")
      .insert({
        code: e.code,
        source: e.source,
        target: e.target,
        geometry: e.geom,
        length_meters: e.length,
        cost: e.length, // simple distance cost
        reverse_cost: e.length, // bidirectional walk
        study_area_id: areaId,
        source_id: sourceId,
        environment: "DUMMY",
        validation_status: "VALIDATED"
      });
      
    if (edgeError) throw edgeError;
  }

  // 6. Test Routing (N1 to N3)
  console.log("Testing pgRouting RPC (N1 -> N3)...");
  
  const { data: routeResult, error: routeError } = await supabase
    .rpc("calculate_walking_route", {
      p_origin_id: nodeRoutingIds["N1"],
      p_destination_id: nodeRoutingIds["N3"],
      p_environment: "DUMMY"
    });

  if (routeError) throw routeError;
  
  console.log("Routing result:", routeResult);

  console.log("Phase 11 Dummy Network Seeding Completed Successfully.");
}

run().catch(console.error);

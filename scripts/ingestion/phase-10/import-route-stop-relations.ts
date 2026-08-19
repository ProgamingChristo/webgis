import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import { TransportRouteStopRepository } from "@/src/repositories/transport-route-stop.repository";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);
const repo = new TransportRouteStopRepository(supabase);

async function main() {
  console.log("Starting Phase 10 Route-Stop Relations Import...");

  try {
    const jsonPath = path.join(process.cwd(), "tests/fixtures/phase-10/route-stops.valid.json");
    const jsonRaw = await fs.readFile(jsonPath, "utf-8");
    const relations = JSON.parse(jsonRaw);

    let total = 0;
    let valid = 0;
    let inserted = 0;
    let invalid = 0;

    for (const rel of relations) {
      total++;
      
      try {
        const { data: corridor } = await supabase
          .from("transport_corridors")
          .select("id")
          .eq("source_record_id", rel.corridor_source_record_id)
          .maybeSingle();

        const { data: node } = await supabase
          .from("transport_nodes")
          .select("id")
          .eq("source_record_id", rel.node_source_record_id)
          .maybeSingle();

        if (!corridor || !node) {
          throw new Error("Corridor or Node not found for relation");
        }

        valid++;

        await repo.upsertByCorridorAndNode({
          corridor_id: corridor.id,
          node_id: node.id,
          stop_sequence: rel.stop_sequence
        });
        inserted++;
      } catch (err) {
        console.error(`Validation/Insert failed for relation:`, err);
        invalid++;
      }
    }

    console.log("\nGETRA PHASE 10 — ROUTE-STOP RELATIONS FINAL REPORT");
    console.log("STATUS: COMPLETED");
    console.log(`RECORD COUNT: total=${total} valid=${valid} upserted=${inserted} invalid=${invalid}`);
    
  } catch (error) {
    console.error("Error importing relations:", error);
    process.exit(1);
  }
}

main();

import { SupabaseClient } from "@supabase/supabase-js";

export class TransportNodeCanonicalMapper {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Maps a validated staging activity into a Canonical transport_node.
   */
  async mapStagingActivity(stagingId: string) {
    // 1. Fetch staging and its raw payload
    const { data: stagingData, error: fetchError } = await this.supabase
      .from("staging_mapid_activities")
      .select(`
        id,
        raw_evidence_id,
        normalized_metadata,
        validation_status,
        raw_mapid_evidence!inner (
          raw_payload
        )
      `)
      .eq("id", stagingId)
      .single();

    if (fetchError || !stagingData) {
      throw new Error(`Failed to fetch staging record ${stagingId}: ${fetchError?.message}`);
    }

    const rawPayload = (stagingData.raw_mapid_evidence as any).raw_payload;

    if (!rawPayload || rawPayload.entity_kind !== "transport_node") {
      throw new Error("Invalid entity_kind for transport_node mapper");
    }

    const properties = rawPayload.properties;
    const geometry = rawPayload.geometry; // GeoJSON Point

    if (!properties.name || !properties.node_type || !properties.transport_mode) {
      throw new Error("Missing required properties for transport_node canonical mapping");
    }

    // Convert GeoJSON to WKT or let PostgREST handle GeoJSON. PostgREST parses GeoJSON directly if passed as JSON object or stringified.
    // However, it's safer to pass as GeoJSON string or EWKT.
    const geoJsonGeometry = JSON.stringify(geometry);

    // 2. Upsert into transport_nodes
    const upsertData = {
      source_id: rawPayload.source_id,
      source_record_id: rawPayload.source_record_id,
      name: properties.name,
      node_type: properties.node_type,
      transport_mode: properties.transport_mode,
      geometry: geoJsonGeometry,
      environment: "DEV",
      data_version: rawPayload.data_version,
      validation_status: "VALIDATED",
      retrieved_at: rawPayload.retrieved_at,
      validated_at: new Date().toISOString()
    };

    const { data: result, error: upsertError } = await this.supabase
      .from("transport_nodes")
      .upsert(upsertData, {
        onConflict: "source_id, source_record_id, environment",
      })
      .select()
      .single();

    if (upsertError) {
      throw new Error(`Failed to upsert canonical transport_node: ${upsertError.message}`);
    }

    return {
      entity: result,
      source: stagingData,
    };
  }
}

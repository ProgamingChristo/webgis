import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as readMissionObservations } from "@/app/api/mapid/mission-observations/route";
import { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import { MapidMissionSyncService } from "@/src/integrations/mapid/mission.service";
import type { MapidMissionSource } from "@/src/integrations/mapid/mission.types";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

const runRuntimeVerification =
  process.env.RUN_MAPID_MISSION_RUNTIME_VERIFICATION === "1";

const jakartaVerificationPolygon = {
  type: "Polygon" as const,
  coordinates: [[
    [106.68, -6.4],
    [106.98, -6.4],
    [106.98, -6.02],
    [106.68, -6.02],
    [106.68, -6.4],
  ]],
};

const availableSources: MapidMissionSource[] = [
  "MENU_GO",
  "STRUK_GO",
  "PROPERTI_GO",
  ...(process.env.MAPID_ACTIVITIES_PATH ? ["ACTIVITIES" as const] : []),
];
const requestedSources = new Set(
  process.env.MAPID_RUNTIME_SOURCES?.split(",")
    .map((source) => source.trim())
    .filter(Boolean) ?? [],
);
const configuredSources = requestedSources.size > 0
  ? availableSources.filter((source) => requestedSources.has(source))
  : availableSources;

describe.skipIf(!runRuntimeVerification).sequential(
  "MAPID Mission linked runtime verification",
  () => {
    it("enforces the remote schema and serves a normalized authorized response", async () => {
      const serviceRoleClient = getServiceRoleSupabaseClient();
      const repository = new MapidMissionRepository(serviceRoleClient);
      const accessToken = await signInTestAdmin();
      const sourceRecordId = `phase01-verification-${randomUUID()}`;
      let syncRunId: string | null = null;

      try {
        syncRunId = await repository.createSyncRun({
          createdBy: null,
          requestContext: { verification: "PHASE_01_CLOSURE" },
          source: "MENU_GO",
        });
        const row = {
          freshness_status: "UNKNOWN",
          geometry: "SRID=4326;POINT(106.8272 -6.1754)",
          latest_sync_run_id: syncRunId,
          mission_name: "PHASE_01_RUNTIME_VERIFICATION",
          normalized_properties: { verification_fixture: true },
          provenance: {
            imported_at: new Date().toISOString(),
            source_id: sourceRecordId,
            source_type: "MENU_GO",
          },
          raw_payload: { verification_fixture: true },
          raw_payload_checksum: "phase01-verification-checksum",
          source_record_id: sourceRecordId,
          source_type: "MENU_GO",
          verification_status: "SOURCE_OBSERVED",
        };

        const firstInsert = await serviceRoleClient
          .from("mapid_mission_observations")
          .insert(row);
        expect(firstInsert.error).toBeNull();

        const duplicateInsert = await serviceRoleClient
          .from("mapid_mission_observations")
          .insert(row);
        expect(duplicateInsert.error?.code).toBe("23505");

        const invalidGeometryInsert = await serviceRoleClient
          .from("mapid_mission_observations")
          .insert({
            ...row,
            geometry: "SRID=4326;LINESTRING(106.82 -6.17,106.83 -6.18)",
            source_record_id: `${sourceRecordId}-invalid-geometry`,
          });
        expect(invalidGeometryInsert.error).not.toBeNull();

        const anonymousClient = createPublicClient();
        const anonymousRead = await anonymousClient
          .from("mapid_mission_observations")
          .select("id")
          .eq("source_record_id", sourceRecordId);
        expect(anonymousRead.error).toBeNull();
        expect(anonymousRead.data).toHaveLength(0);

        const response = await readMissionObservations(
          new NextRequest(
            "http://localhost/api/mapid/mission-observations?source_type=MENU_GO&limit=500&offset=0",
            { headers: { Authorization: `Bearer ${accessToken}` } },
          ),
        );
        const body = await response.json() as {
          data?: Array<Record<string, unknown>>;
          success?: boolean;
        };
        const verificationRow = body.data?.find(
          (item) => item.source_id === sourceRecordId,
        );
        const serializedBody = JSON.stringify(body);

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(verificationRow).toMatchObject({
          geometry: {
            coordinates: [106.8272, -6.1754],
            type: "Point",
          },
          source_id: sourceRecordId,
          source_type: "MENU_GO",
        });
        expect(verificationRow).toHaveProperty("provenance");
        assertSecretsAbsent(serializedBody);

        console.info(
          "MAPID_MISSION_REMOTE_DB_EVIDENCE",
          JSON.stringify({
            admin_read_api: response.status,
            anonymous_rows: anonymousRead.data?.length ?? 0,
            geometry_constraint: "PASS",
            source_identity_constraint: duplicateInsert.error?.code,
          }),
        );
      } finally {
        await serviceRoleClient
          .from("mapid_mission_observations")
          .delete()
          .in("source_record_id", [sourceRecordId, `${sourceRecordId}-invalid-geometry`]);
        if (syncRunId) {
          await serviceRoleClient
            .from("mapid_mission_sync_runs")
            .delete()
            .eq("id", syncRunId);
        }
      }
    }, 60_000);

    it("retrieves, persists, reruns idempotently, and serves normalized records", async () => {
      const serviceRoleClient = getServiceRoleSupabaseClient();
      const repository = new MapidMissionRepository(serviceRoleClient);
      const service = new MapidMissionSyncService(repository);
      const accessToken = await signInTestAdmin();
      const evidence: Record<string, unknown>[] = [];

      for (const source of configuredSources) {
        const before = await countSourceRows(source);
        const first = await service.syncSource({
          createdBy: null,
          feature: jakartaVerificationPolygon,
          maxPages: 2,
          offset: 0,
          pageSize: 500,
          source,
        });
        const afterFirst = await countSourceRows(source);
        const second = await service.syncSource({
          createdBy: null,
          feature: jakartaVerificationPolygon,
          maxPages: 2,
          offset: 0,
          pageSize: 500,
          source,
        });
        const finalCount = await countSourceRows(source);

        console.info(
          "MAPID_MISSION_SOURCE_SYNC_EVIDENCE",
          JSON.stringify({
            final_count: finalCount,
            first: sanitizeReport(first),
            first_error: first.error,
            second: sanitizeReport(second),
            second_error: second.error,
            source,
          }),
        );

        expect(first.status).toBe("COMPLETED");
        expect(first.records_fetched).toBeGreaterThan(0);
        expect(first.invalid).toBe(0);
        expect(first.inserted + first.updated).toBeGreaterThan(0);
        expect(second.status).toBe("COMPLETED");
        expect(second.inserted).toBe(0);
        expect(finalCount).toBe(afterFirst);
        expect(afterFirst).toBe(before + first.inserted);

        const response = await readMissionObservations(
          new NextRequest(
            `http://localhost/api/mapid/mission-observations?source_type=${source}&limit=10&offset=0`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          ),
        );
        const body = await response.json() as {
          data?: Array<Record<string, unknown>>;
          success?: boolean;
        };
        const serializedBody = JSON.stringify(body);

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data?.length).toBeGreaterThan(0);
        expect(body.data?.[0]).toMatchObject({
          geometry: { type: "Point" },
          source_type: source,
        });
        expect(body.data?.[0]).toHaveProperty("source_id");
        expect(body.data?.[0]).toHaveProperty("provenance");
        assertSecretsAbsent(serializedBody);

        evidence.push({
          after_first: afterFirst,
          before,
          final_count: finalCount,
          first: sanitizeReport(first),
          read_api_items: body.data?.length ?? 0,
          second: sanitizeReport(second),
          source,
        });
      }

      console.info("MAPID_MISSION_RUNTIME_EVIDENCE", JSON.stringify(evidence));
    }, 300_000);

    async function countSourceRows(source: MapidMissionSource) {
      const { count, error } = await getServiceRoleSupabaseClient()
        .from("mapid_mission_observations")
        .select("id", { count: "exact", head: true })
        .eq("source_type", source);

      if (error) throw error;
      return count ?? 0;
    }
  },
);

async function signInTestAdmin(): Promise<string> {
  const client = createPublicClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: "getra.admin.test@example.com",
    password:
      process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!",
  });

  if (error || !data.session?.access_token) {
    throw error || new Error("Stable admin test session missing");
  }
  return data.session.access_token;
}

function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase public test config missing");

  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assertSecretsAbsent(serializedBody: string) {
  for (const secret of [
    process.env.MAPID_API_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]) {
    if (secret) expect(serializedBody).not.toContain(secret);
  }
}

function sanitizeReport(report: {
  failed: number;
  inserted: number;
  invalid: number;
  pages_fetched: number;
  records_fetched: number;
  skipped: number;
  status: string;
  updated: number;
}) {
  return {
    failed: report.failed,
    inserted: report.inserted,
    invalid: report.invalid,
    pages_fetched: report.pages_fetched,
    records_fetched: report.records_fetched,
    skipped: report.skipped,
    status: report.status,
    updated: report.updated,
  };
}

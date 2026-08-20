import { NextResponse } from "next/server";

import { createGetraPublicServerClient } from "@/lib/supabase/public-server";

export const dynamic = "force-dynamic";

async function publicCount(
  client: NonNullable<ReturnType<typeof createGetraPublicServerClient>>,
  table: string,
) {
  const { count, error } = await client
    .from(table)
    .select("*", {
      count: "exact",
      head: true,
    });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count ?? 0;
}

export async function GET() {
  const client = createGetraPublicServerClient();

  if (!client) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error:
          "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi.",
      },
      { status: 503 },
    );
  }

  try {
    const [
      categories,
      spatialSources,
      studyAreas,
      transportNodes,
      merchants,
    ] = await Promise.all([
      publicCount(client, "categories"),
      publicCount(client, "spatial_sources"),
      publicCount(client, "study_areas"),
      publicCount(client, "transport_nodes"),
      publicCount(client, "merchants"),
    ]);

    return NextResponse.json({
      ok: true,
      configured: true,
      databaseReachable: true,
      accessMode: "publishable-key + RLS",
      publicReferenceData: {
        categories,
        spatialSources,
        studyAreas,
        transportNodes,
        merchants,
      },
      expectedFoundationState: {
        categoriesSeeded: categories > 0,
        merchantsEmpty: merchants === 0,
        transportNodesEmpty: transportNodes === 0,
        studyAreasEmpty: studyAreas === 0,
      },
      notes: [
        "Synthetic UI merchant tetap local dan tidak dimasukkan ke Supabase.",
        "Raw MAPID dan survey tidak dibaca oleh endpoint public ini.",
        "pgRouting belum menjadi bagian Step 2.",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        databaseReachable: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Supabase foundation error",
      },
      { status: 500 },
    );
  }
}

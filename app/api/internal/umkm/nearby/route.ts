import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UmkmService } from "@/src/modules/umkm/umkm.service";
import { UmkmRepository } from "@/src/repositories/umkm.repository";
import { EntityAccessService } from "@/src/modules/accessibility/entity-access.service";
import { EntityNetworkAccessRepository } from "@/src/repositories/entity-network-access.repository";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Optional: Check auth
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radiusMeters = parseFloat(searchParams.get("radiusMeters") || "1000");
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const environment = searchParams.get("environment") || "DUMMY";

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const umkmRepo = new UmkmRepository(supabase);
    const accessRepo = new EntityNetworkAccessRepository(supabase);
    const accessService = new EntityAccessService(supabase, accessRepo);
    const umkmService = new UmkmService(supabase, umkmRepo, accessService);

    const results = await umkmService.findNearby({
      lat,
      lng,
      radiusMeters,
      category,
      limit,
      environment
    });

    return NextResponse.json({ data: results });
  } catch (err: any) {
    console.error("Error in /api/internal/umkm/nearby:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

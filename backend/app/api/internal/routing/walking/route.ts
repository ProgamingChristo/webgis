import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RoutingService } from "@/src/modules/pedestrian-network/routing.service";

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    // Usually we would check if user is internal/admin here
    // For Phase 11, we assume authentication is enough for the dummy network testing

    const body = await req.json();
    const { originRoutingId, destinationRoutingId, environment = "DUMMY" } = body;

    if (!originRoutingId || !destinationRoutingId) {
      return NextResponse.json(
        { error: "originRoutingId and destinationRoutingId are required" },
        { status: 400 }
      );
    }

    const routingService = new RoutingService(supabase as any);
    
    const result = await routingService.getShortestPath(
      Number(originRoutingId),
      Number(destinationRoutingId),
      environment
    );

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    console.error("Walking routing error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

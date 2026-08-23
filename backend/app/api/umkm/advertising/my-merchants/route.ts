import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    // 1. Fetch merchants owned by current user
    const { data: owned, error: ownedError } = await supabase
      .from("merchants")
      .select("id, name, address, publish_status, verification_status")
      .eq("owner_id", userId)
      .order("name", { ascending: true })
      .limit(20);

    if (ownedError) {
      return NextResponse.json(
        { success: false, error: { message: ownedError.message } },
        { status: 500 }
      );
    }

    // 2. Fetch sample / demo merchants available for testing
    const { data: samples } = await supabase
      .from("merchants")
      .select("id, name, address, publish_status, verification_status, owner_id")
      .order("name", { ascending: true })
      .limit(10);

    const claimableSamples = (samples || []).map((m) => ({
      id: m.id,
      name: m.name,
      address: m.address,
      publish_status: m.publish_status,
      verification_status: m.verification_status,
      isOwnedByMe: m.owner_id === userId,
    }));

    return createSuccessResponse(reqId, {
      ownedMerchants: owned || [],
      recommendedMerchants: claimableSamples,
    });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const body = await req.json().catch(() => ({}));
    const merchantId = body.merchantId;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: { message: "merchantId is required" } },
        { status: 400 }
      );
    }

    // Assign ownership
    const { error: updateError } = await supabase
      .from("merchants")
      .update({ owner_id: userId })
      .eq("id", merchantId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: { message: updateError.message } },
        { status: 500 }
      );
    }

    // Record approved claim
    await supabase.from("merchant_claims").insert({
      merchant_id: merchantId,
      user_id: userId,
      status: "APPROVED",
      evidence: { method: "instant_developer_claim", claimed_at: new Date().toISOString() },
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    });

    const { data: updatedMerchant } = await supabase
      .from("merchants")
      .select("id, name, address, publish_status, verification_status")
      .eq("id", merchantId)
      .single();

    return createSuccessResponse(reqId, {
      merchant: updatedMerchant,
      isOwned: true,
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/my-merchants");

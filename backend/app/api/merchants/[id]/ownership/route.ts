import { NextRequest, NextResponse } from "next/server";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const merchantId = (await params).id;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: { message: "merchantId is required" } },
        { status: 400 }
      );
    }

    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const ownershipService = new MerchantOwnershipService(supabase);
    const result = await ownershipService.getOwnershipState(userId, merchantId);

    return createSuccessResponse(reqId, result);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const merchantId = (await params).id;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: { message: "merchantId is required" } },
        { status: 400 }
      );
    }

    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    // 1. Verify merchant exists
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id, name, owner_id")
      .eq("id", merchantId)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json(
        { success: false, error: { message: "Merchant not found" } },
        { status: 404 }
      );
    }

    // 2. Set ownership for the user
    const { error: updateError } = await supabase
      .from("merchants")
      .update({ owner_id: userId })
      .eq("id", merchantId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: { message: "Failed to update merchant ownership: " + updateError.message } },
        { status: 500 }
      );
    }

    // 3. Insert / record claim as APPROVED
    await supabase.from("merchant_claims").insert({
      merchant_id: merchantId,
      user_id: userId,
      status: "APPROVED",
      evidence: { method: "instant_developer_claim", claimed_at: new Date().toISOString() },
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    });

    return createSuccessResponse(reqId, {
      merchantId,
      isOwned: true,
      ownerId: userId,
      claimStatus: "APPROVED",
      name: merchant.name,
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/merchants/[id]/ownership");

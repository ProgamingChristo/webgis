import { NextRequest, NextResponse } from "next/server";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import { z } from "zod";

const merchantIdSchema = z.string().uuid();

export const maxDuration = 15;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const parsedMerchantId = merchantIdSchema.safeParse((await params).id);
    if (!parsedMerchantId.success) {
      return NextResponse.json(
        { success: false, error: { message: "merchantId is required" } },
        { status: 400 }
      );
    }

    const merchantId = parsedMerchantId.data;
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
    const parsedMerchantId = merchantIdSchema.safeParse((await params).id);
    if (!parsedMerchantId.success) {
      return NextResponse.json(
        { success: false, error: { message: "merchantId is required" } },
        { status: 400 }
      );
    }

    const merchantId = parsedMerchantId.data;
    const userId = await requireAuthenticatedUser(req);
    const supabase = getServiceRoleSupabaseClient();

    // 1. Verify merchant exists
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id, owner_id")
      .eq("id", merchantId)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json(
        { success: false, error: { message: "Merchant not found" } },
        { status: 404 }
      );
    }

    if (merchant.owner_id === userId) {
      return createSuccessResponse(reqId, {
        merchantId,
        isOwned: true,
        claimStatus: "APPROVED",
      });
    }

    const { data: existingClaim } = await supabase
      .from("merchant_claims")
      .select("status")
      .eq("merchant_id", merchantId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!existingClaim) {
      const { error: claimError } = await supabase.from("merchant_claims").insert({
        merchant_id: merchantId,
        user_id: userId,
        status: "PENDING",
        evidence: { method: "user_claim_request" },
      });
      if (claimError) throw claimError;
    }

    return createSuccessResponse(reqId, {
      merchantId,
      isOwned: false,
      claimStatus: existingClaim?.status ?? "PENDING",
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/merchants/[id]/ownership");

import { NextRequest, NextResponse } from "next/server";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { CreativeMediaService } from "@/src/features/umkm-advertising/creative/services/creative-media.service";
import { getMerchantIdFromRequest } from "@/src/features/umkm-advertising/utils/request-context";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; creativeId: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    await requireAuthenticatedUser(req);
    const authorization = req.headers.get("Authorization")!;
    const { id, creativeId } = await params;
    const supabase = getRequestSupabaseClient(authorization);
    const service = new CreativeMediaService(supabase);
    
    const merchantId = getMerchantIdFromRequest(req);
    if (!merchantId) {
      return NextResponse.json({ success: false, error: { message: "Merchant ID tidak valid" } }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ success: false, error: { message: "File tidak ditemukan" } }, { status: 400 });
    }

    // MIME type validation
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: { message: "Tipe file tidak didukung. Gunakan JPG, PNG, atau WEBP." } }, { status: 400 });
    }

    // Size validation: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: { message: "Ukuran file maksimal 5MB." } }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileObj = file as any;
    const filename = fileObj.name || "upload.jpg";

    const url = await service.uploadCreativeImage(merchantId, id, creativeId, buffer, filename, file.type);
    return createSuccessResponse(reqId, { url });
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/campaigns/[id]/creatives/[creativeId]/media");

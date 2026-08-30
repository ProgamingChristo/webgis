import type {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createOptionsHandler,
} from "@/src/lib/api-security";
import {
  withApiLogger,
} from "@/src/lib/api-logger";
import {
  createSuccessResponse,
} from "@/src/lib/api-response";
import {
  requireAuthenticatedUser,
} from "@/src/lib/auth";
import {
  ApplicationError,
} from "@/src/lib/errors";
import {
  rateLimiter,
} from "@/src/lib/rate-limit";
import {
  getRequestId,
} from "@/src/lib/request-id";
import {
  getServiceRoleSupabaseClient,
} from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MERCHANT_SUBMISSION_BUCKET = "merchant-submission-media";
const MAX_MERCHANT_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MERCHANT_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const requestId = getRequestId(request);

  return withApiLogger(
    request,
    requestId,
    async () => {
      const userId = await requireAuthenticatedUser(request);

      await rateLimiter.checkLimit(
        request,
        `${userId}:umkm:merchant-submission:photo`,
      );

      const declaredLength = request.headers.get("content-length");
      if (
        declaredLength !== null &&
        Number(declaredLength) > MAX_MERCHANT_PHOTO_BYTES + 4_096
      ) {
        throw new ApplicationError(
          "REQUEST_TOO_LARGE",
          "Ukuran foto usaha maksimal 5 MB.",
        );
      }

      const formData = await request.formData();
      const photo = formData.get("photo");

      if (!(photo instanceof File)) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "File foto usaha wajib dikirim.",
        );
      }

      if (
        photo.size <= 0 ||
        photo.size > MAX_MERCHANT_PHOTO_BYTES
      ) {
        throw new ApplicationError(
          "REQUEST_TOO_LARGE",
          "Ukuran foto usaha maksimal 5 MB.",
        );
      }

      if (!ALLOWED_MERCHANT_PHOTO_TYPES.has(photo.type)) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Format foto usaha harus JPG, PNG, atau WEBP.",
        );
      }

      const supabase = getServiceRoleSupabaseClient();
      await ensureMerchantSubmissionBucket();

      const extension = EXTENSION_BY_MIME_TYPE[photo.type] ?? "jpg";
      const storagePath =
        `${userId}/submission-photo-${Date.now()}.${extension}`;
      const buffer = Buffer.from(await photo.arrayBuffer());

      const { error: uploadError } =
        await supabase.storage
          .from(MERCHANT_SUBMISSION_BUCKET)
          .upload(
            storagePath,
            buffer,
            {
              cacheControl: "3600",
              contentType: photo.type,
              upsert: false,
            },
          );

      if (uploadError) {
        throw new ApplicationError(
          "DATABASE_UNAVAILABLE",
          "Upload foto usaha gagal.",
          true,
        );
      }

      const { data } =
        supabase.storage
          .from(MERCHANT_SUBMISSION_BUCKET)
          .getPublicUrl(storagePath);

      return createSuccessResponse(
        requestId,
        {
          image_url: data.publicUrl,
          path: storagePath,
        },
        { status: 201 },
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/umkm/merchant-submissions/photo",
  );

async function ensureMerchantSubmissionBucket(): Promise<void> {
  const supabase = getServiceRoleSupabaseClient();
  const { error: getError } =
    await supabase.storage.getBucket(
      MERCHANT_SUBMISSION_BUCKET,
    );

  if (!getError) {
    return;
  }

  const { error: createError } =
    await supabase.storage.createBucket(
      MERCHANT_SUBMISSION_BUCKET,
      {
        allowedMimeTypes: Array.from(
          ALLOWED_MERCHANT_PHOTO_TYPES,
        ),
        fileSizeLimit: MAX_MERCHANT_PHOTO_BYTES,
        public: true,
      },
    );

  if (createError) {
    throw new ApplicationError(
      "DATABASE_UNAVAILABLE",
      "Bucket foto usaha belum tersedia.",
      true,
    );
  }
}

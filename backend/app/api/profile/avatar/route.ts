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

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const requestId =
    getRequestId(request);

  return withApiLogger(
    request,
    requestId,
    async () => {
      const userId =
        await requireAuthenticatedUser(
          request,
        );

      await rateLimiter.checkLimit(
        request,
        `${userId}:profile:avatar:upload`,
      );

      const declaredLength =
        request.headers.get(
          "content-length",
        );

      if (
        declaredLength !== null &&
        Number(declaredLength) >
          MAX_AVATAR_BYTES + 2_048
      ) {
        throw new ApplicationError(
          "REQUEST_TOO_LARGE",
          "Ukuran foto profil maksimal 2 MB.",
        );
      }

      const formData =
        await request.formData();
      const avatar =
        formData.get("avatar");

      if (!(avatar instanceof File)) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "File avatar wajib dikirim.",
        );
      }

      if (
        avatar.size <= 0 ||
        avatar.size > MAX_AVATAR_BYTES
      ) {
        throw new ApplicationError(
          "REQUEST_TOO_LARGE",
          "Ukuran foto profil maksimal 2 MB.",
        );
      }

      if (
        !ALLOWED_AVATAR_TYPES.has(
          avatar.type,
        )
      ) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Format foto profil harus JPG, PNG, WEBP, atau GIF.",
        );
      }

      const supabase =
        getServiceRoleSupabaseClient();

      await ensureAvatarBucket();

      const extension =
        EXTENSION_BY_MIME_TYPE[
          avatar.type
        ] ?? "jpg";
      const storagePath =
        `${userId}/avatar-${Date.now()}.${extension}`;
      const buffer =
        Buffer.from(
          await avatar.arrayBuffer(),
        );

      const { error: uploadError } =
        await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(
            storagePath,
            buffer,
            {
              cacheControl: "3600",
              contentType: avatar.type,
              upsert: true,
            },
          );

      if (uploadError) {
        throw new ApplicationError(
          "DATABASE_UNAVAILABLE",
          "Upload foto profil gagal.",
          true,
        );
      }

      const { data } =
        supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(
            storagePath,
          );

      return createSuccessResponse(
        requestId,
        {
          avatar_url:
            data.publicUrl,
          path: storagePath,
        },
        { status: 201 },
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/profile/avatar",
  );

async function ensureAvatarBucket(): Promise<void> {
  const supabase =
    getServiceRoleSupabaseClient();
  const { error: getError } =
    await supabase.storage.getBucket(
      AVATAR_BUCKET,
    );

  if (!getError) {
    return;
  }

  const { error: createError } =
    await supabase.storage.createBucket(
      AVATAR_BUCKET,
      {
        allowedMimeTypes:
          Array.from(
            ALLOWED_AVATAR_TYPES,
          ),
        fileSizeLimit:
          MAX_AVATAR_BYTES,
        public: true,
      },
    );

  if (createError) {
    throw new ApplicationError(
      "DATABASE_UNAVAILABLE",
      "Bucket avatar belum tersedia.",
      true,
    );
  }
}

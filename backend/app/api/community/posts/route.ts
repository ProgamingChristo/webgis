import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityMediaService,
  COMMUNITY_PHOTO_MAX_INPUT_BYTES,
  CommunityService,
  SupabaseCommunityRepository,
  type CommunityFeedItem,
  type CommunityPhotoUpload,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { MAX_PROFILE_JSON_BODY_BYTES } from "@/src/lib/request-body";
import { readBoundedJsonBody } from "@/src/lib/request-body";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import {
  getRequestSupabaseClient,
  getServiceRoleSupabaseClient,
} from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_COMMUNITY_MULTIPART_BODY_BYTES =
  COMMUNITY_PHOTO_MAX_INPUT_BYTES + 16_384;

type CommunityPostEndpointService = {
  createPost(
    authorId: string,
    input: unknown,
    photo?: CommunityPhotoUpload,
  ): Promise<CommunityFeedItem>;
};

export type CommunityPostsHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityPostEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityPostsHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: (request) => {
    const authorization =
      request.headers.get("Authorization");

    if (!authorization) {
      throw new Error("Missing authorization header");
    }

    return new CommunityService(
      new SupabaseCommunityRepository(
        getRequestSupabaseClient(authorization),
        getServiceRoleSupabaseClient(),
      ),
      new CommunityMediaService(getServiceRoleSupabaseClient()),
    );
  },
  rateLimiter,
};

type CommunityPostRequestBody = {
  payload: unknown;
  photo?: CommunityPhotoUpload;
};

function readContentType(request: NextRequest): string {
  return (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() ?? ""
  );
}

function assertDeclaredBodyLimit(
  request: NextRequest,
  maximumBytes: number,
): void {
  const declaredLength = request.headers.get("content-length");

  if (declaredLength === null) {
    return;
  }

  const length = Number(declaredLength);

  if (!Number.isSafeInteger(length) || length < 0) {
    throw new ApplicationError("VALIDATION_ERROR");
  }

  if (length > maximumBytes) {
    throw new ApplicationError("REQUEST_TOO_LARGE");
  }
}

async function readCommunityPostRequestBody(
  request: NextRequest,
): Promise<CommunityPostRequestBody> {
  const contentType = readContentType(request);

  if (contentType === "application/json") {
    return {
      payload: await readBoundedJsonBody(
        request,
        MAX_PROFILE_JSON_BODY_BYTES,
      ),
    };
  }

  if (contentType !== "multipart/form-data") {
    throw new ApplicationError("VALIDATION_ERROR");
  }

  assertDeclaredBodyLimit(
    request,
    MAX_COMMUNITY_MULTIPART_BODY_BYTES,
  );

  const formData = await request.formData();
  const keys = [...formData.keys()];
  const allowedKeys = new Set(["payload", "photo"]);

  if (keys.some((key) => !allowedKeys.has(key))) {
    throw new ApplicationError("VALIDATION_ERROR");
  }

  const payloadFields = formData.getAll("payload");
  const photoFields = formData.getAll("photo");

  if (payloadFields.length !== 1 || photoFields.length > 1) {
    throw new ApplicationError("VALIDATION_ERROR");
  }

  const payloadValue = payloadFields[0];

  if (typeof payloadValue !== "string") {
    throw new ApplicationError("VALIDATION_ERROR");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(payloadValue);
  } catch {
    throw new ApplicationError("VALIDATION_ERROR");
  }

  const photoValue = photoFields[0];

  if (photoValue === undefined) {
    return { payload };
  }

  if (!(photoValue instanceof File) || photoValue.size <= 0) {
    throw new ApplicationError("VALIDATION_ERROR");
  }

  if (photoValue.size > COMMUNITY_PHOTO_MAX_INPUT_BYTES) {
    throw new ApplicationError("REQUEST_TOO_LARGE");
  }

  return {
    payload,
    photo: photoValue,
  };
}

export function createCommunityPostsHandler(
  dependencies: CommunityPostsHandlerDependencies = defaultDependencies,
) {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:posts:create`,
      );

      const body = await readCommunityPostRequestBody(request);

      const post = await dependencies
        .createService(request)
        .createPost(userId, body.payload, body.photo);

      return createSuccessResponse(requestId, post, {
        status: 201,
      });
    });
  };
}

export const POST = createCommunityPostsHandler();
export const OPTIONS = createOptionsHandler("/api/community/posts");

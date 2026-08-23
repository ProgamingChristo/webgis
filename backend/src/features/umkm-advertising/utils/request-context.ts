import type { NextRequest } from "next/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getMerchantIdFromRequest(
  request: NextRequest,
) {
  const merchantId = (
    request.headers.get("x-getra-merchant-id") ||
    request.headers.get("x-merchant-id") ||
    request.nextUrl.searchParams.get("merchantId")
  )?.trim();

  return merchantId && UUID_PATTERN.test(merchantId)
    ? merchantId
    : null;
}

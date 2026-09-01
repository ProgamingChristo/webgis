"use client";

import { use } from "react";

import { MerchantClaimDetail } from "@/src/features/umkm-workspace/components/merchant-claim-detail";
import { GetraAppShell } from "@/src/components/getra-ui";

export default function MerchantClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <GetraAppShell tone="umkm"><MerchantClaimDetail claimId={id} /></GetraAppShell>;
}

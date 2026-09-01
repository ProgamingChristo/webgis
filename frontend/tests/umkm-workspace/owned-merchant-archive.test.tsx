import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OwnedMerchantList } from "@/src/features/umkm-workspace/components/owned-merchant-list";

describe("owned merchant archive UI", () => {
  it("offers deletion only on the owner-scoped merchant list", () => {
    const html = renderToStaticMarkup(
      <OwnedMerchantList
        merchants={[{
          id: "merchant-owned",
          name: "Warung Milik Saya",
          address: "Jl. GETRA",
          category: "Kuliner",
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          campaigns_count: 0,
        }]}
        onArchiveMerchant={vi.fn()}
      />,
    );

    expect(html).toContain("Warung Milik Saya");
    expect(html).toContain(">Hapus<");
    expect(html).toContain("aria-expanded=\"false\"");
    expect(html).toContain("whitespace-nowrap");
  });

  it("uses an explicit confirmation and explains public removal", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../src/features/umkm-workspace/components/owned-merchant-list.tsx"),
      "utf8",
    );

    expect(source).toContain("Hapus {merchant.name} dari GETRA?");
    expect(source).toContain("tidak akan tampil lagi di peta dan pencarian");
    expect(source).toContain("Ya, Hapus Usaha");
    expect(source).toContain("Campaign aktif harus diselesaikan atau dibatalkan lebih dulu");
  });
});

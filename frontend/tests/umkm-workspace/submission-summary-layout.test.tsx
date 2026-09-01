import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SubmissionSummary } from "@/src/features/umkm-workspace/components/submission-summary";

describe("UMKM submission summary layout", () => {
  it("preserves a long merchant identity and keeps status separate from submission type", () => {
    const merchantName = "WARUNG DONAT KELUARGA BESAR CABANG STASIUN JABODETABEK";
    const html = renderToStaticMarkup(
      <SubmissionSummary
        claims={[]}
        submissions={[{
          id: "submission-layout-test",
          name: merchantName,
          category: "Makanan dan Minuman dengan Nama Kategori Panjang",
          status: "PENDING_REVIEW",
          address: "Jalan dengan alamat sangat panjang di dekat simpul transit utama Jabodetabek",
          created_at: "2026-08-30T10:00:00.000Z",
          updated_at: "2026-08-31T10:00:00.000Z",
        }]}
      />,
    );

    expect(html).toContain(merchantName);
    expect(html).toContain("Pendaftaran usaha baru");
    expect(html).toContain(">Menunggu Review<");
    expect(html).not.toContain("Pendaftaran Menunggu Review");
    expect(html).toContain("break-words");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("w-full");
  });
});

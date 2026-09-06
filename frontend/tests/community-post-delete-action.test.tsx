import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PostDeleteAction } from "@/src/features/community/components/post/post-delete-action";

describe("Community post delete action", () => {
  it("keeps an authorized owner's delete action directly visible", () => {
    const html = renderToStaticMarkup(<PostDeleteAction authorName="Pemilik" onDelete={vi.fn()} />);
    expect(html).toContain("title=\"Hapus postingan\"");
    expect(html).toContain(">Hapus</span>");
    expect(html).toContain("Hapus postingan?");
    expect(html).toContain("Postingan ini akan dihapus dari Community.");
  });

  it("names the author and moderation context for an admin delete", () => {
    const html = renderToStaticMarkup(<PostDeleteAction authorName="Rani" moderation onDelete={vi.fn()} />);
    expect(html).toContain("Hapus postingan sebagai admin?");
    expect(html).toContain("Postingan milik Rani akan dihapus dari Community.");
  });
});

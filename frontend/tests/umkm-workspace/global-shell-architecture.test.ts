import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

describe("GETRA global shell architecture", () => {
  it("keeps exactly General, Community, and UMKM in global navigation", () => {
    const header = readFileSync(resolve(root, "src/components/getra-ui/getra-global-header.tsx"), "utf8");
    expect(header).toMatch(/label: "General"/);
    expect(header).toMatch(/label: "Community"/);
    expect(header).toMatch(/label: "UMKM"/);
    expect(header).not.toMatch(/label: "Promosi"/);
    expect(header).not.toMatch(/label: "Profile"/);
  });

  it("uses one global header on General and the shared application shell", () => {
    const dashboard = readFileSync(resolve(root, "components/getra-dashboard.tsx"), "utf8");
    const shell = readFileSync(resolve(root, "src/components/getra-ui/getra-unified-app-shell.tsx"), "utf8");
    expect(dashboard).toMatch(/<GetraGlobalHeader/);
    expect(shell).toMatch(/<GetraGlobalHeader/);
    expect(shell).not.toMatch(/getra-app-rail/);
    expect(shell).toMatch(/Navigasi UMKM/);
  });

  it("keeps admin destinations conditional and outside global navigation", () => {
    const header = readFileSync(resolve(root, "src/components/getra-ui/getra-global-header.tsx"), "utf8");
    expect(header).toMatch(/const isAdmin/);
    expect(header).toMatch(/isAdmin \?/);
    expect(header).toMatch(/Review UMKM/);
  });

  it("uses bounded responsive map columns without a page-wide minimum width", () => {
    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    expect(css).toMatch(/grid-template-columns: clamp\(280px, 22vw, 330px\) minmax\(0, 1fr\) clamp\(300px, 23vw, 350px\)/);
    expect(css).not.toMatch(/min-width:\s*1920px/);
    expect(css).not.toMatch(/\.workspace\s*\{[^}]*transform:\s*scale\(/s);
  });
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const frontendRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("active journey map regression", () => {
  it("keeps the preview route until the live GPS route is available", () => {
    const dashboard = readFileSync(`${frontendRoot}components/getra-dashboard.tsx`, "utf8");
    expect(dashboard).toContain("journey.route ?? preview.route");
    expect(dashboard).toContain("journey.engaged && Boolean(journey.position)");
  });

  it("forces MapLibre to resize after the navigation layout settles", () => {
    const map = readFileSync(`${frontendRoot}components/getra-map.tsx`, "utf8");
    expect(map).toContain("map.triggerRepaint()");
    expect(map).toContain("window.setTimeout(resizeMap, 250)");
    expect(map).toContain("}, [journeyActive]);");
  });

  it("keeps the selected merchant popup compact", () => {
    const css = readFileSync(
      `${frontendRoot}src/features/global-search/commuter-sidebar.css`,
      "utf8",
    );
    expect(css).toContain("width: min(220px, calc(100vw - 42px))");
    expect(css).toContain("height: 82px");
  });

  it("places the active navigation map in the only visible grid column", () => {
    const css = readFileSync(
      `${frontendRoot}src/features/global-search/commuter-sidebar.css`,
      "utf8",
    );
    const activeOverride = css.lastIndexOf(
      '.workspace-grid[class*="activeWorkspace"] > .map-panel',
    );
    const defaultMapRule = css.lastIndexOf(
      ".workspace--figma.commuter-workspace .map-panel {",
      activeOverride,
    );
    expect(activeOverride).toBeGreaterThan(defaultMapRule);
    expect(css.slice(activeOverride, activeOverride + 180)).toContain(
      "grid-column: 1 / -1 !important",
    );
  });
});

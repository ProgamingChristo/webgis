import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeatureExplorerSection } from "../components/feature-explorer-section";
import { FEATURE_EXPLORER } from "../data/landing-content";

describe("FeatureExplorerSection", () => {
  it("renders every feature layer and default Smart Search content", () => {
    const html = renderToStaticMarkup(createElement(FeatureExplorerSection));

    FEATURE_EXPLORER.forEach((feature) => {
      expect(html).toContain(feature.label);
    });
    expect(html).toContain("Natural language diterjemahkan menjadi parameter.");
    expect(html).toContain("category=food");
    expect(html).toContain("max_walk=10");
  });
});

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchResultsDisclosure } from "@/src/features/global-search/components/search-results-disclosure";

const dashboard = readFileSync(new URL("../../components/getra-dashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../src/features/global-search/commuter-sidebar.css", import.meta.url), "utf8");

function render(expanded: boolean, count = "100 tempat dari 730 hasil") {
  const renderRows = vi.fn();
  function MerchantRows() {
    renderRows();
    return <button data-merchant-id="canonical-one">Toko Satu</button>;
  }
  const html = renderToStaticMarkup(
    <SearchResultsDisclosure
      title="Hasil pencarian"
      count={count}
      expanded={expanded}
      onExpandedChange={vi.fn()}
      controls={<select aria-label="Urutan hasil" defaultValue="NEAREST"><option value="NEAREST">Terdekat</option></select>}
    ><MerchantRows /></SearchResultsDisclosure>,
  );
  return { html, renderRows };
}

describe("commuter search result disclosure", () => {
  it("keeps the result count and sort visible without rendering collapsed rows", () => {
    const { html, renderRows } = render(false);
    expect(html).toContain("100 tempat dari 730 hasil");
    expect(html).toContain('aria-label="Urutan hasil"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('hidden=""');
    expect(html).not.toContain("Toko Satu");
    expect(renderRows).not.toHaveBeenCalled();
  });

  it("renders selectable canonical rows when expanded", () => {
    const { html, renderRows } = render(true);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-merchant-id="canonical-one"');
    expect(html).not.toContain('hidden=""');
    expect(renderRows).toHaveBeenCalledOnce();
  });

  it("preserves a user collapse when result counts update", () => {
    expect(render(false, "75 tempat ditemukan").html).toContain('aria-expanded="false"');
    expect(render(false, "0 tempat ditemukan").html).toContain("0 tempat ditemukan");
    expect(render(false, "Tempat belum dapat dimuat").html).toContain("Tempat belum dapat dimuat");
    // Only explicit submit and the disclosure button own expansion, never result updates.
    expect(dashboard.match(/setSearchResultsExpanded\(/g)).toHaveLength(1);
    expect(dashboard).toContain("if (query.trim()) setSearchResultsExpanded(true)");
    expect(dashboard).toContain("onExpandedChange={setSearchResultsExpanded}");
  });

  it("has native keyboard semantics, associated content, a focus ring and a touch target", () => {
    const { html } = render(false);
    expect(html).toMatch(/<button[^>]+type="button"[^>]+aria-expanded="false"/);
    const contentId = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(contentId).toBeTruthy();
    expect(html).toContain(`id="${contentId}" hidden=""`);
    expect(styles).toContain(".commuter-results-disclosure__toggle:focus-visible");
    expect(styles).toContain("min-height: 52px");
  });

  it("defaults collapsed and does not couple expansion to map, filters or selected detail", () => {
    expect(dashboard).toContain("[searchResultsExpanded, setSearchResultsExpanded] = useState(false)");
    const references = dashboard.split("\n").filter((line) => line.includes("searchResultsExpanded"));
    expect(references).toHaveLength(2);
    expect(dashboard).toContain(': primaryMode === "merchant" ? mapMerchants : []');
    expect(dashboard).toMatch(/onSelect=\{handleSelect\}/);
    const sectionStart = dashboard.indexOf("<SearchResultsDisclosure");
    const sectionEnd = dashboard.indexOf("</SearchResultsDisclosure>", sectionStart);
    const disclosureMarkup = dashboard.slice(sectionStart, sectionEnd);
    expect(disclosureMarkup).not.toContain("<GetraMap");
    expect(disclosureMarkup).not.toContain("<PlaceDetailDrawer");
    expect(disclosureMarkup).toContain("onSelect={handleSelect}");
    expect(disclosureMarkup).toContain("regionResultGroups.map");
    expect(disclosureMarkup).toContain("eligibleSponsoredMerchants.map");
  });
});

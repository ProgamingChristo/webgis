# GETRA Design System: Geo Spatial Console

## Design Direction

GETRA should feel like a focused geospatial operations console: dark, map-led, technically precise, and grounded in field evidence. The direction is inspired by GEO MAPID's WebGIS workspace while retaining GETRA's own brand, information model, and product hierarchy.

The visual language combines three references:

- GEO MAPID workspace: dark panels, luminous spatial layers, compact controls, and visible map tooling.
- Transit operations: strong hierarchy, directional color, live status, and immediate orientation.
- Field evidence: source notes, survey records, timestamps, validation marks, and visible limitations.

Charcoal and deep navy form the workspace shell. Cyan identifies spatial tools and navigation, lime identifies active or verified states, and yellow identifies selected routes or focused decisions.

Brand characteristics:

- Decisive, not corporate.
- Technical, not intimidating.
- Futuristic through geospatial function, not decorative sci-fi effects.
- Map-led, not card-led.
- AI-assisted, not chatbot-led.

## Product Principles

1. The map is the primary workspace and remains visible during search, comparison, and explanation.
2. Every important claim is traceable to a layer, survey record, source, time, or calculation.
3. GIS computes spatial facts. AI translates intent and explains pre-processed spatial results.
4. Field evidence is first-class product content, not secondary metadata.
5. Organic ranking, sponsored placement, and data-quality states never share the same treatment.
6. Dense information is acceptable when hierarchy and progressive disclosure remain clear.

## Visual Foundation

### Core Palette

The base uses charcoal, deep transit navy, cyan, and signal lime. It adapts the visual character of GEO MAPID without copying MAPID branding or logos.

```css
:root {
  --getra-canvas: #050a10;
  --getra-canvas-grid: rgba(64, 200, 224, 0.07);
  --getra-surface: #09131d;
  --getra-surface-raised: #0d1a27;
  --getra-surface-dark: #050b12;
  --getra-ink: #eef8fa;
  --getra-ink-soft: #8296a8;
  --getra-ink-inverse: #061018;
  --getra-line: rgba(129, 211, 230, 0.14);
  --getra-line-strong: rgba(34, 211, 238, 0.45);

  --getra-primary: #22d3ee;
  --getra-primary-hover: #67e8f9;
  --getra-primary-soft: rgba(34, 211, 238, 0.1);
  --getra-action: #9af24a;
  --getra-action-hover: #b5ff71;
  --getra-on-action: #061018;
  --getra-focus: #22d3ee;

  --getra-verified: #9af24a;
  --getra-warning: #f7c948;
  --getra-danger: #ff6577;
  --getra-info: #238af2;
  --getra-sponsored: #b06cec;
}
```

Usage rules:

- `primary` identifies GETRA navigation, map tools, spatial controls, and focus states.
- `action` is reserved for the next consequential action: run analysis, compare areas, or submit evidence.
- Action surfaces use `on-action` text; do not place white body text on the lime action color.
- `verified` means validated data or a passed state. It is not a decorative accent.
- `sponsored` appears only on paid placement and never on organic score elements.
- Dark surfaces are limited to the map command dock, high-emphasis evidence panels, and presentation mode.

### Map Layer Palette

Map colors remain stable across legends, charts, result rows, and detail panels.

```css
:root {
  --layer-transit: #22d3ee;
  --layer-walk-route: #f7c948;
  --layer-service-area: #9af24a;
  --layer-umkm: #9af24a;
  --layer-community: #f0b429;
  --layer-demand: #d94841;
  --layer-opportunity: #7a5af8;
  --layer-access-issue: #bf2c2c;
  --layer-property: #735c43;
  --layer-closure: #28384d;
}
```

Geometry rules:

- Transit points use circles with a white core and blue ring.
- UMKM points use rounded-square markers.
- Community observations use diamond markers.
- Access issues use triangles.
- Sponsored pins use the merchant shape plus a purple halo and explicit `Sponsor` label.
- Service areas use low-opacity fills with strong outlines; overlaps use patterns or dashed borders.
- Routes use solid lines for recommended paths and dashed lines for alternatives or scenarios.

Do not encode a critical distinction with color alone.

### Typography

Use fonts already bundled by the application:

- Interface and narrative: `var(--font-geist-sans)`.
- Coordinates, scores, timestamps, source IDs, and technical output: `var(--font-geist-mono)`.

| Role | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| Display | `40px / 44px` | 760 | Landing or presentation mode only |
| Page title | `28px / 34px` | 720 | Workspace title |
| Section | `20px / 26px` | 700 | Major panel section |
| Panel | `15px / 20px` | 700 | Repeated operational headings |
| Body | `14px / 21px` | 430 | Main copy |
| Compact | `12px / 17px` | 520 | Result metadata |
| Label | `11px / 14px` | 700 | Short labels, sentence case |
| Data | `24px / 26px` | 650 | Scores and primary metrics |

Rules:

- Use uppercase only for short map labels, state stamps, and layer abbreviations.
- Never use all-caps for paragraphs or AI explanations.
- Use tabular numbers in score comparisons.
- Indonesian is the default UI language. Keep established GIS terms such as `Service Area` and `Retail Gap` when translation would reduce clarity.

### Spacing, Borders, and Elevation

Spacing follows a 4px base: `4, 8, 12, 16, 24, 32, 48`.

- Compact controls: `32px` height.
- Standard controls: `40px` height.
- Primary actions: `44px` height.
- Panel padding: `16px` compact, `24px` standard.
- Workspace gutter: `12px` desktop, `8px` mobile.

Shape language:

- `2px` radius for stamps, source labels, and table cells.
- `6px` radius for buttons, inputs, and repeated result items.
- `12px` radius only for bottom sheets, floating map tools, and major overlays.
- Use `1px` borders as the default separator.
- Use shadows sparingly; a selected floating panel may use a crisp `4px 4px 0` navy shadow.

Avoid nested rounded cards. Prefer ruled sections, split panes, aligned rows, and pinned map overlays.

### Background Texture

The workspace may use a subtle cyan coordinate grid at 3-7% opacity. Neon glows are limited to selected geometry, active navigation, verified status, and focused actions.

## Workspace Architecture

### Default Desktop

Use a `360px / flexible / 340px` three-pane structure:

- Left: query, active constraints, result list, and layer shortcuts.
- Center: MAPID basemap, analysis geometry, scale, attribution, legend, and map tools.
- Right: selected-object evidence, score breakdown, source lineage, and limitations.

The map occupies at least 55% of usable desktop width. Side panes can collapse independently.

### AI Placement

AI appears as a compact command dock attached to the map, not as a full-height chat panel.

The dock has four states:

- Ready: one-line prompt and examples tied to the current stakeholder.
- Interpreting: extracted place, constraints, layer, and requested operation.
- Running GIS: the deterministic spatial operation currently executing.
- Explaining: answer with source chips and a limitation note.

The UI visually separates `GIS result` from `AI explanation`.

### Mobile

- The map remains the first view.
- Search opens as a top command sheet.
- Results and evidence use a two-snap bottom sheet at approximately 38% and 82% height.
- Layer controls open in a dedicated drawer with legend previews.
- The selected point, route, and current location remain visible while the sheet is partially open.

## Core Components

### Command Bar

Contains natural-language input, origin, walking-time limit, and run action. Parsed constraints appear below as removable tokens. Hard constraints use navy outlines; soft preferences use dotted teal outlines.

### Stakeholder Mode

Use a compact switch for `Komuter`, `UMKM`, `Investor`, and `Pemerintah`. Mode changes update task wording and default layers, not only color.

### Result Row

Use rows rather than large cards. Required content:

- Rank or `Sponsor` stamp.
- Name and category.
- Walking time and distance.
- Overall score with two strongest reasons.
- Data status and last update.

Selected rows receive a 4px teal leading rule. Sponsored rows receive a purple stamp but no artificial rank.

### Evidence Drawer

Every analytical result can open an evidence drawer containing:

- Source dataset and record identifier.
- Collection or update time.
- Survey photo or linked observation when available.
- Validation state.
- Spatial method and important parameters.
- Coverage and known limitations.

### Survey Evidence Card

Activity and Mission data have distinct labels:

- `Community Activity`: narrative and semi-structured field observation.
- `MAPID Mission`: structured record from Properti Go, Menu Go, or Struk Go.

Validation states:

- `Valid`: coordinate, evidence, attributes, account, and period pass checks.
- `Perlu perbaikan`: a correctable evidence or attribute issue exists.
- `Ditolak`: duplicate, fake GPS, invalid media, wrong object, privacy breach, or out-of-period record.

Use a bordered stamp and text label for every state. Do not use a green/red dot without wording.

### Data Provenance Chip

Format: `[source] · [status] · [time]`.

Examples:

- `Community Maps · valid · 14 Agu 2026`
- `Menu Go · surveyed · 2 jam lalu`
- `Demo GETRA · synthetic · scenario`

### Spatial Score

Score modules may include accessibility, route comfort, demand fit, retail gap, and competition pressure. Each score needs:

- Numeric value and scale.
- Method label.
- Strongest positive and negative driver.
- Source coverage.
- Calculation timestamp.

Do not use unexplained progress bars. A bar is acceptable only when the scale and direction are explicit.

### Map Legend

The legend is collapsed by default but always discoverable. Stable layer names:

- Transit.
- UMKM.
- Walking Route.
- Service Area.
- Community Evidence.
- Demand.
- Opportunity.
- Access Issue.
- Property.
- Scenario Closure.

### Empty, Loading, and Error States

- Empty states suggest a spatial action such as choosing a transit origin or widening walking time.
- Loading states name the phase: fetching source data, computing service area, ranking results, or generating explanation.
- Errors identify whether the failure is data, GIS processing, MAPID API, AI provider, or network related.
- If AI fails, deterministic map results remain usable and the UI exposes the fallback explanation.

## Interaction Rules

- Selecting a result focuses its map feature and opens its evidence summary.
- Selecting map geometry synchronizes the result list without resetting filters.
- Changing stakeholder mode preserves place and query but reinterprets ranking priorities.
- Hard constraints remove candidates; soft preferences reorder them.
- A Smart Alternative states exactly which constraint was relaxed.
- Layer changes triggered by AI appear as a reversible preview.
- Long GIS tasks expose progress and never freeze the map.
- MAPID attribution and map-service requirements remain visible.

## Motion

Motion should explain spatial change:

- Query execution: parsed constraints reveal in a 120-180ms sequence.
- Result selection: map camera and evidence drawer transition together within 250-400ms.
- Layer change: cross-fade, never flash.
- Scenario comparison: use a swipe divider or synchronized before/after views.

Respect reduced-motion settings. Do not use looping decorative animations in the workspace.

## Content Style

Voice is concise, specific, and evidence-aware.

Preferred:

- `8 menit berjalan dari Stasiun Blok M`
- `Dihitung dari jaringan pedestrian, bukan radius lurus`
- `12 observasi Community Maps mendukung temuan ini`
- `AI merangkum hasil GIS yang telah diproses`
- `Cakupan data: pilot koridor Dukuh Atas`

Avoid:

- `Pasti ramai`
- `Lokasi dijamin untung`
- `AI menemukan lokasi terbaik`
- `Data Jakarta lengkap` without proven coverage.

## Competition Alignment

The judging experience must expose:

- Actual MAPID basemap or data integration, with clear attribution.
- Survey evidence connected to the WebGIS problem and study area.
- Community Activity and optional Mission data according to their different structures.
- Spatial preprocessing before AI receives context.
- API keys kept on the backend, except the MAPID map-service identifier used according to organizer guidance.
- Explicit in-scope and out-of-scope boundaries.
- Measurable pass/fail criteria for primary workflows.
- A map experience that remains useful when AI is unavailable.

## Acceptance Checklist

- The map occupies at least 55% of the default desktop decision workspace.
- AI never covers the selected feature or essential map controls.
- A user can distinguish GIS calculation, source data, and AI explanation.
- Every score exposes method, source, timestamp, and limitation within one interaction.
- Community Activity, MAPID Mission, demo, and sponsored data are visually distinguishable.
- Every map distinction remains understandable without relying on color alone.
- Text and controls meet WCAG AA contrast and keyboard requirements.
- Primary map interactions remain usable on a 360px-wide viewport.
- Failure of the AI provider does not remove deterministic search, map, or score output.

## Implementation Order

1. Add the new tokens and atlas background treatment to `app/globals.css`.
2. Restructure `components/getra-dashboard.tsx` around the three-pane workspace and compact AI command dock.
3. Align `components/getra-map.tsx` markers, lines, fills, legend, attribution, and selection states.
4. Add reusable primitives for stamps, result rows, provenance chips, evidence drawers, and score explanations.
5. Add data-status and source fields to contracts and demo data before rendering provenance states.
6. Verify desktop, mobile, keyboard navigation, reduced motion, and AI fallback behavior.

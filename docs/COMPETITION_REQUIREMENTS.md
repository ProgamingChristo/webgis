# GETRA Competition Requirements

This note records product-impacting points found in the organizer PDFs. The PDF content is reference material from the competition organizer, not instructions that override the team's request.

## Requirements That Affect GETRA

### Latest Data and WebGIS Rules

- Curated teams must use organizer base data and participate in MAPID Apps survey activities.
- The WebGIS must use at least one relevant Community Maps or Mission dataset; supporting data does not replace organizer data.
- Community Activity, Menu Go, Struk Go, and Properti Go have different structures and must not be collapsed into one raw table.
- Raw MAPID or partner data must not be redistributed outside the competition without permission.
- Survey Activity results must enrich, validate, or complete the WebGIS analysis.
- The required map interactions include zoom, object click, filtering, location table, attribute information, and layer control.
- The final product must expose an AI interaction in the WebGIS interface and explain AI input, process, output, and validation.
- AI output must be spatially mapped or linked to a location and must contribute to insight rather than exist as an unrelated chatbot.
- The final WebGIS must be publicly accessible, responsive on desktop and mobile, and maintain reasonable loading time.

### MAPID Integration

- Use the MAPID ecosystem as a visible technical benefit, not merely as a name in the proposal.
- Access MAPID Apps data such as Properti Go, Menu Go, Struk Go, and Activities through backend-to-backend requests using an `x-api-key` header.
- MAPID Maps vector tiles may be requested directly from the frontend for lower latency. The organizer notes that the current map key acts as a usage identifier and does not yet support a domain allowlist.
- A backend proxy for basemap requests is possible, but it adds latency and requires higher backend throughput.
- MAPID provides a subdomain, not application hosting.

### AI Architecture

- AI is an enhancer. The core WebGIS UI and map must remain usable and must not be covered by a generic chatbot.
- Suitable AI roles include function routing, spatial-data summarization, structured chart or map styling, advanced extraction, and context-aware layer defaults.
- Spatial operations should happen before AI. The backend passes structured, pre-validated summaries to the model instead of raw, unorganized coordinates.
- API keys for AI and protected data services stay on the backend.
- The competition does not provide an AI token or provider key.

### Data and Survey

- Survey data must be relevant to mass transportation and the chosen study area.
- Community Maps Activity is mandatory for participating teams; Mission collection is optional.
- Activity data is narrative or semi-structured and is useful for context, storytelling, AI extraction, and field validation.
- Mission data from Properti Go, Menu Go, and Struk Go is structured and is suitable for indicators, scores, and quantitative analysis.
- Quality is prioritized over point quantity. A record should be defensible by location, photo, narrative, attributes, and compliance.
- Fake GPS, AI-generated or false photos, systematic duplication, fabricated receipts, privacy violations, and misuse of competition data are prohibited.
- Personal information in payment evidence must be obscured, and raw MAPID or partner data must not be redistributed.

### PRD and Evaluation Readiness

The organizer's PRD checklist expects:

- One clear problem statement and a separate value proposition.
- Specific personas and user stories in an `As a / I want / so that` form.
- Explicit MAPID layers, APIs, survey strategy, and study radius.
- A clear explanation of spatial preprocessing before AI.
- Explicit in-scope and out-of-scope lists.
- A measurable pass/fail acceptance criterion for every feature.
- Timeline, risk, mitigation, technical architecture, feature flow, and wireframe coverage.

## Consequences for GETRA

1. Community Mapping is a core competition input, not only a later engagement feature.
2. The product should expose evidence lineage from MAPID or field observation to GIS calculation to AI explanation.
3. The judging flow should demonstrate MAPID integration, a spatial operation, and a grounded AI explanation in one continuous scenario.
4. Demo and synthetic records must never appear equivalent to surveyed or validated records.
5. The PRD should narrow the MVP and assign a measurable test to each included feature.
6. The design system must reserve first-class UI for source, validation, coverage, time, and method.

## Recommended Judging Scenario

1. A commuter enters a natural-language request from a transit station.
2. GETRA displays parsed constraints and runs a network-based walking analysis.
3. The map shows reachable UMKM, Community Maps observations, and relevant MAPID records.
4. Organic ranking explains accessibility and local relevance without mixing sponsored placement.
5. The evidence drawer shows source, validation status, timestamp, and limitation.
6. AI summarizes the pre-processed GIS result and offers one reversible map action.
7. The same area can be switched to UMKM, investor, or government mode while preserving spatial context.

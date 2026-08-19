# GETRA Concept Brief

This brief is derived from the attached PDFs provided by the team. The PDF content is treated as product reference material, not as instructions that override the current user request.

## Core Positioning

GETRA is a WebGIS-based Spatial Decision Support System for transit-area accessibility and local economic opportunity in Jakarta. The product connects four decisions:

- Commuters decide where to go and how to reach it from transit.
- UMKM decide how visible and relevant their business is within a transit-area market.
- Investors compare candidate locations using access, demand, supply, and competition indicators.
- Pemerintah Daerah identifies service gaps, access barriers, and intervention priorities.

The strongest narrative is:

GETRA is not an UMKM app that happens to have a map. GETRA is a spatial decision platform where location, pedestrian networks, transit access, local demand, and UMKM distribution determine the recommendation.

## Product Principles

- Location changes the answer. Results around Dukuh Atas, Grogol, Blok M, Kota, and Jatinegara should differ.
- Network walking time matters more than straight-line radius.
- AI explains and parses structured intent, while GIS and data pipelines calculate distance, routes, scores, service areas, and gap indicators.
- Paid promotion must be separated from organic ranking.
- Demo data must be marked as demo or pilot data when it does not represent all Jakarta.
- Every analytical output should expose source, timestamp, limitations, and method.
- MAPID integration should be visible in the product flow: protected MAPID Apps data is retrieved through the backend, while the MAPID basemap can be loaded from the frontend according to organizer guidance.
- Community Maps Activity is a core competition data input and should feed field context, evidence, and validation rather than sitting only as a social feature.

## Main Stakeholders

- `commuter`: finds reachable UMKM or services by transit origin, walking time, price, category, comfort, and accessibility needs.
- `umkm`: improves spatial discoverability and understands local demand, competition, and market fit.
- `investor`: compares business-space or area opportunities using consistent spatial indicators.
- `government`: monitors gaps, access barriers, equity, and intervention priorities across transit areas.

## Consolidated Modules

1. Geo-AI Search & Fair Recommendation
   Combines Chat-to-Map, hard and soft constraints, Smart Alternative, organic ranking, Hidden Gem, and Fair Exposure.

2. Adaptive Pedestrian Access
   Combines service area, route, walking time, Comfort-Aware Route, Route Switch, avoid-segment behavior, and route comparison.

3. GETRA Community Mapping
   Combines commuter findings, cultural map, request board, accessibility contribution, confirmation, points, and trust score.

4. UMKM Spatial Discoverability
   Combines UMKM profile, profile completeness, visibility diagnosis, coordinate checks, entrance/access checks, and relevance to local search.

5. UMKM Spatial Intelligence
   Combines Demand Pulse, Retail Gap, Transit Area Profile, commuter requests, failed searches, and AI UMKM Copilot.

6. GETRA Spatial Promotion
   Combines Sponsored Pin, contextual promo banner, target area, campaign analytics, profile poster, and Midtrans as payment infrastructure.

7. Explore and Local Trails
   Combines Local Economic Trail, Cultural Trail, and Transit Micro-Tourism Loop.

8. Area Opportunity & Resilience
   Combines Opportunity Zone, vacancy/business-space map when data is available, Access Resilience, Scenario Closure, Time-Capsule, and Accessibility Need Map.

## MVP Priority

Priority 1:

- Geo-AI Search & Fair Recommendation.
- Adaptive Pedestrian Access.
- UMKM Spatial Discoverability.
- GETRA Community Mapping with Activity evidence, provenance, and validation state.
- Sponsored Pin separated from organic results.
- MAPID basemap and backend MAPID Apps integration.

Priority 2:

- Demand Pulse with pilot data.
- Simple Retail Gap.
- AI UMKM Copilot as explanation layer.
- Contextual Promo Banner.
- Basic analytics.
- Midtrans sandbox if payment setup is ready.

Roadmap:

- Full Explore Trails.
- Accessibility Need Map.
- Wide-scale Access Resilience.
- Transit Time-Capsule.
- Vacancy Map.
- Full digital twin.

## Data Model Direction

The PDFs reference these data sources:

- MAPID Menu Go: food/retail location, business type, menu, average price, buyer condition, photos, and fixed/mobile seller status.
- MAPID Struk Go: transaction activity, merchant category, time, payment method, receipt photo, and location.
- MAPID Properti Go: property category, sale/rent status, recording date, address, photos, and coordinates.
- Community Maps: user findings, reports, stories, and location-bound context.
- Open data: Jakarta transit ridership, food and beverage points, UMKM status, economic indicators, pedestrian infrastructure, and supporting administrative layers.
- Field survey: sidewalk quality, crossing condition, lighting, access barriers, walking time validation, business attributes, and commuter flow samples.

## Data Quality Rules

- Store source name, source record id, source update time, collection time, verification status, and limitations.
- Distinguish surveyed, verified, unverified, stale, and synthetic/demo records.
- Do not present survey samples as a census of all Jakarta.
- Keep personal commuter identity out of aggregate spatial analysis unless an explicit feature requires authenticated user history.
- Server-side code must protect API keys and sensitive data access.
- Keep `Community Activity` and `MAPID Mission` records distinct because their structure, collection rules, and analytical roles differ.
- Reject fake GPS, AI-generated or false survey photos, systematic duplicates, fabricated receipts, and privacy-violating evidence.
- Obscure personal information in payment evidence and do not redistribute raw MAPID or partner data.

## Product Boundaries

Strong WebGIS features:

- Smart Search from transit.
- Service Area.
- Pedestrian Routing.
- Route Switch and Comfort-Aware Route.
- Demand Pulse.
- Retail Gap.
- Request aggregation.
- Sponsored Pin targeting.
- Opportunity Zone.
- Access Resilience.
- Scenario Closure.
- Explore Trails.
- Accessibility Need Map.
- Time-Capsule.

Support features:

- Login.
- Account management.
- Profile forms.
- Photo storage.
- Poster generation.
- Midtrans.
- Notifications.
- Contribution points and badges.
- Admin moderation.

Support features are valid product requirements, but they should not be described as the main WebGIS innovation.

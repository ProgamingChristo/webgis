# GETRA GIS & Routing Reference

The foundational principle of GETRA spatial analysis is:
**GIS COMPUTES. AI INTERPRETS.**

This document details how PostGIS and pgRouting are utilized in the Phase 10 integration.

## Coordinate Reference System

- All geometries in PostgreSQL are stored in SRID `4326` (WGS 84).
- Metric distances internally rely on geography conversions or `ST_DistanceSphere`.
- All output GeoJSON relies on the standard `[longitude, latitude]` format.

## PostGIS Capabilities

The backend uses PostGIS for:
1. **Bounding Box Queries:** `ST_MakeEnvelope` and `ST_Contains` (or `ST_Intersects`) are used in the `/api/spatial/bbox` endpoint to find UMKM and Transport Nodes within viewport windows.
2. **Proximity Analysis:** `ST_DWithin` combined with geography casting enables high-performance nearest-neighbor lookups within a given radius (`/api/spatial/nearby`, `/api/transport/nearest`).
3. **Point-to-Point Distance:** Direct `haversine` or `ST_Distance` allows metric measurement between any arbitrary `[lng, lat]` pairs.

## pgRouting Capabilities

The pedestrian/walking network relies heavily on `pgRouting`:
1. **Graph Construction:** The `pedestrian_network_ways` table includes calculated cost columns (based on length/duration) and is processed via `pgr_createTopology` to populate `pedestrian_network_vertices`.
2. **Shortest Path Analysis:** `pgr_dijkstra` provides routing from origin to destination across the walking network.
3. **Snap-to-Network:** Arbitrary user coordinates are snapped to the nearest valid network edge using `ST_ClosestPoint` before routing begins.

## Accessibility Limitations

*FULL ACCESSIBILITY ROUTING: NOT AVAILABLE*
Currently, the pedestrian network does not factor in wheelchair access, slope gradient constraints, or temporary blockages in the standard Dijkstra cost model. This is tracked as a Future Feature backlog item.

## Troubleshooting

**No Route Found (`NO_ROUTE`)**: The routing API throws a `503 SPATIAL_NETWORK_NOT_READY` or a `404` if the origin/destination is too far from a valid `pedestrian_network_ways` edge.

**Invalid Coordinates**: The spatial validator intercepts badly formed coordinates (e.g. string values or out of bound latitudes) before hitting the GIS engine, returning `SPATIAL_INVALID_COORDINATE`.

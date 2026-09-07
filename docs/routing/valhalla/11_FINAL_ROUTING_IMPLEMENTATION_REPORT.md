# GETRA Valhalla Routing Infrastructure Report

Date: 2026-09-02 Asia/Jakarta

## Summary

Pedestrian routing infrastructure is operational locally through real Valhalla routes in Docker Compose. Direct Valhalla routes and authenticated GETRA normalized routing API routes returned geometry, distance, and duration.

The VPS HTTPS reverse proxy and external firewall checks remain not verified from this workstation.

## Final Status

- Commit SHA: `2cf252e8bfcedbff42a40de07d6227e34ca63499`
- VPS: not verified; current run used Windows Docker Desktop
- Docker: PASS
- Compose: PASS
- OSM source date: `Tue, 01 Sep 2026 02:53:00 GMT`
- PBF size: `178,468,668` bytes
- PBF SHA-256: `4CCA8B99D9BAB9C15DCC9EC6B1E67E8B5E3CF093BD936BC58B1B711B3F89D92E`
- Routing validation: PASS
- Valhalla container: HEALTHY
- Backend container: HEALTHY
- Internal DNS: PASS
- Direct pedestrian: PASS, 0.953 km, 673.124 seconds
- Direct motorcycle: PASS, 1.035 km, 149.947 seconds
- Direct auto: PASS, 8.706 km, 1044.961 seconds
- Cross-region motorcycle: PASS, 37.514 km, 4642.405 seconds
- Cross-region auto: PASS, 29.377 km, 2485.777 seconds
- Provider health: READY
- GETRA walking: PASS, 953 m, 673 seconds, LineString 25 coordinates
- GETRA motorcycle: PASS, 1035 m, 150 seconds, LineString 29 coordinates
- GETRA car: PASS, 8706 m, 1045 seconds, LineString 385 coordinates
- HTTPS API: NOT VERIFIED on VPS
- Public backend port: loopback-only locally; external VPS scan NOT VERIFIED
- Public Valhalla port: loopback-only locally; external VPS scan NOT VERIFIED
- Secrets exposed: NONE FOUND in tested API responses

## Quality Gates

- Backend typecheck: PASS
- Backend lint: PASS
- Focused routing/docker tests: PASS, 4 files / 24 tests
- Full backend tests: PASS, 136 files passed, 2 skipped; 865 tests passed, 3 skipped
- Backend production build: PASS
- Docker backend production build: PASS

## Files Changed

- `.dockerignore`: exclude nested build/runtime artifacts and routing source cache from Docker build context.
- `.gitignore`: ignore `routing-source-cache/`.
- `docs/routing/valhalla/*`: routing infrastructure evidence.

## Runtime Artifacts

- `routing-data/jabodetabek.osm.pbf`
- `routing-data/jabodetabek_tiles/`
- `routing-data/jabodetabek_tiles.tar`
- `routing-source-cache/java-latest.osm.pbf`

These are local/runtime artifacts and remain ignored.

## Routing Infrastructure

ROUTING INFRASTRUCTURE: PARTIAL

Reason: core Docker + Valhalla + GETRA backend routing is verified locally with live routes, but target VPS HTTPS reverse proxy and external firewall exposure were not verified from this machine.


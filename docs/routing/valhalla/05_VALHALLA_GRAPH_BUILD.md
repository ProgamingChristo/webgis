# GETRA Valhalla Routing - Graph Build

Date: 2026-09-02 Asia/Jakarta

## Graph Build Status

- Valhalla image: `ghcr.io/valhalla/valhalla-scripted:3.8.3`
- Pinned digest in Compose: present.
- Build input: `/custom_files/jabodetabek.osm.pbf`
- `VALHALLA_FORCE_REBUILD=True` was used once to rebuild after removing the full Java PBF from active routing data.
- Routine environment remains configured with `VALHALLA_FORCE_REBUILD=False`.

## Build Evidence

Valhalla log evidence:

- Routable ways: `742,505`
- Nodes contained in routable ways: `4,296,340`
- Graph edges: `1,443,275`
- Graph nodes: `1,172,398`
- Directed edge count: `2,886,550`
- Built tiles: `33`
- Tile build duration: `256s`
- Tile archive: `routing-data/jabodetabek_tiles.tar`
- Tile archive size: `249,180,160` bytes

## Health

- Valhalla container: healthy
- Host status endpoint: `http://127.0.0.1:8002/status`
- HTTP status: `200`
- Valhalla version: `3.8.3`
- `route` action: available


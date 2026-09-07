# GETRA Valhalla Routing - OSM Data Provenance

Date: 2026-09-02 Asia/Jakarta

## Source

- Source URL: `https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf`
- Redirected source file: `java-260831.osm.pbf`
- Last-Modified: `Tue, 01 Sep 2026 02:53:00 GMT`
- Source size: `896,222,332` bytes

## Extract

- BBOX: `106.30,-6.90,107.25,-5.85`
- Output: `routing-data/jabodetabek.osm.pbf`
- Format: PBF
- Compression: none
- Size: `178,468,668` bytes
- SHA-256: `4CCA8B99D9BAB9C15DCC9EC6B1E67E8B5E3CF093BD936BC58B1B711B3F89D92E`

## Validation

- `npm run routing:validate`: PASS
- Validation output: `Routing source ready: D:\Getra_Production\routing-data\jabodetabek.osm.pbf (178,468,668 bytes)`

## Notes

- Host `osmium` was unavailable, so extraction used a temporary Debian container with `osmium-tool`.
- The full Java PBF was moved outside active `routing-data` to avoid Valhalla building from two PBF extracts.
- Active Valhalla build used only `/custom_files/jabodetabek.osm.pbf`.


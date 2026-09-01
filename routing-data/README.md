# Jabodetabek routing graph data

Place `jabodetabek.osm.pbf` in this directory before starting Valhalla. Generated
tiles, configuration, databases, hashes, and archives remain ignored because they
are large runtime artifacts.

Run `npm run routing:prepare` from the repository root to download the current
Java OpenStreetMap extract and clip it to the documented Jabodetabek bounding box.
The script requires `osmium` on `PATH`.


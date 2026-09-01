import { stat } from "node:fs/promises";
import { resolve } from "node:path";

const graphSource = resolve(process.cwd(), "routing-data", "jabodetabek.osm.pbf");
const minimumBytes = 1_000_000;

try {
  const file = await stat(graphSource);
  if (!file.isFile() || file.size < minimumBytes) {
    throw new Error(`file is smaller than ${minimumBytes.toLocaleString("en-US")} bytes`);
  }
  console.log(`Routing source ready: ${graphSource} (${file.size.toLocaleString("en-US")} bytes)`);
} catch (error) {
  const reason = error instanceof Error ? error.message : "unknown error";
  console.error(`Routing source is not ready: ${graphSource} (${reason}).`);
  console.error("Run npm run routing:prepare before starting the routing stack.");
  process.exitCode = 1;
}

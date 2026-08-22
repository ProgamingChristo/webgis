import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 8081;

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/mock-activity")) {
    const fixturePath = path.join(__dirname, "../tests/fixtures/mapid/valid-response.fixture.json");
    const data = fs.readFileSync(fixturePath, "utf-8");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(data);
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(port, () => {
  console.log(`Mock MAPID API running on http://localhost:${port}`);
});

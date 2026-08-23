import fs from "node:fs";

process.loadEnvFile("backend/.env.local");

const apiBaseUrl = "http://localhost:8080";
const loginSource = fs.readFileSync("frontend/app/login/page.tsx", "utf8");
const email = /DEV_LOGIN_EMAIL\s*=\s*"([^"]+)"/.exec(loginSource)?.[1];
const password = process.env.GETRA_E2E_ADMIN_PASSWORD;

if (!email || !password || !process.env.GETRA_MAPID_OPEN_API_KEY) {
  throw new Error("Admin fixture or MAPID configuration is unavailable.");
}

async function request(path, init = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(`${path} failed: ${json.error?.code ?? response.status}`);
  }

  return json.data;
}

const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

if (login.profile?.account_role !== "ADMIN") {
  throw new Error("Fixture is not an ADMIN account.");
}

const authorization = `Bearer ${login.session.access_token}`;
const headers = {
  Authorization: authorization,
  "Content-Type": "application/json",
};

const mapidUrl = new URL("https://geoserver.mapid.io/layers_new/get_layer");
mapidUrl.searchParams.set("api_key", process.env.GETRA_MAPID_OPEN_API_KEY);
mapidUrl.searchParams.set("layer_id", "6a8a0c594da1860f1342c221");
mapidUrl.searchParams.set("project_id", "6a7dc2492456fcd172136867");

const jakartaBarat = JSON.parse(
  fs.readFileSync(
    "D:/downloadnew/BRAND COFFEE SHOP DI KOTA ADM JAKARTA BARAT 2026.geojson",
    "utf8",
  ),
);

const sources = [
  {
    layer_name: "Makanan dan Minuman Jakarta Pusat 2025",
    source_type: "PUBLIC_API_URL",
    url: mapidUrl.toString(),
  },
  {
    layer_name: "Brand Coffee Shop Jakarta Barat 2026",
    source_type: "JSON_PAYLOAD",
    payload: jakartaBarat,
  },
];

const committed = [];

for (const source of sources) {
  const preview = await request("/api/admin/map-import/preview", {
    method: "POST",
    headers,
    body: JSON.stringify(source),
  });
  const result = await request("/api/admin/map-import/commit", {
    method: "POST",
    headers,
    body: JSON.stringify({
      layer_name: preview.layer_name,
      source_type: preview.source_type,
      merchants: preview.merchants,
    }),
  });
  committed.push({
    layer: result.layer_name,
    features: result.total_features,
    regions: result.regions.map((region) => region.name),
    persisted: result.persisted,
  });
}

const persisted = await request("/api/map-import/layers", {
  headers: { Authorization: authorization },
});

console.log(
  JSON.stringify({
    adminRole: login.profile.account_role,
    committed,
    databaseReadback: {
      layers: persisted.total_layers,
      features: persisted.total_features,
      boundaries: persisted.layers.reduce(
        (total, layer) => total + (layer.boundaries?.features.length ?? 0),
        0,
      ),
    },
  }),
);

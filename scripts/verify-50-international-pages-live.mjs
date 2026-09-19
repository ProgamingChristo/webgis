process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE_URL = "https://getra-routing-api.tail0ed517.ts.net:8443";
const HEALTH_URL = "https://getra-routing-api.tail0ed517.ts.net/api/health";

const INTERNATIONAL_SLUGS = [
  "cctv", "traffic-congestion", "multimodal-transit", "air-quality", "urban-heat",
  "elevation-profile", "smart-parking", "ev-charging", "noise-pollution", "flood-monitoring",
  "solar-radiation", "emergency-evacuation", "micromobility", "gtfs-realtime", "walk-score",
  "tourist-audio-guide", "currency-tax-refund", "market-translator", "carbon-marketplace", "digital-twin-3d",
  "road-damage-ai", "drone-corridors", "port-logistics", "historical-map", "spatial-demographics",
  "public-wifi", "green-spaces", "cultural-heritage", "water-refill", "accessible-restrooms",
  "street-lighting", "incident-dispatch", "commuter-crowding", "weather-radar", "curbside-management",
  "waste-recycling", "pedestrian-bridges", "nightlife-zones", "street-performers", "freight-delivery",
  "airport-express", "pedestrian-flow-ai", "cross-border-tariffs", "medical-tourism", "satellite-ndvi",
  "wildlife-corridors", "sea-level-rise", "heritage-preservation", "global-embassy", "open-basemaps"
];

async function verify() {
  console.log("===============================================================");
  console.log("VERIFYING LIVE PUBLIC GETRA 50 INTERNATIONAL PAGES + PORTAL HUB");
  console.log("===============================================================");

  // 1. Backend Health
  try {
    const healthRes = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(10000) });
    const healthJson = await healthRes.json();
    console.log(`[BACKEND HEALTH] HTTP ${healthRes.status}:`, JSON.stringify(healthJson));
  } catch (err) {
    console.error("[BACKEND HEALTH ERROR]", err.message);
  }

  // 2. International Portal Hub
  try {
    const hubRes = await fetch(`${BASE_URL}/international`, { signal: AbortSignal.timeout(15000) });
    const hubText = await hubRes.text();
    console.log(`[PORTAL HUB] /international -> HTTP ${hubRes.status} (${hubText.length} bytes)`);
  } catch (err) {
    console.error("[PORTAL HUB ERROR]", err.message);
  }

  // 3. All 50 International Pages
  let passCount = 0;
  for (const slug of INTERNATIONAL_SLUGS) {
    const route = `/international/${slug}`;
    const url = `${BASE_URL}${route}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      const isSuccess = res.status === 200;
      const hasContent = text.length > 500;
      if (isSuccess && hasContent) {
        passCount++;
        console.log(`[PASS] ${route.padEnd(45)} -> HTTP ${res.status} (${text.length} bytes)`);
      } else {
        console.error(`[FAIL] ${route.padEnd(45)} -> HTTP ${res.status} (${text.length} bytes)`);
      }
    } catch (err) {
      console.error(`[FAIL] ${route.padEnd(45)} -> ${err.message}`);
    }
  }

  console.log("---------------------------------------------------------------");
  console.log(`Total 50 International Pages Verified: ${passCount} / ${INTERNATIONAL_SLUGS.length} PASS`);
  if (passCount === INTERNATIONAL_SLUGS.length) {
    console.log("RESULT: ALL 50 INTERNATIONAL FEATURES ARE SUCCESSFULLY LIVE ON PRODUCTION!");
  } else {
    process.exitCode = 1;
  }
}

verify();

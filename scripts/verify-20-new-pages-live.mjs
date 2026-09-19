process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE_URL = "https://getra-routing-api.tail0ed517.ts.net:8443";
const HEALTH_URL = "https://getra-routing-api.tail0ed517.ts.net/api/health";

const PAGES = [
  "/transit",
  "/accessibility",
  "/eco-walk",
  "/safety",
  "/directory",
  "/deals",
  "/culinary-trails",
  "/umkm/supplies",
  "/government/equity",
  "/government/infrastructure",
  "/government/closures",
  "/government/accessibility-audit",
  "/investor/foot-traffic",
  "/investor/tod-index",
  "/investor/market-gap",
  "/umkm/insights",
  "/quests",
  "/reports/new",
  "/transparency/status",
  "/developers/open-data",
];

async function check() {
  console.log("==================================================");
  console.log("VERIFYING LIVE PUBLIC GETRA SYSTEM & 20 NEW PAGES");
  console.log("==================================================");

  // 1. Backend Health
  try {
    const healthRes = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(10000) });
    const healthJson = await healthRes.json();
    console.log(`[BACKEND HEALTH] HTTP ${healthRes.status}:`, JSON.stringify(healthJson));
  } catch (err) {
    console.error(`[BACKEND HEALTH ERROR]`, err.message);
  }

  // 2. 20 New Pages
  let passCount = 0;
  for (const pagePath of PAGES) {
    const url = `${BASE_URL}${pagePath}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      const isSuccess = res.status === 200;
      const hasContent = text.length > 500;
      if (isSuccess && hasContent) {
        passCount++;
        console.log(`[PASS] ${pagePath.padEnd(35)} -> HTTP ${res.status} (${text.length} bytes)`);
      } else {
        console.error(`[FAIL] ${pagePath.padEnd(35)} -> HTTP ${res.status} (${text.length} bytes)`);
      }
    } catch (err) {
      console.error(`[FAIL] ${pagePath.padEnd(35)} -> ${err.message}`);
    }
  }

  console.log("--------------------------------------------------");
  console.log(`Total Verified: ${passCount} / ${PAGES.length} pages LIVE PASS`);
  if (passCount === PAGES.length) {
    console.log("RESULT: ALL 20 NEW PAGES SUCCESSFULLY VERIFIED ON PRODUCTION!");
  } else {
    process.exitCode = 1;
  }
}

check();

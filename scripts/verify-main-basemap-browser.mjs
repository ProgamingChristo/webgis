import puppeteer from "puppeteer-core";
import { ordinaryUserFixture } from "../frontend/tests/routing/browser-user-fixture.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.GETRA_QA_URL || "https://getra-routing-api.tail0ed517.ts.net:8443";
const journeyMode = process.env.GETRA_QA_JOURNEY === '1';
const output = journeyMode ? "outputs/international-audit/journey" : "outputs/international-audit/main-map";
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1440, height: 1000 } });
const report = { base, switches: [], errors: [] };
let page;
let gpsTimer;
try {
  page = await browser.newPage();
  if (journeyMode) { await browser.defaultBrowserContext().overridePermissions(base, ['geolocation']); await page.setGeolocation({ latitude: -6.21412, longitude: 106.68299, accuracy: 5 }); }
  page.on("pageerror", e => report.errors.push(e.message));
  const fixture = ordinaryUserFixture();
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('#email').fill(fixture.email);
  await page.locator('#password').fill(fixture.password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/app", { timeout: 45000 });
  await page.waitForFunction(() => window.__getraMapLibreInstance?.isStyleLoaded(), { timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  report.loginDefault = await page.evaluate(() => ({ stored: localStorage.getItem("getra:basemap:v2"), style: window.__getraMapLibreInstance.getStyle().name }));
  if (report.loginDefault.stored !== "mapid-default") throw new Error("Login did not reset to MAPID");
  // Route destination from a coordinate handoff; the actual route remains computed by GETRA GIS.
  await page.goto(`${base}/app?destination_lat=-6.218&destination_lon=106.687`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[aria-label="Latitude Asal"]', { timeout: 30000 }).catch(() => null);
  const originInput = await page.$('[aria-label="Latitude Asal"]');
  if (originInput) {
    await page.evaluate(() => { let e = document.querySelector('[aria-label="Latitude Asal"]'); while (e) { if (e.tagName === 'DETAILS') e.open = true; e = e.parentElement; } });
    await page.locator('[aria-label="Latitude Asal"]').fill('-6.21412');
    await page.locator('[aria-label="Longitude Asal"]').fill('106.68299');
    await page.click('[aria-label="Terapkan koordinat asal"]');
    await page.waitForFunction(() => window.__getraMapLibreInstance?.getSource('walking-route')?.serialize()?.data?.features?.length > 0, { timeout: 45000 });
  }
  await page.waitForFunction(() => window.__getraMapLibreInstance?.isStyleLoaded(), { timeout: 45000 });
  if (journeyMode) {
    const update = () => page.setGeolocation({ latitude: -6.21412, longitude: 106.68299, accuracy: 5 });
    await update(); gpsTimer = setInterval(() => { void update().catch(() => {}); }, 5000);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Mulai Perjalanan')).click());
    await page.waitForSelector('main[data-journey-open="true"]');
    await page.waitForFunction(() => window.__getraMapLibreInstance?.getSource('walking-route')?.serialize()?.data?.features?.length > 0, { timeout: 45000 });
  }
  if (!journeyMode) await page.waitForSelector('.maplibregl-marker button[aria-label^="Pilih "]');
  report.merchantSelected = !journeyMode && await page.evaluate(() => { document.querySelector('.maplibregl-marker button[aria-label^="Pilih "]').click(); return true; });
  if (report.merchantSelected) await page.waitForSelector('.maplibregl-popup-content');
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => { window.__qaMain = window.__getraMapLibreInstance; });
  const snapshot = () => page.evaluate(() => {
    const map = window.__getraMapLibreInstance, style = map.getStyle();
    return { same: map === window.__qaMain, center: map.getCenter().toArray(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(),
      sources: Object.entries(style.sources).filter(([,v]) => v.type === "geojson").map(([id,v]) => ({ id, count: typeof v.data === "object" ? v.data.features?.length : null })),
      routeGeometry: JSON.stringify(map.getSource('walking-route')?.serialize()?.data),
      merchantMarkers: document.querySelectorAll('.maplibregl-marker button[aria-label^="Pilih "]').length,
      journeyOpen: document.querySelector('main[data-journey-open]')?.dataset.journeyOpen,
      selectedPopup: document.querySelector('.maplibregl-popup-content')?.textContent ?? null, stored: localStorage.getItem('getra:basemap:v2'), style: style.name };
  });
  report.before = await snapshot();
  await page.evaluate(() => { const d = document.querySelector("details.planning-basemap, details.navigation-basemap"); if (d) d.open = true; });
  for (const [id,label] of [["osm","OpenStreetMap"],["esri-satellite","Esri Satellite"],["mapid-default","MAPID"]]) {
    await page.evaluate(label => { const b = [...document.querySelectorAll('.basemap-button')].find(b => label === 'MAPID' ? b.textContent.trim() === 'Reset ke MAPID' : b.querySelector('span')?.textContent.trim() === label); if (!b) throw new Error('Basemap button missing'); b.click(); }, label);
    await page.waitForFunction(id => window.__getraMapLibreInstance?.getContainer().dataset.basemapId === id && !document.querySelector('.map-basemap-state'), { timeout: 45000 }, id);
    const state = await snapshot();
    report.observed ??= []; report.observed.push({ id, ...state });
    // Background effects may register an additional empty source after capture.
    // Every existing overlay and the actual route geometry must still survive.
    const lostOverlay = report.before.sources.some(before => !state.sources.some(after => after.id === before.id && after.count === before.count));
    if (!state.same || lostOverlay || state.routeGeometry !== report.before.routeGeometry) throw new Error(`Application overlays lost during ${id}`);
    if (state.merchantMarkers !== report.before.merchantMarkers || state.selectedPopup !== report.before.selectedPopup) throw new Error(`Merchant selection lost during ${id}`);
    if (state.journeyOpen !== report.before.journeyOpen || journeyMode && state.journeyOpen !== 'true') throw new Error(`Journey state lost during ${id}`);
    if (Math.abs(state.zoom - report.before.zoom) > 0.01 || state.center.some((v,i) => Math.abs(v-report.before.center[i]) > 0.00001)) throw new Error(`Camera changed during ${id}`);
    report.switches.push({ id, ...state });
    await page.screenshot({ path: `${output}/${id}.png`, fullPage: true });
  }
  if (!journeyMode) {
    await page.evaluate(() => [...document.querySelectorAll('.basemap-button')].find(b => b.querySelector('span')?.textContent.trim() === 'OpenStreetMap').click());
    await page.waitForFunction(() => localStorage.getItem('getra:basemap:v2') === 'osm');
    await page.click('.account-menu__trigger'); await page.click('.account-menu__logout');
    await page.waitForFunction(() => localStorage.getItem('getra:basemap:v2') === 'mapid-default');
    report.logoutResets = true;
  }
  report.passed = true;
} catch (error) { report.failure = error.message; if (page) { await page.screenshot({ path: `${output}/failure.png`, fullPage: true }); report.page = await page.evaluate(() => ({ url: location.href, text: document.body.innerText.slice(-7000) })); } process.exitCode = 1; }
finally { clearInterval(gpsTimer); await writeFile(`${output}/report.json`, JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2)); await browser.close(); }

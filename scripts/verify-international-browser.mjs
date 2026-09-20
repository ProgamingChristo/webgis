import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.GETRA_QA_URL || "https://getra-routing-api.tail0ed517.ts.net:8443";
const output = process.env.GETRA_QA_OUTPUT || "outputs/international-audit/browser";
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1440, height: 1000 } });
const report = { base, started: new Date().toISOString(), switches: [], responsive: [], errors: [] };
try {
  const page = await browser.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  await page.goto(`${base}/international/weather`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('[data-basemap-status]')?.textContent === "READY", { timeout: 45000 });
  await page.click('form button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes("1 hasil spasial"), { timeout: 45000 });
  await page.waitForFunction(() => window.__getraGlobalMap?.getStyle().sources["getra-international"]?.data?.features?.length === 1, { timeout: 20000 });
  await page.evaluate(() => { window.__qaMap = window.__getraGlobalMap; window.__qaMap.jumpTo({ center: window.__qaMap.getStyle().sources["getra-international"].data.features[0].geometry.coordinates, zoom: 13, bearing: 12, pitch: 20 }); document.querySelector('details[class*="basemaps"]').open = true; });
  const providers = await page.evaluate(() => fetch("/api/basemap/status").then(r => r.json()));
  report.providerAvailability = providers;
  for (const id of ["osm", "carto-light", "carto-dark", "esri-satellite", "mapid-default", "osm", "mapid-default"]) {
    await page.click(`[data-basemap="${id}"]`);
    if (providers[id] === "AUTH_REQUIRED") {
      await page.waitForFunction(() => document.querySelector("[role=alert]")?.textContent.includes("Basemap gagal") && window.__getraGlobalMap.getContainer().dataset.basemapId === "mapid-default" && document.querySelector("[data-basemap-status]").textContent === "READY", { timeout: 45000 });
      report.switches.push({id, status: "AUTH_REQUIRED", fallback: "mapid-default", unavailable: true});
      continue;
    }
    await page.waitForFunction(id => document.querySelector('[data-basemap-status]')?.textContent === "READY" && window.__getraGlobalMap?.getContainer().dataset.basemapId === id, { timeout: 45000 }, id);
    await page.waitForFunction(() => window.__getraGlobalMap.queryRenderedFeatures({ layers: ["getra-international-points"] }).length > 0, { timeout: 15000 });
    const state = await page.evaluate(() => {
      const map = window.__getraGlobalMap, style = map.getStyle(), source = style.sources['getra-international'];
      return { sameInstance: map === window.__qaMap, center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), style: style.name, sources: Object.keys(style.sources), overlayCount: source?.data?.features?.length, visiblePoints: map.queryRenderedFeatures({ layers: ['getra-international-points'] }).length, attribution: document.querySelector('.maplibregl-ctrl-attrib')?.textContent };
    });
    if (!state.sameInstance || state.overlayCount !== 1 || Math.abs(state.zoom - 13) > 0.01 || Math.abs(state.bearing - 12) > 0.01 || !state.visiblePoints) throw new Error(`Basemap acceptance failed: ${id} ${JSON.stringify(state)}`);
    report.switches.push({ id, ...state });
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({ path: `${output}/${report.switches.length}-${id}.png`, fullPage: true });
  }
  await page.click('[data-basemap="esri-satellite"]');
  await page.waitForFunction(() => document.querySelector('[data-basemap-status]')?.textContent === "READY" && window.__getraGlobalMap.getContainer().dataset.basemapId === "esri-satellite", { timeout: 45000 });
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForFunction(() => window.__getraGlobalMap?.getContainer().dataset.basemapId === "esri-satellite", { timeout: 45000 });
  report.reloadPersists = true;
  for (const [name, width, height] of [["mobile",390,844],["tablet",820,1180],["desktop",1440,1000]]) {
    await page.setViewport({ width, height });
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await new Promise(resolve => setTimeout(resolve, 350));
    const state = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, canvas: window.__getraGlobalMap?.getCanvas().width }));
    report.responsive.push({ name, ...state });
    if (state.scrollWidth > width + 1) throw new Error(`${name}: horizontal overflow`);
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    if (name === 'mobile') {
      await page.click('button[class*="mobileBasemap"]');
      const sheet = await page.evaluate(() => { const element = document.querySelector('details[class*="basemaps"]'); return { open: element.open, position: getComputedStyle(element).position, bottom: element.getBoundingClientRect().bottom, viewport: innerHeight }; });
      if (!sheet.open || sheet.position !== 'fixed' || Math.abs(sheet.bottom-sheet.viewport)>2) throw new Error('Mobile basemap sheet is not anchored to viewport');
      report.mobileSheet = sheet; await page.screenshot({ path: `${output}/mobile-basemap-sheet.png`, fullPage: false });
      await page.evaluate(() => { document.querySelector('details[class*="basemaps"]').open = false; });
    }
  }
  const routes = ["weather","earthquakes","active-fire","air-quality","places","elevation","timezone","poi","accessibility","water-refill","bikeshare","micromobility","ev-charging","transit-stops","jakarta-transit","flood","disaster","weather-radar","weather-satellite","open-data"];
  report.routes = [];
  for (const route of routes) {
    const response = await fetch(`${base}/international/${route}`);
    report.routes.push({ route, status: response.status });
    if (response.status !== 200) throw new Error(`Route ${route}: HTTP ${response.status}`);
  }
  await page.goto(`${base}/international/open-data`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => [...document.querySelectorAll('label')].some(l => l.textContent.startsWith('Dataset')));
  await page.evaluate(() => { [...document.querySelectorAll('label')].find(l => l.textContent.startsWith('Dataset')).querySelector('select').id = 'qa-dataset'; });
  await page.select('#qa-dataset', 'poi');
  await page.evaluate(() => { [...document.querySelectorAll('label')].find(l => l.textContent.startsWith('Fasilitas')).querySelector('select').id = 'qa-category'; });
  await page.select('#qa-category', 'pharmacy');
  const requested = page.waitForRequest(request => request.url().includes('/api/international/open-data?'));
  await page.click('form button[type="submit"]');
  report.openDataFilter = Object.fromEntries(new URL((await requested).url()).searchParams);
  if (report.openDataFilter.source !== 'poi' || report.openDataFilter.category !== 'pharmacy') throw new Error('Open Data filter not applied to actual API query');
  report.passed = true;
} catch (error) { report.failure = error.message; process.exitCode = 1; }
finally { await writeFile(`${output}/report.json`, JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2)); await browser.close(); }

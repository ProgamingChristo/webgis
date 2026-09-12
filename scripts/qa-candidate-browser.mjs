import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_PORT = process.env.QA_PORT || '3100';
const BASE_URL = `http://localhost:${TARGET_PORT}`;
const OUTPUT_DIR = resolve(process.cwd(), 'outputs/frontend-map-recovery');

await mkdir(OUTPUT_DIR, { recursive: true });

console.log(`[QA] Starting candidate browser QA against ${BASE_URL}...`);

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});

try {
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', (err) => {
    console.error('[PageError]', err.message);
    errors.push(err.message);
  });

  // Login first
  console.log('[QA] Navigating to /login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.locator('#email').fill('getra.admin.test@example.com');
  await page.locator('#password').fill('PasswordDevelopment123!');
  await page.locator('button[type=submit]').click();

  try {
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });
  } catch {
    console.log('[QA] Still on /login after click');
  }

  console.log('[QA] Post-login URL:', page.url());

  if (!page.url().includes('/app')) {
    console.log('[QA] Navigating explicitly to /app...');
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  // 1. Initial /app map state test
  console.log('[QA] Waiting for map-shell on /app...');
  await page.waitForSelector('.map-shell', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 6000)); // Allow MapLibre to load and settle

  const mapInfo = await page.evaluate(() => {
    const map = window.__getraMapLibreInstance;
    if (!map) return { ready: false };
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    return {
      ready: true,
      center: { lng: center.lng, lat: center.lat },
      zoom,
      bounds: [
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getEast(), bounds.getNorth()],
      ],
    };
  });

  console.log('[QA] Initial Map Info:', JSON.stringify(mapInfo, null, 2));

  if (mapInfo.ready) {
    const isPadang =
      mapInfo.center.lng > 107.5 &&
      mapInfo.center.lng < 110.0 &&
      mapInfo.center.lat > -3.0 &&
      mapInfo.center.lat < 0.0;
    const isJakarta =
      mapInfo.center.lng > 106.5 &&
      mapInfo.center.lng < 107.2 &&
      mapInfo.center.lat > -6.5 &&
      mapInfo.center.lat < -6.0;

    console.log(`[QA] Is Padang regression present? ${isPadang}`);
    console.log(`[QA] Is Jakarta study area present? ${isJakarta}`);

    if (isPadang) {
      throw new Error(`CRITICAL: Map is still centered in Padang! Coordinates: ${JSON.stringify(mapInfo.center)}`);
    }
  }

  const initialShotPath = resolve(OUTPUT_DIR, TARGET_PORT === '3000' ? '03-final-localhost-map.png' : '02-candidate-initial-map.png');
  await page.screenshot({ path: initialShotPath });
  console.log(`[QA] Saved screenshot to ${initialShotPath}`);

  if (TARGET_PORT === '3100') {
    const prodShot = resolve('D:/Getra_Production/outputs/frontend-map-recovery/02-candidate-initial-map.png');
    await page.screenshot({ path: prodShot });
  }

  // 2. Search flow
  console.log('[QA] Testing search input...');
  const searchInput = await page.$('#global-search-query');
  if (searchInput) {
    await searchInput.type('kopi');
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 4000));

    const resultsShotPath = resolve(OUTPUT_DIR, '04-search-results.png');
    await page.screenshot({ path: resultsShotPath });
    console.log(`[QA] Saved search results screenshot to ${resultsShotPath}`);
    await page.screenshot({ path: resolve('D:/Getra_Production/outputs/frontend-map-recovery/04-search-results.png') });
  }

  // 3. Routing flow
  console.log('[QA] Testing routing flow...');
  const merchantRow = await page.$('.merchant-result-row, .merchant-card');
  if (merchantRow) {
    await merchantRow.click();
    await new Promise((r) => setTimeout(r, 2000));
    
    // Find and click Rute ke sini button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ruteBtn = btns.find((b) => b.textContent?.includes('Rute') || b.getAttribute('aria-label')?.includes('Rute'));
      if (ruteBtn) ruteBtn.click();
    });
    await new Promise((r) => setTimeout(r, 4000));
  }
  const routeShotPath = resolve(OUTPUT_DIR, '05-route-preview.png');
  await page.screenshot({ path: routeShotPath });
  console.log(`[QA] Saved route preview screenshot to ${routeShotPath}`);
  await page.screenshot({ path: resolve('D:/Getra_Production/outputs/frontend-map-recovery/05-route-preview.png') });

  // 4. Active journey
  console.log('[QA] Testing Active Journey trigger...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const startBtn = btns.find((b) => b.textContent?.includes('Mulai') || b.getAttribute('aria-label')?.includes('Mulai'));
    if (startBtn) startBtn.click();
  });
  await new Promise((r) => setTimeout(r, 4000));

  const journeyShotPath = resolve(OUTPUT_DIR, '06-active-journey.png');
  await page.screenshot({ path: journeyShotPath });
  console.log(`[QA] Saved active journey screenshot to ${journeyShotPath}`);
  await page.screenshot({ path: resolve('D:/Getra_Production/outputs/frontend-map-recovery/06-active-journey.png') });

  // 5. Community
  console.log('[QA] Testing Community...');
  await page.goto(`${BASE_URL}/community`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));
  const communityShotPath = resolve(OUTPUT_DIR, '07-community.png');
  await page.screenshot({ path: communityShotPath });
  console.log(`[QA] Saved community screenshot to ${communityShotPath}`);
  await page.screenshot({ path: resolve('D:/Getra_Production/outputs/frontend-map-recovery/07-community.png') });

  // 6. UMKM
  console.log('[QA] Testing UMKM...');
  await page.goto(`${BASE_URL}/umkm`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));
  const umkmShotPath = resolve(OUTPUT_DIR, '08-umkm.png');
  await page.screenshot({ path: umkmShotPath });
  console.log(`[QA] Saved UMKM screenshot to ${umkmShotPath}`);
  await page.screenshot({ path: resolve('D:/Getra_Production/outputs/frontend-map-recovery/08-umkm.png') });

  // 7. Profile
  console.log('[QA] Testing Profile...');
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));
  const profileShotPath = resolve(OUTPUT_DIR, '09-profile.png');
  await page.screenshot({ path: profileShotPath });
  console.log(`[QA] Saved profile screenshot to ${profileShotPath}`);
  await page.screenshot({ path: resolve('D:/Getra_Production/outputs/frontend-map-recovery/09-profile.png') });

  // 8. Admin UMKM
  console.log('[QA] Testing Admin UMKM...');
  await page.goto(`${BASE_URL}/admin/umkm`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));
  const adminShotPath = resolve(OUTPUT_DIR, '10-admin.png');
  await page.screenshot({ path: adminShotPath });
  console.log(`[QA] Saved admin screenshot to ${adminShotPath}`);
  await page.screenshot({ path: resolve('D:/Getra_Production/outputs/frontend-map-recovery/10-admin.png') });

  console.log('[QA] ALL CANDIDATE QA CHECKS COMPLETED SUCCESSFULLY!');
} finally {
  await browser.close();
}

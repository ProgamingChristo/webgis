import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { approvedAccountFixture } from '../frontend/tests/routing/browser-user-fixture.mjs';

const base = process.env.GETRA_QA_ORIGIN || 'http://localhost:3100';
const output = resolve('outputs/final-ui-consistency');
mkdirSync(output, { recursive: true });
const phase = process.argv[2] || 'final';
const evidence = { phase, origin: base, started: new Date().toISOString(), screens: [], errors: [], failures: [] };

let fixtures = null;
if (existsSync('secrets/final-ui-fixtures.json')) {
  try {
    fixtures = JSON.parse(readFileSync('secrets/final-ui-fixtures.json', 'utf8'));
  } catch (e) {
    console.warn('Could not parse fixtures:', e.message);
  }
}

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  defaultViewport: { width: 1440, height: 960 },
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function captureScreen(page, path, name) {
  await page.goto(base + path, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));
  const screen = await page.evaluate(() => ({
    path: location.pathname,
    title: document.title,
    text: document.body.innerText.slice(0, 6000),
    overflow: document.documentElement.scrollWidth > innerWidth,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    shellBackground: getComputedStyle(document.querySelector('main') || document.body).backgroundColor,
  }));
  evidence.screens.push({ requested: path, name, ...screen });
  const screenPath = resolve(output, `${name}.png`);
  await page.screenshot({ path: screenPath, fullPage: true });
  console.log(JSON.stringify({ name, route: screen.path, overflow: screen.overflow, title: screen.title }));
}

function attachListeners(page) {
  page.on('pageerror', error => {
    console.error(`[PAGEERROR] [${page.url()}] ${error.message}`);
    evidence.errors.push({ route: page.url(), message: error.message });
  });
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/api/')) {
      evidence.failures.push({ route: page.url(), url: response.url().split('?')[0], status: response.status() });
    }
  });
}

try {
  // 1. Public screens
  const publicPage = await browser.newPage();
  attachListeners(publicPage);
  await captureScreen(publicPage, '/', '01-landing');
  await captureScreen(publicPage, '/login', 'login');
  await publicPage.close();

  // 2. Owner context (view pending submission detail)
  if (fixtures && fixtures.users && fixtures.users.length > 0) {
    const ownerUser = fixtures.users[0];
    const pendingSub = fixtures.submissions?.find(s => s.purpose === 'pending') || fixtures.submissions?.[0];
    
    const ownerContext = await browser.createBrowserContext();
    const ownerPage = await ownerContext.newPage();
    attachListeners(ownerPage);

    await ownerPage.goto(base + '/login', { waitUntil: 'networkidle2' });
    await ownerPage.locator('#email').fill(ownerUser.email);
    await ownerPage.locator('#password').fill(ownerUser.password);
    await ownerPage.locator('button[type=submit]').click();
    await ownerPage.waitForFunction(() => location.pathname !== '/login', { timeout: 15000 });

    if (pendingSub) {
      await ownerPage.goto(base + `/umkm/submissions/${pendingSub.id}`, { waitUntil: 'networkidle2', timeout: 60000 });
      await ownerPage.waitForSelector('[data-testid="merchant-submission-detail-container"]', { timeout: 15000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await captureScreen(ownerPage, `/umkm/submissions/${pendingSub.id}`, '12-umkm-pending');
    }

    await ownerPage.close();
    await ownerContext.close();
  }

  // 3. Admin context
  const adminContext = await browser.createBrowserContext();
  const adminPage = await adminContext.newPage();
  attachListeners(adminPage);

  await adminPage.goto(base + '/login', { waitUntil: 'networkidle2' });
  const admin = approvedAccountFixture('ADMIN');
  await adminPage.locator('#email').fill(admin.email);
  await adminPage.locator('#password').fill(admin.password);
  await adminPage.locator('button[type=submit]').click();
  await adminPage.waitForFunction(() => location.pathname !== '/login', { timeout: 15000 });

  // Admin routes
  await captureScreen(adminPage, '/admin/umkm', '16-admin-queue');
  await captureScreen(adminPage, '/admin/mission-data', '19-admin-data-lapangan');
  await captureScreen(adminPage, '/admin/import', '20-admin-import');
  await captureScreen(adminPage, '/admin/community/contributions', '21-admin-moderation');

  // Authenticated operational routes
  await captureScreen(adminPage, '/settings/profile', '15-profile');
  await captureScreen(adminPage, '/community', '08-community');
  await captureScreen(adminPage, '/umkm', '13-umkm-owner');
  await captureScreen(adminPage, '/umkm/advertising', '14-promotion');
  await captureScreen(adminPage, '/users', 'users');

  // App route with search results disclosure test
  await adminPage.goto(base + '/app', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  const searchInput = await adminPage.$('#global-search-query');
  if (searchInput) {
    await searchInput.type('kopi', { delay: 50 });
    await searchInput.press('Enter');
    await adminPage.waitForSelector('.commuter-results-disclosure__toggle', { timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  }

  await captureScreen(adminPage, '/app', '02-app-collapsed-results');

  // If search disclosure toggle exists, click to expand
  const toggleButton = await adminPage.$('.commuter-results-disclosure__toggle');
  if (toggleButton) {
    await toggleButton.click();
    await new Promise(r => setTimeout(r, 1000));
    await adminPage.screenshot({ path: resolve(output, '03-app-expanded-results.png'), fullPage: true });
    console.log(JSON.stringify({ name: '03-app-expanded-results', action: 'toggle clicked' }));
  }

  await adminPage.close();
  await adminContext.close();

} finally {
  writeFileSync(resolve(output, `${phase}-browser-audit.json`), JSON.stringify(evidence, null, 2));
  await browser.close();
}

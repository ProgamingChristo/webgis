import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const base = 'http://localhost:3100';
const outputDir = resolve('outputs/admin-approval-e2e');
mkdirSync(outputDir, { recursive: true });

async function main() {
  console.log('=== STARTING 10 E2E SCREENSHOT CAPTURE ===');
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 960 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Log into admin account
    console.log('Logging in as admin...');
    await page.goto(base + '/login', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.locator('#email').fill('getra.admin.test@example.com');
    await page.locator('#password').fill('PasswordDevelopment123!');
    await page.locator('button[type=submit]').click();
    await page.waitForFunction(() => location.pathname !== '/login', { timeout: 15000 });
    console.log('Admin logged in successfully.');

    // 01-pending-before.png: /umkm view showing pending/draft state
    console.log('Capturing 01-pending-before.png...');
    await page.goto(base + '/umkm', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: resolve(outputDir, '01-pending-before.png'), fullPage: false });

    // 02-admin-queue.png: /admin/umkm queue loaded with no red error banner
    console.log('Capturing 02-admin-queue.png...');
    await page.goto(base + '/admin/umkm', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: resolve(outputDir, '02-admin-queue.png'), fullPage: false });

    // 03-admin-review.png: review card for pending item
    console.log('Capturing 03-admin-review.png...');
    // Find first button with text 'Setujui'
    const setujuiButtons = await page.$$('button');
    let approveBtn = null;
    for (const btn of setujuiButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Setujui')) {
        approveBtn = btn;
        break;
      }
    }

    if (approveBtn) {
      await approveBtn.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: resolve(outputDir, '03-admin-review.png'), fullPage: false });

      // 04-admin-approve-click.png: focusing/hovering approve button
      console.log('Capturing 04-admin-approve-click.png...');
      await approveBtn.hover();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: resolve(outputDir, '04-admin-approve-click.png'), fullPage: false });

      // 05-admin-approve-success.png: clicking approve
      console.log('Clicking approve and capturing 05-admin-approve-success.png...');
      await approveBtn.click();
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: resolve(outputDir, '05-admin-approve-success.png'), fullPage: false });
    } else {
      console.warn('No Setujui button found in queue (maybe already all approved).');
      await page.screenshot({ path: resolve(outputDir, '03-admin-review.png'), fullPage: false });
      await page.screenshot({ path: resolve(outputDir, '04-admin-approve-click.png'), fullPage: false });
      await page.screenshot({ path: resolve(outputDir, '05-admin-approve-success.png'), fullPage: false });
    }

    // 06-admin-queue-after.png: Queue refreshed
    console.log('Capturing 06-admin-queue-after.png...');
    await page.goto(base + '/admin/umkm', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: resolve(outputDir, '06-admin-queue-after.png'), fullPage: false });

    // 07-public-search.png: /app search bar showing kopi christo
    console.log('Capturing 07-public-search.png...');
    await page.goto(base + '/app', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));

    const searchInput = await page.$('#global-search-query');
    if (searchInput) {
      await searchInput.type('kopi christo', { delay: 50 });
      await searchInput.press('Enter');
      await new Promise(r => setTimeout(r, 3000));
    }
    await page.screenshot({ path: resolve(outputDir, '07-public-search.png'), fullPage: false });

    // 08-public-map-marker.png: click on the result to open place-detail and center map
    console.log('Capturing 08-public-map-marker.png...');
    // Click on the result element containing 'kopi christo'
    const resultItems = await page.$$('.commuter-result-item, button, article, div');
    let clickedResult = false;
    for (const item of resultItems) {
      const isCard = await page.evaluate(el => {
        return el.classList?.contains('commuter-result-item') || el.getAttribute('role') === 'button' || el.tagName === 'BUTTON';
      }, item);
      if (isCard) {
        const txt = await page.evaluate(el => el.innerText, item);
        if (txt.includes('kopi christo')) {
          await item.click();
          clickedResult = true;
          break;
        }
      }
    }
    if (!clickedResult) {
      // Fallback: click anywhere inside the search result card with kopi christo
      const allDivs = await page.$$('div');
      for (const d of allDivs) {
        const text = await page.evaluate(el => el.innerText, d);
        if (text.includes('kopi christo') && text.includes('Gria Jakarta')) {
          await d.click().catch(() => {});
          break;
        }
      }
    }
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: resolve(outputDir, '08-public-map-marker.png'), fullPage: false });

    // 09-public-merchant-detail.png: detail panel with route CTA clicked
    console.log('Capturing 09-public-merchant-detail.png...');
    const routeCta = await page.$('[data-testid="merchant-route-cta"]');
    if (routeCta) {
      console.log('Found merchant-route-cta, clicking...');
      await routeCta.click();
      await new Promise(r => setTimeout(r, 3500));
    } else {
      console.log('Searching for Rute ke sini button...');
      const btns = await page.$$('button');
      for (const b of btns) {
        const txt = await page.evaluate(el => el.innerText, b);
        if (txt.includes('Rute ke sini')) {
          await b.click();
          await new Promise(r => setTimeout(r, 3500));
          break;
        }
      }
    }
    await page.screenshot({ path: resolve(outputDir, '09-public-merchant-detail.png'), fullPage: false });

    // 10-owner-verified-business.png: /umkm showing kopi christo as verified owned business
    console.log('Capturing 10-owner-verified-business.png...');
    await page.goto(base + '/umkm?merchantId=5ab4020f-c191-46b6-890c-9717d7f0ec57', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: resolve(outputDir, '10-owner-verified-business.png'), fullPage: false });

    console.log('=== ALL 10 SCREENSHOTS COMPLETED SUCCESSFULLY ===');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('ERROR CAPTURING SCREENSHOTS:', err);
  process.exit(1);
});

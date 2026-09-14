import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = 'D:\\getra docs\\Production docs\\Final_QA_Evidence';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--ignore-certificate-errors', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Log in with UMKM account (getra.umkm.test@example.com)
  console.log('Navigating to login...');
  await page.goto('https://getra-routing-api.tail0ed517.ts.net:8443/login', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Logging in as qa_user_1789373472055@getra.local...');
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', 'qa_user_1789373472055@getra.local');
  await page.type('#password', 'Password123!');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  console.log('Current URL after login:', page.url());

  // 1. Laporkan Kondisi
  console.log('Capturing Laporkan Kondisi...');
  await page.goto('https://getra-routing-api.tail0ed517.ts.net:8443/community/contributions', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outDir, '20-updated-laporkan-kondisi.png'), fullPage: false });
  console.log('Saved 20-updated-laporkan-kondisi.png');

  // 2. Peta Budaya (direct view=map)
  console.log('Capturing Peta Budaya...');
  await page.goto('https://getra-routing-api.tail0ed517.ts.net:8443/community?view=map', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(outDir, '21-updated-peta-budaya.png'), fullPage: false });
  console.log('Saved 21-updated-peta-budaya.png');

  // 2b. Modal Tambah Temuan Budaya
  console.log('Opening Tambah Temuan modal...');
  const addBtn = await page.$('button::-p-text(Tambah Temuan Budaya)');
  if (addBtn) {
    await addBtn.click();
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outDir, '24-updated-modal-tambah-temuan.png'), fullPage: false });
    console.log('Saved 24-updated-modal-tambah-temuan.png');
  }

  // 3. Teman (Explore / Cari Teman)
  console.log('Capturing Teman...');
  await page.goto('https://getra-routing-api.tail0ed517.ts.net:8443/community/friends', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  const buttonsFriends = await page.$$('button');
  for (const b of buttonsFriends) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Cari Teman')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(outDir, '22-updated-cari-teman.png'), fullPage: false });
  console.log('Saved 22-updated-cari-teman.png');

  // 4. Usaha yang dipromosikan (UMKM Advertising)
  console.log('Capturing Usaha yang dipromosikan...');
  await page.goto('https://getra-routing-api.tail0ed517.ts.net:8443/umkm/advertising', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(outDir, '23-updated-usaha-dipromosikan.png'), fullPage: false });
  console.log('Saved 23-updated-usaha-dipromosikan.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});

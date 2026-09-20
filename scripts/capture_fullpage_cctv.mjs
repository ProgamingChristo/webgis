// scripts/capture_fullpage_cctv.mjs
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_INT = 'https://getra-routing-api.tail0ed517.ts.net:8443/international/cctv';
const URL_CCTV = 'https://getra-routing-api.tail0ed517.ts.net:8443/cctv';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1536, height: 960 });

    console.log('Capturing /international/cctv (Full Page)...');
    await page.goto(URL_INT, { waitUntil: 'networkidle2', timeout: 35000 });
    await page.screenshot({ path: 'outputs/cctv_international_fullpage.png', fullPage: false });

    console.log('Capturing /cctv (Full Page)...');
    await page.goto(URL_CCTV, { waitUntil: 'networkidle2', timeout: 35000 });
    await page.screenshot({ path: 'outputs/cctv_standalone_fullpage.png', fullPage: false });

    console.log('Fullpage screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(console.error);

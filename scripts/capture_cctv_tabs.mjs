// scripts/capture_cctv_tabs.mjs
import puppeteer from 'puppeteer-core';

const WEB_URL = 'https://getra-routing-api.tail0ed517.ts.net:8443/cctv';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });
    await page.goto(WEB_URL, { waitUntil: 'networkidle2' });

    // 1. Live Tab (Scrolled down slightly to show camera list & active player)
    await page.screenshot({ path: 'outputs/cctv_live_full.png', fullPage: true });

    // 2. Click AI Vision Tab
    const aiTabButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.innerText.includes('AI Vision'));
    });
    if (aiTabButton) {
      await aiTabButton.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: 'outputs/cctv_ai_vision.png', fullPage: false });
    }

    // 3. Click Sensors Tab
    const sensorTabButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.innerText.includes('Sensors'));
    });
    if (sensorTabButton) {
      await sensorTabButton.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: 'outputs/cctv_sensors.png', fullPage: false });
    }

    console.log('Tab screenshots saved to outputs/');
  } finally {
    await browser.close();
  }
}

run().catch(console.error);

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/chris/.gemini/antigravity-ide/brain/e953f5fb-efb3-4330-8352-79618321fac2';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  console.log('Navigating to https://getra-routing-api.tail0ed517.ts.net:8443/cctv ...');
  await page.goto('https://getra-routing-api.tail0ed517.ts.net:8443/cctv', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Click AI Vision Tab
  console.log('Clicking AI Vision tab...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('AI Vision'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 2500));

  // Take screenshot of active AI vision tab
  const aiMainPath = path.join(ARTIFACT_DIR, 'cctv_ai_vision_active.png');
  await page.screenshot({ path: aiMainPath, fullPage: true });
  console.log('Saved AI vision screenshot to:', aiMainPath);

  // Now click the camera selector to open the drawer
  console.log('Clicking camera selector trigger...');
  await page.evaluate(() => {
    const trigger = Array.from(document.querySelectorAll('div[role="button"]')).find(el =>
      el.textContent && el.textContent.includes('AI AKTIF')
    );
    if (trigger) trigger.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  // Take screenshot of opened camera drawer
  const aiDrawerPath = path.join(ARTIFACT_DIR, 'cctv_ai_selector_drawer.png');
  await page.screenshot({ path: aiDrawerPath, fullPage: true });
  console.log('Saved AI selector drawer screenshot to:', aiDrawerPath);

  await browser.close();
  console.log('Done capturing all screenshots!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

// scripts/debug_cctv_dom.mjs
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'https://getra-routing-api.tail0ed517.ts.net:8443/cctv';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to', URL);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Current URL:', page.url());
  console.log('Document Title:', await page.title());

  const body = await page.evaluate(() => document.body.innerHTML);
  console.log('Body length:', body.length);
  console.log('Body snippet (first 1000 chars):', body.slice(0, 1000));

  await browser.close();
}

test().catch(console.error);

// scripts/verify-public-cctv.mjs
import puppeteer from 'puppeteer-core';

const BASE_WEB = 'https://getra-routing-api.tail0ed517.ts.net:8443';
const BASE_API = 'https://getra-routing-api.tail0ed517.ts.net';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function main() {
  console.log('=== GETRA PUBLIC CCTV & PLATFORM VERIFICATION ===');
  const results = [];

  // 1. Backend Health Check
  console.log('\n[1] Testing Backend Health...');
  try {
    const res = await fetch(`${BASE_API}/api/health`, { signal: AbortSignal.timeout(10000) });
    const json = await res.json();
    const isOk = (json.status === 'ok' || json.data?.status === 'ok') && (json.database === 'connected' || json.data?.database === 'connected');
    const passed = res.ok && isOk;
    results.push({
      test: 'Backend Health Endpoint',
      url: `${BASE_API}/api/health`,
      status: res.status,
      passed,
      details: JSON.stringify(json)
    });
    console.log(`Backend Health: HTTP ${res.status} => ${passed ? 'PASS' : 'FAIL'}`, json);
  } catch (err) {
    results.push({
      test: 'Backend Health Endpoint',
      url: `${BASE_API}/api/health`,
      status: 0,
      passed: false,
      details: err.message
    });
    console.error('Backend Health Error:', err.message);
  }

  // 2. Login Page Check
  console.log('\n[2] Testing Login Page...');
  try {
    const res = await fetch(`${BASE_WEB}/login`, { signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    const passed = res.ok && text.includes('GETRA');
    results.push({
      test: 'Login Page',
      url: `${BASE_WEB}/login`,
      status: res.status,
      passed,
      details: `HTTP ${res.status}, page size ${text.length} bytes`
    });
    console.log(`Login Page: HTTP ${res.status} => ${passed ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    results.push({
      test: 'Login Page',
      url: `${BASE_WEB}/login`,
      status: 0,
      passed: false,
      details: err.message
    });
    console.error('Login Page Error:', err.message);
  }

  // 3. New CCTV Platform Page Check (HTTP)
  console.log('\n[3] Testing New CCTV Platform Page (/cctv)...');
  try {
    const res = await fetch(`${BASE_WEB}/cctv`, { signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    results.push({
      test: 'CCTV Route (/cctv) HTTP Response',
      url: `${BASE_WEB}/cctv`,
      status: res.status,
      passed: res.ok,
      details: `HTTP ${res.status}, content length ${text.length}`
    });
    console.log(`CCTV Route: HTTP ${res.status} => ${res.ok ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    results.push({
      test: 'CCTV Route (/cctv) HTTP Response',
      url: `${BASE_WEB}/cctv`,
      status: 0,
      passed: false,
      details: err.message
    });
    console.error('CCTV Route Error:', err.message);
  }

  // 4. Puppeteer Deep Verification of /cctv
  console.log('\n[4] Running Browser Acceptance on /cctv via Chrome...');
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.goto(`${BASE_WEB}/cctv`, { waitUntil: 'networkidle2', timeout: 35000 });

    const pageTitle = await page.title();
    console.log('Page Title:', pageTitle);

    // Check DOM contents
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasLiveTab = bodyText.includes('Live CCTV') || bodyText.includes('REAL CAMERA');
    const hasAiTab = bodyText.includes('AI Vision') || bodyText.includes('Computer Vision');
    const hasSensorTab = bodyText.includes('Sensor') || bodyText.includes('ISPU');
    const hasTruthfulNotice = bodyText.includes('DATA_UNAVAILABLE') || bodyText.includes('Terkoneksi') || bodyText.includes('DKI Jakarta');

    console.log('Has Live Tab / Real Camera:', hasLiveTab);
    console.log('Has AI Vision Tab:', hasAiTab);
    console.log('Has Sensor Tab:', hasSensorTab);
    console.log('Has Truthful Notice:', hasTruthfulNotice);

    // Check iframe presence
    const iframeCount = await page.evaluate(() => document.querySelectorAll('iframe').length);
    console.log('Iframe count on /cctv:', iframeCount);

    const browserPass = hasLiveTab && (hasAiTab || hasSensorTab);
    results.push({
      test: 'Browser DOM /cctv Feature Render',
      url: `${BASE_WEB}/cctv`,
      status: 200,
      passed: browserPass,
      details: `Title: "${pageTitle}", LiveTab: ${hasLiveTab}, AITab: ${hasAiTab}, SensorTab: ${hasSensorTab}, Iframes: ${iframeCount}`
    });

    // Take screenshot
    await page.screenshot({ path: 'outputs/cctv_live_verification.png', fullPage: false });
    console.log('Screenshot saved to outputs/cctv_live_verification.png');

  } catch (err) {
    results.push({
      test: 'Browser DOM /cctv Feature Render',
      url: `${BASE_WEB}/cctv`,
      status: 0,
      passed: false,
      details: err.message
    });
    console.error('Puppeteer Test Error:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  // 5. Check international CCTV route
  console.log('\n[5] Testing /international/cctv Route...');
  try {
    const res = await fetch(`${BASE_WEB}/international/cctv`, { signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    results.push({
      test: 'International CCTV Route (/international/cctv)',
      url: `${BASE_WEB}/international/cctv`,
      status: res.status,
      passed: res.ok,
      details: `HTTP ${res.status}, content length ${text.length}`
    });
    console.log(`International CCTV: HTTP ${res.status} => ${res.ok ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    results.push({
      test: 'International CCTV Route (/international/cctv)',
      url: `${BASE_WEB}/international/cctv`,
      status: 0,
      passed: false,
      details: err.message
    });
    console.error('International CCTV Route Error:', err.message);
  }

  console.log('\n=== SUMMARY OF TESTS ===');
  console.table(results.map(r => ({ Test: r.test, Status: r.status, Result: r.passed ? 'PASS' : 'FAIL', Details: r.details.slice(0, 70) })));

  const allPassed = results.every(r => r.passed);
  console.log(`\nOVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

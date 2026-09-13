import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });
  await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle2' });
  await page.locator('#email').fill('getra.admin.test@example.com');
  await page.locator('#password').fill('PasswordDevelopment123!');
  await page.locator('button[type=submit]').click();
  await page.waitForFunction(() => location.pathname !== '/login');
  
  await page.goto('http://localhost:3100/app', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#global-search-query');
  await page.type('#global-search-query', 'kopi christo');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 4000));

  const items = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('*')).filter(el => {
      return el.children.length > 1 && el.innerText && el.innerText.includes('kopi christo') && el.innerText.includes('Gria Jakarta');
    });
    return list.map(el => ({
      tag: el.tagName,
      className: el.className,
      outerHtml: el.outerHTML.slice(0, 300)
    }));
  });
  console.log('Matched containers:', items);

  await browser.close();
}

main().catch(console.error);

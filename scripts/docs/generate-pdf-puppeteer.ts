import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { marked } from 'marked';

const DOCS_DIR = path.join(process.cwd(), 'docs', 'final-source');
const FINAL_DIR = path.join(process.cwd(), 'docs', 'final');
const FINAL_MD_PATH = path.join(DOCS_DIR, 'GETRA_BACKEND_FULL_DOCUMENTATION.md');
const FINAL_PDF_PATH = path.join(FINAL_DIR, 'GETRA_BACKEND_FULL_DOCUMENTATION.pdf');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  try {
    const mdContent = fs.readFileSync(FINAL_MD_PATH, 'utf-8');
    const htmlContent = marked.parse(mdContent);

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>GETRA Documentation</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; margin-top: 1.5em; }
          pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; font-family: Consolas, monospace; font-size: 13px; }
          code { font-family: Consolas, monospace; background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f6f8fa; }
          a { color: #0366d6; text-decoration: none; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    console.log('Launching Edge browser...');
    const browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    console.log('Generating PDF...');
    await page.pdf({
      path: FINAL_PDF_PATH,
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
    });

    await browser.close();
    console.log('Successfully generated PDF at ' + FINAL_PDF_PATH);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
  }
})();

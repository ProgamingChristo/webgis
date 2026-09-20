import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { ordinaryUserFixture } from '../frontend/tests/routing/browser-user-fixture.mjs';
const base = process.env.GETRA_QA_URL || 'http://localhost:3100';
const out = process.env.GETRA_QA_OUTPUT || 'outputs/production-hardening/responsive';
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 } });
const report = { base, started: new Date().toISOString(), viewports: [], network: [], errors: [], cameras: [] };
const widths = [[390,844],[430,932],[768,1024],[1024,768],[1280,800],[1440,900]];
try {
 const page = await browser.newPage();
 page.on('pageerror', e => report.errors.push({ path: new URL(page.url()).pathname, message: e.message }));
 page.on('response', r => { const u=new URL(r.url()); if(u.pathname.startsWith('/api/')) report.network.push({ path: u.pathname, status:r.status(), method:r.request().method() }); });
 await page.goto(`${base}/login`, { waitUntil:'domcontentloaded', timeout:60000 });
 const fixture=ordinaryUserFixture(); await page.locator('#email').fill(fixture.email); await page.locator('#password').fill(fixture.password); await page.click('button[type=submit]');
 await page.waitForFunction(()=>location.pathname==='/app',{timeout:45000});
 const paths=['/app','/umkm','/umkm/advertising','/community','/international/cctv','/international/weather','/international/earthquakes','/international/active-fire','/international/air-quality','/international/flood','/international/accessibility','/international/traffic-congestion'];
 for(const route of paths){
   await page.goto(`${base}${route}`,{waitUntil:'networkidle2',timeout:60000});
   await page.waitForFunction(() => !document.body.innerText.includes('Menyiapkan GETRA') && document.body.innerText.length > 350, { timeout: 60000 });
   if(route==='/international/cctv') await page.waitForSelector('iframe[title^="Kamera CCTV"]', { timeout: 30000 });
   for(const [width,height] of widths){
     await page.setViewport({width,height}); await new Promise(r=>setTimeout(r,300));
     const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,title:document.title,buttons:document.querySelectorAll('button').length}));
     const row={route,...state,passed:state.scrollWidth<=width+1}; report.viewports.push(row);
     if(width===390 || route==='/international/cctv') await page.screenshot({path:`${out}/${route.replaceAll('/','_')}-${width}.png`});
   }
   if(route==='/international/cctv'){
     const frames=page.frames().filter(f=>/balitower/.test(f.url()));
     for(const frame of frames){try{report.cameras.push({url:frame.url(),...(await frame.evaluate(()=>({videos:[...document.querySelectorAll('video')].map(v=>({readyState:v.readyState,width:v.videoWidth,height:v.videoHeight,time:v.currentTime}))})))});}catch{}}
     for(const name of ['AI VISION','SENSORS']){
       await page.evaluate(name=>[...document.querySelectorAll('button')].find(b=>b.textContent.toUpperCase().includes(name))?.click(),name);
       await new Promise(r=>setTimeout(r,500));
       for(const [width,height] of widths){await page.setViewport({width,height});await new Promise(r=>setTimeout(r,200)); const s=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,unavailable:document.body.innerText.includes('UNAVAILABLE')}));report.viewports.push({route:`${route}#${name}`,...s,passed:s.scrollWidth<=width+1});if(width===390||width===1440)await page.screenshot({path:`${out}/cctv-${name.replaceAll(' ','-')}-${width}.png`});}
     }
   }
   await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
   console.log(route,report.viewports.filter(r=>r.route===route).every(r=>r.passed)?'PASS':'FAIL');
 }
 report.passed=report.viewports.every(v=>v.passed)&&report.errors.length===0;
}catch(e){report.failure=e.message;report.passed=false;}
finally{report.finished=new Date().toISOString();await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
if(!report.passed)process.exitCode=1;

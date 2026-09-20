import puppeteer from 'puppeteer-core';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
const base = process.env.GETRA_QA_URL || 'https://getra-routing-api.tail0ed517.ts.net:8443';
const dir = path.resolve('docs/international-guide');
const features = JSON.parse(await readFile(path.join(dir,'features.json'),'utf8'));
await mkdir(path.join(dir,'screenshots'), {recursive:true});
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox'],defaultViewport:{width:1440,height:1160}});
const report = process.argv.includes('--resume') ? JSON.parse(await readFile(path.join(dir,'capture-report.json'),'utf8')) : {captured_at:new Date().toISOString(),base,references:[],features:[]};
try {
  for(const [name,url] of [['frontend',base],['login',base+'/login'],['health','https://getra-routing-api.tail0ed517.ts.net/api/health']]) {
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    report.references.push({name,url,http:response.status,...(name==='health'?{body:await response.json()}:{})});
    if(response.status!==200) throw new Error(`Reference URL failed: ${name}`);
  }
  const login=await browser.newPage(); await login.goto(base+'/login',{waitUntil:'networkidle2',timeout:60000});
  await login.screenshot({path:path.join(dir,'screenshots/login.jpg'),type:'jpeg',quality:85,fullPage:true});await login.close();
  for(const feature of features) {
    const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
    if(only && only!==feature.id) continue;
    if(!only && report.features.some(r=>r.id===feature.id&&!r.capture_error)) continue;
    const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    const entry={id:feature.id,url:base+'/international/'+feature.id,errors};
    try {
      const response=await page.goto(entry.url,{waitUntil:'domcontentloaded',timeout:60000});entry.http=response.status();
      await page.waitForFunction(()=>document.querySelector('[data-basemap-status]')?.textContent==='READY',{timeout:50000});
      for(const [key,value] of Object.entries(feature.query)) {
        if(key==='lat'||key==='lon') await page.locator(`[aria-label="${key==='lat'?'Latitude':'Longitude'}"]`).fill(value);
        else if(key==='radius') { await page.evaluate(()=>{[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Radius')).querySelector('select').id='qa-radius';}); await page.select('#qa-radius',value); }
      }
      const load = async()=>{const wait=page.waitForResponse(r=>r.url().includes('/api/international/'+feature.id+'?')&&r.request().method()==='GET',{timeout:85000});await page.click('form button[type=submit]'); const response=await wait; const body=await response.json(); await page.waitForFunction(()=>!document.querySelector('form button[type=submit]')?.disabled);return body;};
      let body=await load();
      if(feature.system && body.systems) {
        await page.evaluate(()=>{[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Sistem GBFS')).querySelector('select').id='qa-system';});
        await page.select('#qa-system',feature.system); body=await load();
      }
      entry.status=body.status;entry.count=body.data?.features?.length??0;entry.provider=body.source?.provider;entry.updated=body.last_updated;entry.message=body.message;entry.ttl=body.ttl;entry.truncated=body.truncated;
      if(feature.world) await page.evaluate(()=>window.__getraGlobalMap.jumpTo({center:[30,5],zoom:1.4}));
      if(feature.id==='weather'&&entry.count) {
        await page.evaluate(()=>{document.querySelector('aside[class*="detail"] ul button')?.click();window.__getraGlobalMap.jumpTo({center:window.__getraGlobalMap.getStyle().sources['getra-international'].data.features[0].geometry.coordinates,zoom:13});});
      }
      await page.waitForFunction(()=>window.__getraGlobalMap?.isStyleLoaded()&&window.__getraGlobalMap?.areTilesLoaded(),{timeout:25000});
      await new Promise(r=>setTimeout(r,1300));
      entry.screenshot=`screenshots/${feature.id}.jpg`;
      await page.screenshot({path:path.join(dir,entry.screenshot),type:'jpeg',quality:85,fullPage:true});
      console.log(JSON.stringify({id:entry.id,status:entry.status,count:entry.count}));
    } catch(error) {entry.capture_error=error.message;entry.screenshot=`screenshots/${feature.id}.jpg`;await page.screenshot({path:path.join(dir,entry.screenshot),type:'jpeg',quality:85,fullPage:true}).catch(()=>{});console.log(JSON.stringify({id:feature.id,error:error.message}));}
    report.features=report.features.filter(r=>r.id!==feature.id);report.features.push(entry);await writeFile(path.join(dir,'capture-report.json'),JSON.stringify(report,null,2));await page.close().catch(()=>{});
  }
  for(const [source,target] of [['public/1-osm.png','basemap-osm.png'],['public/4-esri-satellite.png','basemap-esri.png'],['public/5-mapid-default.png','basemap-mapid.png'],['public/mobile-basemap-sheet.png','mobile-sheet.png'],['public/mobile.png','mobile.png'],['public/tablet.png','tablet.png'],['main-map/mapid-default.png','route-merchant.png'],['journey/mapid-default.png','journey.png']]) await copyFile(path.resolve('outputs/international-audit',source),path.join(dir,'screenshots',target));
  report.finished_at=new Date().toISOString();await writeFile(path.join(dir,'capture-report.json'),JSON.stringify(report,null,2));
} finally {await browser.close();}

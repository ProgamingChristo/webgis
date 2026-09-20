import puppeteer from 'puppeteer-core';
import { ordinaryUserFixture } from '../frontend/tests/routing/browser-user-fixture.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const base='https://getra-routing-api.tail0ed517.ts.net:8443', output='outputs/international-audit/service-area';
await mkdir(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox'],defaultViewport:{width:1440,height:1000}});
const page=await browser.newPage(), report={base,errors:[],switches:[],apiFailures:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('response',async response=>{ if(response.status()>=400&&response.url().includes('/api/')) report.apiFailures.push({url:response.url().replace(/\?.*/,''),status:response.status(),body:(await response.text().catch(()=>'' )).slice(0,1000)}); });
try {
  await browser.defaultBrowserContext().overridePermissions(base,['geolocation']);
  // Explicit QA user location at a real merchant coordinate; service geometry comes only from GETRA GIS.
  await page.setGeolocation({latitude:-6.2151,longitude:106.6842,accuracy:10});
  await page.goto(`${base}/login`,{waitUntil:'domcontentloaded'});
  const fixture=ordinaryUserFixture(); await page.locator('#email').fill(fixture.email); await page.locator('#password').fill(fixture.password); await page.click('button[type=submit]');
  await page.waitForFunction(()=>location.pathname==='/app');
  await page.waitForSelector('#global-search-query');
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Ganti area').click());
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Gunakan lokasi saya').click());
  await page.waitForFunction(()=>!document.querySelector('.commuter-radius-state')?.disabled,{timeout:30000});
  await page.click('.commuter-filter-trigger');
  await page.select('.commuter-filter-select select','10');
  await page.click('#commuter-filters .commuter-apply');
  await page.waitForFunction(()=>window.__getraMapLibreInstance?.getSource('walking-service-area'),{timeout:60000});
  await page.waitForFunction(()=>window.__getraMapLibreInstance?.isStyleLoaded());
  await new Promise(r=>setTimeout(r,2000));
  report.before=await page.evaluate(()=>{window.__qaServiceMap=window.__getraMapLibreInstance;return {geometry:window.__qaServiceMap.getSource('walking-service-area').serialize().data,center:window.__qaServiceMap.getCenter().toArray(),zoom:window.__qaServiceMap.getZoom()};});
  await page.evaluate(()=>document.querySelector('details.planning-basemap').open=true);
  for(const [id,label] of [['osm','OpenStreetMap'],['esri-satellite','Esri Satellite'],['mapid-default','MAPID']]) {
    await page.evaluate(label=>[...document.querySelectorAll('.basemap-button')].find(b=>b.querySelector('span')?.textContent.trim()===label).click(),label);
    await page.waitForFunction(id=>window.__getraMapLibreInstance?.getContainer().dataset.basemapId===id&&!document.querySelector('.map-basemap-state'),{timeout:45000},id);
    const state=await page.evaluate(()=>({same:window.__qaServiceMap===window.__getraMapLibreInstance,geometry:window.__getraMapLibreInstance.getSource('walking-service-area')?.serialize().data,center:window.__getraMapLibreInstance.getCenter().toArray(),zoom:window.__getraMapLibreInstance.getZoom()}));
    if(!state.same||JSON.stringify(state.geometry)!==JSON.stringify(report.before.geometry)||Math.abs(state.zoom-report.before.zoom)>0.01)throw new Error(`Service area changed on ${id}`);
    report.switches.push({id,same:true,geometryPreserved:true}); await page.screenshot({path:`${output}/${id}.png`,fullPage:true});
  }
  report.passed=true;
}catch(error){report.failure=error.message; report.text=await page.evaluate(()=>document.body.innerText.slice(-4000));await page.screenshot({path:`${output}/failure.png`,fullPage:true});process.exitCode=1;}
finally {await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,before:report.before?{...report.before,geometry:'See artifact'}:null},null,2));await browser.close();}

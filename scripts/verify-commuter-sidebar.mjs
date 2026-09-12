// Isolated browser regression test. Auth, API responses, and basemap use explicit fixtures; no live writes.
import puppeteer from 'puppeteer-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const env = await readFile('frontend/.env.local','utf8');
const supabaseUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\r\n"']+)/m)?.[1];
if (!supabaseUrl) throw new Error('Public Supabase URL unavailable');
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
const browser = await puppeteer.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page = await browser.newPage();
await page.browserContext().overridePermissions('http://localhost:3000',['geolocation']);
await page.setGeolocation({latitude:-6.17,longitude:106.75,accuracy:12});
const errors=[]; const requests=[];
page.on('pageerror',e=>errors.push(e.message));
const uid='11111111-1111-4111-8111-111111111111';
await page.evaluateOnNewDocument((key,uid)=>{
 const session={access_token:'browser-test-fixture',refresh_token:'browser-test-fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
 localStorage.setItem(key,JSON.stringify(session));
},storageKey,uid);
const bounds={west:106.8,south:-6.25,east:106.9,north:-6.15};
const merchants=Array.from({length:5},(_,i)=>({id:`fixture-${i}`,name:`Tempat Uji ${i+1}`,category:'Makanan',brand:'Usaha lokal',latitude:-6.17+i*.001,longitude:106.75+i*.001,walkingMinutes:null,distanceMeters:null,accessibilityScore:0,priceLabel:'Hemat',openNow:i!==2,openingStatus:i===2?'UNKNOWN':'OPEN',photo:i===0?'https://fixture.example.test/merchant.svg':undefined,source:'BROWSER_TEST_FIXTURE',status:'surveyed',updatedAt:'2026-09-11',limitation:'Synthetic browser test only',address:'Alamat fixture untuk pengujian',observedPriceAmount:i===2?null:12000+i*1000,openStatusKnown:i!==2}));
let empty=false; let fail=false;
await page.setRequestInterception(true);
page.on('request',async req=>{
 try {
 const u=new URL(req.url());
 if(u.pathname.startsWith('/api/')) {
  requests.push({path:u.pathname,query:Object.fromEntries(u.searchParams)});
  const headers={'access-control-allow-origin':'http://localhost:3000','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(req.method()==='OPTIONS') return req.respond({status:204,headers});
  let data=[];
  if(u.pathname==='/api/auth/me') data={user:{id:uid,email:'fixture@example.test'},profile:{display_name:'Pengujian UI',account_role:'USER',onboarding_complete:true,trust_score:0},stakeholder_modes:[]};
  else if(u.pathname==='/api/discovery') data={original:[{id:'discovery-fixture',name:'Tempat Discovery Uji',category:'Makanan',geometry:{type:'Point',coordinates:[106.751,-6.171]},distance_meters:120,walking_minutes:null,open_now:null,route_status:null}],hidden_gems:[],sponsored:[],metadata:{total_original:0,total_hidden_gems:0,total_sponsored:0,sponsored_available:false,query_context:{origin:{longitude:106.75,latitude:-6.17},radius_meters:Number(u.searchParams.get('radius_meters'))}}};
  else if(u.pathname==='/api/merchants/canonical') {
   if(fail) return req.respond({status:503,headers,contentType:'application/json',body:JSON.stringify({success:false,error:{code:'SERVICE_UNAVAILABLE'}})});
   const budget=Number(u.searchParams.get('max_budget'))||null;
   const rows=empty?[]:merchants.filter(m=>!budget || (m.observedPriceAmount!==null && m.observedPriceAmount<=budget));
   data={layer_id:'canonical',layer_name:'Fixture',source:'BROWSER_TEST_FIXTURE',total_features:rows.length,total_available:rows.length,limit:100,offset:0,has_more:false,next_offset:null,bbox:bounds,merchants:rows,regions:[],available_regions:[],intent:{recommendation:u.searchParams.get('recommendation')==='true',sort:u.searchParams.get('sort')||'RELEVANCE',radius_meters:Number(u.searchParams.get('radius_meters'))||undefined,reference:u.searchParams.get('reference_text')?{id:'transit-fixture',label:u.searchParams.get('reference_text'),type:'TRANSIT',longitude:106.75,latitude:-6.17}:null,domain:'MERCHANT',original_query:u.searchParams.get('q')||'',keyword:u.searchParams.get('q')||null,location_text:null,category:null,scope:{type:'CURRENT_VIEWPORT',region_ids:[],bounds},constraints:{budget:budget?{max_idr:budget}:null,opening:u.searchParams.has('open_now')?{open_now:true,timezone:'Asia/Jakarta'}:null,walking:null},origin:null,parser:'DETERMINISTIC',confidence:'HIGH'},commuter:{candidate_count:rows.length,constrained_count:rows.length,excluded:{},hard_constraints_applied:[],constraints_relaxed:false}};
  } else if(u.pathname==='/api/ai/ask') {
    const body=JSON.parse(req.postData());
    const previous=body.context?.search_context;
    const asked=body.question.toLowerCase();
    data={answer:'Saya akan mencari tempat.',intent:'MERCHANT_SEARCH',limitations:[],evidence:[],provider:'openai',search_action:{type:'APPLY_SEARCH_CRITERIA',criteria:{query:asked==='soto'?'soto':previous?.query||'soto',max_budget:body.question.includes('20 ribu')?20000:15000,open_now:false,max_walking_minutes:null,reference_text:'Stasiun Uji',near_user:false,radius_meters:500,sort:'NEAREST'}}};
  }
  else if(u.pathname.includes('routing')) return req.respond({status:503,headers,contentType:'application/json',body:JSON.stringify({success:false,error:{code:'SERVICE_UNAVAILABLE'}})});
  return req.respond({status:200,headers,contentType:'application/json',body:JSON.stringify({success:true,data})});
 }
 if(u.hostname==='fixture.example.test') return req.respond({status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="#d5eaf0"/><text x="90" y="85" fill="#102357">FOTO UJI</text></svg>'});
 if(u.origin==='http://localhost:3000') return req.continue();
 if(req.resourceType()==='stylesheet'||req.resourceType()==='font') return req.abort();
 if(u.pathname.endsWith('.json')) return req.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e9f0ef'}}]})});
 return req.abort();
 } catch { if(!req.isInterceptResolutionHandled()) await req.abort(); }
});
const out='docs/verification/commuter-sidebar'; await mkdir(out,{recursive:true});
let stage='start';
try {
 stage='load-dashboard';
 await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 await page.goto('http://localhost:3000/app',{waitUntil:'networkidle2',timeout:90000});
 await page.waitForSelector('.commuter-sidebar',{timeout:45000});
 const idleRows=await page.$$eval('.commuter-merchant',els=>els.length);
 const idleMessage=await page.$eval('.commuter-idle',e=>e.textContent.includes('Belum ada pencarian aktif'));
 await page.$eval('#global-search-query',(e)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(e,'bakso');e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.click('.commuter-search__input button');
 await page.waitForSelector('.commuter-merchant',{timeout:45000});
 stage='responsive-layout';
 await page.screenshot({path:`${out}/desktop-fixture.png`});
 const layouts=[];
 for(const [width,height] of [[1440,1000],[1280,800],[820,1180],[390,844]]) {
  await page.setViewport({width,height});
  await new Promise(r=>setTimeout(r,300));
  layouts.push(await page.evaluate(()=>{const a=document.querySelector('.commuter-sidebar').getBoundingClientRect(),m=document.querySelector('.map-panel').getBoundingClientRect();return {viewport:innerWidth,sidebarWidth:a.width,sidebarHeight:a.height,mapWidth:m.width,mapHeight:m.height,overflow:document.documentElement.scrollWidth>innerWidth};}));
  await page.screenshot({path:`${out}/${width}-fixture.png`});
 }
 await page.setViewport({width:1440,height:1000});
 stage='nearby-and-popup';
 await page.click('.commuter-section__heading button');
 await page.waitForFunction(()=>document.querySelector('.commuter-location')?.textContent.includes('(aktif)'));
 await new Promise(r=>setTimeout(r,800));
 await page.click('.commuter-merchant');
 await page.waitForSelector('.commuter-popup-actions',{timeout:15000});
 const selected=await page.$eval('.commuter-merchant',e=>e.getAttribute('aria-pressed'));
 const popupPhoto = await page.$eval('.commuter-place-popup__media img',e=>e.complete && e.naturalWidth>0);
 await page.screenshot({path:`${out}/merchant-popup-fixture.png`});
 await page.click('.commuter-popup-actions button:first-child');
 await page.waitForSelector('.place-detail');
 const detailClean=await page.$eval('.place-detail',e=>e.textContent.includes('Alamat fixture untuk pengujian')&&!e.textContent.includes('Data GETRA')&&!e.textContent.includes('Koordinat'));
 await page.screenshot({path:`${out}/place-detail-fixture.png`});
 await page.click('.place-detail__route');
 const routeTab=await page.$eval('.commuter-tabs button:last-child',e=>e.getAttribute('aria-pressed'));
 const destination=await page.$eval('[data-testid="routing-destination"] .route-selection-card__title',e=>e.textContent.trim());
 await page.click('.commuter-tabs button:first-child');
 stage='filters-empty-error';

 // Search reset is the second section heading button (location action is the first).
 await page.evaluate(()=>[...document.querySelectorAll('.commuter-section__heading button')].find(e=>e.textContent==='Reset')?.click());
 await new Promise(r=>setTimeout(r,700));
 const preservedDestination=await page.$eval('[data-testid="routing-destination"] .route-selection-card__title',e=>e.textContent.trim());
 const setInput = async (selector,value) => page.$eval(selector,(e,value)=>{ const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true})); },value);
 await setInput('#global-search-query','bakso');
 await new Promise(r=>setTimeout(r,100));
 await page.click('.commuter-search__input button');
 await page.waitForFunction(()=>document.querySelector('.result-list')?.getAttribute('aria-busy')==='false');
 await page.click('.commuter-search__form > button');
 await setInput('#commuter-filters input[type="number"]','15000');
 await new Promise(r=>setTimeout(r,900));
 const budgetRequest=requests.filter(r=>r.path==='/api/merchants/canonical').at(-1);
 const requestsBeforeReset=requests.filter(r=>r.path==='/api/merchants/canonical').length;
 await page.evaluate(()=>[...document.querySelectorAll('.commuter-section__heading button')].find(e=>e.textContent==='Reset')?.click());
 await new Promise(r=>setTimeout(r,800));
 const resetTriggeredRequest=requests.filter(r=>r.path==='/api/merchants/canonical').length>requestsBeforeReset;
 await setInput('#global-search-query','bakso');
 await new Promise(r=>setTimeout(r,100));
 empty=true;
 await page.click('.commuter-search__input button');
 await page.waitForFunction(()=>document.querySelector('.result-list')?.getAttribute('aria-busy')==='false');
 const emptyRows=await page.$$eval('.commuter-merchant',els=>els.length);
 empty=false;fail=true;
 await page.click('.commuter-search__input button');
 await page.waitForSelector('.commuter-error');
 const errorVisible=await page.$eval('.commuter-error',e=>e.textContent.includes('Tempat belum dapat dimuat'));
 fail=false;
 await page.click('.commuter-error button');
 await page.waitForSelector('.commuter-merchant');
 stage='ai-recommendation';
 await page.click('.commuter-ai-launcher');
 await page.waitForSelector('#commuter-assistant:not([hidden])');
 await setInput('#commuter-assistant input','soto');
 await page.click('#commuter-assistant button[type="submit"]');
 await page.waitForFunction(()=>document.querySelector('.tanya-getra__messages')?.textContent.includes('Saya sudah menampilkan'));
 await new Promise(r=>setTimeout(r,400));
 const aiRequest=requests.filter(r=>r.path==='/api/merchants/canonical').at(-1);
 const recommendationHeading=await page.$eval('.results-header',e=>e.textContent.includes('Rekomendasi sesuai kebutuhanmu'));
 await page.evaluate(()=>document.querySelector('.commuter-sidebar__body').scrollTop=0);
 await page.screenshot({path:`${out}/chat-recommendation-fixture.png`});
 await page.click('button[aria-label="Minimalkan Tanya GETRA"]');
 await page.waitForSelector('#commuter-assistant[hidden]');
 await page.click('.commuter-ai-launcher');
 const historyPreserved=await page.$eval('.tanya-getra__messages',e=>e.textContent.includes('Saya sudah menampilkan'));
 await page.evaluate(()=>[...document.querySelectorAll('.tanya-getra__suggestions button')].find(e=>e.textContent==='Budget 20 ribu').click());
 await page.waitForFunction(()=>!document.querySelector('.tanya-getra__loading'));
 const followupRequest=requests.filter(r=>r.path==='/api/merchants/canonical').at(-1);
 await page.click('button[aria-label="Tutup Tanya GETRA"]');
 stage='fair-discovery';
 await page.evaluate(()=>document.querySelector('.commuter-tools').open=true);
 await page.evaluate(()=>[...document.querySelectorAll('.workspace-view-switcher button')].find(e=>e.textContent.includes('Penelusuran Adil'))?.click());
 await page.select('select[aria-label="Radius pencarian"]','500');
 await new Promise(r=>setTimeout(r,800));
 const radiusRequest=requests.filter(r=>r.path==='/api/discovery').at(-1);
 await page.waitForSelector('[data-merchant-id="discovery-fixture"]');
 await page.click('[data-merchant-id="discovery-fixture"]');
 await page.waitForSelector('button[aria-label="Pilih Tempat Discovery Uji"]');
 await page.click('button[aria-label="Pilih Tempat Discovery Uji"]');
 await page.waitForFunction(()=>document.querySelector('.maplibregl-popup')?.textContent.includes('Tempat Discovery Uji'));
 const discoverySelection=true;
 const routeRequest=requests.find(r=>r.path.includes('routing'));
 if(layouts.some(l=>l.overflow || (l.viewport>760 && l.sidebarWidth>380))) throw new Error('Responsive layout failed');
 if(idleRows!==0||!idleMessage||resetTriggeredRequest||!popupPhoto||!detailClean||!recommendationHeading||!historyPreserved||followupRequest?.query.max_budget!=='20000'||followupRequest?.query.q!=='soto'||selected!=='true'||routeTab!=='true'||destination!==preservedDestination||emptyRows!==0||!errorVisible||budgetRequest?.query.max_budget!=='15000'||aiRequest?.query.q!=='soto'||radiusRequest?.query.radius_meters!=='500') throw new Error(`Interaction assertion failed: ${JSON.stringify({idleRows,idleMessage,resetTriggeredRequest,popupPhoto,detailClean,recommendationHeading,historyPreserved,followupRequest,selected,routeTab,destination,preservedDestination,emptyRows,errorVisible,budgetRequest,aiRequest,radiusRequest})}`);
 const result={fixtureOnly:true,idleRows,idleMessage,resetTriggeredRequest,popupPhoto,detailClean,recommendationHeading,historyPreserved,followupRequest,discoverySelection,radiusRequest,routeRequest,budgetRequest,emptyRows,errorVisible,aiRequest,layouts,selected,routeTab,destination,preservedDestination,errors,canonicalRequests:requests.filter(r=>r.path==='/api/merchants/canonical')};
 await writeFile(`${out}/browser-results.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({...result,canonicalRequests:result.canonicalRequests.length}));
} catch(e){const ui=await page.evaluate(()=>{const b=document.querySelector('.commuter-ai-launcher'),p=document.querySelector('#commuter-assistant');return {buttonExpanded:b?.getAttribute('aria-expanded'),buttonDisplay:b?getComputedStyle(b).display:null,buttonVisibility:b?getComputedStyle(b).visibility:null,panelHidden:p?.hasAttribute('hidden'),panelDisplay:p?getComputedStyle(p).display:null,panelRect:p?.getBoundingClientRect().toJSON()};}).catch(()=>null);await page.screenshot({path:`${out}/failure-fixture.png`}).catch(()=>{}); console.log(JSON.stringify({stage,error:e.message,url:page.url(),errors,ui}));process.exitCode=1;}
finally {await browser.close();}

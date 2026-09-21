import { mkdir, writeFile } from 'node:fs/promises';
import { ordinaryUserFixture } from '../frontend/tests/routing/browser-user-fixture.mjs';
import puppeteer from 'puppeteer-core';
const base=process.env.GETRA_QA_API || 'http://localhost:8180';
const front=process.env.GETRA_QA_URL || 'http://localhost:3100';
const out=process.env.GETRA_QA_OUTPUT || 'outputs/production-hardening/runtime';
await mkdir(out,{recursive:true});
const report={base,front,checked_at:new Date().toISOString(),urls:[],routes:[]};
for(const url of [front,front+'/login',base+'/api/health']){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});report.urls.push({url,http:r.status});await r.arrayBuffer();}catch(e){report.urls.push({url,error:e.message});}
}
const auth=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ordinaryUserFixture())}).then(r=>r.json());
const token=auth.data?.session?.access_token;
if(!token)throw new Error('QA login failed');
for(const mode of ['walking','motorcycle','car']){
 const start=Date.now();const response=await fetch(base+'/api/routing',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({origin:{latitude:-6.21412,longitude:106.68299},destination:{latitude:-6.218,longitude:106.687},mode,include_alternatives:true}),signal:AbortSignal.timeout(60000)});
 const body=await response.json(),data=body.data;report.routes.push({mode,http:response.status,status:data?.route_status,engine:data?.engine,distance_meters:data?.distance_meters,duration_seconds:data?.duration_seconds,geometry:data?.geometry?.type,points:data?.geometry?.coordinates?.length,ms:Date.now()-start,passed:response.ok&&data?.route_status==='ROUTABLE'&&data?.geometry?.coordinates?.length>2&&data?.distance_meters>0});
}
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox'],defaultViewport:{width:1440,height:1000}});
try{const page=await browser.newPage();await page.goto(front+'/international/cctv',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/AI Vision/i.test(b.textContent)),{timeout:60000});await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/AI Vision/i.test(b.textContent))?.click());await new Promise(r=>setTimeout(r,2000));report.ai_vision=await page.evaluate(()=>({explicit_status:document.querySelector('[data-ai-status]')?.getAttribute('data-ai-status')??null,canvas_count:document.querySelector('[role=tabpanel]')?.querySelectorAll('canvas').length??0,text:document.querySelector('[role=tabpanel]')?.textContent?.slice(0,10000)}));await page.screenshot({path:out+'/ai-vision.png',fullPage:true});}catch(e){report.browser_error=e.message;}finally{await browser.close();}
report.passed=report.urls.every(r=>r.http===200)&&report.routes.length===3&&report.routes.every(r=>r.passed)&&report.ai_vision?.explicit_status==='UNAVAILABLE'&&report.ai_vision?.canvas_count===0;
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,ai_vision:{...report.ai_vision,text:undefined}},null,2));if(!report.passed)process.exitCode=1;

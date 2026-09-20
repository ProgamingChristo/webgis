// Install QA-only tools under outputs/qa-tools; application dependencies are unchanged.
import { chromium } from '../outputs/qa-tools/node_modules/playwright/index.mjs';
import AxeBuilder from '../outputs/qa-tools/node_modules/@axe-core/playwright/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.GETRA_QA_URL || 'http://localhost:3100';
const output=process.env.GETRA_QA_OUTPUT || 'outputs/production-hardening/accessibility';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={base,checked_at:new Date().toISOString(),engine:'Playwright + axe-core, WCAG 2.1 AA automated subset',pages:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 for(const route of ['/login','/international/weather','/international/cctv']){
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.body.innerText.includes('Menyiapkan GETRA')&&document.body.innerText.length>150,{timeout:60000});
  if(route.includes('weather'))await page.waitForSelector('[data-basemap-status]', {state:'attached'});
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const entry={route,url:page.url(),violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>v.id),passes:result.passes.length};
  report.pages.push(entry);console.log(route,entry.violations.map(v=>v.id));
  await page.screenshot({path:`${output}/${route.replaceAll('/','_')}.png`});
 }
}finally{await browser.close();report.passed=report.pages.length===3&&report.pages.every(p=>p.violations.length===0);await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));}
if(!report.passed)process.exitCode=1;

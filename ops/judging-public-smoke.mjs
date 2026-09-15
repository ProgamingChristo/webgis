import puppeteer from "puppeteer-core";
import { approvedAccountFixture } from "../frontend/tests/routing/browser-user-fixture.mjs";
const web="https://getra-routing-api.tail0ed517.ts.net:8443",api="https://getra-routing-api.tail0ed517.ts.net",result={routing:"FAIL",ai:"FAIL",ai_http:null,ai_action:null,ai_region:false};
const browser=await puppeteer.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:"new",args:["--no-sandbox"]});
try{
  const account=approvedAccountFixture("USER"),page=await browser.newPage();
  await page.goto(`${web}/login`,{waitUntil:"networkidle2",timeout:60000});await page.type("#email",account.email);await page.type("#password",account.password);
  await Promise.all([page.waitForNavigation({waitUntil:"networkidle2",timeout:60000}).catch(()=>undefined),page.click('button[type="submit"]')]);if(!new URL(page.url()).pathname.startsWith("/app"))throw new Error("LOGIN_FAILED");
  const call=(path,body)=>page.evaluate(async({api,path,body})=>{const key=Object.keys(localStorage).find(x=>x.startsWith("sb-")&&x.endsWith("-auth-token"));const token=key?JSON.parse(localStorage.getItem(key)||"null")?.access_token:null;const response=await fetch(api+path,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});return{status:response.status,body:await response.json().catch(()=>null)}},{api,path,body});
  const routes=[];for(const mode of ["walking","motorcycle","car"])routes.push(await call("/api/routing",{origin:{latitude:-6.2151,longitude:106.6842},destination:{latitude:-6.218,longitude:106.687},mode}));
  if(routes.every(x=>x.status===200&&x.body?.data?.route_status==="ROUTABLE"&&x.body?.data?.geometry?.coordinates?.length>1))result.routing="PASS";
  const ai=await call("/api/ai/ask",{question:"bakso di jakarta pusat",active_experience:"GENERAL",context:{enable_search:true,origin:{latitude:-6.2,longitude:106.8}}}),action=ai.body?.data?.action;
  const structured=action||ai.body?.data?.map_action;result.ai_http=ai.status;result.ai_action=structured?.type||null;result.ai_region=/Jakarta Pusat/i.test(JSON.stringify(ai.body?.data||{}));result.ai_intent=ai.body?.data?.intent||null;
  if(ai.status===200&&ai.body?.success===true&&result.ai_region&&/bakso/i.test(JSON.stringify(ai.body?.data||{})))result.ai="PASS";
}finally{await browser.close()}
process.stdout.write(`${JSON.stringify(result)}\n`);if(result.routing!=="PASS"||result.ai!=="PASS")process.exitCode=1;

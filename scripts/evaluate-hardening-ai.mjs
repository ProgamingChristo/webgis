import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { ordinaryUserFixture } from '../frontend/tests/routing/browser-user-fixture.mjs';
const base=process.env.GETRA_QA_API || 'http://localhost:8180';
const output=process.env.GETRA_QA_OUTPUT || 'outputs/production-hardening/ai-live';
await mkdir(output,{recursive:true});
const questions=JSON.parse(await readFile('docs/production-hardening/ai-questions.json','utf8'));
const fixture=ordinaryUserFixture();
const login=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fixture),signal:AbortSignal.timeout(20000)});
const auth=await login.json();const token=auth.data?.session?.access_token;if(!login.ok||!token)throw new Error(`QA authentication failed (${login.status})`);
const report={base,started:new Date().toISOString(),kind:'Real HTTP /api/ai/ask; deterministic and configured tools; no mocked provider responses',results:[]};
const compatible={ROUTE:/ROUTE|ROUTING|JOURNEY|WALKING|CLARIFICATION/,UMKM:/UMKM|MERCHANT|OWNER|DISCOVERY/,CCTV:/CCTV/,WEATHER:/ENVIRONMENT/,EARTHQUAKE:/ENVIRONMENT/,FIRE:/ENVIRONMENT/,AIR_QUALITY:/ENVIRONMENT/,FLOOD:/ENVIRONMENT/,ACCESSIBILITY:/ACCESSIBILITY|ENVIRONMENT/,INTERNATIONAL:/ENVIRONMENT|TRANSIT/,COMMUNITY:/COMMUNITY/,ADMIN:/ADMIN|SAFETY|PROFILE/,PROMOTION:/PROMOTION|PAYMENT/,GENERAL_HELP:/HELP|IDENTITY|CHAT|GENERAL|CLARIFICATION|UNKNOWN|UNSUPPORTED/};
for(const row of questions){
 const started=Date.now();let result;
 try{
   const response=await fetch(`${base}/api/ai/ask`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({question:row.question,active_experience:'GENERAL',context:{origin:{latitude:-6.2,longitude:106.82}}}),signal:AbortSignal.timeout(60000)});
   const body=await response.json();const answer=body.data??{};
   result={...row,http:response.status,intent:answer.intent,answer:answer.answer,evidence:answer.evidence??[],limitations:answer.limitations??[],provider:answer.provider,latency_ms:Date.now()-started,intent_match:Boolean(compatible[row.expected_intent]?.test(answer.intent??'')),error_code:body.error?.code};
 }catch(error){result={...row,http:0,error:error.name,latency_ms:Date.now()-started,intent_match:false};}
 report.results.push(result);console.log(row.id,result.http,result.intent??result.error_code??result.error);
 await writeFile(`${output}/results.json`,JSON.stringify(report,null,2));
}
const latency=report.results.map(r=>r.latency_ms).sort((a,b)=>a-b);
report.finished=new Date().toISOString();report.metrics={questions:questions.length,successful_http:report.results.filter(r=>r.http===200).length,intent_accuracy:report.results.filter(r=>r.intent_match).length/questions.length,answers_with_evidence:report.results.filter(r=>r.evidence?.length).length,fallback_answers:report.results.filter(r=>/belum tersedia|tidak tersedia|belum dapat|pilih lokasi/i.test(r.answer??'')).length,p50_ms:latency[Math.floor(latency.length*.5)],p95_ms:latency[Math.floor(latency.length*.95)],hallucination_rate:null,groundedness:null,groundedness_note:'Requires claim-by-claim review; evidence presence alone is not a hallucination metric.'};
await writeFile(`${output}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report.metrics));
if(report.metrics.successful_http!==questions.length)process.exitCode=1;

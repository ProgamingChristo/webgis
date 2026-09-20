import { mkdir, writeFile } from 'node:fs/promises';
import { ordinaryUserFixture } from '../frontend/tests/routing/browser-user-fixture.mjs';
const base=process.env.GETRA_QA_API || 'http://localhost:8180';
const frontend=process.env.GETRA_QA_URL || 'http://localhost:3100';
const out=process.env.GETRA_QA_OUTPUT || 'outputs/production-hardening/security';
await mkdir(out,{recursive:true});
const report={base,frontend,checked_at:new Date().toISOString(),checks:[]};
async function check(name,url,init,expected,extra=()=>true){
 const start=Date.now();const r=await fetch(url,{...init,signal:AbortSignal.timeout(30000)});
 const headers=Object.fromEntries(['x-request-id','x-content-type-options','x-frame-options','access-control-allow-origin','content-security-policy'].map(k=>[k,r.headers.get(k)]));
 const row={name,status:r.status,ms:Date.now()-start,headers,passed:expected.includes(r.status)&&extra(r)};report.checks.push(row);await r.arrayBuffer();console.log(name,row.status,row.passed);
}
try{
 await check('anonymous profile denied',base+'/api/profile',{},[401]);
 await check('anonymous admin denied',base+'/api/admin/merchant-claims',{},[401]);
 await check('unknown layer',base+'/api/international/not-a-layer',{},[404]);
 await check('invalid coordinates',base+'/api/international/weather?lat=999&lon=106',{},[400]);
 await check('malformed JSON',base+'/api/international/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'},[400]);
 await check('oversized JSON',base+'/api/international/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'x'.repeat(17000)})},[413]);
 await check('untrusted origin blocked',base+'/api/international/registry',{headers:{Origin:'https://untrusted.example'}},[403],r=>!r.headers.get('access-control-allow-origin'));
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ordinaryUserFixture())});
 const body=await login.json();const token=body.data?.session?.access_token;if(!token)throw new Error('QA login failed');
 await check('ordinary user admin denied',base+'/api/admin/merchant-claims',{headers:{Authorization:`Bearer ${token}`}},[403]);
 await check('frontend security headers',frontend+'/login',{},[200],r=>r.headers.get('x-content-type-options')==='nosniff'&&r.headers.get('x-frame-options')==='DENY'&&r.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
}catch(e){report.error=e.message;}
report.passed=report.checks.length===9&&report.checks.every(c=>c.passed)&&!report.error;
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;

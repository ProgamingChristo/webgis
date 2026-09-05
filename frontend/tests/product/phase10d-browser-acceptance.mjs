// Opt-in shared staging QA. No account, friendship, merchant, or ingestion is created.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { approvedAccountFixture } from "../routing/browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.GETRA_FRONTEND_ORIGIN;
assert(origin?.startsWith("https://"), "EXPLICIT_QA_HTTPS_ORIGIN_REQUIRED");
const api = process.env.GETRA_TEST_API_ORIGIN || "https://getra-routing-api.tail0ed517.ts.net";
const output = resolve("outputs/phase10d");
mkdirSync(output, { recursive: true });
const evidence = { started: new Date().toISOString(), origin, physicalDevice: false, physicalTravel: false, checks: {}, http: [], screenshots: [] };
const browser = await chromium.launch({ channel: "msedge", headless: true });
const clean = value => String(value).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]").replace(/eyJ[A-Za-z0-9_.-]{25,}/g, "[redacted]").replace(/Bearer\s+\S+/gi, "[redacted]");
let context, page, fixture;
const button = name => page.getByRole("button", { name, exact: typeof name === "string" }).first();
const link = name => page.getByRole("link", { name, exact: typeof name === "string" }).first();
async function session(role) {
  await context?.close();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  fixture = approvedAccountFixture(role);
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on("response", r => { const u = new URL(r.url()); if (u.origin === api && u.pathname.startsWith("/api/")) evidence.http.push({ path: u.pathname, method: r.request().method(), http: r.status() }); });
  await page.route("**/api/**", async route => {
    const r = route.request(), u = new URL(r.url());
    const allowed = /^\/api\/(auth\/(login|logout)|routing$|onboarding$|ai\/ask$|business-space\/(compare|insight)$|analytics\/interpretation$)/.test(u.pathname);
    if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && !allowed) await route.abort("blockedbyclient");
    else await route.continue();
  });
}
async function login(destination = "/app") {
  await page.getByLabel("Email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await button("Masuk").click();
  await page.waitForURL(url => url.pathname === destination, { timeout: 45000 });
}
async function snapshot(name) {
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(overflow, false, "HORIZONTAL_OVERFLOW");
  await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true, mask: [page.getByText(fixture.email, { exact: true }), page.locator('input[type="email"]')] });
  evidence.screenshots.push({ name, viewport: page.viewportSize(), overflow });
}
async function check(name, run) {
  try { await run(); evidence.checks[name] = "PASS"; }
  catch (error) {
    evidence.checks[name] = "FAIL";
    evidence.failures ??= []; evidence.failures.push({ name, error: clean(error.message).slice(0,800), path: new URL(page.url()).pathname, visibleText: clean(await page.locator("body").innerText()).slice(0,12000) });
    await snapshot(`failure-${name}`).catch(() => {});
    await page.keyboard.press("Escape"); await page.setViewportSize({width:1440,height:1000});
  }
  writeFileSync(resolve(output,"evidence.json"),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({ check: name, result: evidence.checks[name] }));
}
async function apiRead(path) {
  return page.evaluate(async ({ api, path }) => {
    const key = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
    const token = key ? JSON.parse(localStorage.getItem(key))?.access_token : null;
    const r = await fetch(api + path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    return { http: r.status, success: j.success, provider: j.data?.provider, status: j.data?.status, privateInfo: /http:\/\/valhalla|:8002|\/home\/|access_token|service_role|stack/i.test(JSON.stringify(j)) };
  }, { api, path });
}
async function general() { await link("General").click(); await page.getByRole("region", { name: "Perencana rute" }).waitFor(); }
try {
  await session("USER");
  await check("deepLink", async () => {
    await page.goto(origin + "/business-space");
    await page.waitForURL("**/login?returnTo=*");
    assert.equal(new URL(page.url()).searchParams.get("returnTo"), "/business-space");
    await login("/business-space");
    await page.getByRole("heading", { name: "Temukan properti di sekitar peta" }).waitFor();
    await snapshot("business-direct-desktop");
  });
  await check("businessReturnComparison", async () => {
    await general(); await button("Fitur").click(); await link("Business Space").click();
    const cards = page.getByRole("complementary", { name: "Properti di area peta" }).getByRole("button");
    await cards.nth(1).waitFor({ timeout: 45000 });
    for (let i=0;i<2;i++) { await cards.nth(i).click(); await button("Bandingkan properti").click(); }
    const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/business-space/compare" && r.request().method() === "POST");
    await button("Bandingkan (2/4)").click(); assert.equal((await response).status(), 200);
    await page.waitForTimeout(1500); await snapshot("business-comparison-desktop");
    await page.setViewportSize({ width:390,height:844 }); await snapshot("business-comparison-mobile");
    await button("Buka menu GETRA").click(); await general();
    await page.setViewportSize({ width:1440,height:1000 });
  });
  await check("userNavigationAndProvider", async () => {
    await general(); await page.getByRole("region", { name: "Perencana rute" }).waitFor();
    assert((await page.locator("body").innerText()).includes("Asisten GETRA"));
    const state = await apiRead("/api/internal/routing/provider-health");
    assert.equal(state.http,200);assert.equal(state.status,"READY");assert.equal(state.privateInfo,false);
    await button("Fitur").click(); assert.equal(await link("Moderasi Kontribusi").count(),0); await button("Fitur").click();
    assert.equal((await apiRead("/api/admin/community/contributions")).http,403);
    await snapshot("general-desktop");
  });
  await check("drawerKeyboard", async () => {
    await page.setViewportSize({width:390,height:844});
    const trigger=button("Buka menu GETRA");await trigger.click();
    assert.equal(await page.evaluate(()=>document.querySelector("dialog[open]")?.contains(document.activeElement)),true);
    for(const key of ["Tab","Shift+Tab","Shift+Tab","Tab",...Array(16).fill("Tab")]) {
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(()=>document.querySelector("dialog[open]")?.contains(document.activeElement)),true);
    }
    await snapshot("drawer-mobile");await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(),0);
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    await trigger.click();await page.getByRole("dialog").getByRole("link",{name:"Community",exact:true}).click();
    assert.equal(await page.getByRole("dialog").count(),0);
    await page.setViewportSize({width:1440,height:1000});
  });
  await check("friendsEmptyErrorRetry", async () => {
    await link("Community").click(); await button("Teman").click();
    await button("Buka Teman").click();await page.getByRole("heading",{name:"Belum ada data."}).waitFor();
    assert.equal((await apiRead("/api/community/friends")).http,200);await snapshot("friends-real-empty");
    const failure=async route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({success:false,error:{code:"SERVICE_UNAVAILABLE",message:"Uji kegagalan terkontrol"}})});
    await page.route("**/api/community/friends?*",failure);await page.reload();
    await button("Coba lagi").waitFor();await page.unroute("**/api/community/friends?*",failure);
    await button("Coba lagi").click();await page.getByRole("heading",{name:"Belum ada data."}).waitFor();
    await page.setViewportSize({width:390,height:844});await snapshot("friends-mobile-recovered");
    await page.setViewportSize({width:1440,height:1000});
  });
  await check("experienceActivation", async () => {
    await button(/Profil/).click();await button("Pengaturan profil").click();await link("Kelola pengalaman").click();
    await page.getByRole("heading",{name:"Kelola pengalaman"}).waitFor();
    const umkm=button(/^UMKM/); const wasEnabled=await umkm.getAttribute("aria-pressed")==="true";
    evidence.originalUMKMMode=wasEnabled;
    assert.equal(wasEnabled,false,"GENERAL_FIXTURE_WITHOUT_UMKM_REQUIRED");
    try {
      await umkm.click();const response=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/onboarding"&&r.request().method()==="POST");
      await button("Simpan pengalaman").click();assert.equal((await response).status(),200);
      await page.waitForURL("**/settings/profile");await page.reload();
      await link("Kelola pengalaman").click();assert.equal(await button(/^UMKM/).getAttribute("aria-pressed"),"true");
      await page.setViewportSize({width:390,height:844});await snapshot("experience-activation-mobile");
    } finally {
      if(new URL(page.url()).pathname!=="/onboarding") await page.goto(origin+"/onboarding?returnTo=%2Fsettings%2Fprofile");
      if(await button(/^UMKM/).getAttribute("aria-pressed")==="true") {
        await button(/^UMKM/).click();await button(/Lanjutkan dengan General|Simpan pengalaman/).click();
        await page.waitForURL("**/settings/profile");
      }
      evidence.fixtureModeRestored=true;
      await page.setViewportSize({width:1440,height:1000});
    }
  });
  await check("umkmEntry",async()=>{await link("UMKM").click();await page.waitForURL("**/umkm");await page.waitForTimeout(2000);await snapshot("umkm-entry");});
  await session("ADMIN");await page.goto(origin+"/login");await login();
  await check("adminModerationEntry",async()=>{
    await button("Fitur").click();await link("Moderasi Kontribusi").click();await page.waitForURL("**/admin/community/contributions");
    assert.equal((await apiRead("/api/admin/community/contributions")).http,200);await snapshot("admin-moderation-desktop");
    await page.setViewportSize({width:390,height:844});await snapshot("admin-moderation-mobile");
    await link("Kembali").click();await button("Buka menu GETRA").click();await link("Mission Data").click();
    await page.setViewportSize({width:1440,height:1000});
  });
  await check("missionReadErrorRecovery",async()=>{
    if(!page.url().endsWith("/admin/mission-data")){await button("Fitur").click();await link("Mission Data").click();}
    assert.equal((await apiRead("/api/admin/mission/sync")).http,200);
    await page.waitForTimeout(2000);await snapshot("mission-desktop");
    const failure=async route=>route.request().method()==="GET"?route.fulfill({status:500,contentType:"application/json",body:JSON.stringify({success:false,error:{code:"DATABASE_ERROR",message:"Uji status gagal"}})}):route.abort();
    await page.route("**/api/admin/mission/sync",failure);await button("Muat ulang status sinkronisasi").click();await page.getByText("Uji status gagal",{exact:true}).waitFor();
    assert.equal(await page.getByText("Siap",{exact:true}).count(),0);
    assert((await page.locator("body").innerText()).includes("Status belum dapat dipastikan"));
    await snapshot("mission-controlled-error");await page.unroute("**/api/admin/mission/sync",failure);
    const recovery=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/admin/mission/sync"&&r.request().method()==="GET");
    await button("Muat ulang status sinkronisasi").click();assert.equal((await recovery).status(),200);
    await page.waitForTimeout(1000);assert.equal(await page.getByText("Uji status gagal",{exact:true}).count(),0);
    await page.setViewportSize({width:390,height:844});await snapshot("mission-mobile-recovered");
  });
} catch(error) { evidence.fatal=clean(error.message).slice(0,500); }
finally {
  evidence.status=!evidence.fatal&&Object.values(evidence.checks).every(v=>v==="PASS")?"PASS":"FAIL";
  evidence.finished=new Date().toISOString();await browser.close();
  writeFileSync(resolve(output,"evidence.json"),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({status:evidence.status,checks:evidence.checks,fatal:evidence.fatal}));
  if(evidence.status!=="PASS")process.exitCode=1;
}

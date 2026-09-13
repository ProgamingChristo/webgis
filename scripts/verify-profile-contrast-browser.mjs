import puppeteer from "puppeteer-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const origin = process.env.GETRA_QA_ORIGIN || "http://localhost:3100";
const env = await readFile("frontend/.env.local", "utf8");
const supabaseUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\r\n"']+)/m)?.[1];
if (!supabaseUrl) throw new Error("Public Supabase URL unavailable");

const userId = "11111111-1111-4111-8111-111111111111";
const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
const profile = {
  id: userId,
  display_name: "ADMIN Updated Name",
  username: "admin.getra",
  avatar_url: null,
  bio: "Profil uji keterbacaan GETRA.",
  account_role: "ADMIN",
  stakeholder_modes: ["UMKM", "INVESTOR", "GOVERNMENT"],
  trust_score: 50,
  created_at: "2026-09-01T08:00:00.000Z",
};
const context = {
  user: { id: userId, email: "admin@example.test" },
  profile: { ...profile, onboarding_complete: true },
  stakeholder_modes: profile.stakeholder_modes,
};

const output = "outputs/profile-contrast";
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const errors = [];
const failedRequests = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 500) failedRequests.push(`${response.status()} ${response.url()}`);
});
await page.evaluateOnNewDocument((key, id) => {
  const session = {
    access_token: "profile-contrast-fixture",
    refresh_token: "profile-contrast-fixture",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: { id, email: "admin@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
  localStorage.setItem(key, JSON.stringify(session));
}, storageKey, userId);

await page.setRequestInterception(true);
page.on("request", async (request) => {
  try {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname.startsWith("/api/")) {
      let data = {};
      if (url.pathname === "/api/auth/me") data = context;
      else if (url.pathname === "/api/profiles") data = { profiles: [profile] };
      else if (url.pathname === `/api/profiles/${userId}`) data = profile;
      return request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    }
    return request.continue();
  } catch {
    if (!request.isInterceptResolutionHandled()) await request.abort();
  }
});

function auditExpression() {
  const parse = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const luminance = (value) => {
    const channels = parse(value).map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const inspect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const style = getComputedStyle(element);
    const backgroundElement = element.closest(".user-type-badge, .user-profile-mode, .account-menu__panel, a") || element;
    const background = getComputedStyle(backgroundElement).backgroundColor;
    const lighter = Math.max(luminance(style.color), luminance(background));
    const darker = Math.min(luminance(style.color), luminance(background));
    return { selector, text: element.textContent.trim(), color: style.color, background, contrast: Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2)) };
  };
  return {
    overflow: document.documentElement.scrollWidth > innerWidth,
    trust: inspect(".profile-trust-score"),
    adminBadge: inspect(".user-type-badge--admin"),
    profileCard: inspect(".user-profile-mode strong"),
    profileCopy: inspect(".user-profile-mode p"),
  };
}

try {
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/users`, { waitUntil: "networkidle2", timeout: 60_000 });
  await page.waitForSelector(".profile-trust-score");
  await page.click(".account-menu__trigger");
  await page.waitForSelector(".account-menu__panel");
  const directory = await page.evaluate(auditExpression);
  await page.screenshot({ path: `${output}/directory-and-account-menu.png`, fullPage: true });

  await page.goto(`${origin}/users/${userId}`, { waitUntil: "networkidle2", timeout: 60_000 });
  await page.waitForSelector(".user-profile-mode");
  const profileDesktop = await page.evaluate(auditExpression);
  await page.screenshot({ path: `${output}/profile-desktop.png`, fullPage: true });

  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector(".user-profile-mode");
  const profileMobile = await page.evaluate(auditExpression);
  await page.screenshot({ path: `${output}/profile-mobile.png`, fullPage: true });

  const measured = [directory.trust, directory.adminBadge, profileDesktop.adminBadge, profileDesktop.profileCard, profileDesktop.profileCopy].filter(Boolean);
  const pass = errors.length === 0 && failedRequests.length === 0 && !directory.overflow && !profileDesktop.overflow && !profileMobile.overflow && measured.every((item) => item.contrast >= 4.5);
  const result = { pass, errors, failedRequests, directory, profileDesktop, profileMobile };
  await writeFile(`${output}/browser-audit.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (!pass) process.exitCode = 1;
} finally {
  await browser.close();
}

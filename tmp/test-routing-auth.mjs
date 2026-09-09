import { createClient } from "@supabase/supabase-js";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Set ${name} before running this manual diagnostic.`);
  return value;
}

async function run() {
  const email = requiredEnv("GETRA_TEST_USER_EMAIL");
  const password = requiredEnv("GETRA_TEST_USER_PASSWORD");
  const browserOrigin = new URL(requiredEnv("GETRA_FRONTEND_ORIGIN")).origin;
  const targets = (process.env.GETRA_ROUTING_TARGETS || `${requiredEnv("GETRA_BACKEND_ORIGIN").replace(/\/+$/, "")}/api/routing`)
    .split(",").map((target) => target.trim());
  for (const target of targets) {
    const url = new URL(target);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) {
      throw new Error("Routing targets must be HTTP(S) URLs without embedded credentials or fragments.");
    }
  }
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  console.log("Signing in with test credentials...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    throw new Error(`Authentication failed (${authError?.status ?? "no session"}).`);
  }

  const token = authData.session.access_token;
  console.log("Authenticated successfully.");

  const payload = {
    origin: { latitude: -6.21412, longitude: 106.68299 },
    destination: { latitude: -6.218, longitude: 106.687 },
    mode: "motorcycle",
  };

  let failures = 0;
  for (const url of targets) {
    console.log(`\n--- Testing ${url} ---`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Origin": browserOrigin,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });

      console.log(`HTTP status: ${res.status}`);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (res.ok && json.data?.route_status === "ROUTABLE") {
          const count = json.data.route_candidates?.length ?? json.data.routes?.length ?? 1;
          console.log(`Routable: ${count} candidate(s), distance: ${json.data.distance_meters}m, duration: ${json.data.duration_seconds}s`);
        } else {
          failures += 1;
          console.error("Routing failed:", json.data?.route_status ?? json.error?.code ?? "INVALID_RESPONSE");
        }
      } catch {
        failures += 1;
        console.error("Routing failed: response was not JSON.");
      }
    } catch (err) {
      failures += 1;
      console.error(`Fetch failed (${err instanceof Error ? err.name : "unknown error"}).`);
    }
  }
  if (failures) throw new Error(`${failures} routing target(s) failed.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

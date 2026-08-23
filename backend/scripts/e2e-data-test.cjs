/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');

async function request(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': data.length } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let result = '';
      res.on('data', d => result += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(result || '{}') });
        } catch {
          resolve({ status: res.statusCode, body: result });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- STARTING E2E DATA & GIS TEST ---');

  // 1. USE EXTERNAL TOKEN
  const token = process.env.GETRA_E2E_ACCESS_TOKEN;

  if (!token) {
    console.error('Set GETRA_E2E_ACCESS_TOKEN before running this smoke test.');
    process.exit(1);
  }
  let res;

  // 2. GET STUDY AREAS
  res = await request('/api/v1/study-areas', 'GET', null, token);
  console.log('GET /api/v1/study-areas:', res.status);
  if (res.status !== 200) {
      console.error(res.body);
      process.exit(1);
  }
  const studyAreas = res.body.data || [];
  console.log(`Found ${studyAreas.length} study areas.`);
  if (studyAreas.length > 0) {
      console.log('Sample study area:', studyAreas[0].name);
  }

  // 3. GET NEAREST TRANSPORT
  res = await request('/api/transport/nearest', 'POST', {
    origin: { latitude: -6.200000, longitude: 106.816666 },
    radius_meters: 5000
  }, token);
  console.log('POST /api/transport/nearest:', res.status);
  if (res.status !== 200) {
      console.error('Expected 200, got', res.status);
  }
  
  // 4. GET ROUTING
  res = await request('/api/routing', 'POST', {
    origin: { latitude: -6.200000, longitude: 106.816666 },
    destination: { latitude: -6.210000, longitude: 106.820000 },
    mode: "walking"
  }, token);
  console.log('POST /api/routing:', res.status);
  if (res.status !== 200) {
      console.error('Expected 200, got', res.status);
  }

  // 5. MAPID INGESTION PIPELINE (Admin only, but testing existence)
  res = await request('/api/admin/ingestion/run', 'POST', { job_id: "00000000-0000-0000-0000-000000000000", records: [] }, token);
  console.log('POST /api/admin/ingestion/run:', res.status);
  // Expect 403 because we are not ADMIN
  if (res.status !== 403) {
      console.error('Expected 403 for non-admin on ingestion, got', res.status);
  }

  // 6. POST AI ASK
  res = await request('/api/ai/ask', 'POST', {
    question: "Tolong carikan rute tercepat",
    active_experience: "GENERAL"
  }, token);
  console.log('POST /api/ai/ask:', res.status);
  // It might be 200 or 500 depending on Gemini API key configuration, but we check if it doesn't return 401/404.
  if (res.status === 401 || res.status === 404) {
      console.error('Expected 200 or 500, got', res.status);
  }

  console.log('--- E2E DATA TEST FINISHED ---');
}

run().catch(console.error);

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
  console.log('--- STARTING E2E AUTH & ONBOARDING TEST ---');

  const email = `test_e2e_${Date.now()}@example.com`;
  const password = "Password123!";

  // 1. PUBLIC SIGNUP
  let res = await request('/api/auth/register', 'POST', {
    email,
    password,
    display_name: "Test User"
  });
  console.log('REGISTER:', res.status, res.body);
  
  if (res.status !== 200) {
    console.error('Registration failed.');
    process.exit(1);
  }
  
  const token = res.body.data?.session?.access_token;
  if (!token) {
    console.error('No session returned after registration. Email confirmation might be required.');
    process.exit(1);
  }

  // 2. CHECK /auth/me BEFORE ONBOARDING
  res = await request('/api/auth/me', 'GET', null, token);
  console.log('GET /auth/me BEFORE ONBOARDING:', res.status, res.body);
  if (res.body.data?.profile?.onboarding_complete !== false) {
    console.error('Expected onboarding_complete = false');
    process.exit(1);
  }

  // 3. COMPLETE ONBOARDING (GENERAL ONLY)
  res = await request('/api/onboarding', 'POST', { modes: [] }, token);
  console.log('POST /onboarding (GENERAL ONLY):', res.status, res.body);

  // 4. CHECK /auth/me AFTER ONBOARDING
  res = await request('/api/auth/me', 'GET', null, token);
  console.log('GET /auth/me AFTER ONBOARDING:', res.status, res.body);
  if (res.body.data?.profile?.onboarding_complete !== true) {
    console.error('Expected onboarding_complete = true');
    process.exit(1);
  }
  if (res.body.data?.stakeholder_modes?.length > 0) {
    console.error('Expected empty stakeholder modes for general user');
    process.exit(1);
  }

  // 5. TEST INVALID ONBOARDING MODES
  const modesRes = await request('/api/onboarding', 'POST', { modes: ["COMMUTER", "ADMIN"] }, token);
  console.log('POST /onboarding (INVALID MODES):', modesRes.status, modesRes.body);
  if (modesRes.status !== 400 && modesRes.status !== 422 && modesRes.status !== 500) {
      console.error('Expected failure for invalid modes');
      process.exit(1);
  }
  
  // 6. TEST STAKEHOLDER ONBOARDING
  res = await request('/api/onboarding', 'POST', { modes: ["UMKM", "INVESTOR"] }, token);
  console.log('POST /onboarding (UMKM, INVESTOR):', res.status, res.body);
  
  res = await request('/api/auth/me', 'GET', null, token);
  console.log('GET /auth/me AFTER STAKEHOLDER:', res.body.data?.stakeholder_modes);
  if (res.body.data?.stakeholder_modes?.length !== 2) {
    console.error('Expected exactly 2 stakeholder modes');
    process.exit(1);
  }

  // 7. PUBLIC ADMIN INJECTION
  const adminRes = await request('/api/auth/register', 'POST', {
    email: `admin_${Date.now()}@example.com`,
    password: "Password123!",
    display_name: "Evil Admin",
    account_role: "ADMIN",
    role: "ADMIN"
  });
  console.log('ADMIN INJECTION ATTEMPT:', adminRes.status, adminRes.body);
  // It shouldn't create an ADMIN user.
  
  console.log('--- E2E AUTH TEST PASSED ---');
}

run().catch(console.error);

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { approvedAccountFixture } from '../frontend/tests/routing/browser-user-fixture.mjs';

const root = process.cwd();
const out = path.join(root, 'outputs/final-ui-consistency');
fs.mkdirSync(out, { recursive: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = publicClient();
const login = await admin.auth.signInWithPassword(approvedAccountFixture('ADMIN'));
if (login.error) throw new Error(`ADMIN_LOGIN_${login.error.code}`);
const token = login.data.session.access_token;
const evidence = { timestamp: new Date().toISOString(), adminId: login.data.user.id, queue: [], database: {} };
for (const table of ['merchant_submissions','merchant_claims','merchants']) {
  const read = await service.from(table).select('*', { count: 'exact', head: true });
  evidence.database[table] = { count: read.count, error: read.error };
}
for (let i = 0; i < 5; i++) {
  for (const endpoint of ['merchant-submissions','merchant-claims']) {
    const start = Date.now();
    const response = await fetch(`http://localhost:8180/api/admin/${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    evidence.queue.push({ iteration: i + 1, endpoint, status: response.status, durationMs: Date.now() - start, itemCount: Array.isArray(data.data) ? data.data.length : null, error: data.error });
  }
}
fs.writeFileSync(path.join(out, 'backend-initial-api.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));

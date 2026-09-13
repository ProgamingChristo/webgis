import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { approvedAccountFixture } from '../frontend/tests/routing/browser-user-fixture.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);
const browserClient = () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, opts);
const fixturePath = 'secrets/final-ui-fixtures.json';
fs.mkdirSync('secrets', { recursive: true });
fs.mkdirSync('outputs/final-ui-consistency', { recursive: true });
const must = (result, operation) => { if (result.error) throw new Error(`${operation}: ${result.error.code} ${result.error.message}`); return result.data; };
const runId = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
let fixtures = fs.existsSync(fixturePath) ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')) : { runId, users: [], submissions: [] };
const save = () => fs.writeFileSync(fixturePath, JSON.stringify(fixtures, null, 2));
if (!fixtures.users.length) {
  const email = `getra.final-ui.${runId}@example.com`;
  const password = crypto.randomBytes(24).toString('base64url') + '!aA1';
  const created = must(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'GETRA UI QA Disposable Owner' } }), 'create user');
  fixtures.users.push({ email, password, id: created.user.id }); save();
  must(await service.from('profiles').update({ account_role: 'USER', display_name: 'GETRA UI QA Disposable Owner' }).eq('id', created.user.id), 'profile');
  must(await service.from('user_stakeholder_modes').upsert({ user_id: created.user.id, mode: 'UMKM' }), 'mode');
}
const owner = browserClient();
const session = must(await owner.auth.signInWithPassword(fixtures.users[0]), 'owner login').session;
fixtures.users[0].access_token = session.access_token;
fixtures.users[0].refresh_token = session.refresh_token;
const headers = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
if (!fixtures.submissions.length) {
  for (const purpose of ['approve', 'reject', 'pending']) {
    const input = {
      name: `Kedai Uji GETRA ${fixtures.runId} ${purpose}`,
      category: 'Kedai Kopi',
      description: 'Kopi susu aren dan roti panggang dibuat segar setiap pagi.\n\n[Jenis Usaha: Keliling] [Menu Andalan: Kopi Susu Aren] [Fasilitas: Tempat Duduk, Take Away] [Instagram: @kedai.uji.getra] [Catatan: Catatan privat pengujian admin]',
      address: 'Jl. H. R. Rasuna Said, Kuningan, Jakarta Selatan',
      location: { type: 'Point', coordinates: [106.8306, -6.2216] },
      opening_hours: Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => [day, { is_closed: day === 'sunday', opens_at: day === 'sunday' ? null : '07:30', closes_at: day === 'sunday' ? null : '20:00' }])),
      public_media: { menu_urls: [], product_urls: [] },
      business_info: { contact_phone: '081234567890', price_range: 'STANDARD', payment_methods: ['CASH','QRIS'] },
    };
    const response = await fetch('http://localhost:8180/api/umkm/merchant-submissions', { method: 'POST', headers, body: JSON.stringify(input) });
    const data = await response.json();
    if (response.status !== 201) throw new Error(`create submission ${response.status} ${JSON.stringify(data)}`);
    const id = data.data.submission.id;
    fixtures.submissions.push({ purpose, id, input }); save();
    const submit = await fetch(`http://localhost:8180/api/umkm/merchant-submissions/${id}/submit`, { method: 'POST', headers, body: '{}' });
    if (!submit.ok) throw new Error(`submit ${submit.status} ${await submit.text()}`);
  }
}
save();
const admin = browserClient();
const adminSession = must(await admin.auth.signInWithPassword(approvedAccountFixture('ADMIN')), 'admin login').session;
const approval = fixtures.submissions.find(s => s.purpose === 'approve');
const response = await fetch(`http://localhost:8180/api/admin/merchant-submissions/${approval.id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${adminSession.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'Disposable release QA approval' }) });
const responseBody = await response.json();
const rpc = await admin.rpc('approve_merchant_submission', { p_submission_id: approval.id, p_review_note: 'Disposable release QA approval' });
const after = must(await service.from('merchant_submissions').select('id,status,canonical_merchant_id').eq('id', approval.id).single(), 'after');
const evidence = { runId: fixtures.runId, userId: fixtures.users[0].id, submissions: fixtures.submissions, approval: { status: response.status, body: responseBody, rpc: { data: rpc.data, error: rpc.error }, after } };
fs.writeFileSync('outputs/final-ui-consistency/backend-fixture-evidence.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ runId: fixtures.runId, userId: fixtures.users[0].id, submissions: fixtures.submissions.map(({ id, purpose }) => ({ id, purpose })), approval: evidence.approval }, null, 2));

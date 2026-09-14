import { createClient } from '@supabase/supabase-js';

const url = 'https://sesakxnjaphrxqxllqjm.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlc2FreG5qYXBocnhxeGxscWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUzOTk0OCwiZXhwIjoyMTAyMTE1OTQ4fQ.iCkUIPqX-VcYIkIi3M4n89voeTkG0NUy7HRGz6zD80U';
const client = createClient(url, key);

async function run() {
  const { data: users, error: uErr } = await client.auth.admin.listUsers();
  if (uErr) {
    console.error('listUsers error:', uErr);
    return;
  }
  const qaUser = users?.users?.find(u => u.email === 'qa_user_1789373472055@getra.local');
  console.log('qaUser id:', qaUser?.id);

  if (!qaUser) return;

  const { data: merchs } = await client.from('merchants').select('id, name').ilike('name', '%christo%');
  console.log('merchants:', merchs);

  if (merchs && merchs.length > 0) {
    const mId = merchs[0].id;
    const { error: updErr } = await client.from('merchants').update({ owner_user_id: qaUser.id }).eq('id', mId);
    console.log('Assigned merchant to qaUser!', updErr || 'OK');
  }

  // Also check if any merchants exist at all
  const { data: allMerchs } = await client.from('merchants').select('id, name, owner_user_id').limit(5);
  console.log('allMerchs:', allMerchs);
  if (allMerchs && allMerchs.length > 0) {
    for (const m of allMerchs) {
      await client.from('merchants').update({ owner_user_id: qaUser.id }).eq('id', m.id);
    }
    console.log('Assigned top merchants to qaUser as well!');
  }
}

run().catch(console.error);

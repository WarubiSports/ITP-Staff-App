const { createClient } = require('@supabase/supabase-js');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MDQ3MDAsImV4cCI6MjA4MjQ4MDcwMH0.V2Msr5JzCaKT3bPJw3ypwk1neyCmf5yLsJvRbI64fNo';
const URL = 'https://umblyhwumtadlvgccdwg.supabase.co';

async function test() {
  // Test 1: Basic select with anon key
  const anonClient = createClient(URL, ANON_KEY);
  const { data, error } = await anonClient.from('events').select('id').limit(1);
  console.log('Anon SELECT:', error ? 'FAILED - ' + error.message : 'OK (' + data.length + ' rows)');

  // Test 2: Select with service role
  const svcClient = createClient(URL, SERVICE_KEY);
  const { data: svcData, error: svcErr } = await svcClient.from('events').select('id').limit(1);
  console.log('Service SELECT:', svcErr ? 'FAILED - ' + svcErr.message : 'OK (' + svcData.length + ' rows)');

  // Test 3: Get a user session and test INSERT on event_attendees
  const { data: linkData } = await svcClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'th.el@warubi-sports.com',
  });
  const token = linkData?.properties?.hashed_token;

  // Verify OTP using the anon client to get a session
  const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
    token_hash: token,
    type: 'magiclink'
  });
  if (verifyErr) {
    console.log('Verify failed:', verifyErr.message);
    return;
  }
  console.log('User:', verifyData.user.email, 'Role:', verifyData.user.role);

  // Test 4: After session, try SELECT and INSERT
  const { data: selData, error: selErr } = await anonClient.from('events').select('id').limit(1);
  console.log('Authed SELECT:', selErr ? 'FAILED - ' + selErr.message : 'OK (' + selData.length + ' rows)');

  const { data: ev } = await svcClient.from('events').select('id').limit(1).single();
  const { data: pl } = await svcClient.from('players').select('id').limit(1).single();

  const { data: ins, error: insErr } = await anonClient
    .from('event_attendees')
    .insert({ event_id: ev.id, player_id: pl.id, status: 'pending' })
    .select('id')
    .single();
  console.log('Authed INSERT:', insErr ? 'FAILED - ' + insErr.message + ' (code: ' + insErr.code + ', hint: ' + insErr.hint + ')' : 'OK id=' + ins.id);

  if (ins) await svcClient.from('event_attendees').delete().eq('id', ins.id);
}

test().catch(e => console.error(e));

/**
 * Verify Schema Dependencies for RLS Migration
 * Checks that all required tables/columns exist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verify() {
  console.log('🔍 Verifying Schema Dependencies\n');

  // Check 1: member_client_access table structure
  console.log('1️⃣  Checking member_client_access schema...');
  const { data: mca, error: mcaError } = await supabase
    .from('member_client_access')
    .select('*')
    .limit(1);

  if (mcaError) {
    console.log(`   ❌ CRITICAL: member_client_access query failed: ${mcaError.message}`);
    process.exit(1);
  } else {
    console.log('   ✅ member_client_access table exists and is queryable');
    if (mca && mca.length > 0) {
      console.log('   Columns:', Object.keys(mca[0]).join(', '));
    }
  }

  // Check 2: role table has hierarchy_level
  console.log('\n2️⃣  Checking role.hierarchy_level column...');
  const { data: roles, error: roleError } = await supabase
    .from('role')
    .select('id, name, hierarchy_level')
    .limit(1);

  if (roleError) {
    console.log(`   ❌ CRITICAL: role query failed: ${roleError.message}`);
    process.exit(1);
  } else if (roles && roles.length > 0) {
    if ('hierarchy_level' in roles[0]) {
      console.log('   ✅ role.hierarchy_level exists');
      console.log(`   Example: ${roles[0].name} (level ${roles[0].hierarchy_level})`);
    } else {
      console.log('   ❌ CRITICAL: hierarchy_level column missing from role table');
      process.exit(1);
    }
  }

  // Check 3: user table has role_id
  console.log('\n3️⃣  Checking user.role_id column...');
  const { data: users, error: userError } = await supabase
    .from('user')
    .select('id, role_id, agency_id')
    .limit(1);

  if (userError) {
    console.log(`   ❌ CRITICAL: user query failed: ${userError.message}`);
    process.exit(1);
  } else if (users && users.length > 0) {
    if ('role_id' in users[0] && 'agency_id' in users[0]) {
      console.log('   ✅ user.role_id and user.agency_id exist');
    } else {
      console.log('   ❌ CRITICAL: Missing columns in user table');
      process.exit(1);
    }
  }

  // Check 4: client table has agency_id
  console.log('\n4️⃣  Checking client.agency_id column...');
  const { data: clients, error: clientError } = await supabase
    .from('client')
    .select('id, agency_id')
    .limit(1);

  if (clientError) {
    console.log(`   ❌ CRITICAL: client query failed: ${clientError.message}`);
    process.exit(1);
  } else if (clients && clients.length > 0) {
    if ('agency_id' in clients[0]) {
      console.log('   ✅ client.agency_id exists');
    } else {
      console.log('   ❌ CRITICAL: agency_id missing from client table');
      process.exit(1);
    }
  }

  // Check 5: communication table has client_id and agency_id
  console.log('\n5️⃣  Checking communication schema...');
  const { data: comms, error: commError } = await supabase
    .from('communication')
    .select('id, client_id, agency_id')
    .limit(1);

  if (commError) {
    console.log(`   ❌ CRITICAL: communication query failed: ${commError.message}`);
    process.exit(1);
  } else if (comms && comms.length > 0) {
    if ('client_id' in comms[0] && 'agency_id' in comms[0]) {
      console.log('   ✅ communication.client_id and agency_id exist');
    } else {
      console.log('   ❌ CRITICAL: Missing columns in communication table');
      process.exit(1);
    }
  } else {
    console.log('   ⚠️  communication table empty (expected for new installs)');
  }

  // Check 6: ticket table has client_id and agency_id
  console.log('\n6️⃣  Checking ticket schema...');
  const { data: tickets, error: ticketError } = await supabase
    .from('ticket')
    .select('id, client_id, agency_id')
    .limit(1);

  if (ticketError) {
    console.log(`   ❌ CRITICAL: ticket query failed: ${ticketError.message}`);
    process.exit(1);
  } else if (tickets && tickets.length > 0) {
    if ('client_id' in tickets[0] && 'agency_id' in tickets[0]) {
      console.log('   ✅ ticket.client_id and agency_id exist');
    } else {
      console.log('   ❌ CRITICAL: Missing columns in ticket table');
      process.exit(1);
    }
  } else {
    console.log('   ⚠️  ticket table empty (expected for new installs)');
  }

  // Check 7: role_permission table exists
  console.log('\n7️⃣  Checking role_permission table...');
  const { data: rp, error: rpError } = await supabase
    .from('role_permission')
    .select('role_id, permission_id')
    .limit(1);

  if (rpError) {
    console.log(`   ❌ CRITICAL: role_permission query failed: ${rpError.message}`);
    process.exit(1);
  } else {
    console.log('   ✅ role_permission table exists');
  }

  console.log('\n✅ ALL SCHEMA DEPENDENCIES VERIFIED\n');
  console.log('The database schema is ready for RLS migration.\n');
}

verify().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

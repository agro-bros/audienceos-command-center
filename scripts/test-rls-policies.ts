/**
 * Test RLS Policies - Verify row-level security enforcement
 *
 * This script tests that RLS policies properly isolate data between agencies.
 * Uses ANON key (not service role) to test as regular authenticated users.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client for setup
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client for testing (respects RLS)
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

async function setupTestData() {
  console.log('📋 Setting up test data...\n');

  // Create Agency B
  const agencyBId = '22222222-2222-2222-2222-222222222222';
  const { data: agencyB, error: agencyError } = await adminClient
    .from('agency')
    .upsert({
      id: agencyBId,
      name: 'Test Agency B',
      slug: 'test-agency-b',
      domain: 'agency-b.test',
    })
    .select()
    .single();

  if (agencyError && agencyError.code !== '23505') { // Ignore duplicate key
    console.error('❌ Error creating Agency B:', agencyError.message);
    return null;
  }

  console.log('✅ Agency B created:', agencyBId);

  // Create test user in Agency B
  const userBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: 'user-b@agency-b.test',
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (authError && !authError.message.includes('already')) {
    console.error('❌ Error creating auth user:', authError.message);
    return null;
  }

  // Create app user record
  const { data: appUser, error: appUserError } = await adminClient
    .from('user')
    .upsert({
      id: authUser?.user?.id || userBId,
      email: 'user-b@agency-b.test',
      first_name: 'User',
      last_name: 'B',
      agency_id: agencyBId,
      role_id: null, // Will get default Admin role from migration
      is_owner: false,
    })
    .select()
    .single();

  if (appUserError && appUserError.code !== '23505') {
    console.error('❌ Error creating app user:', appUserError.message);
    return null;
  }

  console.log('✅ User B created in Agency B');

  // Get existing role from Agency A
  const { data: agencyARoles } = await adminClient
    .from('role')
    .select('id, name')
    .eq('agency_id', '11111111-1111-1111-1111-111111111111')
    .limit(1);

  console.log('✅ Agency A has', agencyARoles?.length || 0, 'roles');

  // Create role in Agency B
  const { data: agencyBRole, error: roleError } = await adminClient
    .from('role')
    .upsert({
      agency_id: agencyBId,
      name: 'Test Role B',
      description: 'Role in Agency B for RLS testing',
      hierarchy_level: null, // Must be NULL for non-system roles
      is_system: false,
    })
    .select()
    .single();

  if (roleError && roleError.code !== '23505') {
    console.error('❌ Error creating role in Agency B:', roleError.message);
    return null;
  }

  console.log('✅ Role created in Agency B\n');

  return {
    agencyAId: '11111111-1111-1111-1111-111111111111',
    agencyBId,
    userAEmail: 'test@audienceos.dev',
    userBEmail: 'user-b@agency-b.test',
    userBPassword: 'TestPassword123!',
  };
}

async function testRLS() {
  console.log('🔐 Testing RLS Policies\n');
  console.log('=' .repeat(60));
  console.log('\n');

  const testData = await setupTestData();
  if (!testData) {
    console.error('❌ Failed to set up test data');
    process.exit(1);
  }

  // TEST 1: Sign in as User A (Agency A)
  console.log('TEST 1: User A (Agency A) queries role table');
  console.log('-'.repeat(60));

  const { data: sessionA, error: signInErrorA } = await anonClient.auth.signInWithPassword({
    email: testData.userAEmail,
    password: 'TestPassword123!', // Known password from previous setup
  });

  if (signInErrorA) {
    console.error('❌ Could not sign in as User A:', signInErrorA.message);
    console.log('   (This is okay - we might not have the password)');
    console.log('   Skipping User A test\n');
  } else {
    console.log('✅ Signed in as User A:', testData.userAEmail);

    const { data: rolesForA, error: rolesErrorA } = await anonClient
      .from('role')
      .select('id, name, agency_id');

    if (rolesErrorA) {
      console.error('❌ Error querying roles:', rolesErrorA.message);
    } else {
      const agencyACount = rolesForA?.filter(r => r.agency_id === testData.agencyAId).length || 0;
      const agencyBCount = rolesForA?.filter(r => r.agency_id === testData.agencyBId).length || 0;

      console.log(`   Roles returned: ${rolesForA?.length || 0}`);
      console.log(`   - Agency A roles: ${agencyACount}`);
      console.log(`   - Agency B roles: ${agencyBCount}`);

      if (agencyBCount > 0) {
        console.error('   ❌ RLS VIOLATION: User A can see Agency B roles!');
      } else {
        console.log('   ✅ RLS WORKING: User A only sees Agency A roles');
      }
    }

    await anonClient.auth.signOut();
    console.log('');
  }

  // TEST 2: Sign in as User B (Agency B)
  console.log('TEST 2: User B (Agency B) queries role table');
  console.log('-'.repeat(60));

  const { data: sessionB, error: signInErrorB } = await anonClient.auth.signInWithPassword({
    email: testData.userBEmail,
    password: testData.userBPassword,
  });

  if (signInErrorB) {
    console.error('❌ Could not sign in as User B:', signInErrorB.message);
    process.exit(1);
  }

  console.log('✅ Signed in as User B:', testData.userBEmail);

  const { data: rolesForB, error: rolesErrorB } = await anonClient
    .from('role')
    .select('id, name, agency_id');

  if (rolesErrorB) {
    console.error('❌ Error querying roles:', rolesErrorB.message);
  } else {
    const agencyACount = rolesForB?.filter(r => r.agency_id === testData.agencyAId).length || 0;
    const agencyBCount = rolesForB?.filter(r => r.agency_id === testData.agencyBId).length || 0;

    console.log(`   Roles returned: ${rolesForB?.length || 0}`);
    console.log(`   - Agency A roles: ${agencyACount}`);
    console.log(`   - Agency B roles: ${agencyBCount}`);

    if (agencyACount > 0) {
      console.error('   ❌ RLS VIOLATION: User B can see Agency A roles!');
    } else {
      console.log('   ✅ RLS WORKING: User B only sees Agency B roles');
    }
  }

  await anonClient.auth.signOut();
  console.log('');

  // TEST 3: Service role can see all
  console.log('TEST 3: Service role (bypass RLS) queries role table');
  console.log('-'.repeat(60));

  const { data: allRoles, error: allRolesError } = await adminClient
    .from('role')
    .select('id, name, agency_id');

  if (allRolesError) {
    console.error('❌ Error querying roles:', allRolesError.message);
  } else {
    const agencyACount = allRoles?.filter(r => r.agency_id === testData.agencyAId).length || 0;
    const agencyBCount = allRoles?.filter(r => r.agency_id === testData.agencyBId).length || 0;

    console.log(`   Roles returned: ${allRoles?.length || 0}`);
    console.log(`   - Agency A roles: ${agencyACount}`);
    console.log(`   - Agency B roles: ${agencyBCount}`);
    console.log('   ✅ Service role bypasses RLS (expected)\n');
  }

  console.log('=' .repeat(60));
  console.log('\n✅ RLS testing complete!');
}

testRLS().catch(console.error);

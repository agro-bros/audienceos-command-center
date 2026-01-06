#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('Checking database state...\n');

  // Check if old role column exists
  const { data: oldRole, error: oldError } = await supabase
    .from('user')
    .select('id, email, role')
    .limit(1);

  if (!oldError && oldRole) {
    console.log('✅ Old "role" column exists');
    console.log('   Sample:', oldRole[0]);
  } else {
    console.log('❌ Old "role" column:', oldError?.message);
  }

  // Check if new role_id column exists
  const { data: newRole, error: newError } = await supabase
    .from('user')
    .select('id, email, role_id, is_owner')
    .limit(1);

  if (newError) {
    console.log('❌ New columns NOT found:', newError.message);
    console.log('\n⚠️  MIGRATION NOT YET APPLIED');
  } else {
    console.log('✅ New columns exist (role_id, is_owner)');
    console.log('   Sample:', newRole?.[0]);
  }
}

check();

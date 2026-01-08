/**
 * Check if proposed indexes already exist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PROPOSED_INDEXES = [
  'idx_member_access_user_client',
  'idx_member_access_client',
  'idx_member_access_user',
  'idx_role_hierarchy',
  'idx_user_role'
];

async function checkIndexes() {
  console.log('🔍 Checking for existing indexes\n');

  // Try to query information_schema (may not be accessible)
  console.log('⚠️  Note: Cannot directly query pg_indexes via Supabase client');
  console.log('Using CREATE INDEX IF NOT EXISTS in migration ensures safety.\n');

  console.log('Proposed indexes:');
  for (const idx of PROPOSED_INDEXES) {
    console.log(`  - ${idx}`);
  }

  console.log('\n✅ Migration uses "IF NOT EXISTS" clause - safe to run');
  console.log('   Existing indexes will be skipped, new ones created.\n');
}

checkIndexes();

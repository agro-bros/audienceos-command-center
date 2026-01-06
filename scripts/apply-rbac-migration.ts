#!/usr/bin/env tsx
/**
 * Apply Fixed RBAC Migration
 *
 * Applies the idempotent RBAC migration with all blockers fixed
 * Run: npx tsx scripts/apply-rbac-migration.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSql(sql: string, description: string): Promise<boolean> {
  console.log(`\n🔄 Executing: ${description}`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error(`❌ Failed: ${error.message}`);
      console.error('Error details:', error);
      return false;
    }

    console.log(`✅ Success: ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  // Check role table exists and has data
  const { data: roles, error: rolesError } = await supabase
    .from('role')
    .select('id, name, hierarchy_level, is_system')
    .limit(5);

  if (rolesError) {
    console.error('❌ Verification failed - role table:', rolesError.message);
    return false;
  }

  console.log(`✅ Found ${roles?.length} system roles`);
  roles?.forEach(r => console.log(`   - ${r.name} (level ${r.hierarchy_level})`));

  // Check users have role_id populated
  const { data: users, error: usersError } = await supabase
    .from('user')
    .select('id, email, role_id, is_owner')
    .limit(5);

  if (usersError) {
    console.error('❌ Verification failed - user table:', usersError.message);
    return false;
  }

  const usersWithRoles = users?.filter(u => u.role_id);
  const owners = users?.filter(u => u.is_owner);

  console.log(`✅ Found ${usersWithRoles?.length}/${users?.length} users with role_id assigned`);
  console.log(`✅ Found ${owners?.length} owner(s)`);

  if (usersWithRoles?.length === 0) {
    console.error('⚠️  WARNING: No users have role_id assigned!');
    return false;
  }

  return true;
}

async function applyMigration() {
  console.log('🚀 Starting RBAC Migration Application\n');
  console.log(`📍 Database: ${SUPABASE_URL}\n`);

  const migrationFile = 'supabase/migrations/20260106_rbac_fixed.sql';
  const filePath = path.join(process.cwd(), migrationFile);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  const success = await executeSql(sql, 'Multi-Org RBAC Fixed Migration');

  if (!success) {
    console.log('\n⚠️  Migration execution failed. Check errors above.');
    process.exit(1);
  }

  // Verify the migration worked
  const verified = await verifyMigration();

  console.log('\n' + '='.repeat(60));
  if (verified) {
    console.log('\n🎉 Migration applied and verified successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Verify TypeScript compilation passes');
    console.log('   3. Continue to TASK-011 (API Middleware)');
    process.exit(0);
  } else {
    console.log('\n⚠️  Migration applied but verification failed.');
    console.log('Check the warnings above.');
    process.exit(1);
  }
}

applyMigration();

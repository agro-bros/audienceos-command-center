/**
 * Verify all users have role_id and is_owner set (no NULLs)
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifyUserMigration() {
  console.log('🔍 Checking all users have RBAC columns...\n');

  // Check for NULL role_id
  const { data: nullRoleUsers, error: roleError } = await supabase
    .from('user')
    .select('id, email, role_id')
    .is('role_id', null);

  if (roleError) {
    console.error('❌ Error checking role_id:', roleError.message);
    process.exit(1);
  }

  // Check for NULL is_owner
  const { data: nullOwnerUsers, error: ownerError } = await supabase
    .from('user')
    .select('id, email, is_owner')
    .is('is_owner', null);

  if (ownerError) {
    console.error('❌ Error checking is_owner:', ownerError.message);
    process.exit(1);
  }

  // Get total user count
  const { count: totalUsers, error: countError } = await supabase
    .from('user')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting users:', countError.message);
    process.exit(1);
  }

  console.log(`📊 Total users in database: ${totalUsers}`);
  console.log(`❌ Users with NULL role_id: ${nullRoleUsers?.length || 0}`);
  console.log(`❌ Users with NULL is_owner: ${nullOwnerUsers?.length || 0}`);
  console.log('');

  if (nullRoleUsers && nullRoleUsers.length > 0) {
    console.error('⚠️  MIGRATION INCOMPLETE: Found users without role_id:');
    nullRoleUsers.forEach(u => console.error(`   - ${u.email} (${u.id})`));
    process.exit(1);
  }

  if (nullOwnerUsers && nullOwnerUsers.length > 0) {
    console.error('⚠️  MIGRATION INCOMPLETE: Found users without is_owner:');
    nullOwnerUsers.forEach(u => console.error(`   - ${u.email} (${u.id})`));
    process.exit(1);
  }

  console.log('✅ All users have role_id and is_owner set!');
  console.log('✅ Migration verification PASSED');
}

verifyUserMigration().catch(console.error);

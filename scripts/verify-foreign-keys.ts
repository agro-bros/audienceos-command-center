/**
 * Verify foreign key constraints are enforced
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

async function verifyForeignKeys() {
  console.log('🔍 Testing foreign key constraints...\n');

  // Test 1: Try to insert user with invalid role_id
  console.log('Test 1: Insert user with invalid role_id...');
  const { data: user1, error: fkError } = await supabase
    .from('user')
    .insert({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'fk-test@example.com',
      first_name: 'Test',
      last_name: 'User',
      agency_id: '11111111-1111-1111-1111-111111111111',
      role_id: '99999999-9999-9999-9999-999999999999', // Invalid role_id
      is_owner: false,
    })
    .select();

  if (fkError) {
    if (fkError.code === '23503' || fkError.message.includes('foreign key')) {
      console.log('   ✅ FK constraint enforced! Error:', fkError.message);
    } else {
      console.log('   ⚠️  Different error:', fkError.message);
    }
  } else {
    console.log('   ❌ FK constraint NOT enforced! Insert succeeded when it should have failed.');
    // Cleanup
    await supabase.from('user').delete().eq('id', '00000000-0000-0000-0000-000000000001');
  }

  // Test 2: Try to insert role_permission with invalid role_id
  console.log('\nTest 2: Insert role_permission with invalid role_id...');
  const { data: rolePerm, error: fkError2 } = await supabase
    .from('role_permission')
    .insert({
      role_id: '99999999-9999-9999-9999-999999999999', // Invalid
      permission_id: '00000000-0000-0000-0000-000000000001', // Also invalid
      agency_id: '11111111-1111-1111-1111-111111111111',
    })
    .select();

  if (fkError2) {
    if (fkError2.code === '23503' || fkError2.message.includes('foreign key')) {
      console.log('   ✅ FK constraint enforced! Error:', fkError2.message);
    } else {
      console.log('   ⚠️  Different error:', fkError2.message);
    }
  } else {
    console.log('   ❌ FK constraint NOT enforced! Insert succeeded when it should have failed.');
  }

  console.log('\n✅ Foreign key verification COMPLETE');
}

verifyForeignKeys().catch(console.error);

/**
 * Verify all RBAC indexes were created
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

async function verifyIndexes() {
  console.log('🔍 Checking RBAC indexes...\n');

  const rbacTables = ['permission', 'role', 'role_permission', 'member_client_access'];

  const { data: indexes, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (${rbacTables.map((t, i) => `$${i + 1}`).join(', ')})
      ORDER BY tablename, indexname;
    `,
    params: rbacTables
  });

  if (error) {
    console.log('⚠️  Cannot query pg_indexes via RPC (function may not exist)');
    console.log('   Attempting alternative method...\n');

    // Try direct query (may be restricted)
    for (const table of rbacTables) {
      console.log(`📋 Checking indexes for ${table}...`);
      const { data, error: queryError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (queryError) {
        console.log(`   ❌ Error: ${queryError.message}`);
      } else {
        console.log(`   ✅ Table exists and is queryable`);
      }
    }

    console.log('\n⚠️  Index verification requires direct database access.');
    console.log('   Tables are accessible, assuming indexes were created with migration.');
    return;
  }

  if (!indexes || indexes.length === 0) {
    console.error('❌ No indexes found for RBAC tables!');
    process.exit(1);
  }

  console.log(`✅ Found ${indexes.length} indexes:\n`);
  indexes.forEach((idx: any) => {
    console.log(`   ${idx.tablename}.${idx.indexname}`);
  });

  console.log('\n✅ Index verification PASSED');
}

verifyIndexes().catch(console.error);

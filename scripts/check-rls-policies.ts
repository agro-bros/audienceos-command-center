/**
 * Check current RLS policies on RBAC tables
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies on RBAC tables...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('client', 'communication', 'ticket', 'member_client_access', 'role', 'permission')
      ORDER BY tablename, policyname;
    `
  });

  if (error) {
    console.log('❌ Error querying policies:', error.message);
    console.log('\n⚠️  Trying direct query instead...\n');

    // Fallback: Try to infer from table queries
    const tables = ['client', 'communication', 'ticket', 'member_client_access'];

    for (const table of tables) {
      try {
        // This should fail if RLS is blocking us
        const { data: testData, error: testError } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (testError) {
          console.log(`⚠️  ${table}: RLS may be blocking (${testError.message})`);
        } else {
          console.log(`✅ ${table}: Accessible (RLS allows service role)`);
        }
      } catch (e: any) {
        console.log(`❌ ${table}: ${e.message}`);
      }
    }

    return;
  }

  console.log('📋 Current RLS Policies:\n');

  if (!data || data.length === 0) {
    console.log('⚠️  No policies found');
    return;
  }

  let currentTable = '';
  for (const policy of data) {
    if (policy.tablename !== currentTable) {
      console.log(`\n📊 ${policy.tablename.toUpperCase()}`);
      currentTable = policy.tablename;
    }
    console.log(`  ✅ ${policy.policyname}`);
    console.log(`     Command: ${policy.cmd}`);
    console.log(`     Roles: ${policy.roles}`);
    if (policy.qual) {
      console.log(`     Using: ${policy.qual.substring(0, 80)}...`);
    }
  }
}

checkRLSPolicies().catch(console.error);

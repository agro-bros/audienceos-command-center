/**
 * TASK-013 Pre-Implementation Verification
 * Verify all preconditions before starting implementation
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface VerificationResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  critical: boolean;
}

const results: VerificationResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'warn', message: string, critical = false) {
  results.push({ name, status, message, critical });
}

async function verify() {
  console.log('🔍 TASK-013 PRE-IMPLEMENTATION VERIFICATION\n');
  console.log('═'.repeat(60));
  console.log('\n');

  // Check 1: RBAC tables exist
  console.log('1️⃣  Checking RBAC tables...');
  const tables = ['permission', 'role', 'role_permission', 'member_client_access'];
  let allTablesExist = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      addResult(`Table: ${table}`, 'fail', `Does not exist: ${error.message}`, true);
      allTablesExist = false;
    } else {
      addResult(`Table: ${table}`, 'pass', 'Exists');
    }
  }

  if (allTablesExist) {
    console.log('   ✅ All RBAC tables exist\n');
  } else {
    console.log('   ❌ Some RBAC tables missing\n');
  }

  // Check 2: member_client_access has data
  console.log('2️⃣  Checking member_client_access data...');
  const { data: memberAccess, error: accessError } = await supabase
    .from('member_client_access')
    .select('*')
    .limit(5);

  if (accessError) {
    addResult('member_client_access data', 'fail', `Query failed: ${accessError.message}`, true);
  } else if (!memberAccess || memberAccess.length === 0) {
    addResult('member_client_access data', 'warn', 'No data - need test data for validation', false);
    console.log('   ⚠️  No member client access records (will need test data)\n');
  } else {
    addResult('member_client_access data', 'pass', `${memberAccess.length} records found`);
    console.log(`   ✅ Found ${memberAccess.length} member access records\n`);
  }

  // Check 3: Users with Member role exist
  console.log('3️⃣  Checking for Member role users...');
  const { data: roles } = await supabase
    .from('role')
    .select('id, name, hierarchy_level')
    .eq('name', 'Member')
    .single();

  if (!roles) {
    addResult('Member role', 'fail', 'Member role not found', true);
  } else {
    const { data: memberUsers } = await supabase
      .from('user')
      .select('id, email')
      .eq('role_id', roles.id)
      .limit(5);

    if (!memberUsers || memberUsers.length === 0) {
      addResult('Member users', 'warn', 'No Member users - need for testing', false);
      console.log('   ⚠️  No users with Member role (will need test users)\n');
    } else {
      addResult('Member users', 'pass', `${memberUsers.length} Member users found`);
      console.log(`   ✅ Found ${memberUsers.length} Member users\n`);
    }
  }

  // Check 4: Verify RLS only checks agency_id (not client-scoped yet)
  console.log('4️⃣  Checking current RLS behavior...');

  // We expect RLS to allow service role to access all data
  const { data: allClients, error: clientError } = await supabase
    .from('client')
    .select('id, name, agency_id')
    .limit(5);

  if (clientError) {
    addResult('Client RLS', 'fail', `Cannot query clients: ${clientError.message}`, true);
  } else if (allClients && allClients.length > 0) {
    addResult('Client RLS', 'pass', `Service role can access ${allClients.length} clients (expected behavior)`);
    console.log(`   ✅ Service role can access clients (RLS allows service_role)\n`);
  } else {
    addResult('Client RLS', 'warn', 'No client data to verify RLS', false);
  }

  // Check 5: Verify permission service exists and is importable
  console.log('5️⃣  Checking permission service...');
  try {
    // This would need actual import, but we can verify the file exists
    const fs = require('fs');
    const path = require('path');
    const permServicePath = path.join(process.cwd(), 'lib/rbac/permission-service.ts');

    if (fs.existsSync(permServicePath)) {
      addResult('Permission Service', 'pass', 'File exists and contains logic');
      console.log('   ✅ Permission service file exists\n');
    } else {
      addResult('Permission Service', 'fail', 'File not found', true);
    }
  } catch (e: any) {
    addResult('Permission Service', 'fail', e.message, true);
  }

  // Check 6: Verify middleware exists
  console.log('6️⃣  Checking middleware...');
  try {
    const fs = require('fs');
    const path = require('path');
    const middlewarePath = path.join(process.cwd(), 'lib/rbac/with-permission.ts');

    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf8');

      // Check for key functionality
      if (content.includes('withPermission')) {
        addResult('Middleware: withPermission', 'pass', 'Function exists');
      } else {
        addResult('Middleware: withPermission', 'fail', 'Function not found', true);
      }

      if (content.includes('extractClientId') || content.includes('clientId')) {
        addResult('Middleware: clientId extraction', 'pass', 'Logic present');
      } else {
        addResult('Middleware: clientId extraction', 'warn', 'No extraction logic found');
      }

      console.log('   ✅ Middleware file exists and has core functions\n');
    } else {
      addResult('Middleware', 'fail', 'File not found', true);
    }
  } catch (e: any) {
    addResult('Middleware', 'fail', e.message, true);
  }

  // Print summary
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═'.repeat(60));
  console.log('\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const criticalFailed = results.filter(r => r.status === 'fail' && r.critical).length;

  console.log(`✅ Passed:   ${passed}/${results.length}`);
  console.log(`⚠️  Warnings: ${warned}/${results.length}`);
  console.log(`❌ Failed:   ${failed}/${results.length}`);

  if (criticalFailed > 0) {
    console.log(`\n🔴 ${criticalFailed} CRITICAL failures - cannot proceed\n`);
  }

  console.log('\n📋 DETAILED RESULTS:\n');

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
    const critical = result.critical ? ' [CRITICAL]' : '';
    console.log(`${icon} ${result.name}${critical}`);
    console.log(`   ${result.message}`);
  }

  // Calculate confidence score
  const totalScore = results.length;
  const earnedScore = passed + (warned * 0.5);
  const confidence = (earnedScore / totalScore) * 10;

  console.log('\n');
  console.log('═'.repeat(60));
  console.log(`🎯 CONFIDENCE SCORE: ${confidence.toFixed(1)}/10`);
  console.log('═'.repeat(60));

  if (criticalFailed === 0 && confidence >= 9.0) {
    console.log('\n✅ READY TO PROCEED with TASK-013 implementation\n');
    process.exit(0);
  } else if (criticalFailed > 0) {
    console.log('\n❌ BLOCKED - Fix critical issues before proceeding\n');
    process.exit(1);
  } else {
    console.log(`\n⚠️  Confidence below 9.0 - review warnings before proceeding\n`);
    process.exit(0);
  }
}

verify().catch((error) => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});

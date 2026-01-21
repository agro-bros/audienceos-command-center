# Validation Report: 403 on /api/v1/chat - RLS Recursion Diagnosis

**Date:** 2026-01-20
**Claim:** "The 403 on /api/v1/chat is caused by RLS infinite recursion on the `user` table. The fix is to apply `supabase/migrations/20260120_fix_user_rls_recursion.sql`"

---

## 1. EXACT ERROR PATH TRACE

### Where the 403 comes from:

**File:** `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/app/api/v1/chat/route.ts`
- **Line 97:** `export const POST = withPermission({ resource: 'ai-features', action: 'write' })(`

**File:** `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/lib/rbac/with-permission.ts`
- **Line 124:** `const authResult = await authenticateUser();` - calls helper to get user
- **Lines 76-78:** `const { data: appUser, error: userError } = await supabase.from('user').select('id, email, role_id, is_owner').eq('id', user.id).single();`
  - **THIS IS THE FAILURE POINT** - queries the `user` table
- **Lines 82-95:** Returns 500 if user fetch fails
- **Lines 137-141:** `const permissions = await permissionService.getUserPermissions(...)` - queries user table AGAIN

**File:** `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/lib/rbac/permission-service.ts`
- **Lines 86-111:** Another SELECT on `user` table with joins to role and role_permissions

### The 403 is returned at:
- **with-permission.ts Lines 179-188:** If `hasPermission` is false
- But the more likely scenario is: **Lines 82-94** return 500, NOT 403

**CRITICAL FINDING:** The error path shows the issue would manifest as:
1. **500 Internal Server Error** (if userError is thrown due to RLS recursion)
2. OR **403 Forbidden** if the permission check fails after user is loaded

---

## 2. RLS RECURSION CLAIM VERIFICATION

### The Problematic Policies (from `013_fix_user_rls.sql` and `017_additional_rls_policies.sql`):

```sql
-- From 013_fix_user_rls.sql (line 20-26)
CREATE POLICY user_same_agency ON "user"
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()  -- RECURSION!
        )
    );

-- From 017_additional_rls_policies.sql (line 14-20)
CREATE POLICY IF NOT EXISTS user_agency_read ON "user"
    FOR SELECT
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()  -- RECURSION!
        )
    );
```

### Why This Causes Recursion:
1. Query hits `user` table
2. RLS policy `user_same_agency` or `user_agency_read` fires
3. Policy executes `SELECT agency_id FROM "user" WHERE id = auth.uid()`
4. This SELECT triggers RLS on `user` again
5. INFINITE LOOP until PostgreSQL throws error

### VERIFIED: This IS a valid infinite recursion pattern.

---

## 3. THE FIX MIGRATION ANALYSIS

**File:** `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/supabase/migrations/20260120_fix_user_rls_recursion.sql`

```sql
-- Step 1: Drop problematic policies
DROP POLICY IF EXISTS user_same_agency ON "user";
DROP POLICY IF EXISTS user_agency_read ON "user";
DROP POLICY IF EXISTS user_rls ON "user";

-- Step 2: Create safe policies
CREATE POLICY user_self_read ON "user"
    FOR SELECT
    USING (id = auth.uid());  -- NO recursion

CREATE POLICY user_agency_access ON "user"
    FOR SELECT
    USING (
        agency_id = (
            COALESCE(
                (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid,
                (auth.jwt() ->> 'agency_id')::uuid
            )
        )
    );  -- Uses JWT, not user table lookup

CREATE POLICY user_self_update ON "user"
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
```

---

## 4. CRITICAL ISSUES FOUND

### ISSUE 1: JWT agency_id may NOT be present

**Evidence from codebase:**
- `supabase/migrations/014_fix_agency_rls.sql` line 4: `-- Root Cause: agency table RLS uses (auth.jwt() ->> 'agency_id')::uuid which is never set`
- `supabase/migrations/013_fix_user_rls.sql` line 4: `-- but JWT doesn't have agency_id claim for new users`
- `supabase/migrations/003_fix_client_rls.sql` line 3: `-- Reason: JWT claims (auth.jwt() ->> 'agency_id') are not set`
- `lib/supabase.ts` lines 197-224: `getUserAgencyId()` uses **service role client** specifically because "RLS policy may not allow users to read their own row"

**CRITICAL:** The migration assumes `auth.jwt() -> 'app_metadata' ->> 'agency_id'` OR `auth.jwt() ->> 'agency_id'` contains the agency_id. But the codebase explicitly documents this is NOT reliably set.

### ISSUE 2: The new `user_agency_access` policy will fail if JWT lacks agency_id

If both JWT paths return NULL, the COALESCE returns NULL, and:
```sql
agency_id = NULL
```
This is ALWAYS false in SQL. **Users won't be able to read ANY other users in their agency.**

### ISSUE 3: No INSERT policy for user table

The migration only creates:
- `user_self_read` (SELECT)
- `user_agency_access` (SELECT)
- `user_self_update` (UPDATE)

There's no INSERT or DELETE policy. The old `user_same_agency` was `FOR ALL`. New users may not be able to be created through RLS-enabled queries.

### ISSUE 4: Current workaround uses service_role

`lib/supabase.ts` `getUserAgencyId()` already bypasses this by using service_role client. The middleware (`with-permission.ts` line 59) creates a regular client via `createRouteHandlerClient(cookies)`, which is subject to RLS.

### ISSUE 5: The actual 403 might have multiple causes

Looking at the error path:
1. **If RLS recursion occurs:** Query fails with PostgreSQL error, caught, returns 500 (not 403)
2. **If user lookup succeeds but permissions fail:** Returns 403

The 403 specifically means the permission check at line 154-158 returned false:
```typescript
const hasPermission = permissionService.checkPermission(
  permissions,
  requirement.resource,
  requirement.action,
  clientId
);
```

This could happen because:
- User doesn't have `ai-features:write` in their role_permissions
- User's role lookup failed (returns empty permissions array)
- User doesn't have a role_id assigned

---

## 5. ALTERNATIVE CAUSES FOR 403

| Cause | Likelihood | How to Verify |
|-------|------------|---------------|
| Missing `ai-features:write` in permission table | Medium | `SELECT * FROM permission WHERE resource = 'ai-features' AND action = 'write'` |
| User's role doesn't have ai-features:write | Medium | Check role_permission table for user's role |
| User has no role_id | High | `SELECT id, role_id FROM "user" WHERE id = '<user-id>'` |
| RLS recursion (claimed cause) | High | Check PostgreSQL logs for "infinite recursion detected" |
| Permission cache returning stale data | Low | Clear cache and retry |

---

## 6. WHAT COULD GO WRONG IF MIGRATION IS APPLIED

| Risk | Impact | Mitigation |
|------|--------|------------|
| JWT agency_id not set | **HIGH** - Users can't see other users in agency | Verify JWT structure before applying |
| INSERT operations fail | **MEDIUM** - New users can't be created via normal flow | Relies on service_role for user creation |
| Other queries depend on old policy names | **LOW** - No code references policy names directly | N/A |
| Rollback difficult if issues | **MEDIUM** - Would need to recreate old policies | Save old policies before DROP |

---

## 7. VERIFICATION TESTS NEEDED

### Before Applying Migration:

1. **Check if RLS recursion is actually occurring:**
   ```sql
   -- Run in Supabase SQL Editor as authenticated user
   SELECT id, agency_id FROM "user" LIMIT 1;
   ```
   If this errors with "infinite recursion", claim is confirmed.

2. **Check JWT structure:**
   ```sql
   SELECT auth.jwt();
   ```
   Verify if `app_metadata.agency_id` or root `agency_id` exists.

3. **Check user's permissions directly:**
   ```sql
   SELECT u.id, u.role_id, r.name as role_name, p.resource, p.action
   FROM "user" u
   LEFT JOIN role r ON u.role_id = r.id
   LEFT JOIN role_permission rp ON r.id = rp.role_id
   LEFT JOIN permission p ON rp.permission_id = p.id
   WHERE u.id = auth.uid()
   AND p.resource = 'ai-features';
   ```

### After Applying Migration:

1. **Verify policies exist:**
   ```sql
   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'user';
   ```

2. **Test user table access:**
   ```sql
   SELECT id, agency_id FROM "user" WHERE id = auth.uid();  -- Should work
   SELECT id, agency_id FROM "user" LIMIT 5;  -- May fail if JWT has no agency_id
   ```

3. **Test chat API:** Send POST to /api/v1/chat and verify response.

---

## VERDICT

```
VERIFIED (with evidence):
- Claim: RLS policies cause infinite recursion
- Proof: migrations/013_fix_user_rls.sql creates user_same_agency policy with
  `SELECT agency_id FROM "user" WHERE id = auth.uid()` which recursively triggers RLS
- Proof: migrations/017_additional_rls_policies.sql creates user_agency_read with same pattern

UNVERIFIED (needs validation):
- Claim: This is the ACTUAL cause of the 403 (not another issue)
- Risk: The 403 could be from missing ai-features:write permission, not RLS
- How to verify: Check PostgreSQL logs for "infinite recursion detected" errors

FOUND ISSUES:
- Issue: Migration relies on JWT having agency_id, which codebase documents as "never set"
- Impact: HIGH - The new user_agency_access policy will return 0 rows if JWT lacks agency_id
- Fix: Either (a) ensure JWT contains agency_id, or (b) use different approach

- Issue: user_self_read already exists (from 013_fix_user_rls.sql)
- Impact: LOW - CREATE POLICY will fail if policy exists
- Fix: Use CREATE POLICY IF NOT EXISTS or DROP first

- Issue: No INSERT/DELETE policies for user table
- Impact: MEDIUM - May break user creation flows
- Fix: Add INSERT policy or rely on service_role for user operations

CONFIDENCE SCORE: 6/10
Explanation: The RLS recursion claim is technically valid - the pattern shown DOES cause
recursion. However:
1. The fix assumes JWT contains agency_id, which the codebase explicitly says is NOT set
2. The 403 could be from multiple causes (missing permissions, no role, etc.)
3. Without PostgreSQL logs showing "infinite recursion detected", we can't confirm this is THE cause
4. The existing workaround (service_role in getUserAgencyId) may mask the issue

BLOCKERS:
1. **MUST verify JWT contains agency_id before applying** - if it doesn't, the migration will
   break user agency queries worse than before
2. **SHOULD check PostgreSQL logs** to confirm "infinite recursion detected" is occurring
3. **SHOULD verify user has role_id assigned** - if null, permission lookup returns empty
```

---

## RECOMMENDED ACTIONS

### Immediate (before demo):

1. **Check if this user has a role_id:**
   ```sql
   SELECT id, role_id, is_owner FROM "user" WHERE id = '<test-user-id>';
   ```
   If `role_id` is NULL, THAT'S the issue - not RLS recursion.

2. **Check PostgreSQL logs** for actual error message when 403 occurs.

3. **Test with service_role:** If chat works with service_role client, RLS is the issue.

### If Migration Needed:

1. **Modify migration** to not depend on JWT:
   ```sql
   CREATE POLICY user_agency_access ON "user"
       FOR SELECT
       USING (
           id = auth.uid()  -- Can read self
           OR
           agency_id = (SELECT agency_id FROM "user" WHERE id = auth.uid())
       );
   ```
   Wait - this ALSO causes recursion. The only safe approach is:
   - Use JWT (if it's set)
   - OR use service_role for all user table queries

2. **Ensure JWT is populated** with agency_id during login/signup flow.

### Long-term:

- Set `agency_id` in JWT claims during Supabase auth (custom claims hook)
- OR always use service_role for user table operations
# VALIDATION RESULTS: Plan File System Overhaul

**Validation Date:** 2026-01-21
**Claude Code Version:** 2.0.76
**Validator:** Senior QA Engineer

---

## 1. Setting Existence: UNKNOWN - CANNOT VERIFY

**Evidence:**

Current `~/.claude/settings.json` does NOT contain `planFileLocation`:
```json
{
  "env": { "DISABLE_AUTOUPDATER": "1" },
  "permissions": { ... },
  "hooks": { ... },
  "statusLine": { ... },
  "enabledPlugins": { ... },
  "alwaysThinkingEnabled": true
}
```

**Issues Found:**
- `planFileLocation` and `planFileCustomPath` are NOT documented in any file I can find
- Claude CLI `--help` shows `--permission-mode` options but NO plan file options
- No `claude config list` command output available
- The plan references "Issue #13395 COMPLETED" but I cannot verify this against actual Claude Code documentation

**Verdict:** The setting MAY work but is UNVERIFIED. The plan author claims it exists based on a GitHub issue, but I cannot confirm this setting is actually recognized by Claude Code 2.0.76.

---

## 2. Project Paths: PARTIAL FAIL

**Verified to EXIST:**
- `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/` - EXISTS
- `/Users/rodericandrews/_PAI/projects/abby/` - EXISTS
- `/Users/rodericandrews/_PAI/projects/revos/` - EXISTS

**NOT FOUND:**
- `/Users/rodericandrews/_PAI/projects/chi/` - NOT FOUND
- `/Users/rodericandrews/_PAI/projects/chi-gateway/` - NOT FOUND
- `/Users/rodericandrews/_PAI/projects/chi-dashboard/` - NOT FOUND

**Actual Chi-related projects found:**
- `/Users/rodericandrews/_PAI/projects/chi-cto/` (different from `chi/`)

**Impact:** The plan lists 6 files going to `chi/`, 1 file to `chi-gateway/`, 1 file to `chi-dashboard/` - these destinations do not exist. **8 files have invalid destinations.**

---

## 3. File Count: PASS

**Actual Count:** 45 files in `~/.claude/plans/`
**Claimed:** ~45 files

**Breakdown:**
- Regular plan files: 29
- Agent files (`*-agent-*.md`): 16

This matches the plan.

---

## 4. Agent Files: PRESERVE CONTENT (Selectively)

**Sample Analysis:**

**File 1:** `ancient-bouncing-shore-agent-a8701f6.md`
- Contains: Detailed API validation report for Abby onboarding
- Field name verification, edge case analysis, specific recommendations
- **VERDICT: VALUABLE CONTENT** - Not just duplicate, has unique analysis

**File 2:** `harmonic-strolling-frog-agent-a1e9764.md` (current session)
- Contains: 403 RLS recursion diagnosis with line-by-line code traces
- JWT analysis, SQL examples, verification tests
- **VERDICT: VALUABLE CONTENT** - Unique debugging context

**File 3:** `virtual-swimming-firefly-agent-aab3b34.md`
- Contains: RevOS + AudienceOS merge validation with 6 critical issues
- Schema comparisons, scenario analysis, P0/P1 blockers
- **VERDICT: VALUABLE CONTENT** - Comprehensive validation report

**Conclusion:** Agent files contain UNIQUE validation reports with specific file:line evidence. They are NOT redundant to parent plans. Some should be preserved as validation/audit records.

---

## 5. Per-Project Settings: PARTIALLY SUPPORTED

**Evidence Found:**

A per-project settings file exists:
- `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/.claude/settings.local.json`

Current content (permissions only):
```json
{
  "permissions": {
    "allow": [
      "mcp__mem0__search-memories",
      "mcp__chi-gateway__google_ads_campaigns",
      ...
    ]
  }
}
```

**Observation:** The file schema appears to be the same as global settings. If `planFileLocation` is a valid setting at the global level, it SHOULD work per-project too.

**Risk:** If the setting is not recognized, adding it will either:
- Be silently ignored (benign failure)
- Cause a parse error (config file rejected)

---

## 6. Breaking Scenarios

### Scenario A: Claude Code does not recognize `planFileLocation`
**Likelihood:** HIGH (no documentation found)
**Impact:** Configuration silently ignored. Plans continue going to `~/.claude/plans/`
**Detection:** First plan mode session after config change
**Mitigation:** Test with one project first, verify behavior before mass migration

### Scenario B: Path is relative but interpreted differently
**Likelihood:** MEDIUM
**Evidence:** Plan says `docs/05-planning/` (relative)
**Risk:** Claude may:
- Interpret relative to CWD
- Interpret relative to project root
- Interpret relative to `~/.claude/`
**Impact:** Plans saved to wrong location
**Mitigation:** Test with explicit absolute path first

### Scenario C: `docs/05-planning/` does not exist when plan starts
**Likelihood:** HIGH for new projects
**Evidence:** Many project `05-planning/` folders exist, but the plan creates subfolders like `docs/05-planning/[feature]/PLAN.md`
**Risk:** If Claude expects folder to exist and it doesn't, plan creation fails
**Impact:** Error on first plan attempt in new feature
**Mitigation:** Test folder creation behavior

### Scenario D: In-progress plans reference old location
**Likelihood:** LOW
**Evidence:** This current session has a plan at `/Users/rodericandrews/.claude/plans/harmonic-strolling-frog-agent-a737856.md`
**Risk:** Active plan contexts may break if files move mid-session
**Impact:** Current work interrupted
**Mitigation:** Complete active sessions before migration, or don't move active plans

### Scenario E: Agent files are autonomous and bypass config
**Likelihood:** MEDIUM
**Evidence:** Agent files have specific naming pattern (`-agent-[hash].md`), suggesting they're managed differently than user plans
**Risk:** Even with config change, agent subprocesses may continue using old location
**Impact:** Mixed locations - some plans move, agent files don't
**Mitigation:** Test specifically with agent spawning tasks

### Scenario F: Non-existent project directories
**Likelihood:** CONFIRMED
**Evidence:** `chi/`, `chi-gateway/`, `chi-dashboard/` DO NOT EXIST
**Impact:** 8 files cannot be moved to claimed destinations
**Fix Required:** Either create these projects or reassign files to existing projects like `chi-cto/`

---

## VERDICT: NEEDS FIXES

**Do NOT execute this plan without addressing:**

### P0 - BLOCKERS

1. **Verify `planFileLocation` setting actually works**
   - Add setting to ONE project's `.claude/settings.local.json`
   - Trigger plan mode
   - Verify plan file appears in expected location
   - If fails: The entire plan is invalid

2. **Fix invalid project paths**
   - `chi/` -> Either create or use `chi-cto/`
   - `chi-gateway/` -> Create or reassign
   - `chi-dashboard/` -> Create or reassign
   - 8 files need valid destinations

3. **Decide agent file handling**
   - Agent files contain UNIQUE validation content (verified)
   - Options:
     a. Merge valuable content into parent plan before deletion
     b. Keep agent files as audit records in `docs/08-reports/`
     c. Move agent files alongside parent as `VALIDATION.md`

### P1 - HIGH PRIORITY

4. **Test folder auto-creation**
   - Does Claude create `docs/05-planning/[feature]/` automatically?
   - Or must folders exist before plan mode starts?

5. **Test relative vs absolute path behavior**
   - Does `docs/05-planning/` work or need absolute path?

6. **Create backup before mass migration**
   ```bash
   cp -r ~/.claude/plans/ ~/.claude/plans-backup-2026-01-21/
   ```

### P2 - SHOULD FIX

7. **Update WorkLedger skill AFTER config is verified working**
   - Not before, or skill references non-functional behavior

---

## Recommended Test Sequence

```
1. BACKUP:     cp -r ~/.claude/plans/ ~/.claude/plans-backup/
2. TEST PROJ:  Add planFileLocation to command_center_audience_OS/.claude/settings.local.json
3. VERIFY:     cd command_center_audience_OS && claude --plan
4. CHECK:      Is new plan in docs/05-planning/ or still in ~/.claude/plans/?
5. IF WORKS:   Proceed with global config + migration
6. IF FAILS:   Research correct setting name/syntax or file feature request
```

---

## Summary Table

| Check | Result | Notes |
|-------|--------|-------|
| Setting exists | UNKNOWN | No documentation found, claim based on GitHub issue |
| Project paths | PARTIAL FAIL | 3/6 named paths don't exist |
| File count | PASS | 45 files as claimed |
| Agent file content | PRESERVE | Contains unique validation reports |
| Per-project settings | SUPPORTED | File exists with same schema |
| Breaking scenarios | 6 FOUND | Need testing before execution |

**Overall: DO NOT EXECUTE without verifying the core setting works first.**

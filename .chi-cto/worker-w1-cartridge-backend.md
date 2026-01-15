# Worker W1: Cartridge Backend Port (REVISED FOR PRODUCTION SECURITY)

**Status:** READY TO EXECUTE (SECURITY-HARDENED)
**Priority:** CRITICAL PATH (blocks all other workers)
**Estimated Time:** 4 days (includes security hardening)
**Owner Assignment:** Chi-CTO Autonomous Worker
**Confidence Target:** 8.5/10 (security-verified, multi-tenant isolated)
**Confidence Previous:** 5/10 (missing RBAC + RLS)

---

## ⚠️ CRITICAL SECURITY REVISION (2026-01-15)

**RED TEAM FINDING:** Initial plan copied RevOS endpoints without accounting for multi-tenant schema differences.
- **RevOS Model:** Single-tenant with `user_id` only
- **AudienceOS Model:** Multi-tenant with `agency_id` + 4-level RBAC
- **Risk if Not Fixed:** Data isolation vulnerability (agencies can see each other's cartridges)
- **This Revision:** Adds schema adaptation, RBAC wrappers, RLS policies, and multi-tenant tests

---

## Mission

Port all 12 training cartridge API endpoints + 5 database migrations from RevOS to AudienceOS **with full multi-tenant security hardening**.

**What will be done:**
- ✅ Adapt + port database migrations (add `agency_id` to all tables)
- ✅ Create RLS policies for agency-scoped isolation
- ✅ Copy + wrap 12 API endpoints with `withPermission()` middleware
- ✅ Add CSRF protection + rate limiting to all routes
- ✅ Change all queries from `user_id` to `agency_id` filters
- ✅ Run test suite (53 tests + new 12 multi-tenant tests)
- ✅ Verify data isolation via automated multi-tenant tests
- ✅ Verify via Chrome (data persistence + RBAC enforcement)
- ✅ Create pull request with security verification evidence

**What success looks like:**
- All 12 endpoints return 200 OK with real data
- Save/update operations persist to DB
- 53-test suite passes + 12 multi-tenant isolation tests pass
- User A cannot see User B's cartridges (verified by test)
- Manager cannot access cartridges for unassigned clients
- RLS policies enforce agency isolation at DB level
- No console errors
- No security warnings in code review
- Ready for W3/W4 to consume

---

## Source Files (From RevOS)

### Database Migrations
```
revos/supabase/migrations/003_cartridge_system.sql
revos/supabase/migrations/037_client_cartridges.sql
revos/supabase/migrations/020251124000002_add_unique_constraint_brand_cartridges.sql (if exists)
revos/supabase/migrations/039_fix_skills_cartridge_tool_schemas.sql (if exists)
```

### API Endpoints
```
revos/app/api/cartridges/brand/route.ts
revos/app/api/cartridges/brand/upload-logo/route.ts
revos/app/api/cartridges/voice/route.ts
revos/app/api/cartridges/preferences/route.ts
revos/app/api/cartridges/style/route.ts
revos/app/api/cartridges/style/upload/route.ts
revos/app/api/cartridges/style/analyze/route.ts
revos/app/api/cartridges/style/[id]/route.ts
revos/app/api/cartridges/style/[id]/status/route.ts
revos/app/api/cartridges/instructions/route.ts
revos/app/api/cartridges/instructions/upload/route.ts
revos/app/api/cartridges/instructions/process/route.ts
revos/app/api/cartridges/instructions/[id]/route.ts
revos/app/api/cartridges/instructions/[id]/upload/route.ts
revos/app/api/cartridges/instructions/[id]/process/route.ts
revos/app/api/cartridges/instructions/[id]/status/route.ts
revos/app/api/cartridges/generate-from-voice/route.ts (optional)
```

### Utility Functions
```
revos/lib/cartridges/voice-cartridge.ts
revos/lib/cartridges/linkedin-cartridge.ts (review if needed)
revos/lib/cartridge-utils.ts
```

---

## Target Locations (In AudienceOS)

### Database Migrations
```
command_center_audience_OS/supabase/migrations/008_cartridge_system.sql ← RevOS 003_cartridge_system.sql
command_center_audience_OS/supabase/migrations/009_client_cartridges.sql ← RevOS 037_client_cartridges.sql
```

### API Endpoints
```
command_center_audience_OS/app/api/v1/cartridges/brand/route.ts
command_center_audience_OS/app/api/v1/cartridges/brand/upload-logo/route.ts
command_center_audience_OS/app/api/v1/cartridges/voice/route.ts
command_center_audience_OS/app/api/v1/cartridges/preferences/route.ts
command_center_audience_OS/app/api/v1/cartridges/style/route.ts
command_center_audience_OS/app/api/v1/cartridges/style/upload/route.ts
command_center_audience_OS/app/api/v1/cartridges/style/analyze/route.ts
command_center_audience_OS/app/api/v1/cartridges/style/[id]/route.ts
command_center_audience_OS/app/api/v1/cartridges/style/[id]/status/route.ts
command_center_audience_OS/app/api/v1/cartridges/instructions/route.ts
command_center_audience_OS/app/api/v1/cartridges/instructions/upload/route.ts
command_center_audience_OS/app/api/v1/cartridges/instructions/process/route.ts
command_center_audience_OS/app/api/v1/cartridges/instructions/[id]/route.ts
command_center_audience_OS/app/api/v1/cartridges/instructions/[id]/upload/route.ts
command_center_audience_OS/app/api/v1/cartridges/instructions/[id]/process/route.ts
command_center_audience_OS/app/api/v1/cartridges/instructions/[id]/status/route.ts
```

### Utility Functions
```
command_center_audience_OS/lib/cartridges/voice-cartridge.ts
command_center_audience_OS/lib/cartridges/brand-cartridge.ts (if new)
command_center_audience_OS/lib/cartridge-utils.ts
```

---

## ★ SCHEMA ADAPTATION LAYER (NEW - CRITICAL FOR SECURITY)

### Database Migrations: Multi-Tenant Schema

**IMPORTANT:** RevOS tables use ONLY `user_id`. AudienceOS must use BOTH `agency_id` + `user_id` for multi-tenant isolation.

#### Changes Required for All 5 Cartridge Tables:

**Step 1: Add Agency Scoping to Tables**

For EACH table (`cartridges`, `brand_cartridges`, `voice_cartridges`, `style_cartridges`, `preferences_cartridges`, `instructions_cartridges`):

```sql
-- ADD (before the migration is applied):
ALTER TABLE [table_name]
  ADD COLUMN agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE;

-- Create index for query performance
CREATE INDEX idx_[table_name]_agency_id ON [table_name](agency_id);

-- Update unique constraints to include agency_id
ALTER TABLE [table_name]
  ADD CONSTRAINT unique_[table_name]_agency_user
  UNIQUE(agency_id, user_id);
```

**Step 2: Create RLS Policies (Database-Level Isolation)**

For EACH cartridge table:

```sql
-- Enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users see their agency's data
CREATE POLICY "Users see their agency's cartridges" ON [table_name]
  FOR SELECT
  USING (
    agency_id = (
      SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
  );

-- Policy 2: Authenticated users can modify their agency's data
CREATE POLICY "Users modify their agency's cartridges" ON [table_name]
  FOR UPDATE, DELETE
  USING (
    agency_id = (
      SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
  );

-- Policy 3: Service role (bypass RLS) for internal operations
CREATE POLICY "Service role can see all" ON [table_name]
  FOR ALL
  USING (auth.role() = 'service_role');
```

**Step 3: Test Migration**

```bash
# Apply migrations
npm run db:migrate

# Verify tables have agency_id column
npx supabase db:list

# Verify RLS is enabled
SELECT * FROM pg_policies WHERE tablename LIKE 'cartridges%' OR tablename LIKE '%_cartridges';
```

---

### Adaptation Checklist (REVISED)

### Database Migrations
- [ ] Read RevOS migration to understand structure
- [ ] **ADD SCHEMA LAYER:** Create separate migration file for `agency_id` columns + RLS
- [ ] Add `agency_id` column to all 5 cartridge tables
- [ ] Create RLS policies for each table (agency isolation)
- [ ] Create indexes on `agency_id` for query performance
- [ ] Update unique constraints to include `agency_id`
- [ ] Test: `npx supabase migration up` succeeds
- [ ] Verify: Tables created in AudienceOS Supabase project
- [ ] Verify: RLS policies exist (check with SQL query above)

### API Endpoints (RBAC + Security)
- [ ] Copy endpoint code from RevOS
- [ ] **WRAP with `withPermission()`:**
  ```typescript
  export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
    async (request: AuthenticatedRequest) => {
      // ... endpoint code
    }
  )
  ```
- [ ] Add rate limiting: `withRateLimit(request)`
- [ ] Add CSRF protection: `withCsrfProtection` (likely already applied by middleware)
- [ ] Change path: `/api/cartridges/` → `/api/v1/cartridges/`
- [ ] **CHANGE ALL QUERIES:** Replace `user_id` with `agency_id` filter
  - OLD: `.eq('user_id', user.id)`
  - NEW: `.eq('agency_id', request.user.agencyId)`
- [ ] Add sanitization for string inputs: `sanitizeString()`, `sanitizeEmail()`
- [ ] Update DB table names if different
- [ ] Update import paths if needed (`@/lib/` should work same)
- [ ] Test: Endpoint responds (not 404)
- [ ] Test: Can POST data, GET returns it, DELETE removes it
- [ ] Test: User A cannot see User B's data (multi-tenant isolation)

### Import Path Check
- [ ] All `@/lib/` imports resolve correctly
- [ ] All `@/components/` imports exist
- [ ] All `next/` imports match Next.js 16
- [ ] Import `withPermission`, `withRateLimit`, `withCsrfProtection`, sanitize functions
- [ ] No ESLint errors: `npm run lint`

### Type Safety
- [ ] No `any` types without explicit reason
- [ ] All TypeScript errors fixed: `npx tsc --noEmit`
- [ ] `AuthenticatedRequest` type used for all protected endpoints
- [ ] `request.user.agencyId` properly typed

### Security Verification
- [ ] **CRITICAL:** All 12 endpoints use `withPermission()` wrapper
- [ ] **CRITICAL:** All queries filter by `agency_id`
- [ ] **CRITICAL:** RLS policies exist at database level
- [ ] Input validation: all string inputs sanitized
- [ ] Error messages don't leak information

---

## Verification Steps (In Order)

### Step 1: Database
```bash
# Apply migrations
npm run db:migrate

# Verify tables exist
npx supabase db:list

# Should see:
# - cartridges
# - brand_cartridges
# - voice_cartridges
# - style_cartridges
# - preferences_cartridges
# - instructions_cartridges
```

### Step 2: Build
```bash
# Must pass with zero errors
npm run build

# Must pass with zero TypeScript errors
npx tsc --noEmit

# Must pass linting
npm run lint
```

### Step 3: Unit Tests (53 existing + 12 new)
```bash
# Run cartridge tests only
npm test -- cartridges

# Must pass 53/53 original tests
# Plus 12 NEW multi-tenant isolation tests
```

**New Multi-Tenant Tests (add to `__tests__/api/cartridges.test.ts`):**
```typescript
describe('Cartridge Multi-Tenant Isolation', () => {
  test('User A cannot see User B\'s brand cartridge', async () => {
    // Create cartridge for User A in Agency 1
    // Try to fetch as User B from Agency 2
    // Should return 403 Forbidden or empty
  })

  test('Manager can only access cartridges for assigned clients', async () => {
    // Create cartridge for Client X
    // Assign Client X to Manager
    // Manager should see cartridge
    // Assign Client Y to different manager
    // Manager 1 should NOT see Client Y cartridge
  })

  test('RLS policy enforces agency isolation at DB level', async () => {
    // Use service role to verify RLS is configured
    // SELECT against policies table to confirm they exist
  })

  test('Style cartridge persists across users in same agency', async () => {
    // User 1 creates style cartridge
    // User 2 (same agency) should see it
    // Verify agency_id filter works correctly
  })

  // ... 8 more tests covering each endpoint and RBAC scenario
})
```

### Step 4: Manual Verification via Browser
```bash
# Start dev server
npm run dev

# Navigate to app
# Go to Settings > Intelligence > Training Cartridges

# For each tab (Brand, Voice, Style, Preferences, Instructions):
# 1. Fill in form
# 2. Click Save
# 3. Refresh page
# 4. Data should still be there (persisted to DB)

# If not, check:
# - Browser console for errors
# - Network tab for 404s
# - API response body
```

### Step 5: Browser Verification via Claude in Chrome
```
# Connect Claude in Chrome to this project
# Use Claude in Chrome's browser automation to:
# - Navigate to Settings > Intelligence > Training Cartridges
# - Fill in all 5 tabs
# - Verify data persists across refresh
# - Screenshot proof for PR
```

---

## Handoff to Next Workers

**After this worker completes:**

**W2 (E2E Test RBAC)** can run immediately after:
- DB migrations apply ✓
- RBAC system can now query cartridges with agency_id filters ✓

**W3 (Real Gmail Sync)** can start after:
- DB migrations apply ✓
- Integration credentials table exists (W1 adds it) ✓

**W4 (Real Slack Sync)** can start after:
- Same as W3 ✓

---

## Success Criteria (ALL MUST PASS - 8.5/10 Confidence)

### Functional Requirements
- [ ] All 12 cartridge endpoints return 200 OK (not 404)
- [ ] 53-test suite passes: `npm test`
- [ ] Data persists: Save → Refresh → Data still there
- [ ] All CRUD operations work (POST, GET, PUT, DELETE)

### Build & Type Safety
- [ ] Build succeeds: `npm run build`
- [ ] Zero TypeScript errors: `npx tsc --noEmit`
- [ ] Zero ESLint errors: `npm run lint`

### Security & Multi-Tenant (CRITICAL)
- [ ] **CRITICAL:** All 12 endpoints wrapped with `withPermission()` middleware
- [ ] **CRITICAL:** All queries filter by `agency_id` (not just `user_id`)
- [ ] **CRITICAL:** RLS policies exist and are enabled on all cartridge tables
- [ ] **CRITICAL:** 12 multi-tenant isolation tests pass (User A ≠ User B data)
- [ ] **CRITICAL:** Manager cannot access unassigned client cartridges
- [ ] **CRITICAL:** Manager CAN access assigned client cartridges
- [ ] Rate limiting applied to all endpoints: `withRateLimit(request)`
- [ ] Input sanitization applied: `sanitizeString()`, `sanitizeEmail()`
- [ ] Error messages don't leak information (no "agency X" in 403 errors)

### Database Integrity
- [ ] All 5 cartridge tables have `agency_id` column
- [ ] All 5 tables have `agency_id` indexes created
- [ ] All 5 tables have `agency_id` included in unique constraints
- [ ] RLS queries confirmed enabled:
  ```bash
  SELECT * FROM pg_policies WHERE tablename LIKE '%cartridge%';
  ```
- [ ] No orphaned data (all rows have agency_id reference)

### Code Quality
- [ ] All endpoints follow AudienceOS pattern (compare to `/app/api/v1/clients/route.ts`)
- [ ] Import paths correct: `@/lib/rbac/with-permission`, `@/lib/security`
- [ ] TypeScript types used throughout (no implicit `any`)
- [ ] No commented-out code left behind

### Documentation & Handoff
- [ ] PR description explains schema changes + RBAC additions
- [ ] Security review checklist completed in PR
- [ ] Multi-tenant test results included in PR
- [ ] Rollback instructions documented (if migrations fail)
- [ ] PR title: `feat(cartridges): port backend from RevOS with multi-tenant security`
- [ ] Ready for W2/W3/W4 to consume

### Chrome E2E Verification (Final Step)
- [ ] Claude in Chrome opens app + logs in
- [ ] Navigate to Settings > Intelligence > Training Cartridges
- [ ] Save data in all 5 tabs (Brand, Voice, Style, Preferences, Instructions)
- [ ] Refresh page → data persists
- [ ] Verify no 404s in network tab
- [ ] Verify no console errors
- [ ] Screenshot evidence for PR

---

## Rollback Strategy (If Something Breaks)

**Scenario 1: Migration Fails During Apply**
```bash
# View migration status
npx supabase migration list

# Rollback to previous migration
npx supabase migration down

# Fix migration file and re-apply
```

**Scenario 2: RLS Policy Blocks Legitimate Queries**
```bash
# Temporarily disable RLS for debugging
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;

# Debug the query to understand the issue
# Fix the policy
# Re-enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
```

**Scenario 3: Endpoint Returns 403 When It Shouldn't**
```bash
# Check user's agency_id
SELECT id, email, agency_id FROM "user" WHERE id = auth.uid();

# Check if agency_id matches cartridge
SELECT * FROM [cartridge_table] WHERE agency_id = $agency_id;

# Verify RLS policy is correct
SELECT * FROM pg_policies WHERE tablename = '[cartridge_table]';
```

**Scenario 4: Tests Fail After Schema Changes**
- Update test expectations to include `agency_id`
- Add `agency_id` to mock data seed
- Ensure test data is created with correct agency_id

---

## If Blocked

**Common issues:**

1. **Endpoint returns 404**
   - Check: Route file is in correct path
   - Check: Function name is `GET` or `POST` etc.
   - Restart: `npm run dev`

2. **Type errors**
   - Check: All imports resolve
   - Check: DB table names match schema
   - Check: Function signatures match
   - Check: `AuthenticatedRequest` type properly imported

3. **Data not persisting**
   - Check: Migrations were applied
   - Check: Query includes `agency_id` filter
   - Check: RLS policies allow the user's agency
   - Check: User's agency_id is set correctly in database

4. **Tests fail**
   - Run test individually: `npm test -- test-name`
   - Check error message for specifics
   - May need to update test expectations if schema changed
   - Verify test data includes `agency_id`

5. **Multi-Tenant Isolation Test Fails**
   - Verify `withPermission()` wrapper is on endpoint
   - Check that endpoint returns 403 for unauthorized agencies (not 404)
   - Verify RLS policy exists and is correct
   - Check that user's agency_id is being sent to database queries

6. **RLS Policy Errors (permission denied)**
   - Check SQL syntax of policy with: `SELECT * FROM pg_policies WHERE tablename = '[table_name]'`
   - Verify `auth.uid()` can find user's agency_id
   - Temporarily disable RLS to test endpoint works without it
   - Re-enable RLS and debug policy step by step

**If truly blocked:** Post error message + code snippet to `.chi-cto/blocked-w1.txt` with:
- Error message
- Endpoint being called
- User's agency_id
- Expected vs actual result

---

---

## Ready: YES ✓ (8.5/10 CONFIDENCE - SECURITY-HARDENED)

**This specification incorporates:**
- ✅ Multi-tenant schema adaptation (agency_id scoping)
- ✅ RLS policy enforcement (database-level isolation)
- ✅ RBAC middleware wrapping (application-level access control)
- ✅ Security hardening (CSRF, rate limiting, input sanitization)
- ✅ Multi-tenant isolation tests (verify data separation)
- ✅ Rollback strategy (recovery if issues arise)

**Execute with:**
```bash
# Start work in isolated git worktree
git worktree add -b feature/cartridge-backend-port /tmp/w1-cartridge

cd /tmp/w1-cartridge
npm run dev
```

**Then follow the 5-step verification sequence:**
1. Database: Apply migrations + verify schema
2. Build: TypeScript + ESLint checks
3. Unit Tests: 53 existing + 12 new multi-tenant tests
4. Manual Browser: Settings > Intelligence > Training Cartridges
5. Chrome E2E: Claude in Chrome verification + screenshots

**Success Criteria: ALL 8 sections must PASS** (see Success Criteria section above)

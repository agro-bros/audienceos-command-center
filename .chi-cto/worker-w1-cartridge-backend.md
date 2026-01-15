# Worker W1: Cartridge Backend Port
**Status:** READY TO EXECUTE
**Priority:** CRITICAL PATH (blocks all other workers)
**Estimated Time:** 3 days
**Owner Assignment:** Chi-CTO Autonomous Worker

---

## Mission

Port all 12 training cartridge API endpoints + 5 database migrations from RevOS to AudienceOS.

**What will be done:**
- ✅ Copy + adapt database migrations
- ✅ Copy + adapt 12 API endpoints
- ✅ Copy + adapt utility functions
- ✅ Run test suite (53 tests must pass)
- ✅ Verify via Chrome (data persistence)
- ✅ Create pull request

**What success looks like:**
- All 12 endpoints respond with real data
- Save/update operations persist to DB
- 53-test suite passes
- No console errors
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

## Adaptation Checklist

### Database Migrations
- [ ] Read RevOS migration to understand structure
- [ ] Adapt tier system: RevOS uses user/client/agency → AudienceOS uses agency + optional user_id
- [ ] Change table references to match AudienceOS schema
- [ ] Test: `npx supabase migration up` succeeds
- [ ] Verify: Tables created in AudienceOS Supabase project

### API Endpoints
- [ ] Copy endpoint code
- [ ] Change path: `/api/cartridges/` → `/api/v1/cartridges/`
- [ ] Change auth: get `agency_id` from user context
- [ ] Change queries: filter by `agency_id` instead of just `user_id`
- [ ] Update DB table names if different
- [ ] Update import paths if needed (`@/lib/` should work same)
- [ ] Test: Endpoint responds (not 404)
- [ ] Test: Can POST data, GET returns it, DELETE removes it

### Import Path Check
- [ ] All `@/lib/` imports resolve correctly
- [ ] All `@/components/` imports exist
- [ ] All `next/` imports match Next.js 16
- [ ] No ESLint errors: `npm run lint`

### Type Safety
- [ ] No `any` types without explicit reason
- [ ] All TypeScript errors fixed: `npx tsc --noEmit`

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

### Step 3: Unit Tests
```bash
# Run cartridge tests only
npm test -- cartridges

# Must pass 53/53 tests
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

## Success Criteria (ALL MUST PASS)

- [ ] All 12 cartridge endpoints return 200 OK (not 404)
- [ ] 53-test suite passes: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Zero TypeScript errors: `npx tsc --noEmit`
- [ ] Zero ESLint errors: `npm run lint`
- [ ] Data persists: Save → Refresh → Data still there
- [ ] PR created with clear description
- [ ] Ready for W2/W3/W4 to consume

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

3. **Data not persisting**
   - Check: Migrations were applied
   - Check: Query includes `agency_id` filter
   - Check: RLS policies allow the user's agency

4. **Tests fail**
   - Run test individually: `npm test -- test-name`
   - Check error message for specifics
   - May need to update test expectations if schema changed

**If truly blocked:** Post error message + code snippet to `.chi-cto/blocked-w1.txt` with description

---

## Ready: YES ✓

Execute with `npm run dev` and begin porting migrations.

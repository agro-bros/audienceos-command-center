# Client Assignment UI - Pre-Implementation Validation Report

## Executive Summary

**CONFIDENCE SCORE: 6/10**

The plan is mostly sound but has **4 critical issues** that need addressing before implementation. The major gaps are: TeamMember type lacks role_id/hierarchy_level, no RBAC API routes exist yet (need to create the directory), and there's a schema mismatch between types/rbac.ts and the actual database schema.

---

## VERIFIED CLAIMS

### 1. MultiSelectDropdown component exists and has correct interface
**File:** `/components/ui/multi-select-dropdown.tsx` (lines 16-31)
**Evidence:**
```typescript
export interface MultiSelectOption {
  value: string
  label: string
  metadata?: Record<string, unknown>
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchable?: boolean
  selectAllOption?: boolean
  maxHeight?: string
  disabled?: boolean
}
```
**Status:** VERIFIED - Can be reused directly for client selection

### 2. withPermission supports { resource: 'users', action: 'manage' }
**File:** `/lib/rbac/with-permission.ts` (lines 11-27, 114)
**Evidence:**
```typescript
export type ResourceType = 'clients' | 'communications' | 'tickets' | ... | 'users' | ...
export type PermissionAction = 'read' | 'write' | 'delete' | 'manage'
```
Existing usage at `/app/api/v1/settings/users/route.ts`:
```typescript
export const GET = withPermission({ resource: 'users', action: 'manage' })(...)
```
**Status:** VERIFIED

### 3. permissionService.invalidateCache() exists with correct signature
**File:** `/lib/rbac/permission-service.ts` (lines 350-360)
**Evidence:**
```typescript
invalidateCache(userId: string, agencyId: string): void {
  if (!userId || !agencyId) {
    console.error('[PermissionService] Invalid userId or agencyId for cache invalidation');
    return;
  }
  const cacheKey = `${userId}:${agencyId}`;
  this.cache.delete(cacheKey);
}
```
**Status:** VERIFIED

### 4. member_client_access table has correct columns
**File:** `/types/database.ts` (lines 820-847)
**Evidence:**
```typescript
member_client_access: {
  Row: {
    agency_id: string
    assigned_at: string
    assigned_by: string
    client_id: string
    id: string
    permission: Database["public"]["Enums"]["client_access_permission"]
    user_id: string
  }
}
```
**Status:** VERIFIED - Matches claim exactly

### 5. Client deletion cascades to member_client_access
**File:** `/supabase/migrations/20260106_multi_org_roles.sql` (line 119)
**Evidence:**
```sql
client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
```
**Status:** VERIFIED - Assignments auto-deleted when client is deleted

### 6. User deletion cascades to member_client_access
**File:** `/supabase/migrations/20260106_multi_org_roles.sql` (line 118)
**Evidence:**
```sql
user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
```
**Status:** VERIFIED - Assignments auto-deleted when user is deleted

---

## UNVERIFIED/PROBLEMATIC CLAIMS

### 1. TeamMember type has role_id and hierarchy_level - **FALSE**
**File:** `/types/settings.ts` (lines 82-96)
**Evidence:**
```typescript
export interface TeamMember {
  id: string
  agency_id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole  // This is "admin" | "user", NOT role_id!
  avatar_url: string | null
  is_active: boolean
  last_active_at: string | null
  created_at: string
  full_name?: string
  client_count?: number
}
```
**Risk:** HIGH - Cannot determine if user is a Member (hierarchy_level=4) from this type
**Impact:** Client assignment button will show for all users, not just Members

### 2. "Only Members (hierarchy_level=4) can have client assignments" enforcement - **MISSING**
**Evidence:** The `TeamMember` type only has `role: UserRole` which is `"admin" | "user"` - NOT the new RBAC role system with hierarchy_level.

The team-members-section.tsx fetches from `/api/v1/settings/users` which returns the old `role` field (line 39):
```typescript
.select('id, email, first_name, last_name, role, avatar_url, is_active, ...')
```
**Risk:** HIGH - Need to either:
1. Update API to join with role table and return hierarchy_level, OR
2. Update TeamMember type to include role_id and fetch hierarchy_level separately

### 3. RBAC API routes exist at /app/api/v1/rbac/ - **FALSE**
**Evidence:** `Glob` returned "No files found" for `app/api/v1/rbac/**/*.ts`
**Risk:** MEDIUM - Need to create the directory structure:
```
app/api/v1/rbac/
  client-access/
    route.ts           # GET (list), POST (create)
    [id]/
      route.ts         # PATCH (update), DELETE (remove)
```

---

## FOUND ISSUES

### Issue 1: Schema Mismatch Between types/rbac.ts and Database
**Location:** `/types/rbac.ts` vs `/types/database.ts`
**Problem:** The `MemberClientAccess` interface in `types/rbac.ts` (line 81-89) has different fields than the database schema:

types/rbac.ts:
```typescript
export interface MemberClientAccess {
  id: string;
  user_id: string;
  agency_id: string;
  client_id: string;
  assigned_by: string | null;  // nullable
  assigned_at: string;
  is_active: boolean;          // extra field
}
```

types/database.ts (from actual schema):
```typescript
{
  agency_id: string
  assigned_at: string
  assigned_by: string          // NOT nullable
  client_id: string
  id: string
  permission: "read" | "write" // missing from types/rbac.ts!
  user_id: string
}
```

**Impact:** HIGH - The `permission` field is critical and missing from types/rbac.ts
**Fix:** Update `types/rbac.ts` to include `permission: 'read' | 'write'` and fix nullability

### Issue 2: Role Promotion Doesn't Clean Up Assignments
**Problem:** If a Member is promoted to Manager/Admin/Owner, their `member_client_access` entries remain. This causes:
1. Stale data in the database
2. Potential confusion in permission checks
3. Wasted storage

**Evidence:** Searched for "promotion" logic - none found. The `permission-service.ts` only reads from `member_client_access` for hierarchy_level=4 users (line 135), but there's no cleanup trigger.

**Fix:** Add a database trigger OR application logic:
```sql
-- Option A: Database trigger
CREATE OR REPLACE FUNCTION cleanup_member_access_on_promotion()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT hierarchy_level FROM role WHERE id = NEW.role_id) < 4 THEN
    DELETE FROM member_client_access WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_member_access
AFTER UPDATE OF role_id ON "user"
FOR EACH ROW EXECUTE FUNCTION cleanup_member_access_on_promotion();
```

### Issue 3: Bulk Assignment Performance
**Problem:** Plan doesn't address bulk operations (e.g., assign 50 clients at once)
**Evidence:** No batch insert logic mentioned

**Impact:** MEDIUM - Large assignments could timeout or fail
**Fix:** Use Supabase batch insert:
```typescript
const { error } = await supabase
  .from('member_client_access')
  .insert(clientIds.map(clientId => ({
    user_id: memberId,
    client_id: clientId,
    agency_id: agencyId,
    permission: 'read',
    assigned_by: currentUserId
  })))
```

### Issue 4: No Existing Pattern for RBAC Routes
**Problem:** There are no existing `/api/v1/rbac/` routes to follow as a pattern
**Evidence:** Glob returned empty for `app/api/v1/rbac/**/*.ts`

**Impact:** LOW - Need to establish the pattern, but `/api/v1/settings/users/route.ts` is a good template
**Fix:** Follow the pattern from `settings/users/route.ts`:
- Use `withPermission()` wrapper
- Use `withRateLimit()` and `withCsrfProtection()`
- Return consistent JSON structure with pagination

---

## MISSING PIECES

### 1. Need to extend TeamMember type
```typescript
// In types/settings.ts
export interface TeamMember {
  // ... existing fields ...
  role_id: string | null       // ADD: For RBAC role lookup
  hierarchy_level?: number     // ADD: For quick Member detection
}
```

### 2. Need to update GET /api/v1/settings/users
The current query (line 37-40) doesn't join with the role table:
```typescript
// Current:
.select('id, email, first_name, last_name, role, avatar_url, is_active, ...')

// Needed:
.select(`
  id, email, first_name, last_name, role, avatar_url, is_active, ...,
  role_id,
  role_obj:role_id (
    hierarchy_level
  )
`)
```

### 3. Need MemberClientAccess response type with client details
```typescript
export interface MemberClientAccessWithClient {
  id: string
  user_id: string
  client_id: string
  permission: 'read' | 'write'
  assigned_at: string
  assigned_by: string
  client: {
    id: string
    name: string
    status: string
  }
}
```

### 4. Need to create useClientAssignment hook
```typescript
// hooks/use-client-assignment.ts
export function useClientAssignment(userId: string) {
  // Fetch current assignments
  // Provide mutation functions
  // Handle cache invalidation
}
```

### 5. Need dropdown menu item in team-members-section
**Location:** `/components/settings/sections/team-members-section.tsx` (around line 577-582)
**Current:**
```tsx
<DropdownMenuItem onClick={() => setSelectedMember(member)}>
  Edit profile
</DropdownMenuItem>
<DropdownMenuItem>Change role</DropdownMenuItem>
<DropdownMenuItem>View activity</DropdownMenuItem>
```
**Needed:**
```tsx
<DropdownMenuItem onClick={() => setSelectedMember(member)}>
  Edit profile
</DropdownMenuItem>
<DropdownMenuItem>Change role</DropdownMenuItem>
{/* ADD: Only show for Members (hierarchy_level=4) */}
{member.hierarchy_level === 4 && (
  <DropdownMenuItem onClick={() => openClientAssignment(member)}>
    Manage client access
  </DropdownMenuItem>
)}
<DropdownMenuItem>View activity</DropdownMenuItem>
```

---

## RECOMMENDED IMPLEMENTATION ORDER

1. **Fix types first:**
   - Update `types/settings.ts` to add `role_id` and `hierarchy_level` to TeamMember
   - Update `types/rbac.ts` MemberClientAccess to include `permission` field

2. **Update GET /api/v1/settings/users:**
   - Join with role table to get hierarchy_level
   - Include in response

3. **Create RBAC API routes:**
   - `app/api/v1/rbac/client-access/route.ts` (GET, POST)
   - `app/api/v1/rbac/client-access/[id]/route.ts` (PATCH, DELETE)

4. **Create hook:**
   - `hooks/use-client-assignment.ts`

5. **Create modal:**
   - `components/settings/modals/client-assignment-modal.tsx`

6. **Update team-members-section:**
   - Add dropdown menu item
   - Wire up modal

7. **Add database trigger for promotion cleanup** (optional but recommended)

---

## DECISION NEEDED

**Question:** Should Members with `permission: 'read'` on a client see different UI than those with `permission: 'write'`?

Currently the plan doesn't distinguish between read-only and read-write assignments in the UI. The database supports both levels, but the modal design hasn't addressed this.

Options:
1. **Simple:** All assignments are `read` by default, upgrade to `write` separately
2. **Full:** Show permission dropdown per client in the modal
3. **Bulk:** Apply same permission level to all selected clients

---

## FINAL CONFIDENCE BREAKDOWN

| Aspect | Score | Notes |
|--------|-------|-------|
| Dependencies exist | 8/10 | Most components exist, some need updates |
| Types correct | 4/10 | Major gaps in TeamMember and MemberClientAccess |
| API pattern clear | 7/10 | Follow settings/users pattern |
| Edge cases handled | 5/10 | Cascade deletes work, promotion cleanup missing |
| UI integration clear | 6/10 | Need hierarchy_level to filter |

**Overall: 6/10 - Proceed with caution, fix types first**
# CRITICAL VALIDATION REPORT: Data Sync Infrastructure Plan

**Date:** 2026-01-12
**Reviewer:** Pre-flight Validation
**Verdict:** MULTIPLE BLOCKERS FOUND - DO NOT IMPLEMENT AS-IS

---

## EXECUTIVE SUMMARY

The plan to build data sync infrastructure has **CRITICAL architectural issues** that will cause it to fail immediately. The most severe: **chi-gateway cannot be called from Next.js API routes**. The plan fundamentally misunderstands how MCP tools work.

---

## VERIFIED (with evidence)

### 1. Sync endpoint exists as placeholder
- **Claim:** `/api/v1/integrations/[id]/sync/route.ts` exists
- **Proof:** File at `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/app/api/v1/integrations/[id]/sync/route.ts`, lines 52-58
- **Reality:** It's a FAKE sync - just updates `last_sync_at` timestamp with a 1-second delay. Does NOT actually sync any data.
```typescript
// Lines 52-58: "In a real implementation, this would queue a sync job"
// Simulate sync delay (in production, this would be a queue)
await new Promise((resolve) => setTimeout(resolve, 1000))
```

### 2. ad_performance table schema exists
- **Claim:** Database table ready
- **Proof:** `/types/database.ts` lines 35-96
- **Columns confirmed:**
  - `account_id: string` (REQUIRED)
  - `agency_id: string` (REQUIRED)
  - `campaign_id: string | null`
  - `client_id: string` (REQUIRED - **this is important!**)
  - `clicks, conversions, impressions, spend, revenue`
  - `date: string` (REQUIRED)
  - `platform: "google_ads" | "meta_ads"` (REQUIRED)
- **FK constraint:** `ad_performance_client_id_fkey` references `client` table

### 3. communication table schema exists
- **Claim:** Database table ready for Slack sync
- **Proof:** `/types/database.ts` lines 444-521
- **Columns confirmed:**
  - `agency_id: string` (REQUIRED)
  - `client_id: string` (REQUIRED)
  - `message_id: string` (REQUIRED - for deduplication)
  - `platform: "slack" | "gmail"`
  - `content, subject, sender_name, sender_email`
  - `thread_id, is_inbound, needs_reply`
  - `received_at: string` (REQUIRED)

### 4. lib/crypto.ts has decryptToken function
- **Claim:** Can decrypt stored OAuth tokens
- **Proof:** `/lib/crypto.ts` lines 143-167
- **Function signature:** `decryptToken(encrypted: EncryptedToken): string | null`
- **Warning:** Returns `null` if `TOKEN_ENCRYPTION_KEY` env var is not set

### 5. OAuth callback stores tokens with expiry
- **Claim:** Tokens are stored with metadata
- **Proof:** `/app/api/v1/oauth/callback/route.ts` lines 88-112
- **Stored fields:** `access_token`, `refresh_token`, `token_expires_at`
- **Encryption:** Uses AES-256-GCM if `TOKEN_ENCRYPTION_KEY` is set

---

## FOUND ISSUES (BLOCKERS)

### ISSUE 1: Chi-gateway is MCP-only - CANNOT call from app code
- **Severity:** BLOCKER
- **Impact:** The entire approach is invalid
- **Evidence:**
  - RUNBOOK.md lines 77-79: "chi-gateway - Personal PAI infrastructure (NOT for products)"
  - cc-gateway index.ts line 527-531: REST API requires `CHI_API_KEY` auth header
  - MCP tools (`mcp__chi-gateway__*`) are for Claude Code sessions, NOT for Next.js runtime
- **What happens if you try:**
  - From Next.js API route: You'd need to make HTTP requests to `chi-gateway.workers.dev`
  - You'd need `CHI_API_KEY` in Vercel env vars (security concern - mixing PAI and product)
  - Chi-gateway uses Roderic's personal Google OAuth tokens, NOT the agency's tokens
- **Fix Required:** Build direct API integration in the app, NOT call chi-gateway

### ISSUE 2: Chi-gateway uses HARDCODED credentials, not per-tenant
- **Severity:** BLOCKER
- **Impact:** Cannot support multi-tenant SaaS
- **Evidence:** `/infrastructure/cloudflare/cc-gateway/src/routes/google-ads.ts` lines 9-34
  - Uses `env.GOOGLE_REFRESH_TOKEN` (single hardcoded token)
  - Uses `env.GOOGLE_ADS_CUSTOMER_ID` (single customer)
  - This is Roderic's personal Google account, not agency accounts!
- **What the app needs:** Each agency has their own OAuth tokens stored in the `integration` table
- **Fix Required:** Build sync logic that reads tokens FROM the integration table, not from env vars

### ISSUE 3: No client_id mapping for ad performance
- **Severity:** BLOCKER
- **Impact:** Cannot insert ad data without knowing which client it belongs to
- **Evidence:**
  - `ad_performance.client_id` is REQUIRED (not nullable)
  - `integration` table has NO `client_id` column (checked `/types/database.ts` lines 729-777)
  - Google Ads API returns account-level data, not client-level
- **Question:** How do we know which AudienceOS client maps to which Google Ads account?
- **Fix Required:** Either:
  1. Add `client_id` to `integration` table (requires migration), OR
  2. Add mapping table `integration_client_mapping`, OR
  3. Store mapping in `integration.config` JSON

### ISSUE 4: Token refresh not handled in sync code
- **Severity:** HIGH
- **Impact:** Sync will fail after ~1 hour when tokens expire
- **Evidence:**
  - OAuth tokens stored at callback time (`token_expires_at`)
  - No code exists to refresh tokens before/during sync
  - Chi-gateway handles its own refresh (lines 9-34 of google-ads.ts) but app cannot
- **Fix Required:** Build token refresh logic that:
  1. Checks `token_expires_at` before sync
  2. Uses `refresh_token` to get new `access_token`
  3. Updates database with new tokens

### ISSUE 5: Communication table requires client_id (how to map Slack users?)
- **Severity:** HIGH
- **Impact:** Cannot store Slack messages without client mapping
- **Evidence:** `communication.client_id` is REQUIRED
- **Question:** When a Slack message comes from `john@acme.com`:
  - How do we know which client "Acme Corp" this maps to?
  - Client matching is non-trivial (email domains, user IDs, etc.)
- **Fix Required:** Define client matching strategy BEFORE implementing sync

---

## UNVERIFIED (needs validation)

### 1. Google Ads API response format
- **Claim:** Chi-gateway returns data ready for ad_performance table
- **Risk:** Format mismatch could cause insertion failures
- **Evidence:** Google Ads route returns raw GAQL response (lines 84-105)
- **What we need:** `{ impressions, clicks, cost_micros, conversions }` per day
- **What API returns:** Nested `customer` response with different field names
- **How to verify:** Call chi-gateway `/google-ads/performance` and inspect response

### 2. Slack API response format
- **Claim:** Plan mentions chi-gateway has Slack tools
- **Risk:** Chi-gateway does NOT have Slack tools!
- **Evidence:** Searched `MCP_TOOLS` array - no `slack_*` tools exist
- **Reality:** Would need to build Slack integration from scratch
- **How to verify:** `grep -r "slack" infrastructure/cloudflare/cc-gateway/` - no routes

### 3. Environment variables on Vercel
- **Claim:** OAuth secrets are configured
- **Variables needed:**
  - `TOKEN_ENCRYPTION_KEY` (for decrypting stored tokens)
  - `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`
  - `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- **How to verify:** Check Vercel dashboard env vars

---

## MISSING PIECES

### 1. Direct Google Ads API integration
- **Need:** `/lib/services/google-ads-sync.ts` that:
  - Reads tokens from `integration` table
  - Decrypts using `decryptToken()`
  - Calls Google Ads API directly
  - Handles token refresh
  - Transforms response to `ad_performance` insert format

### 2. Direct Slack API integration
- **Need:** `/lib/services/slack-sync.ts` that:
  - Reads Slack OAuth token from `integration` table
  - Calls Slack conversations.history API
  - Maps Slack users to AudienceOS clients
  - Transforms to `communication` insert format
  - Handles pagination (Slack limits to 100 messages per request)

### 3. Client mapping configuration
- **Need:** Way to map external account IDs to AudienceOS client_ids
- **Options:**
  1. Store in `integration.config` JSON: `{ "google_ads_account_map": { "1209401747": "client-uuid-here" } }`
  2. Add `client_mappings` table with `external_id`, `client_id`, `integration_id`

### 4. Rate limiting for external APIs
- **Google Ads:** 10,000 requests/day basic tier
- **Slack:** Tier 2 = 20 requests/minute
- **Need:** Backoff logic, request queuing

### 5. Error recovery strategy
- **What if:** API returns 5xx? Rate limited? Invalid token?
- **Need:**
  - Retry logic with exponential backoff
  - Partial failure handling (some records succeed, some fail)
  - Alert/notification on sync failure

### 6. Deduplication logic
- **ad_performance:** Should be idempotent (same date + account = update, not insert)
- **communication:** Use `message_id` as unique key
- **Need:** Upsert logic or pre-check queries

---

## RECOMMENDED ACTION

### Stop. Replan. Here's what actually needs to happen:

1. **Acknowledge chi-gateway is NOT usable** - it's personal infrastructure with hardcoded credentials

2. **Build direct API clients:**
   ```
   lib/services/
     google-ads-client.ts  <- OAuth + API calls
     slack-client.ts       <- OAuth + API calls
     sync-orchestrator.ts  <- Coordinates all syncs
   ```

3. **Add client mapping to integration table:**
   ```sql
   ALTER TABLE integration ADD COLUMN config JSONB;
   -- config: { "client_mappings": { "external_account_id": "client_uuid" } }
   ```
   Wait - `config` column already exists! (line 733 of database.ts)

4. **Build token refresh middleware:**
   ```typescript
   async function getValidToken(integrationId: string): Promise<string> {
     const integration = await getIntegration(integrationId)
     if (isTokenExpired(integration.token_expires_at)) {
       return await refreshToken(integration)
     }
     return decryptToken(integration.access_token)
   }
   ```

5. **Create background job infrastructure:**
   - Supabase Edge Functions, OR
   - Vercel Cron (if Pro plan), OR
   - External job runner (Inngest, Trigger.dev)

---

## REVISED ESTIMATE

| Task | Original Plan | Actual Required |
|------|---------------|-----------------|
| Google Ads sync | "Call chi-gateway" | Build full OAuth client + API wrapper |
| Slack sync | "Call chi-gateway" | Build full Slack API client |
| Token handling | "Already done" | Build refresh logic |
| Client mapping | Not mentioned | Add mapping strategy |
| Error handling | Not mentioned | Build retry/recovery |
| **Total DU** | ~8 DU (assumed) | **18-24 DU** (realistic) |

---

## FINAL VERDICT

**DO NOT PROCEED** with the current plan. The fundamental assumption (use chi-gateway) is invalid for a multi-tenant product. Need to:

1. Write direct API integrations
2. Handle per-tenant OAuth tokens
3. Build client mapping configuration
4. Add token refresh logic
5. Plan for errors and rate limits

This is a significant feature that needs proper Phase D (SpecKit) before implementation.

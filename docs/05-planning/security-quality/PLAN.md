# Security & Code Quality Fix Plan

## Overview
Fix all critical security gaps and code quality issues identified in the code review. This plan addresses 9 phases across ~30 files.

---

## ⚠️ VALIDATION FINDINGS (Pre-Implementation)

After stress-testing this plan, critical gaps were found:

| Issue | Impact | Resolution |
|-------|--------|------------|
| Frontend doesn't use `fetchWithCsrf` | Adding server CSRF = 403 for all forms | **Add Phase 0** |
| Service role in 2 files, not 1 | Incomplete fix | Update Phase 3 |
| Rate limit RPC already exists | Unnecessary migration | **Remove Phase 6** |
| Demo mode depends on service role | Demo will break | Add fallback |

---

## Phase 0: Frontend CSRF Integration (MUST DO FIRST)

**Problem:** `lib/csrf.ts` has `fetchWithCsrf()` but it's NEVER IMPORTED or USED.

**Impact:** Adding server-side CSRF validation will break ALL mutating requests.

**Files to update:**

| File | Line | Current | Fix |
|------|------|---------|-----|
| `stores/pipeline-store.ts` | 189 | `fetch(\`/api/v1/clients/${clientId}/stage\`, { method: 'POST' ...})` | Use `fetchWithCsrf()` |
| `stores/automations-store.ts` | 134 | `fetch(\`/api/v1/workflows/${id}/toggle\`, { method: 'PATCH' ...})` | Use `fetchWithCsrf()` |
| `stores/automations-store.ts` | 158 | `fetch(\`/api/v1/workflows/${id}\`, { method: 'DELETE' ...})` | Use `fetchWithCsrf()` |
| `hooks/communications/use-communications.ts` | 210 | `fetch(\`/api/v1/communications/${messageId}/reply\`, { method: 'POST' ...})` | Use `fetchWithCsrf()` |
| `hooks/communications/use-communications.ts` | 243 | `fetch('/api/v1/assistant/draft', { method: 'POST' ...})` | Use `fetchWithCsrf()` |

**Pattern:**
```typescript
// Before
import { ... } from '...'
const response = await fetch('/api/v1/...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

// After
import { fetchWithCsrf } from '@/lib/csrf'
const response = await fetchWithCsrf('/api/v1/...', {
  method: 'POST',
  body: JSON.stringify(data),  // fetchWithCsrf adds Content-Type automatically
})
```

**Verification:** After this phase, all mutating fetch calls should use `fetchWithCsrf`.

---

## Phase 1: CSRF Protection (Critical)

**Problem:** `withCsrfProtection()` exists in `lib/security.ts:511-535` but is never used.

**Files to modify:** 19 API route files with mutating endpoints

### Implementation

1. **Create CSRF utility wrapper** - Add to `lib/security.ts`:
   ```typescript
   // Helper to apply CSRF to request - returns early if fails
   export function requireCsrf(request: NextRequest): NextResponse | null
   ```

2. **Add CSRF to all mutating endpoints:**

| File | Methods | Lines to Modify |
|------|---------|-----------------|
| `app/api/v1/clients/route.ts` | POST | ~line 102 |
| `app/api/v1/clients/[id]/route.ts` | PUT, DELETE | ~lines 211, 382 |
| `app/api/v1/clients/[id]/stage/route.ts` | PUT | ~line 12 |
| `app/api/v1/communications/[id]/route.ts` | PATCH | ~line 75 |
| `app/api/v1/communications/[id]/reply/route.ts` | POST | ~line 48 |
| `app/api/v1/integrations/route.ts` | POST | ~line 68 |
| `app/api/v1/integrations/[id]/route.ts` | PATCH, DELETE | ~lines 137, 212 |
| `app/api/v1/integrations/[id]/sync/route.ts` | POST | ~line 84 |
| `app/api/v1/integrations/[id]/test/route.ts` | POST | ~line 21 |
| `app/api/v1/tickets/route.ts` | POST | ~line 100 |
| `app/api/v1/tickets/[id]/route.ts` | PATCH, DELETE | ~lines 98, 221 |
| `app/api/v1/tickets/[id]/status/route.ts` | PATCH | ~line 32 |
| `app/api/v1/tickets/[id]/notes/route.ts` | POST | ~line 82 |
| `app/api/v1/tickets/[id]/resolve/route.ts` | POST | ~line 21 |
| `app/api/v1/tickets/[id]/reopen/route.ts` | POST | ~line 21 |
| `app/api/v1/workflows/route.ts` | POST | ~line 92 |
| `app/api/v1/workflows/[id]/route.ts` | PATCH, DELETE | ~lines 84, 239 |
| `app/api/v1/workflows/[id]/toggle/route.ts` | PATCH | ~line 14 |

**Pattern for each endpoint:**
```typescript
export async function POST(request: NextRequest) {
  // Add at top, after rate limit
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError
  // ... rest of handler
}
```

---

## Phase 2: Multi-Tenant Isolation (Critical)

**Problem:** Many endpoints rely solely on RLS without explicit agency_id filters.

### 2A. Fix API Routes Missing agency_id Filter

**Pattern to follow:** `lib/workflows/workflow-queries.ts` (every query has `.eq('agency_id', agencyId)`)

| File | Method | Current | Fix |
|------|--------|---------|-----|
| `clients/[id]/route.ts` | PUT | No filter | Add `.eq('agency_id', agencyId)` line 364 |
| `clients/[id]/route.ts` | DELETE | No filter | Add `.eq('agency_id', agencyId)` line 408 |
| `clients/[id]/stage/route.ts` | PUT | Fetches then updates | Add filter to update query |
| `communications/[id]/route.ts` | PATCH | No filter | Add filter |
| `integrations/[id]/route.ts` | PATCH, DELETE | No filter | Add filter to both |
| `integrations/[id]/sync/route.ts` | POST | No filter | Add filter |
| `integrations/[id]/test/route.ts` | POST | No filter | Add filter |
| `tickets/[id]/route.ts` | PATCH, DELETE | No filter | Add filter to both |
| `tickets/[id]/status/route.ts` | PATCH | No filter | Add filter |
| `tickets/[id]/resolve/route.ts` | POST | No filter | Add filter |
| `tickets/[id]/reopen/route.ts` | POST | No filter | Add filter |

### 2B. Ensure agencyId is Destructured

Several routes call `getAuthenticatedUser()` but don't use `agencyId`:

```typescript
// Current (wrong)
const { user, error: authError } = await getAuthenticatedUser(supabase)

// Fixed
const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)
if (!agencyId) return createErrorResponse(403, 'No agency access')
```

---

## Phase 3: Remove Service Role Bypass (Critical)

**Problem:** Admin client bypassing RLS exists in TWO files (validated).

### Files with Service Role Bypass

| File | Lines | Code |
|------|-------|------|
| `app/api/v1/clients/route.ts` | 8-12 | `getAdminClient()` function |
| `app/api/v1/clients/[id]/route.ts` | 9-13 | `getAdminClient()` function |

### Implementation

**For `app/api/v1/clients/route.ts`:**
1. Delete lines 8-12 (getAdminClient function)
2. Delete `isDevMode` variable and logic (lines 30-39)
3. Ensure authenticated path works without bypass

**For `app/api/v1/clients/[id]/route.ts`:**
1. Delete lines 9-13 (getAdminClient function)
2. Delete dev mode branch (lines 37-110)
3. Keep demo mode for mock data (uses getMockClientDetail, doesn't bypass RLS)

### ⚠️ Demo Mode Impact

After this change:
- Mock data (`getMockClientDetail`) still works for IDs 1-14
- Real UUID requests require authentication
- Dev testing requires a real test user account

**Alternative (if demo mode is critical):**
Keep dev mode BUT add explicit agency_id filter:
```typescript
// If we must keep dev mode, at least add explicit filter
.eq('agency_id', '11111111-1111-1111-1111-111111111111')
```

---

## Phase 4: Fix Subscription Memory Leaks (High)

### 4A. `hooks/use-ticket-subscription.ts`

**Line 103 - Fix boolean dependency:**
```typescript
// Current (wrong)
}, [tickets.length > 0, fetchTickets])

// Fixed
}, [tickets.length, fetchTickets])
```

**Also add early return guard:**
```typescript
useEffect(() => {
  if (tickets.length === 0) return  // Already there, but move before cleanup
  // ...
}, [tickets.length]) // Remove fetchTickets - use getState() pattern instead
```

**Fix fetchTickets instability:**
```typescript
// In callback, instead of using destructured fetchTickets:
useTicketStore.getState().fetchTickets()
```

### 4B. `hooks/use-ticket-subscription.ts` (useTicketNotesSubscription)

**Line 152 - Fix fetchNotes dependency:**
```typescript
// Use getState() pattern
useEffect(() => {
  // Inside callback:
  useTicketStore.getState().fetchNotes(ticketId)
}, [ticketId]) // Remove fetchNotes
```

### 4C. `hooks/use-integrations.ts` (useIntegrations)

**CRITICAL - Line ~60 - Remove integrations array from deps:**
```typescript
// Current (causes infinite loop)
}, [fetchIntegrations, addIntegration, updateIntegration, removeIntegration, integrations])

// Fixed - use refs or getState()
const storeRef = useRef(useIntegrationsStore.getState())
useEffect(() => {
  // Use storeRef.current.methodName() inside callbacks
}, []) // Empty deps - subscription is static
```

### 4D. `hooks/use-integrations.ts` (useIntegrationStatus)

**Fix updateIntegration dependency:**
```typescript
// Use getState() pattern in callback
useIntegrationsStore.getState().updateIntegration(...)
```

### 4E. `hooks/communications/use-realtime-communications.ts`

**Lines 28-70 - Fix queryClient instability:**
```typescript
// Current - queryClient in deps causes re-subscription
const handleNewMessage = useCallback((payload) => {
  addCommunication(...)
  queryClient.invalidateQueries(...)
}, [addCommunication, clientId, queryClient])

// Fixed - stable reference pattern
const queryClientRef = useRef(queryClient)
useEffect(() => { queryClientRef.current = queryClient }, [queryClient])

const handleNewMessage = useCallback((payload) => {
  useCommunicationsStore.getState().addCommunication(...)
  queryClientRef.current.invalidateQueries(...)
}, [clientId]) // Stable deps only
```

---

## Phase 5: Request Size Limits (Medium)

**File:** `lib/security.ts`

Add to `parseJsonBody()` function:
```typescript
export async function parseJsonBody<T>(
  request: NextRequest,
  maxSize: number = 1024 * 1024 // 1MB default
): Promise<{ data: T | null; error: string | null }> {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > maxSize) {
    return { data: null, error: 'Request body too large' }
  }
  // ... rest of function
}
```

---

## Phase 6: Verify Rate Limit Migration (Quick Check)

**✅ VALIDATED:** Migration already exists at `supabase/migrations/005_rate_limit_table.sql`

**Contains:**
- `rate_limit` table with correct schema
- `increment_rate_limit()` function (lines 41-69)
- `cleanup_expired_rate_limits()` function (lines 72-77)
- Proper RLS and service role grants

**Action Required:** Verify migration has been applied to Supabase.

```bash
# Check if table exists in Supabase
supabase db diff

# Or check via MCP
mcp__chi-gateway__supabase_query(table="rate_limit", limit=1)
```

**If not applied:** Run `supabase db push` or apply manually.

**No new migration needed.** Skip to Phase 7.

---

## Phase 7: Add Missing Authentication (Medium)

**Problem:** 4 GET endpoints have no authentication checks.

| File | Method | Fix |
|------|--------|-----|
| `app/api/v1/clients/[id]/communications/route.ts` | GET | Add `getAuthenticatedUser()` check |
| `app/api/v1/communications/[id]/thread/route.ts` | GET | Add `getAuthenticatedUser()` check |

**Pattern:**
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(cookies)
  const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

  if (!user || !agencyId) {
    return createErrorResponse(401, authError || 'Unauthorized')
  }

  // Add .eq('agency_id', agencyId) to queries
  // ... rest of handler
}
```

---

## Phase 8: Conditional Logging (Low)

**CTO Decision:** Wrap logs in NODE_ENV check - preserves debugging in dev, silent in prod.

**Files to update:**

| File | Count | Action |
|------|-------|--------|
| `app/api/v1/clients/[id]/route.ts` | 1 | Wrap in `if (process.env.NODE_ENV !== 'production')` |
| `hooks/use-ticket-subscription.ts` | 4 | Wrap all Realtime logs |
| `hooks/use-integrations.ts` | 2 | Wrap subscription logs |
| `hooks/communications/use-realtime-communications.ts` | 2 | Wrap subscription logs |

**Pattern:**
```typescript
// Before
console.log('[Realtime] Ticket inserted:', payload.new)

// After
if (process.env.NODE_ENV !== 'production') {
  console.log('[Realtime] Ticket inserted:', payload.new)
}
```

**Optional:** Create a dev-only logger utility:
```typescript
// lib/dev-logger.ts
export const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}
```

---

## Phase 9: Fix Array Size Limit Order (Low)

**File:** `app/api/v1/clients/[id]/route.ts` lines 310-318

```typescript
// Current - processes all then slices
updates.tags = tags
  .filter((t): t is string => typeof t === 'string')
  .map((t) => sanitizeString(t).slice(0, 50))
  .slice(0, 20)

// Fixed - limit first
if (tags.length > 100) {
  return createErrorResponse(400, 'Too many tags (max 100)')
}
updates.tags = tags
  .slice(0, 20)  // Limit first
  .filter((t): t is string => typeof t === 'string')
  .map((t) => sanitizeString(t).slice(0, 50))
```

---

## Execution Order

| Phase | Priority | Estimated Scope | Dependencies |
|-------|----------|-----------------|--------------|
| **0. Frontend CSRF** | **BLOCKER** | 3 files, 5 fetch calls | **MUST DO FIRST** |
| 1. Server CSRF Protection | Critical | 19 files, ~40 insertions | Phase 0 complete |
| 2. Multi-Tenant Isolation | Critical | 11 files, ~20 modifications | None (parallel with 1) |
| 3. Remove Service Role | Critical | 2 files, deletions | None |
| 4. Fix Subscriptions | High | 4 files, refactoring | None |
| 5. Request Size Limits | Medium | 1 file | None |
| 6. Verify Rate Limit | Quick | 0 files (verify only) | None |
| 7. Add Missing Auth | Medium | 2 files | None |
| 8. Conditional Logging | Low | 5 files | None |
| 9. Array Size Fix | Low | 1 file | None |

### Recommended Execution Flow

```
Phase 0 (Frontend CSRF) ─────────────────────────────────┐
                                                         ↓
Phase 1 (Server CSRF) ←── depends on Phase 0 ────────────┤
                                                         │
Phase 2 (Multi-Tenant) ←── can run parallel with 1 ──────┤
                                                         │
Phase 3 (Service Role) ←── independent ──────────────────┤
                                                         ↓
Phases 4-9 (Lower priority) ─────────────────────────────┘
```

---

## Verification Checklist

### Phase 0 Verification (Do First)
- [ ] All mutating fetch calls use `fetchWithCsrf()`
- [ ] Manual test: Network tab shows `X-CSRF-Token` header on POST/PUT/PATCH/DELETE

### After Full Implementation
- [ ] All POST/PUT/PATCH/DELETE routes have CSRF check
- [ ] All multi-tenant queries have explicit `.eq('agency_id', agencyId)`
- [ ] No service role key in request-handling code (except `lib/security.ts` for rate limiting)
- [ ] All GET endpoints have authentication checks
- [ ] No boolean expressions in useEffect dependency arrays
- [ ] Rate limit table exists in Supabase (`rate_limit`)
- [ ] All console.log wrapped in NODE_ENV check
- [ ] Run `npm run build` - no TypeScript errors
- [ ] Run `npm run lint` - no lint errors
- [ ] Manual test: CSRF rejection works (missing header returns 403)
- [ ] Manual test: Cross-tenant access blocked (user A can't see user B's data)
- [ ] Manual test: Unauthenticated requests return 401
- [ ] Manual test: Demo mode still works for mock IDs 1-14

---

## Files Summary

**Total files to modify: ~33**

| Category | Count | Files |
|----------|-------|-------|
| **Frontend CSRF (Phase 0)** | 3 | `stores/pipeline-store.ts`, `stores/automations-store.ts`, `hooks/communications/use-communications.ts` |
| API Routes (server CSRF) | 19 | All mutating routes in `app/api/v1/` |
| API Routes (agency_id filter) | 11 | Routes missing explicit filter |
| API Routes (add auth) | 2 | `clients/[id]/communications`, `communications/[id]/thread` |
| API Routes (remove service role) | 2 | `clients/route.ts`, `clients/[id]/route.ts` |
| Hooks (subscription fixes) | 4 | `use-ticket-subscription.ts`, `use-integrations.ts`, `use-realtime-communications.ts` |
| Security utilities | 1 | `lib/security.ts` (request size limits) |
| Logging cleanup | 5 | Hooks + 1 API route |

---

## Confidence Score

**Before validation:** 8/10
**After validation:** 9/10

**Why it increased:**
- Found and fixed critical CSRF frontend gap (would have broken all forms)
- Confirmed rate limit migration exists (no unnecessary work)
- Identified both service role files (complete fix)
- Plan now has proper dependency ordering (Phase 0 → Phase 1)

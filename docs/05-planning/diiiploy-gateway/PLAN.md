# Plan: Refactor Integrations to Use Diiiploy-Gateway

**Created:** 2026-01-14
**Status:** In Progress
**Red Team Validated:** Yes (browser + MCP verification)

## ============================================================
## CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
## Chi-gateway is for personal PAI infrastructure only.
## ============================================================

## Problem

The app currently has its own OAuth flow for Google Workspace, but:
1. Diiiploy-gateway already handles Google Workspace tokens and has 63 MCP tools
2. The "agency model" means clients connect during onboarding calls, not self-serve
3. App's OAuth routes are dead code that duplicates diiiploy-gateway functionality

## Evidence (Red Team Verified)

| Endpoint | Response | Use For |
|----------|----------|---------|
| `/health` | `{"status":"ok","version":"1.3.0","tools":63}` | Gateway status |
| `/health/full` | Per-service status array with message/hint | Integration cards |
| `gmail_inbox` MCP | Returns email data | Confirms Gmail connected |
| `drive_list` MCP | Returns file list | Confirms Drive connected |

## Implementation Plan

### Phase 1: Create Diiiploy-Gateway Status Service (New) - DONE

**File:** `lib/integrations/diiiploy-gateway-status.ts`

```typescript
// CRITICAL: AudienceOS uses diiiploy-gateway, NOT chi-gateway!
const DIIIPLOY_GATEWAY_URL = 'https://diiiploy-gateway.diiiploy.workers.dev'

export async function getIntegrationStatus(): Promise<IntegrationStatus[]> {
  const response = await fetch(`${DIIIPLOY_GATEWAY_URL}/health/full`)
  const data = await response.json()

  return data.services.map(service => ({
    provider: service.service,
    isConnected: service.status === 'ok',
    status: service.status,
    message: service.message,
    hint: service.hint,
  }))
}
```

### Phase 2: Update Integrations Hub UI

**File:** `components/views/integrations-hub.tsx`

1. Remove `onConnect` handler that triggers OAuth
2. Fetch status from diiiploy-gateway on mount
3. Show connection status from diiiploy-gateway health response
4. For disconnected services, show "Contact support to reconnect" (agency model)

**Changes:**
- Remove OAuth-related UI (Connect buttons that trigger OAuth)
- Add "Status" display using diiiploy-gateway health data
- Add manual "Refresh Status" button

### Phase 3: Remove Dead Code

**Files to DELETE:**
- `app/api/v1/oauth/callback/route.ts` - OAuth callback (diiiploy-gateway handles this)

**Files to SIMPLIFY:**
- `app/api/v1/integrations/route.ts` - Remove OAuth URL generation, keep credential-based providers
- `app/api/v1/integrations/[id]/route.ts` - Simplify to just status reads

**Files to AUDIT for dead code:**
- `lib/crypto.ts` - Remove token encryption if no longer used
- `lib/sync/google-ads-sync.ts` - Already uses diiiploy-gateway correctly

### Phase 4: Documentation

**File:** `RUNBOOK.md`

Add section:
```markdown
## Integrations Architecture

**Model:** Agency/Concierge (not self-serve SaaS)

**CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!**

Diiiploy-gateway (Cloudflare Worker) is the single source of truth for integrations:
- **Endpoint:** https://diiiploy-gateway.diiiploy.workers.dev
- **Health Check:** `/health/full` returns per-service status
- **Token Storage:** Cloudflare KV (not in app database)

When a client needs to connect an integration:
1. During onboarding call, admin navigates to diiiploy-gateway OAuth flow
2. Client authenticates on their device
3. Diiiploy-gateway stores tokens in KV
4. App queries `/health/full` to show status
```

## Files to Modify

| File | Action | Reason |
|------|--------|--------|
| `lib/integrations/diiiploy-gateway-status.ts` | CREATE | New status service |
| `components/views/integrations-hub.tsx` | MODIFY | Use diiiploy-gateway status |
| `app/api/v1/oauth/callback/route.ts` | DELETE | Dead code |
| `app/api/v1/integrations/route.ts` | SIMPLIFY | Remove OAuth generation |
| `RUNBOOK.md` | UPDATE | Document architecture |

## NOT Changing

- `supabase/migrations/019_fix_integration_rls.sql` - Keep, may still track metadata
- Integration table in Supabase - May still use for tracking which services client wants
- Credential-based integrations (Slack, Google Ads API keys) - These stay

## Success Criteria

1. Integrations page loads status from diiiploy-gateway `/health/full`
2. No OAuth flows triggered from the app
3. Dead OAuth code removed
4. RUNBOOK.md documents the architecture decision
5. Build passes (`npm run build`)

## Rollback

If issues arise:
- Diiiploy-gateway health endpoint is read-only, no risk to existing data
- OAuth routes being removed aren't functional anyway (Google Cloud not configured)
- Can restore deleted files from git if needed

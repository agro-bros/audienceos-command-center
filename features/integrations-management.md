# FEATURE SPEC: Integrations Management

**What:** OAuth connection management for Slack, Gmail, Google Ads, and Meta Ads with sync monitoring and health checks
**Who:** Agency Admins and Account Managers managing external service connections
**Why:** Centralized control over critical integrations that power communications and ad performance tracking
**Status:** ✅ Complete (UI wired to backend 2026-01-10) | Status Display Fixed 2026-01-20

---

## Current State (2026-01-20)

### Integration Status Display - FIXED

**Problem:** UI showed "0 connected" despite database having integrations with `is_connected: TRUE`

**Root Cause:**
- `integrations-hub.tsx` was reading from diiiploy-gateway (single-tenant health endpoint)
- Gateway returned `warning` status for OAuth services
- UI status logic only mapped `ok` → connected, `error` → error
- `warning` fell through to `disconnected`

**Fix Applied:**
- Removed gateway health dependency
- Now fetches from `/api/v1/integrations` (Supabase with RLS)
- Uses `is_connected` field from database directly
- Added `DbIntegration` interface for type safety

**Commits:**
- `9e87678` - fix(integrations): read from Supabase instead of diiiploy-gateway
- `579daf8` - fix(integrations): add type safety to API response

**Key File:** `components/views/integrations-hub.tsx`

### Multi-tenant Architecture Note

Integration status MUST read from per-tenant data sources (Supabase with RLS) not shared infrastructure (gateway health). Gateway health checks are useful for connectivity testing, but NOT for displaying per-agency integration status.

---

## User Stories

**US-009: View Integration Status**
As an Admin, I want to see all integrations and their connection status, so that I know what's working.

Acceptance Criteria:
- [x] Integration cards for: Slack, Gmail, Google Ads, Meta Ads
- [x] Each card shows: connected/disconnected, last sync time, health
- [x] "Settings" button opens configuration modal
- [x] "Test Connection" validates current tokens

**US-010: Connect Slack Integration**
As an Admin, I want to connect Slack via OAuth, so that client messages sync to the platform.

Acceptance Criteria:
- [x] OAuth 2.0 flow with workspace selection
- [x] Tokens encrypted via AES-GCM (lib/crypto.ts)
- [ ] Configure default channel for notifications (future)
- [ ] Option to sync past 30 days on connect (future)
- [x] Success confirmation with initial sync trigger

**US-011: Connect Gmail Integration**
As a User, I want to connect Gmail via OAuth, so that email threads appear in client timelines.

Acceptance Criteria:
- [ ] Google OAuth with read/send scope selection
- [ ] Thread-based ingestion (not individual messages)
- [ ] Link emails to clients via contact matching
- [ ] Re-authenticate button for expired tokens

**US-012: Connect Ad Platform Integrations**
As an Admin, I want to connect Google Ads and Meta Ads, so that performance data syncs automatically.

Acceptance Criteria:
- [ ] OAuth for both platforms with account selection
- [ ] Business Manager access for Meta
- [ ] Choose which ad accounts to sync
- [ ] Hourly sync frequency (configurable)
- [ ] MCP fallback for quick setup (chi-gateway)

---

## Functional Requirements

What this feature DOES:
- [ ] Manage OAuth 2.0 connections for 4 external services (Slack, Gmail, Google Ads, Meta Ads)
- [ ] Display real-time connection status and sync health indicators
- [ ] Provide platform-specific configuration interfaces
- [ ] Automatically refresh expiring access tokens proactively
- [ ] Test API connectivity on demand with detailed results
- [ ] Trigger manual sync operations with job tracking
- [ ] Encrypt and securely store OAuth credentials using Supabase Vault
- [ ] Log all integration events for audit trail and compliance
- [ ] Handle MCP fallback for Google/Meta Ads (MVP phase)
- [ ] Support graceful disconnection and credential cleanup

What this feature does NOT do:
- ❌ Store OAuth credentials in plaintext or weak encryption
- ❌ Share tokens between agencies (strict tenant isolation)
- ❌ Auto-connect integrations without explicit user consent
- ❌ Bypass OAuth approval processes or scope requirements
- ❌ Sync all data (only configured channels/accounts)

---

## Data Model

Entities involved:
- INTEGRATION - Core connection records with sync status and configuration
- AGENCY - Tenant isolation for integration ownership
- USER - Integration setup attribution and permissions

New fields needed:
| Entity | Field | Type | Description |
|--------|-------|------|-------------|
| INTEGRATION | health_score | Integer | 0-100 health rating based on sync success |
| INTEGRATION | next_sync_at | Timestamp | Scheduled next sync time |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/integrations` | GET | List all integrations with sync status |
| `/api/v1/integrations` | POST | Initiate OAuth flow |
| `/api/v1/integrations/{id}` | GET | Get integration details with config |
| `/api/v1/integrations/{id}` | PATCH | Update integration config |
| `/api/v1/integrations/{id}` | DELETE | Disconnect and delete credentials |
| `/api/v1/integrations/{id}/refresh` | POST | Force OAuth token refresh |
| `/api/v1/integrations/{id}/test` | POST | Test API connectivity |
| `/api/v1/integrations/{id}/sync` | POST | Trigger manual sync |
| `/api/v1/integrations/{id}/sync-status` | GET | Check ongoing sync job status |

---

## UI Components

| Component | Purpose |
|-----------|---------|
| IntegrationsGrid | Responsive 2x2 grid layout for integration cards |
| IntegrationCard | Individual service card with status, actions, settings |
| ConnectionStatus | Visual indicator (connected/failed/never synced) |
| SyncTimestamp | "Last synced: X ago" with real-time updates |
| OAuthButton | Connect/Reconnect with loading states and error handling |
| SettingsModal | Platform-specific configuration forms |
| TestConnectionDialog | API health check with detailed results |
| SyncProgress | Real-time sync progress with cancel option |
| ErrorAlert | Failed sync details with retry and help options |
| HealthIndicator | Visual health score (0-100) with trend arrow |

---

## Implementation Tasks

### OAuth Infrastructure
- [ ] TASK-001: Set up OAuth app registrations (Slack, Google, Meta)
- [ ] TASK-002: Configure Supabase Vault for token encryption
- [ ] TASK-003: Build OAuth callback handler with state validation
- [ ] TASK-004: Implement token refresh scheduler background job

### Integration Flows
- [ ] TASK-005: Build Slack OAuth 2.0 flow with workspace selection
- [ ] TASK-006: Implement Gmail OAuth with granular scope selection
- [ ] TASK-007: Create Google Ads OAuth with account permissions
- [ ] TASK-008: Build Meta Ads OAuth with Business Manager access
- [ ] TASK-009: Add OAuth state validation and CSRF protection

### API Layer
- [ ] TASK-010: Create integration CRUD endpoints with RLS
- [ ] TASK-011: Build token refresh API with retry logic
- [ ] TASK-012: Implement connection test endpoints for each provider
- [ ] TASK-013: Add manual sync trigger with job queuing
- [ ] TASK-014: Build sync status polling endpoint

### UI Components
- [ ] TASK-015: Create IntegrationsGrid with responsive design
- [ ] TASK-016: Build IntegrationCard with status animations
- [ ] TASK-017: Implement OAuthButton with popup handling
- [ ] TASK-018: Create platform-specific SettingsModal forms
- [ ] TASK-019: Build TestConnectionDialog with detailed results

### Token Management
- [ ] TASK-020: Implement proactive token refresh (24h before expiry)
- [ ] TASK-021: Build manual token refresh with user feedback
- [ ] TASK-022: Add token expiry monitoring and alerting
- [ ] TASK-023: Create comprehensive audit logging

### MCP Fallback (MVP)
- [ ] TASK-024: Implement chi-gateway MCP for Google Ads data
- [ ] TASK-025: Add chi-gateway MCP for Meta Ads performance
- [ ] TASK-026: Build MCP vs OAuth toggle interface
- [ ] TASK-027: Plan OAuth migration path for future versions

### Error Handling & Polish
- [ ] TASK-028: Add comprehensive error handling for each provider
- [ ] TASK-029: Implement retry logic with exponential backoff
- [ ] TASK-030: Build user-friendly error messages and resolution guides
- [ ] TASK-031: Add integration health monitoring and scoring

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| OAuth app rejected by provider | Show specific rejection reason, link to troubleshooting guide |
| Token refresh fails repeatedly | Disable integration, alert admin, show reconnect option |
| User revokes permissions externally | Detect on next API call, mark disconnected, prompt reconnect |
| Network timeout during OAuth | Show timeout message, retry option, offline guidance |
| Insufficient OAuth scopes | Display missing permissions, guide re-authorization |
| Integration config becomes invalid | Validate on save, show specific validation errors |
| Concurrent token refresh attempts | Lock refresh process, queue additional requests |
| Provider API rate limiting | Implement backoff, show rate limit status |
| Agency subscription expired | Disable integrations, show billing upgrade prompt |

---

## 2026-01-11 Quality Gate Validation

**What was validated:**
- ✅ All 5 quality gates passed (ACTIVATE, STRESS_TEST, REMEDIATION, FINAL_AUDIT, SANITY_CHECK)
- ✅ 648 tests passing, build compiles successfully
- ✅ All security measures verified (RBAC, CSRF, rate limiting, input validation)
- ✅ Error handling comprehensive in hook and modal components
- ✅ All dependencies installed and correctly imported

**Files verified:**
- `components/views/integrations-hub.tsx` - UI properly wires to real API
- `components/linear/integration-settings-modal.tsx` - Modal with Test/Sync/Disconnect
- `hooks/use-integrations.ts` - API calls include `credentials: 'include'`
- `app/api/v1/integrations/route.ts` - RBAC + security middleware applied

**Confidence Score:** 9/10

**Test Coverage Gaps Identified:**
- No dedicated unit tests for `useIntegrations` hook
- No dedicated unit tests for `IntegrationSettingsModal` component
- Recommendation: Add in future sprint (non-blocking for production)

**Code Quality Notes:**
- One `as any` cast for JSONB config field (acceptable)
- All other type safety verified
- Comprehensive null/undefined handling (12 instances)

**Status:** ✅ Production Ready - All validation gates passed

**Next:**
- Optional: Add unit tests for integration components
- Operational: Configure OAuth env vars on Vercel for full OAuth flows

---

## Technical Implementation

### OAuth Flow Security
```typescript
interface OAuthState {
  agencyId: string;
  userId: string;
  integrationType: 'slack' | 'gmail' | 'google_ads' | 'meta_ads';
  nonce: string;
  expiresAt: number;
}

function generateOAuthURL(type: string, agencyId: string): string {
  const state: OAuthState = {
    agencyId,
    userId: auth.user.id,
    integrationType: type as any,
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
  };

  const stateToken = jwt.sign(state, process.env.OAUTH_STATE_SECRET);

  return `${providers[type].authUrl}?${new URLSearchParams({
    client_id: providers[type].clientId,
    redirect_uri: `${process.env.APP_URL}/api/oauth/callback`,
    scope: providers[type].scopes.join(' '),
    state: stateToken,
    response_type: 'code',
    access_type: 'offline' // For refresh tokens
  })}`;
}
```

### Token Refresh System
```typescript
class TokenRefreshService {
  async scheduleRefresh() {
    const expiringTokens = await supabase
      .from('integrations')
      .select('*')
      .lt('token_expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000))
      .eq('is_connected', true);

    for (const integration of expiringTokens) {
      await this.refreshToken(integration.id);
    }
  }

  async refreshToken(integrationId: string): Promise<void> {
    const integration = await getIntegration(integrationId);
    const refreshToken = await decryptToken(integration.refresh_token_encrypted);

    try {
      const response = await fetch(providers[integration.provider].tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: providers[integration.provider].clientId,
          client_secret: providers[integration.provider].clientSecret
        })
      });

      const tokens = await response.json();

      await supabase
        .from('integrations')
        .update({
          access_token: await encryptToken(tokens.access_token),
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
          last_refreshed_at: new Date()
        })
        .eq('id', integrationId);

    } catch (error) {
      await this.handleRefreshFailure(integrationId, error);
    }
  }
}
```

### Health Check System
```typescript
async function testIntegrationHealth(integrationId: string): Promise<HealthCheckResult> {
  const integration = await getIntegration(integrationId);
  const accessToken = await decryptToken(integration.access_token);

  const tests = {
    slack: () => slackClient.auth.test({ token: accessToken }),
    gmail: () => gmailClient.users.getProfile({ userId: 'me', auth: accessToken }),
    google_ads: () => googleAdsClient.customers.list({ auth: accessToken }),
    meta_ads: () => facebookAdsApi.get('/me/adaccounts', { access_token: accessToken })
  };

  try {
    const startTime = Date.now();
    const result = await tests[integration.provider]();
    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime,
      lastChecked: new Date(),
      details: result
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      lastChecked: new Date(),
      suggestedAction: getSuggestedAction(error)
    };
  }
}
```

### MCP Fallback Implementation
```typescript
// MVP: Use chi-gateway MCP for ads data
async function getAdsPerformance(platform: 'google_ads' | 'meta_ads', config: any) {
  const integration = await getIntegration(platform);

  if (integration?.oauth_enabled) {
    // V2: Use OAuth tokens
    return platform === 'google_ads'
      ? await googleAdsClient.getPerformance(config)
      : await metaAdsClient.getPerformance(config);
  } else {
    // MVP: Use MCP fallback
    return platform === 'google_ads'
      ? await mcp_chi_gateway_google_ads_performance(config)
      : await mcp_chi_gateway_meta_insights(config);
  }
}
```

### Real-time Status Updates
```typescript
function IntegrationCard({ integration }: { integration: Integration }) {
  const [status, setStatus] = useState(integration.last_sync_status);
  const [lastSync, setLastSync] = useState(integration.last_sync_at);

  useEffect(() => {
    const subscription = supabase
      .channel(`integration-${integration.id}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'integrations',
          filter: `id=eq.${integration.id}`
        },
        handleIntegrationUpdate
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [integration.id]);

  function handleIntegrationUpdate(payload: any) {
    const updated = payload.new;
    setStatus(updated.last_sync_status);
    setLastSync(updated.last_sync_at);

    if (updated.last_sync_status === 'failed') {
      toast.error(`${integration.provider} sync failed`);
    }
  }

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3>{integration.provider}</h3>
          <ConnectionStatus status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <SyncTimestamp lastSync={lastSync} />
        <div className="flex gap-2 mt-4">
          <OAuthButton integration={integration} />
          <TestConnectionButton integrationId={integration.id} />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Testing Checklist

- [ ] Happy path: OAuth flow completes successfully for all 4 providers
- [ ] Token refresh: Automatic refresh works 24h before expiry
- [ ] Error handling: Failed connections show specific error messages
- [ ] Settings: Platform-specific configuration saves and validates
- [ ] Test connection: API validation works for each integration
- [ ] Disconnect: Clean removal of tokens and configuration
- [ ] Security: Tokens properly encrypted with Supabase Vault
- [ ] Audit trail: All integration events logged with details
- [ ] Real-time updates: Status changes reflect immediately
- [ ] Mobile responsive: Integration cards stack properly
- [ ] Performance: Large integration lists load quickly
- [ ] MCP fallback: Google/Meta Ads work via chi-gateway
- [ ] Multi-tenant: Agencies isolated from each other's integrations
- [ ] Rate limiting: Graceful handling of API rate limits
- [ ] Network resilience: Offline states and retry mechanisms

---

## OAuth Provider Configuration

### Slack OAuth Setup
```typescript
const slackOAuthConfig = {
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  authUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  scopes: [
    'channels:read',      // List channels
    'channels:history',   // Read messages
    'chat:write',         // Send replies
    'users:read',         // User information
    'team:read'           // Workspace info
  ]
};
```

### Gmail OAuth Setup
```typescript
const gmailOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
  ]
};
```

### Google Ads API Setup
```typescript
const googleAdsConfig = {
  clientId: process.env.GOOGLE_ADS_CLIENT_ID,
  clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: ['https://www.googleapis.com/auth/adwords'],
  additionalParams: {
    access_type: 'offline',
    include_granted_scopes: 'true'
  }
};
```

### Meta Marketing API Setup
```typescript
const metaAdsConfig = {
  clientId: process.env.META_APP_ID,
  clientSecret: process.env.META_APP_SECRET,
  authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
  scopes: [
    'ads_read',           // Campaign data
    'business_management', // Account access
    'ads_management'      // Campaign metrics
  ]
};
```

---

## Performance Considerations

### Token Storage Optimization
- Use Supabase Vault for encryption (not app-level encryption)
- Cache decrypted tokens in memory for 5 minutes max
- Implement token pool for high-frequency API calls
- Use connection pooling for database access

### API Rate Limiting
```typescript
class RateLimitedClient {
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();

  async makeRequest(provider: string, request: () => Promise<any>) {
    const limit = this.rateLimiter.get(provider);

    if (limit && limit.count >= RATE_LIMITS[provider] && Date.now() < limit.resetTime) {
      throw new Error(`Rate limit exceeded for ${provider}`);
    }

    try {
      const response = await request();
      this.updateRateLimit(provider, response.headers);
      return response;
    } catch (error) {
      if (error.status === 429) {
        this.handleRateLimit(provider, error);
      }
      throw error;
    }
  }
}
```

### Background Job Optimization
- Schedule token refresh during low-traffic hours
- Use queue system for sync jobs to prevent overload
- Implement exponential backoff for failed operations
- Batch similar operations to reduce API calls

---

## Security Considerations

### Token Encryption
- All OAuth tokens encrypted using Supabase Vault
- Separate encryption keys per agency for isolation
- Regular key rotation (quarterly)
- No tokens stored in application logs

### OAuth Security
```typescript
// State validation to prevent CSRF
function validateOAuthState(stateToken: string): OAuthState {
  try {
    const decoded = jwt.verify(stateToken, process.env.OAUTH_STATE_SECRET);

    if (decoded.expiresAt < Date.now()) {
      throw new Error('OAuth state expired');
    }

    return decoded as OAuthState;
  } catch (error) {
    throw new Error('Invalid OAuth state');
  }
}
```

### Multi-tenant Isolation
- RLS policies prevent cross-agency access
- Integration IDs include agency prefix for additional protection
- Audit logs track all cross-tenant access attempts
- Regular security audits of integration access patterns

---

## Dependencies

### Required for Implementation
- Supabase Vault (token encryption)
- OAuth provider SDKs (Slack, Google, Meta)
- Background job scheduler (cron or queue system)
- Chi-gateway MCP (ads fallback)

### Blocked By
- INTEGRATION table with proper RLS policies
- OAuth app registrations with all providers
- Supabase Vault configuration
- Background job infrastructure

### Enables
- Unified Communications Hub (Slack/Gmail sync)
- Dashboard metrics (ad performance data)
- Automations (integration status triggers)
- Intelligence Center (cross-platform insights)

---

## Success Metrics

- **Connection Success Rate:** >95% OAuth flows complete without errors
- **Token Reliability:** <1% token refresh failures over 30 days
- **Sync Performance:** 98% of syncs complete within SLA (5min for comms, 1h for ads)
- **User Adoption:** 85% of agencies connect at least 3 of 4 integrations
- **Error Resolution Time:** <4 hours average time to resolve connection issues
- **Security Compliance:** Zero unauthorized access to integration credentials

---

## Monitoring & Alerts

### Key Metrics Dashboard
- OAuth success/failure rates by provider
- Token refresh success rates and timing
- API call success rates and response times
- Integration health scores trending
- MCP vs OAuth usage patterns

### Critical Alerts
```yaml
token_refresh_failures:
  condition: failure_rate > 5%
  window: 1h
  alert: PagerDuty

oauth_flow_failures:
  condition: failure_rate > 10%
  window: 15m
  alert: Slack

sync_delays:
  condition: avg_sync_time > 10m
  window: 30m
  alert: Email

integration_disconnects:
  condition: disconnection_rate > 2%
  window: 1h
  alert: Slack
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-10 | **UI WIRED TO BACKEND** - Replaced mock data with useIntegrations hook, created IntegrationSettingsModal, added Connect buttons with OAuth flow, verified E2E on production |
| 2025-12-31 | Enhanced spec with complete implementation details, corrected user story numbers |
| 2025-12-31 | Created initial spec from PRD integrations section |

---

*Living Document - Located at features/integrations-management.md*
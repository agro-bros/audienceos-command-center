# Data Sync Infrastructure - Implementation Plan

**Feature:** Build real data sync from Google Ads and Slack to AudienceOS
**Demo Account:** "Speak English" (English teaching company with online courses)
**Google Ads Account ID:** 1209401747
**Slack Workspace:** Badaboost
**Estimated Effort:** 6-8 DU

---

## Current State Analysis

### What EXISTS (OAuth - Complete)
- `/app/api/v1/oauth/callback/route.ts` - Token exchange with HMAC-signed state
- `/lib/crypto.ts` - AES-256-GCM token encryption
- `/app/api/v1/oauth/[provider]/route.ts` - OAuth initiation endpoints
- `integration` table stores encrypted tokens

### What's PLACEHOLDER (Sync - Needs Building)
- `/app/api/v1/integrations/[id]/sync/route.ts` - Only updates timestamp, no real sync
- No background workers for automated sync
- No data transformation from provider → database format

### Database Tables Ready
- `ad_performance` - Google/Meta ads metrics
- `communication` - Synced messages from Slack/Gmail
- `integration` - OAuth tokens and connection status

---

## Implementation Plan

### Phase 1: Google Ads Sync Endpoint (2-3 DU)

**File:** `app/api/v1/integrations/[id]/sync/route.ts` (modify)

Steps:
1. Read encrypted tokens from `integration` table
2. Decrypt using `/lib/crypto.ts`
3. Call chi-gateway `google_ads_performance` with account ID
4. Transform response → `ad_performance` table format
5. Upsert to Supabase with proper `agency_id` isolation
6. Update `last_sync_at` timestamp

**Chi-Gateway Call:**
```typescript
mcp__chi-gateway__google_ads_performance({
  days: "30"  // Last 30 days of data
})
```

**Transform to ad_performance:**
```typescript
{
  agency_id: integration.agency_id,
  client_id: integration.client_id,
  platform: 'google_ads',
  campaign_id: campaign.id,
  campaign_name: campaign.name,
  impressions: metrics.impressions,
  clicks: metrics.clicks,
  spend: metrics.cost_micros / 1_000_000,
  conversions: metrics.conversions,
  date: metrics.date
}
```

### Phase 2: Slack Sync Endpoint (2-3 DU)

**File:** `app/api/v1/integrations/[id]/sync/route.ts` (extend)

For Slack, sync recent messages to `communication` table:
1. Decrypt Slack OAuth tokens
2. Call Slack API for conversations.history
3. Transform messages → `communication` format
4. Store with proper threading (parent_id for threads)

**Communication table mapping:**
```typescript
{
  agency_id: integration.agency_id,
  client_id: integration.client_id,
  channel: 'slack',
  thread_id: message.ts,
  sender_name: user.name,
  content: message.text,
  timestamp: new Date(message.ts * 1000),
  metadata: { channel_id, reactions, attachments }
}
```

### Phase 3: Manual Sync Button (1 DU)

**File:** `components/integrations/integration-card.tsx` (modify)

Add "Sync Now" button that:
1. Calls POST `/api/v1/integrations/[id]/sync`
2. Shows loading spinner
3. Toast success/error
4. Refreshes data display

### Phase 4: Demo Data Setup (1 DU)

Create "Speak English" client and wire up integrations:

1. Add client record for "Speak English":
```sql
INSERT INTO client (agency_id, name, industry, status, website)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Speak English',
  'Education',
  'active',
  'https://speakenglish.example.com'
);
```

2. Configure integration to link Google Ads account 1209401747

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/api/v1/integrations/[id]/sync/route.ts` | Add real sync logic for Google Ads + Slack |
| `lib/sync/google-ads-sync.ts` | NEW - Google Ads data transformation |
| `lib/sync/slack-sync.ts` | NEW - Slack message sync |
| `components/integrations/integration-card.tsx` | Add "Sync Now" button |
| `types/integrations.ts` | Add sync response types |

## Files to Create

| File | Purpose |
|------|---------|
| `lib/sync/google-ads-sync.ts` | Fetch + transform Google Ads data |
| `lib/sync/slack-sync.ts` | Fetch + transform Slack messages |
| `lib/sync/types.ts` | Sync job types and result interfaces |

---

## Data Flow

```
User clicks "Sync Now"
    ↓
POST /api/v1/integrations/[id]/sync
    ↓
Read integration record (get provider, tokens)
    ↓
Decrypt OAuth tokens (AES-256-GCM)
    ↓
Call provider API:
  - Google Ads → chi-gateway/google_ads_performance
  - Slack → Slack Web API conversations.history
    ↓
Transform response → database format
    ↓
Upsert to ad_performance / communication tables
    ↓
Update integration.last_sync_at
    ↓
Return sync summary
```

---

## Testing Plan

1. **Manual Test - Google Ads:**
   - Connect integration via OAuth flow
   - Click "Sync Now"
   - Verify ad_performance records created
   - Check data matches chi-gateway output

2. **Manual Test - Slack:**
   - Connect Badaboost workspace
   - Sync messages
   - Verify communication records

3. **Browser Verification:**
   - Navigate to Integrations page
   - Click sync on connected integration
   - Verify toast shows success
   - Check data appears in relevant views

---

## Key Technical Decisions

1. **Sync Approach:** On-demand (button click) first, automated later
2. **Data Storage:** Direct to Supabase tables (no intermediate queue)
3. **Token Handling:** Decrypt → use → discard (never log)
4. **Error Handling:** Graceful degradation with detailed error messages
5. **Rate Limiting:** Respect provider limits (defer to chi-gateway)

---

## Success Criteria

- [ ] Google Ads sync pulls real data from account 1209401747
- [ ] Data appears in ad_performance table correctly
- [ ] Slack messages sync to communication table
- [ ] "Speak English" client shows ad metrics in dashboard
- [ ] Manual sync button works without errors

---

## Out of Scope (Future)

- Automated scheduled sync (cron/workers)
- Gmail integration sync
- Meta Ads sync
- Real-time webhooks from providers
- Historical backfill beyond 30 days

---

✅ Plan ready for implementation

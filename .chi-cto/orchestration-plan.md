# Chi-CTO Production Sprint Orchestration
**Session:** 2026-01-15 | Mode B (Autonomous)
**Goal:** AudienceOS → Production Ready (All Features Working)

---

## Task Priority Matrix

| Task | Score | U/I/C/M | Tier | Worker | Est. Time |
|------|-------|---------|------|--------|-----------|
| Port Cartridge Backend | 38/40 | 10/10/8/10 | IMMEDIATE | W1 | 3 days |
| E2E Test Multi-Org Roles | 35/40 | 8/10/9/8 | IMMEDIATE | W2 | 1 day |
| Real Gmail Sync | 36/40 | 9/9/9/9 | IMMEDIATE | W3 | 2 days |
| Real Slack Sync | 36/40 | 9/9/9/9 | IMMEDIATE | W4 | 2 days |
| Real Google Ads | 28/40 | 7/9/6/6 | SOON | W5 | 1 day |
| Real Meta Ads | 28/40 | 7/9/6/6 | SOON | W5 | 1 day |
| Final Verification | 25/40 | 10/10/5/0 | SOON | Manual | 0.5 day |

---

## Worker Assignments

### Worker 1: Cartridge Backend Port (3 days) - CRITICAL PATH
**Task:** Port all 12 cartridge API endpoints + 5 DB migrations from RevOS
**Blocking:** Everything else (RBAC depends on, integrations depend on)
**Files to Port:**
- RevOS: `supabase/migrations/003_cartridge_system.sql` → AudienceOS: `supabase/migrations/008_cartridge_system.sql`
- RevOS: `supabase/migrations/037_client_cartridges.sql` → AudienceOS: `supabase/migrations/009_client_cartridges.sql`
- RevOS: `app/api/cartridges/brand/route.ts` → AudienceOS: `app/api/v1/cartridges/brand/route.ts` (+ 11 more endpoints)
- RevOS: `lib/cartridges/*.ts` → AudienceOS: `lib/cartridges/*.ts`
**Handoff:** Schema migrations + API endpoints ready for W3/W4

### Worker 2: Multi-Org Roles E2E Test (1 day) - BLOCKING RBAC CLAIM
**Task:** Use Claude in Chrome to verify role system works end-to-end
**Depends On:** W1 (DB migrations must exist)
**Acceptance Criteria:**
- [ ] Owner can edit all clients
- [ ] Admin can edit all clients
- [ ] Manager can edit assigned clients only
- [ ] Member is read-only
- [ ] Screenshots prove it works
**Handoff:** RBAC feature marked "verified"

### Worker 3: Real Gmail Sync (2 days) - REPLACES MOCK EMAIL
**Task:** Implement OAuth callback + token storage + scheduled sync
**Depends On:** W1 (DB schema ready)
**Starts After:** W1 migrations applied
**Files to Create:**
- `supabase/migrations/010_integration_credentials.sql`
- `app/api/oauth/gmail/callback/route.ts`
- `lib/integrations/gmail-sync.ts`
- `app/api/v1/integrations/sync/gmail/route.ts`
**Handoff:** Real Gmail emails visible in Communications Hub

### Worker 4: Real Slack Sync (2 days) - REPLACES MOCK SLACK
**Task:** Add Slack to diiiploy-gateway + implement AudienceOS sync
**Depends On:** W1 (DB schema ready) + diiiploy-gateway deployment
**Starts After:** W1 migrations applied
**Files to Create:**
- diiiploy-gateway: `src/routes/slack.ts` (NEW)
- AudienceOS: `lib/integrations/slack-sync.ts`
- AudienceOS: `app/api/v1/integrations/sync/slack/route.ts`
**Handoff:** Real Slack messages visible in Communications Hub

### Worker 5: Polish & Real Ads (3 days) - NICE TO HAVE
**Task:** Real Google Ads + Meta Ads data (replaces mock metrics)
**Depends On:** W1 (DB schema ready)
**Files to Create:**
- `lib/integrations/google-ads-sync.ts`
- `lib/integrations/meta-ads-sync.ts`
- `app/api/v1/integrations/sync/google-ads/route.ts`
- `app/api/v1/integrations/sync/meta/route.ts`
**Handoff:** Dashboard shows real campaign metrics

---

## Execution Sequence

```
Day 1-3:  W1 Port Cartridge Backend
Day 4:    W2 E2E Test RBAC + W3/W4 Start (parallel)
Day 4-5:  W3 Real Gmail Sync
Day 4-5:  W4 Real Slack Sync
Day 6:    W5 Polish (Google Ads + Meta Ads)
Day 7:    Final verification + deploy
```

---

## RevOS → AudienceOS Adaptation Guide

### Database Schema Changes
- RevOS uses `user_id` for all queries
- AudienceOS uses `agency_id` + optional `user_id` for multi-tenant
- **Change:** Add `agency_id` to all cartridge tables, filter by agency not just user

### API Route Changes
- RevOS: `/api/cartridges/[resource]`
- AudienceOS: `/api/v1/cartridges/[resource]` (consistent with other endpoints)
- **Change:** Update all route paths to use `/v1/` prefix

### Authentication Changes
- RevOS: `supabase.auth.getUser()` works
- AudienceOS: Same auth, but must also get `agency_id` from user context
- **Change:** All endpoints must verify user is member of agency

### Import Paths
- Both projects use same structure: `@/lib/`, `@/components/`, etc.
- **No change needed:** Copy-paste should work with minor path tweaks

---

## Success Criteria (Must All Pass)

### Tier 1 (Non-negotiable)
- [ ] All 12 cartridge endpoints respond (not 404)
- [ ] 53-test suite passes: `npm test -- cartridges`
- [ ] RBAC tested via Chrome (screenshots in PR)
- [ ] Build succeeds: `npm run build`
- [ ] Zero TypeScript errors

### Tier 2 (Real Data)
- [ ] Real Gmail emails visible in Communications Hub
- [ ] Real Slack messages visible in Communications Hub
- [ ] Mock email data removed
- [ ] Mock Slack data removed

### Tier 3 (Polish)
- [ ] Real Google Ads metrics in dashboard
- [ ] Real Meta Ads metrics in dashboard
- [ ] No console errors on production

---

## Parallel Worker Kickoff

Each worker will receive:
1. Task specification (from sections above)
2. RevOS source file paths to copy from
3. AudienceOS target paths to create
4. Adaptation notes (auth, routes, schema)
5. Success criteria + verification steps
6. Status file template for reporting

---

**Ready to spawn workers:**

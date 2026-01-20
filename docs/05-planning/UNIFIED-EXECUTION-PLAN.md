# Unified Execution Plan: RevOS + AudienceOS Platform

**Date:** 2026-01-20
**Status:** CTO APPROVED
**Timeline:** 3 weeks (15 working days)
**Total Effort:** ~120 hours

---

## Executive Summary

This plan merges:
1. **CC2's Integration Plan v2** - RevOS → AudienceOS feature porting
2. **AudienceOS CTO Audit** - Security hardening requirements
3. **CTO Decision** - Security-first sequencing

**Key Insight:** We can run SOME work in parallel (security on AudienceOS while CC2 preps schemas), but security blockers must complete before integration code ships.

---

## Week 1: Foundation (Parallel Tracks)

### Track A: AudienceOS Security (AudienceOS CTO)

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| 1 | Fix env fallbacks | 2h | `lib/env.ts` with Zod validation |
| 1 | Remove `|| ''` from crypto.ts | 1h | Secrets validated at startup |
| 2 | Create structured logger | 4h | `lib/logger.ts` with Pino |
| 2 | Add `no-console` ESLint rule | 1h | `.eslintrc.js` updated |
| 3 | Replace console statements (critical) | 4h | Zero `console.*` in `/app/api/`, `/lib/crypto.ts` |
| 4 | Add rate limiting | 4h | Chat, sync, OAuth endpoints protected |
| 5 | Token refresh mechanism | 8h | `lib/integrations/oauth-utils.ts` |

**Week 1 Exit Criteria (Track A):**
- [ ] Build fails if required env vars missing
- [ ] `grep -r "console\." app/api lib/crypto.ts | wc -l` = 0
- [ ] Rate limits on: `/v1/chat`, `/v1/integrations/*/sync`, `/v1/oauth/*`
- [ ] Token refresh tested with Gmail OAuth

### Track B: Schema Preparation (Chi CTO)

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| 1-2 | Create RevOS tables SQL | 8h | `supabase/migrations/025_add_revos_tables.sql` |
| 3 | Add RLS policies | 4h | All new tables have `agency_id` RLS |
| 4 | Unify cartridge schema | 4h | `supabase/migrations/026_unify_cartridges.sql` |
| 5 | Test migration locally | 4h | Migration runs without errors |

**Week 1 Exit Criteria (Track B):**
- [ ] Migration SQL files ready (not applied to prod yet)
- [ ] RLS policies defined for all new tables
- [ ] Cartridge table supports `app_context` column
- [ ] Local testing passed

**Week 1 Gate:** Track A must complete before Track B migrations are applied to production.

---

## Week 2: Integration (Sequential)

### Day 1: Apply Migrations + Verify Security

| Task | Owner | Hours |
|------|-------|-------|
| Apply migrations to AudienceOS Supabase | Chi CTO | 2h |
| Verify RLS working | Chi CTO | 2h |
| Final security verification | AudienceOS CTO | 2h |
| Create `/api/health` endpoint | AudienceOS CTO | 2h |

**Day 1 Gate:** Production passes health check with all validations.

### Days 2-4: Feature Port

| Day | Task | Owner | Hours |
|-----|------|-------|-------|
| 2 | Port 11 chips to AudienceOS | Chi CTO | 8h |
| 3 | Port MarketingConsole + WorkflowExecutor | Chi CTO | 8h |
| 4 | Port LinkedIn cartridge + update Mem0 | Chi CTO | 8h |

**File Structure After Port:**
```
lib/
├── chips/                    # FROM RevOS
│   ├── base-chip.ts
│   ├── write-chip.ts
│   ├── dm-chip.ts
│   └── ... (11 total)
├── console/                  # FROM RevOS
│   ├── marketing-console.ts
│   └── workflow-executor.ts
├── cartridges/               # MERGED
│   └── unified-cartridge.ts
├── memory/                   # UPDATED
│   └── mem0-service.ts       # 3-part format
├── integrations/             # EXISTING + oauth-utils.ts
├── logger.ts                 # NEW (Week 1)
└── env.ts                    # NEW (Week 1)
```

### Day 5: Integration Testing

| Task | Owner | Hours |
|------|-------|-------|
| Unit tests for ported features | Chi CTO | 4h |
| Integration tests with DB | Chi CTO | 4h |

**Week 2 Exit Criteria:**
- [ ] All 11 chips callable and tested
- [ ] WorkflowExecutor loads from `console_workflow` table
- [ ] MarketingConsole generates content
- [ ] Mem0 uses 3-part format
- [ ] Build passes, lint clean

---

## Week 3: HGC + App Switcher

### Days 1-2: HGC AgentKit Adapter

| Task | Owner | Hours |
|------|-------|-------|
| Create `agentkit-adapter.ts` | Chi CTO | 8h |
| Add AI provider routing to HGC | Chi CTO | 4h |
| Test both backends | Chi CTO | 4h |

**New File:** `hgc-monorepo/shared/adapters/agentkit-adapter.ts`

```typescript
export class AgentKitAdapter implements IAIProvider {
  async sendMessage(messages: HGCMessage[]): Promise<HGCResponse> {
    const agentKitMessages = messages.map(normalizeForAgentKit);
    const result = await this.agent.run(agentKitMessages);
    return normalizeForHGC(result);
  }
}
```

### Day 3: App Switcher Component

| Task | Owner | Hours |
|------|-------|-------|
| Create `app-switcher.tsx` | AudienceOS CTO | 4h |
| Integrate into TopBar | AudienceOS CTO | 2h |
| Add app context state (Zustand) | AudienceOS CTO | 2h |

### Day 4: Route Structure + Sidebar

| Task | Owner | Hours |
|------|-------|-------|
| Add `?app=` query param support | Both | 4h |
| Conditional sidebar rendering | AudienceOS CTO | 4h |

### Day 5: E2E Testing + Polish

| Task | Owner | Hours |
|------|-------|-------|
| E2E: App switching flow | Both | 4h |
| E2E: Chat with both backends | Both | 2h |
| Bug fixes | Both | 2h |

**Week 3 Exit Criteria:**
- [ ] App switcher visible in header
- [ ] RevOS routes show RevOS sidebar items
- [ ] AudienceOS routes show AudienceOS sidebar items
- [ ] Chat works with Gemini (AudienceOS) and AgentKit (RevOS)
- [ ] All E2E tests pass

---

## Definition of Done

### Security (BLOCKING)
- [ ] Zero `|| ''` fallbacks for secrets in `lib/`
- [ ] Rate limiting on all mutation endpoints
- [ ] Console statements < 10 in API/lib paths
- [ ] Token refresh working for Gmail

### Integration
- [ ] All 11 chips ported and tested
- [ ] RevOS tables exist in AudienceOS Supabase with RLS
- [ ] Cartridge table unified with `app_context`
- [ ] Mem0 using 3-part format

### UI
- [ ] App switcher in header
- [ ] Sidebar changes based on app context
- [ ] Both AI backends working via HGC

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Security fixes take longer | Medium | High | Fixed scope, no feature creep |
| AgentKit adapter complexity | Medium | Medium | Spike test Day 1 of Week 3 |
| Route collisions | Low | Medium | Namespace planning in Week 2 |
| Token refresh breaks OAuth | Low | High | Test in dev first |

---

## Communication Plan

| When | What | Who |
|------|------|-----|
| Daily | Async standup in Slack | Both CTOs |
| End of Week 1 | Security gate review | AudienceOS CTO |
| End of Week 2 | Integration gate review | Chi CTO |
| End of Week 3 | Final demo | Both + Stakeholders |

---

## Files Changed Summary

### New Files (AudienceOS)
```
lib/env.ts                              # Zod env validation
lib/logger.ts                           # Pino structured logging
lib/integrations/oauth-utils.ts         # Token refresh
lib/chips/*.ts                          # 11 chips from RevOS
lib/console/marketing-console.ts        # From RevOS
lib/console/workflow-executor.ts        # From RevOS
lib/cartridges/unified-cartridge.ts     # Merged
components/app-switcher.tsx             # Header dropdown
supabase/migrations/025_*.sql           # RevOS tables
supabase/migrations/026_*.sql           # Unified cartridge
```

### Modified Files (AudienceOS)
```
lib/crypto.ts                           # Remove fallbacks
lib/memory/mem0-service.ts              # 3-part format
components/TopBar.tsx                   # Add app switcher
components/dashboard-sidebar.tsx        # Conditional rendering
.eslintrc.js                            # no-console rule
```

### New Files (HGC Monorepo)
```
shared/adapters/agentkit-adapter.ts     # AgentKit wrapper
```

### Modified Files (HGC Monorepo)
```
packages/hgc/src/lib/core/hgc-instance.ts  # AI provider routing
```

---

## Approval

**Reviewed By:** CTO (Claude Cowork Session)
**Approved:** ✅ 2026-01-20
**Condition:** Week 1 security gate must pass before Week 2 migrations

---

*Unified Execution Plan v1.0 | 2026-01-20 | Merges CC2 Integration Plan + AudienceOS Security Audit*

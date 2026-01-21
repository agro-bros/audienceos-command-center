# AudienceOS Integration - Chi CTO Execution Plan

**Created:** 2026-01-04
**Status:** 🔵 PLANNING
**Project:** AudienceOS Command Center
**Estimated Duration:** 5 days (can run across sessions)

---

## Executive Summary

AudienceOS has ~90% backend complete (35 APIs) but only ~40% connected to frontend. This plan uses Chi CTO to orchestrate InfraBuilder and FeatureBuilder agents to close the gap.

---

## Current State (CTO Audit Findings)

| Layer | Completion | Gap |
|-------|------------|-----|
| API Routes | 90% (35 endpoints) | Dashboard API missing |
| Database | 100% (19 tables) | Migrations not applied |
| Frontend | 85% (137 components) | Using mock data |
| **Integration** | **40%** | **THE PROBLEM** |

### Store Connection Status

| Store | Connection | Issue |
|-------|------------|-------|
| pipeline-store | `/api/v1/clients` | ✅ Connected |
| automations-store | `/api/v1/workflows` | ✅ Connected |
| ticket-store | Direct Supabase | ⚠️ Bypasses API |
| knowledge-base-store | Mock data | ❌ Not connected |
| communications-store | None | ❌ No fetch method |
| dashboard-store | None | ❌ No API exists |
| settings-store | Unknown | ⚠️ APIs exist |

---

## Execution Strategy: Chi CTO Mode B

Use ChiCTO to orchestrate parallel agents:

```
Chi CTO (Orchestrator)
    │
    ├── Phase 1: INFRA ────────────────────────────────────────┐
    │   └── InfraBuilder: Database + Auth Foundation            │
    │                                                           │
    ├── Phase 2: CONNECT (Parallel) ──────────────────────────┤
    │   ├── FeatureBuilder CC1: Ticket store → API             │
    │   ├── FeatureBuilder CC2: KB store → API                 │
    │   └── FeatureBuilder CC3: Settings store → API           │
    │                                                           │
    ├── Phase 3: BUILD (Parallel) ────────────────────────────┤
    │   ├── InfraBuilder CC4: Dashboard API                    │
    │   └── InfraBuilder CC5: Communications API               │
    │                                                           │
    └── Phase 4: INTEGRATE ───────────────────────────────────┘
        └── FeatureBuilder: Connect new APIs to stores
```

---

## Phase 1: Database Foundation (InfraBuilder)

**Skill:** InfraBuilder
**Duration:** 1 session (~2 hours)
**Blockers:** None

### Tasks

1. **Apply migrations to Supabase**
   - Run 6 SQL migration files
   - Verify 21 tables created

2. **Seed test agency + users**
   - Insert Chase Digital Agency
   - Create 4 auth users (Luke, Garrett, Josh, Jeff)

3. **Seed sample clients**
   - 8 clients across pipeline stages
   - Client assignments to users

4. **Create auth context**
   - `contexts/auth-context.tsx`
   - Wrap app in AuthProvider

5. **Remove hardcoded "Luke"**
   - 14+ files with hardcoded user
   - Replace with auth context

### Critical Files
- `supabase/migrations/*.sql`
- `lib/supabase.ts`
- `hooks/use-auth.ts`
- `components/sidebar.tsx`
- `components/linear/sidebar.tsx`

---

## Phase 2: Connect Stores (Parallel FeatureBuilders)

**Skill:** FeatureBuilder x3 (parallel)
**Duration:** 1 session (~2 hours)
**Dependencies:** Phase 1 complete

### CC1: Ticket Store Refactor

Refactor `stores/ticket-store.ts`:
- Replace 11 direct Supabase calls with API calls
- Use `/api/v1/tickets` endpoints
- Preserve optimistic updates

### CC2: Knowledge Base Store

Refactor `stores/knowledge-base-store.ts`:
- Remove mock data imports
- Add `fetchDocuments()` method
- Connect to `/api/v1/documents`

### CC3: Settings Store

Connect `stores/settings-store.ts`:
- Add `fetchAgencySettings()`
- Add `fetchTeamMembers()`
- Connect to `/api/v1/settings/*`

---

## Phase 3: Build Missing APIs (Parallel InfraBuilders)

**Skill:** InfraBuilder x2 (parallel)
**Duration:** 1-2 sessions (~4 hours)
**Dependencies:** Phase 1 complete

### CC4: Dashboard API

Create `app/api/v1/dashboard/kpis/route.ts`:
- Aggregation queries for 5 KPIs
- Previous period comparison
- Change calculation

Create `app/api/v1/dashboard/trends/route.ts`:
- Time-series data for charts
- Period parameter (7/30/90 days)

### CC5: Communications API

Create `app/api/v1/communications/route.ts`:
- Global communications list (not just per-client)
- Cursor pagination
- Source/needs_reply filters

---

## Phase 4: Final Integration (FeatureBuilder)

**Skill:** FeatureBuilder
**Duration:** 1 session (~2 hours)
**Dependencies:** Phases 2 + 3 complete

### Tasks

1. Connect dashboard-store to new API
   - Add `fetchKPIs()` method
   - Add `fetchTrends()` method

2. Connect communications-store
   - Add `fetchCommunications()` method
   - Wire to components

3. Full integration test
   - All stores fetch from APIs
   - Build passes
   - Browser validation

---

## Execution Manifest Structure

```
docs/05-planning/audienceos-integration/
├── 00-MANIFEST.md
├── 01-CC1-database-foundation.md
├── 02-CC2-ticket-store-refactor.md
├── 03-CC3-kb-store-refactor.md
├── 04-CC4-settings-store-connect.md
├── 05-CC5-dashboard-api.md
├── 06-CC6-communications-api.md
└── 07-CC7-final-integration.md
```

---

## How to Execute

### Option A: Chi CTO Mode B (Autonomous)

```bash
/chi-cto mode-b run
```

Chi CTO will:
1. Read this plan + project docs
2. Create execution manifest
3. Spawn InfraBuilder for Phase 1
4. Spawn parallel FeatureBuilders for Phase 2
5. Push PRs (not merge)
6. Generate morning report

### Option B: Manual Parallel Build

Follow Orchestration cookbook:

1. Open 3-4 terminal tabs
2. Each tab: `cd project && claude`
3. Tab 1: `/build-infra` for Phase 1
4. Tabs 2-4: `/build-feature` for Phase 2 (parallel)
5. Wait for completion
6. Merge and continue Phase 3

---

## Success Criteria

- [ ] All 6 migrations applied
- [ ] Auth context working (no hardcoded Luke)
- [ ] All 7 stores fetch from APIs (not mock/direct Supabase)
- [ ] Dashboard API returns real KPIs
- [ ] Build passes with zero errors
- [ ] Browser shows real data

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Session timeout | Execution Manifest enables resume |
| Merge conflicts | Git worktrees for isolation |
| API breaks | Each phase creates PR for review |
| Data issues | Seed script creates known-good data |

---

## Estimated Cost

- **5 sessions x 2 hours = 10 hours**
- **At ~$3/hour = ~$30 total**
- **Human equivalent: 40-50 hours of work**
- **ROI: 4-5x**

---

*Ready for approval. Will create Execution Manifest upon exit.*

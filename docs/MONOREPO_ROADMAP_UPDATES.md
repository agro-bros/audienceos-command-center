# Monorepo Implementation - Roadmap Updates Based on Final Decisions

**Date:** 2026-01-17
**Status:** Final decisions locked in, ready for Phase 0
**Timeline:** 15 days (unchanged)
**Confidence:** 9/10 ✅

---

## YOUR 4 DECISIONS (LOCKED IN)

### 1. ✅ Adapter Pattern Scope: PUBLISHED NPM PACKAGE
**Decision:** Create `@pai-architectures/hgc-adapters` (publishable)
**Impact on Roadmap:** Phase 1.4 adds npm publishing setup
**What Changes:** shared/adapters/ will have package.json for npm publishing

### 2. ✅ Test Frameworks: KEEP BOTH FOREVER
**Decision:** Jest (HGC) + Vitest (AudienceOS) coexist permanently
**Impact on Roadmap:** NO CHANGE - original plan already preserved both
**What Changes:** Updated documentation confirms this is intentional

### 3. ✅ Supabase Client: SEPARATE PER DEPLOYMENT
**Decision:** Don't consolidate - env vars handle routing
**Impact on Roadmap:** Phase 1.2 keeps supabase clients separate
**What Changes:** Each package has own supabase.ts, never consolidated

### 4. ✅ E2E Test Scope: BOTH PROJECTS
**Decision:** Claude in Chrome tests cover both HGC + AudienceOS
**Impact on Roadmap:** Phase 4 creates comprehensive E2E suite
**What Changes:** More test scenarios (covers both projects)

---

## 15-DAY TIMELINE (WITH DECISIONS APPLIED)

### Phase 0: Preparation (1 Day) - 2026-01-17
```
✅ Backup repos
✅ Create feature branches
✅ Read documentation
```

### Phase 1: Monorepo Setup (2 Days) - 2026-01-18 to 2026-01-19
```
✅ Create /packages/hgc/ structure
✅ Create /packages/audiences-os/ structure
✅ Create /packages/shared/ with adapters
✅ Create root package.json with workspaces
✅ Setup @pai-architectures/hgc-adapters npm publishing (NEW)
✅ Verify: npm install succeeds
✅ Verify: both packages boot independently
```

### Phase 2: HGC Core Extraction (3 Days) - 2026-01-20 to 2026-01-22
```
✅ Move HGC to packages/hgc/ (all 396 tests pass)
✅ Define IContextProvider interface (shared/)
✅ Define IFunctionRegistry interface (shared/)
✅ Extract HGC chat service to reusable core
✅ Verify: Jest tests still pass (396/396)
✅ Verify: HGC package boots standalone
```

### Phase 3: AudienceOS Replacement (3 Days) - 2026-01-23 to 2026-01-25
```
✅ Replace /app/api/v1/chat/route.ts with HGC + adapters
✅ Create AudienceOS context provider (implements IContextProvider)
✅ Create AudienceOS function registry (implements IFunctionRegistry)
✅ Wrap with RBAC withPermission() decorator (kept from original)
✅ Write 50+ new Vitest tests for replaced code
✅ Verify: agencyId context flows correctly
✅ Verify: Supabase client still initializes
✅ Verify: Gemini model executes correctly
```

### Phase 4: Integration Testing (2 Days) - 2026-01-26 to 2026-01-27
```
✅ Both packages run in monorepo
✅ Streaming works in both
✅ Memory persistence works in both
✅ RAG search works in both
✅ Function execution works with Supabase
✅ Test Coverage: 396 (Jest/HGC) + 50+ (Vitest/AudienceOS)
```

### Phase 5: E2E Testing - Claude in Chrome (2 Days) - 2026-01-28 to 2026-01-29
```
✅ Test HGC chat scenarios (5 scenarios)
✅ Test AudienceOS chat scenarios (10 scenarios)
✅ Test adapter pattern (5 scenarios)
✅ Test streaming works end-to-end
✅ Test memory persistence works
✅ Total: 20+ E2E scenarios passing
```

### Phase 6: Documentation (1 Day) - 2026-01-30
```
✅ Update CLAUDE.md with new architecture
✅ Document how to use @pai-architectures/hgc-adapters
✅ Document adapter pattern examples
✅ Write RevOS onboarding guide
✅ Document test framework approach (Jest + Vitest)
```

### Phase 7: Deployment (1 Day) - 2026-01-31
```
✅ Merge feature/monorepo-merge to main
✅ Verify CI/CD works with new structure
✅ Publish @pai-architectures/hgc-adapters to npm
✅ Deploy AudienceOS with new chat code
✅ Monitor production for 24 hours
```

**Total: 15 days (2026-01-17 to 2026-01-31)**

---

## WHAT ACTUALLY CHANGES (PER YOUR DECISIONS)

### Phase 1 Change (New: npm publishing setup)
**Added Task:** Configure shared/adapters/ for npm publishing
```json
// packages/shared/package.json
{
  "name": "@pai-architectures/hgc-adapters",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "prepublish": "npm run build"
  }
}
```

**Time Impact:** +2 hours (phase 1.4)

### Phase 3 Change (Supabase: Stay Separate)
**What We Were Thinking:** Consolidate both supabase clients to shared/
**What Actually Happens:** Keep them separate
```
✅ packages/hgc/src/lib/supabase/client.ts (original)
✅ packages/audiences-os/lib/supabase.ts (original)
❌ shared/lib/supabase.ts (NOT created)
```

**Why:** Each deployment needs different env vars
**Time Impact:** -1 hour (we do less consolidation)

### Phase 4 Change (More E2E Scenarios)
**What We Were Thinking:** E2E tests for AudienceOS only
**What Actually Happens:** Test both HGC + AudienceOS
```
Original Plan:
- 10 E2E scenarios for AudienceOS

New Plan:
- 5 E2E scenarios for HGC library
- 10 E2E scenarios for AudienceOS
- 5 adapter pattern scenarios
= 20+ total scenarios
```

**Time Impact:** +1 day (but already budgeted in Phase 5)

### Phase 6 Change (RevOS Documentation)
**What We Were Thinking:** General documentation
**What Actually Happens:** Include RevOS onboarding guide
```
New sections:
- How to create an adapter for RevOS
- Example: RevOS context provider
- Example: RevOS function registry
- Quick start: integrate HGC into RevOS
```

**Time Impact:** +1 hour (included in phase 6.5)

---

## RISK MITIGATION (YOUR DECISIONS HELP WITH THIS)

### Risk: Supabase credentials get mixed up
**Mitigation (Your Decision):** Keep separate - env vars per deployment prevents this
**Confidence:** 10/10 ✅

### Risk: npm publishing breaks something
**Mitigation (Your Decision):** @pai-architectures/hgc-adapters starts as opt-in
**Confidence:** 9/10 ✅

### Risk: E2E tests take too long
**Mitigation (Your Decision):** 20 scenarios fits in 2-day phase
**Confidence:** 9/10 ✅

---

## FINAL VERIFICATION CHECKLIST

Before Phase 0 starts, verify:

- [ ] Both repos backed up to ~/.backups/
- [ ] Both repos on feature/monorepo-merge branch
- [ ] All documents read and understood
- [ ] CTO sanity check confirms 9/10 confidence
- [ ] 4 decisions locked in:
  - [ ] Adapters: Published npm package ✅
  - [ ] Test frameworks: Keep both ✅
  - [ ] Supabase: Separate per deployment ✅
  - [ ] E2E scope: Both projects ✅

---

## NEXT STEP: REQUEST FINAL APPROVAL

**Ready to proceed to Phase 0 when you confirm:**

```
I approve the monorepo migration with the 4 decisions locked in.
Begin Phase 0 (Preparation) now.
```

---

**Timeline:** 2026-01-17 to 2026-01-31 (15 days)
**Confidence:** 9/10
**Risk:** LOW
**Status:** ✅ READY FOR PHASE 0

This is your next opus. All the homework is done. Ready to build.

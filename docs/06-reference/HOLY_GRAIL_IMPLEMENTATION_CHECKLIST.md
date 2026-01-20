# Holy Grail Chat - Implementation Checklist

**Purpose:** Step-by-step guide for implementing Phase 1 & 2
**Status:** Ready for execution
**Estimated Effort:** Phase 1 (8 days) + Phase 2 (8 days)

---

## PRE-IMPLEMENTATION (Day 0)

- [ ] Read and understand `/docs/HOLY_GRAIL_CHAT_AUDIT.md` (complete findings)
- [ ] Review `/docs/HOLY_GRAIL_CHAT_ARCHITECTURE.md` (technical design)
- [ ] Answer 5 product questions in EXEC_SUMMARY.md
- [ ] Create feature branch: `git checkout -b feature/holy-grail-chat-phase1`
- [ ] Create Sentry project for monitoring (optional but recommended)

---

## PHASE 1: CONTEXT & MEMORY (8 Days)

### Day 1-2: Context Injection Infrastructure

**Goal:** SessionContext flows from UI through API to Gemini

**Task 1.1: Update Type Definitions**
- [ ] Open `lib/chat/types.ts`
- [ ] Verify `SessionContext` interface has all fields:
  - [ ] `clientId?: string`
  - [ ] `clientName?: string`
  - [ ] `currentPage?: string`
  - [ ] `activeFilters?: Record<string, string | string[]>`
  - [ ] `recentAlerts?: string[]`
  - [ ] `userRole?: string`
  - [ ] `timestamp?: number`
- [ ] Add JSDoc comments to each field

**Task 1.2: Update API Route**
- [ ] Open `app/api/v1/chat/route.ts`
- [ ] Add SessionContext parameter to POST handler
- [ ] Type-safe context extraction
- [ ] Pass context to `handleChatMessage()` function

**Task 1.3: Create Context Assembly Function**
- [ ] Create `lib/chat/utils/assemble-context-block.ts`
- [ ] Implement `assembleContextBlock(context: SessionContext): string`
- [ ] Format context as readable text block
- [ ] Write unit tests for all edge cases

**Task 1.4: Inject Context into Gemini Prompt**
- [ ] Modify Gemini API call in `route.ts`
- [ ] Prepend context block to user message
- [ ] Verify in logs that context is sent to Gemini

**Task 1.5: Update Components to Pass Context**
- [ ] `app/dashboard/page.tsx` - Pass `{ currentPage: '/dashboard' }`
- [ ] `app/clients/[id]/page.tsx` - Pass `{ clientId, clientName }`
- [ ] `app/support/page.tsx` - Pass `{ currentPage: '/support' }`
- [ ] `app/automations/page.tsx` - Pass `{ currentPage: '/automations' }`
- [ ] `app/knowledge-base/page.tsx` - Pass `{ currentPage: '/knowledge-base' }`
- [ ] `app/settings/page.tsx` - Pass `{ currentPage: '/settings' }`
- [ ] Chat component updated to accept and use context
- [ ] Test that context appears in Gemini logs

**Task 1.6: Test Context Flow (Day 2)**
- [ ] Manual test: Navigate to `/clients/acme` and ask "show alerts"
  - [ ] Expected: "I see you're looking at Acme Corp..."
  - [ ] Verify: Only Acme's alerts returned
- [ ] Manual test: Navigate to `/dashboard` and ask "what are our KPIs"
  - [ ] Expected: "I see you're on the dashboard..."
- [ ] Verify context appears in browser console logs
- [ ] Verify context sent to Gemini API
- [ ] Test with multiple agencies (verify isolation)

---

### Day 3: Memory Persistence

**Goal:** User preferences and learnings actually persist across sessions

**Task 3.1: Create Memory Extraction Function**
- [ ] Create `lib/memory/extract-memories.ts`
- [ ] Implement `extractMemoriesFromInteraction(userMsg, assistantMsg): Memory[]`
- [ ] Pattern matching for:
  - [ ] Preferences ("I prefer X", "I like to Y")
  - [ ] Decisions ("I decide to", "We will")
  - [ ] Learning (long exchanges > 100 chars)
  - [ ] Tasks ("remind me", "remember to")
- [ ] Write unit tests

**Task 3.2: Update Memory Injector**
- [ ] Open `lib/memory/memory-injector.ts`
- [ ] Find `processWithMemory()` function
- [ ] Add memory storage after response generation
- [ ] Make storage async (non-blocking)
- [ ] Handle storage errors gracefully
- [ ] Add logging for memory operations

**Task 3.3: Update Chat Route**
- [ ] Open `app/api/v1/chat/route.ts`
- [ ] After generating response, extract memories
- [ ] Call `mem0.storeMemory()` for each memory
- [ ] Wrap in try-catch to prevent response blocking
- [ ] Log all memory operations
- [ ] Verify memories appear in Mem0 dashboard

**Task 3.4: Test Memory Persistence (Day 3)**
- [ ] Manual test: Tell chat "Remember I prefer phone calls"
  - [ ] Expected: Chat says it will remember
- [ ] Refresh browser / start new session
- [ ] Ask "What's my preference?"
  - [ ] Expected: Chat recalls the preference
- [ ] Verify in Mem0 dashboard that memory exists
- [ ] Test with multiple users (verify isolation)
- [ ] Test memory deduplication (same fact twice → no duplicates)

---

### Day 4-5: Add 2 Critical Functions

**Goal:** Chat can access support tickets and automation status

**Task 5.1: Support Tickets Function**
- [ ] Create `lib/chat/functions/search-support-tickets.ts`
- [ ] Implement executor function
- [ ] Add to function registry in `lib/chat/functions/index.ts`
- [ ] Create API endpoint if needed (or use existing query)
- [ ] Add RLS queries for multi-tenant safety
- [ ] Test with mock data
- [ ] Test with real database
- [ ] Verify function schema is correct

**Task 5.2: Automations Status Function**
- [ ] Create `lib/chat/functions/get-automations-status.ts`
- [ ] Implement executor function
- [ ] Add to function registry
- [ ] Query automations table with proper filtering
- [ ] Return run status and recent results
- [ ] Test with mock data
- [ ] Test with real database
- [ ] Verify filtering by agency_id

**Task 5.3: Test Function Calling (Day 5)**
- [ ] Manual test: "What support tickets does Acme have?"
  - [ ] Expected: Gemini calls `search_support_tickets`
  - [ ] Expected: Returns Acme's tickets only
- [ ] Manual test: "Are our automations running?"
  - [ ] Expected: Gemini calls `get_automations_status`
  - [ ] Expected: Returns agency automations
- [ ] Test with different users (verify isolation)
- [ ] Test with invalid client_id (should handle gracefully)
- [ ] Verify execution times < 500ms

---

### Day 6-8: Integration Testing & Polish

**Task 8.1: End-to-End Testing (Day 6)**
- [ ] Test full flow: Context → Function Calling → Memory
  - [ ] Navigate to `/clients/acme`
  - [ ] Ask "Show me recent alerts"
  - [ ] Verify response includes client context
  - [ ] Verify function returns client-specific data
  - [ ] Verify memory stored
- [ ] Test with different pages
- [ ] Test with different users
- [ ] Test with different agencies
- [ ] Verify no cross-agency data leakage
- [ ] Check response times (< 2s target)

**Task 8.2: Error Handling (Day 7)**
- [ ] Test with invalid client_id
- [ ] Test with network timeouts
- [ ] Test with malformed context
- [ ] Test memory storage failure
- [ ] Test function execution failure
- [ ] Verify errors don't break chat

**Task 8.3: Browser Testing (Day 7)**
- [ ] Test drag-drop file upload still works
- [ ] Test message streaming
- [ ] Test citations
- [ ] Test suggestion pills
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile
- [ ] Test keyboard accessibility

**Task 8.4: Production Readiness (Day 8)**
- [ ] Run `npm run build` - must pass
- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run type-check` - must pass
- [ ] All tests passing
- [ ] No console errors
- [ ] No Sentry errors
- [ ] Load test (verify performance under load)

**Task 8.5: Documentation (Day 8)**
- [ ] Update CLAUDE.md with Phase 1 completion
- [ ] Add troubleshooting guide
- [ ] Document new functions
- [ ] Create user guide for context-aware chat
- [ ] Update feature status

**Task 8.6: Create Pull Request (Day 8)**
- [ ] Commit all changes
- [ ] Push to remote
- [ ] Create PR with comprehensive description
- [ ] Include testing evidence
- [ ] Get review approval
- [ ] Merge to main
- [ ] Deploy to production

---

## PHASE 2: FUNCTION EXPANSION (Days 9-16)

### Day 9-10: Add 4 More Functions

**Task 10.1: Search Client Documents**
- [ ] Create `lib/chat/functions/search-client-documents.ts`
- [ ] Connect to RAG system
- [ ] Filter by client_id
- [ ] Add to function registry
- [ ] Test searches for specific client
- [ ] Verify only that client's docs returned

**Task 10.2: Get Client Timeline**
- [ ] Create `lib/chat/functions/get-client-timeline.ts`
- [ ] Combine emails, calls, notes, updates
- [ ] Order by date
- [ ] Limit to recent activity
- [ ] Add to function registry
- [ ] Test with real client data

**Task 10.3: Search KB Documents**
- [ ] Create `lib/chat/functions/search-kb-documents.ts`
- [ ] Agency-wide document search
- [ ] Category filtering
- [ ] Add to function registry
- [ ] Test across agencies

**Task 10.4: Get Training Cartridges**
- [ ] Create `lib/chat/functions/get-training-cartridges.ts`
- [ ] Query training_cartridges table
- [ ] Optional client filtering
- [ ] Add to function registry
- [ ] Test with real cartridges

---

### Day 11-12: RAG Enhancement

**Task 12.1: Client-Scoped RAG**
- [ ] Update `lib/rag/gemini-rag.ts` search function
- [ ] Accept optional clientId parameter
- [ ] Filter documents by clientId
- [ ] Fall back to agency-wide if no client-specific docs

**Task 12.2: Update Router**
- [ ] Pass clientId to RAG search
- [ ] Test RAG returns client-specific docs
- [ ] Verify fallback works

**Task 12.3: Test RAG (Day 12)**
- [ ] Upload doc as Client A
- [ ] Upload different doc as Client B
- [ ] Search from Client A context
- [ ] Verify only Client A's doc returned
- [ ] Search from Client B context
- [ ] Verify only Client B's doc returned

---

### Day 13-14: UX Polish

**Task 14.1: Fix Drag-Drop Z-Index**
- [ ] Open `components/chat/chat-interface.tsx`
- [ ] Update parent chat bar pointerEvents to `always auto`
- [ ] Add drag feedback to entire container
- [ ] Test drag-drop works before clicking input
- [ ] Test on all browsers

**Task 14.2: Expand File Types**
- [ ] Add SVG, ODT, EPUB, RTF support
- [ ] Update MIME type validation
- [ ] Test upload with new types

**Task 14.3: Improve Error Feedback**
- [ ] Add error indicator in chat bar
- [ ] Show upload progress more clearly
- [ ] Better timeout messages

---

### Day 15-16: Final Testing & Deployment

**Task 16.1: Comprehensive Testing (Day 15)**
- [ ] All 12 functions working
- [ ] Context flowing correctly
- [ ] Memory persisting
- [ ] RAG scoped properly
- [ ] No cross-agency leakage
- [ ] Performance < 2s
- [ ] All browsers working
- [ ] Accessibility verified

**Task 16.2: Performance Tuning (Day 15)**
- [ ] Profile function execution times
- [ ] Profile Gemini latency
- [ ] Profile memory storage latency
- [ ] Identify bottlenecks
- [ ] Optimize if needed

**Task 16.3: Production Validation (Day 16)**
- [ ] All tests passing
- [ ] Build succeeds
- [ ] Linting passes
- [ ] Type checking passes
- [ ] No Sentry errors
- [ ] Load testing successful

**Task 16.4: Deployment & Documentation (Day 16)**
- [ ] Final commit and PR
- [ ] Code review approval
- [ ] Merge to main
- [ ] Deploy to production
- [ ] Monitor for errors (1 hour)
- [ ] Update CLAUDE.md
- [ ] Update feature status to "COMPLETE"

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- [x] SessionContext flows through chat system
- [x] Context appears in Gemini prompts
- [x] Memories persist across sessions
- [x] User can verify memories in Mem0 dashboard
- [x] All changes pass linting, tests, type checking
- [x] No regressions in existing functionality
- [x] All unit tests passing

### Phase 2 Complete When:
- [x] 12 total functions available (6 existing + 6 new)
- [x] All functions return client-specific data
- [x] RAG searches scoped to current client
- [x] Drag-drop UX improved
- [x] Performance metrics met
- [x] Multi-tenant isolation verified
- [x] End-to-end browser tests passing
- [x] Deployed to production
- [x] Zero regressions

---

## ROLLBACK PLAN

If critical issues discovered:

1. **Immediate:** Revert latest commit
   ```bash
   git revert HEAD --no-edit
   git push
   ```

2. **Redeploy:** Trigger production deployment of previous version

3. **Communication:** Update status in CLAUDE.md

4. **Debugging:** Use Sentry + logs to understand issue

5. **Root Cause:** Fix in feature branch, re-test, re-deploy

---

## MONITORING AFTER DEPLOYMENT

First 24 hours post-launch:

- [ ] Monitor Sentry for new errors
- [ ] Check database query performance
- [ ] Verify memory storage succeeding
- [ ] Monitor function call latency
- [ ] Check user feedback/support tickets
- [ ] Verify multi-tenant isolation (test with 3+ agencies)
- [ ] Monitor server response times
- [ ] Check chat feature usage in analytics

---

## DOCUMENTATION UPDATES NEEDED

After Phase 1 & 2 complete:

- [ ] Update `/docs/HOLY_GRAIL_CHAT_AUDIT.md` - Mark complete
- [ ] Update `CLAUDE.md` - Update status to 100%
- [ ] Update `features/INDEX.md` - Mark Holy Grail Chat complete
- [ ] Create user guide for new features
- [ ] Create troubleshooting guide
- [ ] Document all 12 functions with examples
- [ ] Document context injection for future developers

---

## Questions/Decisions Needed Before Starting

1. **Function Priority:** Which 2 to add in Phase 1?
   - [ ] Support tickets + Automations (recommended)
   - [ ] Other combination?

2. **Memory Scope:** Per-user or per-agency?
   - [ ] Per-user (each person's preferences) - recommended
   - [ ] Per-agency (shared learnings)

3. **RAG Hybrid Strategy:** When should we use RAG vs functions?
   - [ ] Functions first, RAG fallback
   - [ ] Both in parallel
   - [ ] Smart selection based on query type

4. **Context Depth:** What app state to include?
   - [ ] Just page + client (minimal)
   - [ ] + active filters (medium) - recommended
   - [ ] + recent interactions (rich)

5. **Performance Budget:**
   - [ ] < 1s response time (aggressive)
   - [ ] < 2s response time (reasonable) - recommended
   - [ ] < 4s response time (comfortable)

---

**Ready to execute. Awaiting product decisions and Phase 1 approval.**

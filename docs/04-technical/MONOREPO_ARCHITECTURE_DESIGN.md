# Holy Grail Chat Monorepo - Architecture Design Document

**Status:** Planning Phase | Awaiting Approval
**Date:** 2026-01-17
**Decision:** Merge HGC + AudienceOS into unified monorepo for automatic propagation of improvements
**Scope:** This is production-critical architecture - must be perfect before implementation

---

## 🎯 VISION

**Single Source of Truth:**
- Holy Grail Chat (HGC) is the reusable library component
- AudienceOS is the first consumer application
- RevOS is the second consumer (future)
- Changes in HGC → automatically available in all consumers
- Like Flash symbols: same component, different project contexts

---

## 📊 CURRENT STATE vs TARGET STATE

### CURRENT (Broken)
```
holy-grail-chat/ (standalone, complete, 396 tests)
├── src/
│   ├── components/chat/
│   ├── lib/
│   └── app/ (demo app)

command_center_audience_OS/ (separate, 70% integration)
├── components/chat/ (COPY of HGC, diverged)
├── lib/chat/ (COPY of HGC, diverged)
└── app/api/v1/chat/ (COPY of HGC, diverged)

Problem: Two separate codebases, changes don't propagate, tests don't align
```

### TARGET (Perfect)
```
holy-grail-chat/ (monorepo root - HGC library + all consumers)
├── packages/
│   ├── hgc/ (core library - extracted from src/)
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   └── __tests__/ (396 Jest tests)
│   │
│   ├── audiences-os/ (consumer app - moved here)
│   │   ├── app/ (Next.js app)
│   │   ├── lib/ (AudienceOS-specific adapters)
│   │   │   └── hgc-adapter/
│   │   │       ├── context-provider.ts (AudienceOS context)
│   │   │       └── function-registry.ts (AudienceOS functions)
│   │   └── __tests__/ (integration tests)
│   │
│   └── revo-os/ (future consumer - same structure)
│
├── shared/
│   └── adapters/ (abstract interfaces both consumers implement)
│       ├── IContextProvider.ts
│       ├── IFunctionRegistry.ts
│       └── types.ts
│
├── package.json (root monorepo)
└── jest.config.js (unified test config)

Result: Single source, automatic propagation, shared test infrastructure
```

---

## 🏗️ MONOREPO STRUCTURE (DETAILED)

### Root Package.json (Monorepo Workspace Config)

```json
{
  "name": "holy-grail-chat-monorepo",
  "private": true,
  "workspaces": [
    "packages/hgc",
    "packages/audiences-os",
    "packages/revo-os"
  ],
  "scripts": {
    "test": "jest --passWithNoTests",
    "test:hgc": "jest --testPathPattern=packages/hgc",
    "test:audiences-os": "jest --testPathPattern=packages/audiences-os",
    "test:all": "jest",
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspaces",
    "lint": "eslint packages/*/src",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "jest": "^29.x",
    "@testing-library/react": "^14.x",
    "typescript": "^5.x"
  }
}
```

### packages/hgc/ - Core Library

```
packages/hgc/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx (portable)
│   │   │   ├── ChatWidget.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ConversationHistory.tsx
│   │   │   └── __tests__/
│   │   ├── memory/
│   │   │   ├── MemoryManager.tsx
│   │   │   └── __tests__/
│   │   └── ui/ (shared UI components)
│   │
│   ├── lib/
│   │   ├── router.ts (5-way intent classification)
│   │   ├── memory/
│   │   │   ├── memory-injector.ts
│   │   │   └── __tests__/
│   │   ├── rag/ (RAG service)
│   │   │   ├── gemini-rag.ts
│   │   │   └── __tests__/
│   │   ├── functions/
│   │   │   ├── types.ts (abstract function interface)
│   │   │   ├── base-registry.ts (abstract registry)
│   │   │   └── __tests__/
│   │   └── utils/
│   │
│   ├── types/
│   │   ├── index.ts (SessionContext, Memory, etc.)
│   │   ├── adapters.ts (IContextProvider, IFunctionRegistry interfaces)
│   │   └── gemini.ts
│   │
│   └── api/ (abstract route handler)
│       └── chat-handler.ts (receives adapter + context, returns response)
│
├── __tests__/
│   ├── unit/ (component tests)
│   ├── integration/ (router + functions + RAG)
│   └── e2e/ (Claude in Chrome scenarios)
│
├── package.json (HGC as a package)
├── tsconfig.json
└── jest.config.js
```

### packages/audiences-os/ - Consumer Application

```
packages/audiences-os/
├── app/ (Next.js 15)
│   ├── api/
│   │   ├── v1/
│   │   │   ├── chat/
│   │   │   │   └── route.ts (uses HGC chat-handler + AudienceOS adapter)
│   │   │   ├── clients/
│   │   │   └── alerts/
│   │   └── health/
│   │
│   ├── dashboard/
│   ├── clients/
│   ├── chat/ (UI layout that uses HGC ChatInterface component)
│   └── page.tsx
│
├── lib/
│   ├── hgc-adapter/ (AudienceOS-specific implementations)
│   │   ├── context-provider.ts
│   │   │   // Implements IContextProvider
│   │   │   // Returns: AudienceOS page context (client, page, filters)
│   │   │   // References: "self-awareness stock" for understanding
│   │   │
│   │   ├── function-registry.ts
│   │   │   // Implements IFunctionRegistry
│   │   │   // Provides: clients, alerts, tickets, automations, etc.
│   │   │   // Specific to AudienceOS features
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAudienceOSContext.ts (page context provider)
│   │   │   └── useHGCChat.ts (integrated chat hook)
│   │   │
│   │   └── __tests__/
│   │       ├── context-provider.test.ts
│   │       ├── function-registry.test.ts
│   │       └── integration.test.ts
│   │
│   ├── services/ (AudienceOS business logic)
│   └── supabase/ (AudienceOS DB queries)
│
├── components/
│   ├── layout/ (uses HGC ChatInterface)
│   └── pages/
│
├── __tests__/
│   ├── unit/
│   ├── integration/ (HGC + AudienceOS adapter)
│   └── e2e/ (Claude in Chrome)
│
├── package.json (dependencies on @hgc/core)
└── tsconfig.json
```

### packages/revo-os/ - Future Consumer (Template)

```
packages/revo-os/
├── Same structure as audiences-os/
├── lib/hgc-adapter/
│   ├── context-provider.ts (RevOS-specific context)
│   └── function-registry.ts (RevOS-specific functions)
└── __tests__/
    └── integration tests for RevOS + HGC
```

### shared/ - Abstract Patterns

```
shared/
├── adapters/
│   ├── IContextProvider.ts
│   │   interface IContextProvider {
│   │     getContext(userId, agencyId): Promise<SessionContext>
│   │   }
│   │
│   ├── IFunctionRegistry.ts
│   │   interface IFunctionRegistry {
│   │     getFunctions(): FunctionDeclaration[]
│   │     executeFunction(name, args, context): Promise<any>
│   │   }
│   │
│   ├── types.ts (SessionContext, Memory, etc.)
│   │
│   └── examples/
│       ├── BasicContextProvider.ts (template)
│       └── BasicFunctionRegistry.ts (template)
│
└── README.md (how to implement adapters for new projects)
```

---

## 🔌 ADAPTER PATTERN (THE KEY TO FLEXIBILITY)

### The Problem Being Solved

```
HGC says: "I need context and functions"
AudienceOS says: "I have self-awareness stock and support tickets"
RevOS says: "I have different context and no support tickets"

Solution: Let each project implement adapters
```

### IContextProvider Interface

```typescript
// shared/adapters/IContextProvider.ts

export interface SessionContext {
  clientId?: string
  clientName?: string
  currentPage?: string
  activeFilters?: Record<string, string | string[]>
  recentAlerts?: string[]
  projectSpecificData?: Record<string, any> // ← RevOS can add fields
}

export interface IContextProvider {
  /**
   * Get current session context based on user, agency, page
   * Different projects return different context
   */
  getContext(
    userId: string,
    agencyId: string,
    currentRoute?: string
  ): Promise<SessionContext>

  /**
   * Watch for context changes (user navigates, filters change)
   */
  onContextChange(callback: (context: SessionContext) => void): () => void
}
```

### IFunctionRegistry Interface

```typescript
// shared/adapters/IFunctionRegistry.ts

export interface IFunctionRegistry {
  /**
   * Return all available functions for this project
   * AudienceOS: clients, alerts, tickets, automations
   * RevOS: contacts, deals, pipeline, activities
   */
  getFunctions(): FunctionDeclaration[]

  /**
   * Execute a function by name
   * HGC calls this, project implements
   */
  executeFunction(
    functionName: string,
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<unknown>
}
```

### AudienceOS Implementation

```typescript
// packages/audiences-os/lib/hgc-adapter/context-provider.ts

export class AudienceOSContextProvider implements IContextProvider {
  async getContext(
    userId: string,
    agencyId: string,
    currentRoute?: string
  ): Promise<SessionContext> {
    // Get current page from Next.js router
    // Get active client from state/URL
    // Get recent alerts from Supabase
    // Return AudienceOS-specific context

    return {
      clientId: activeClient?.id,
      clientName: activeClient?.name,
      currentPage: currentRoute || '/dashboard',
      // ... additional fields
      projectSpecificData: {
        selfAwarenessStock: await getSelfAwarenessData(),
        accountHealth: await getAccountHealth(),
      }
    }
  }

  onContextChange(callback) {
    // Subscribe to router changes, state changes
    // Call callback when context changes
  }
}

// packages/audiences-os/lib/hgc-adapter/function-registry.ts

export class AudienceOSFunctionRegistry implements IFunctionRegistry {
  getFunctions(): FunctionDeclaration[] {
    return [
      {
        name: 'get_clients',
        // ... schema from HGC
      },
      {
        name: 'search_support_tickets',
        // ... AudienceOS-specific
      },
      // ... all other functions
    ]
  }

  async executeFunction(
    functionName: string,
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<unknown> {
    switch (functionName) {
      case 'get_clients':
        return getClientsFromSupabase(args, context.agencyId)
      case 'search_support_tickets':
        return searchTicketsInAudienceOS(args, context)
      // ... all other functions
    }
  }
}
```

### How HGC Uses Adapters

```typescript
// packages/hgc/src/api/chat-handler.ts

export async function handleChat(
  message: string,
  contextProvider: IContextProvider,
  functionRegistry: IFunctionRegistry,
  geminiApiKey: string
): Promise<ChatResponse> {
  // Get context from adapter
  const context = await contextProvider.getContext(userId, agencyId)

  // Get functions from adapter
  const functions = functionRegistry.getFunctions()

  // Use context + functions in smart router
  const route = await classifyIntent(message, context)

  // Execute function from adapter
  if (route === 'dashboard') {
    const result = await functionRegistry.executeFunction(
      functionName,
      args,
      { agencyId, userId }
    )
  }

  // Generate response with Gemini
  return generateResponse(message, context, result)
}
```

### How AudienceOS Wires It Up

```typescript
// packages/audiences-os/app/api/v1/chat/route.ts

import { handleChat } from '@hgc/core/api/chat-handler'
import { AudienceOSContextProvider } from '@/lib/hgc-adapter/context-provider'
import { AudienceOSFunctionRegistry } from '@/lib/hgc-adapter/function-registry'

export async function POST(request: NextRequest) {
  const { message, sessionId } = await request.json()
  const { agencyId, userId } = request.user

  // Create project-specific adapters
  const contextProvider = new AudienceOSContextProvider()
  const functionRegistry = new AudienceOSFunctionRegistry()

  // Pass to HGC
  const response = await handleChat(
    message,
    contextProvider,
    functionRegistry,
    process.env.GEMINI_API_KEY
  )

  return Response.json(response)
}
```

---

## 🧪 TEST STRATEGY (COMPREHENSIVE)

### Test Pyramid

```
                  /\
                 /  \       E2E Tests (Claude in Chrome)
                /    \      - Real browser, real interactions
               /______\     - All scenarios: context, memory, functions

              /        \
             /          \    Integration Tests (Jest)
            /            \   - HGC + Adapter working together
           /  Integrat.   \  - Context provided → functions called → response generated
          /________________\

         /                  \
        /                    \  Unit Tests (Jest)
       /                      \ - Router classifies correctly
      /         Unit Tests     \ - Memory extractors work
     /                          \ - RAG search returns docs
    /____________________________|
```

### Unit Tests (HGC Core)

**Location:** `packages/hgc/__tests__/unit/`

```typescript
// Router classification
test('classifies "show clients" as dashboard route', async () => {
  const result = await classifyIntent('show me our clients')
  expect(result).toBe('dashboard')
})

// Memory extraction
test('extracts preference from "I prefer phone calls"', () => {
  const memories = extractMemories('Remember I prefer phone calls')
  expect(memories[0].type).toBe('preference')
  expect(memories[0].content).toContain('phone calls')
})

// RAG search
test('returns documents matching query', async () => {
  const results = await ragService.search('onboarding process')
  expect(results.length).toBeGreaterThan(0)
  expect(results[0].relevance).toBeGreaterThan(0.7)
})

// Function validation
test('validates function arguments against schema', () => {
  const schema = getFunctionSchema('get_clients')
  const valid = validateArgs({ health_status: 'good' }, schema)
  expect(valid).toBe(true)
})
```

### Integration Tests (Adapter + HGC)

**Location:** `packages/audiences-os/__tests__/integration/`

```typescript
// Context provider returns correct data
test('AudienceOSContextProvider returns client context', async () => {
  const provider = new AudienceOSContextProvider()
  const context = await provider.getContext(userId, agencyId, '/clients/123')

  expect(context.clientId).toBe('123')
  expect(context.currentPage).toBe('/clients/123')
})

// Function registry executes AudienceOS functions
test('executeFunction calls AudienceOS API for clients', async () => {
  const registry = new AudienceOSFunctionRegistry()
  const results = await registry.executeFunction('get_clients', {}, context)

  expect(results).toHaveLength(greaterThan(0))
  expect(results[0]).toHaveProperty('name')
})

// Full chat flow
test('chat integrates context + functions + Gemini', async () => {
  const response = await handleChat(
    'Show alerts for Acme Corp',
    contextProvider,
    functionRegistry,
    apiKey
  )

  expect(response.content).toContain('Acme')
  expect(response.functionsCalled).toContain('get_alerts')
})
```

### E2E Tests (Claude in Chrome)

**Location:** `packages/audiences-os/__tests__/e2e/`

```typescript
// Using Claude in Chrome automation

test('E2E: Chat understands client context', async () => {
  // 1. Navigate to /clients/acme-corp
  await browser.navigate('http://localhost:3000/clients/acme-corp')

  // 2. Type "show alerts"
  await browser.typeInChat('show alerts')

  // 3. Verify response includes "Acme"
  const response = await browser.getChatResponse()
  expect(response).toContain('Acme Corp')

  // 4. Verify only Acme's alerts shown
  expect(response).not.toContain('other company')
})

test('E2E: Memory persists across sessions', async () => {
  // 1. Tell chat "Remember I prefer email"
  await browser.typeInChat('Remember I prefer email over phone')

  // 2. Refresh browser
  await browser.refresh()

  // 3. Ask "What's my preference?"
  await browser.typeInChat("What's my communication preference?")

  // 4. Verify it remembers
  const response = await browser.getChatResponse()
  expect(response).toContain('email')
})

test('E2E: File upload works', async () => {
  // 1. Drag file to chat
  await browser.dragFileToChat('test-doc.pdf')

  // 2. Verify upload success
  const toast = await browser.waitForToast('uploaded successfully')
  expect(toast).toBeVisible()

  // 3. Ask about file
  await browser.typeInChat('What was in that file?')

  // 4. Verify chat can discuss file content
  const response = await browser.getChatResponse()
  expect(response.length).toBeGreaterThan(50) // substantive answer
})

test('E2E: Multi-function orchestration', async () => {
  // Ask complex question requiring multiple functions
  await browser.typeInChat(
    'Show me alerts for our top clients by revenue'
  )

  // Verify functions called in correct order
  const log = await browser.getNetworkLog()
  expect(log).toContainSequence([
    '/api/clients', // get clients
    '/api/alerts',  // get alerts
  ])
})
```

---

## 🚀 MIGRATION SEQUENCE (STEP BY STEP)

### Phase 0: Preparation (1 day)
- [ ] Review this design document
- [ ] Get approval
- [ ] Backup both repositories
- [ ] Create new branch `feature/monorepo-merge`

### Phase 1: Monorepo Setup (2 days)
- [ ] Create root `package.json` with workspaces
- [ ] Create `packages/` directory structure
- [ ] Create `packages/hgc/` package
- [ ] Create `packages/audiences-os/` package
- [ ] Move HGC src/ into packages/hgc/src/
- [ ] Move AudienceOS files into packages/audiences-os/
- [ ] Configure root Jest config
- [ ] Verify all dependencies resolve

### Phase 2: Adapter Pattern (3 days)
- [ ] Create `shared/adapters/` interfaces
- [ ] Create AudienceOS context provider
- [ ] Create AudienceOS function registry
- [ ] Update HGC chat-handler to use adapters
- [ ] Wire up AudienceOS API route
- [ ] Verify no breaking changes

### Phase 3: Test Migration (2 days)
- [ ] Run all HGC tests in new structure
- [ ] Create integration tests (adapter + HGC)
- [ ] Create AudienceOS-specific tests
- [ ] Verify all 396+ HGC tests still pass
- [ ] Add new tests for adapter implementations

### Phase 4: E2E Testing (3 days)
- [ ] Set up Claude in Chrome test framework
- [ ] Create E2E test scenarios (context, memory, functions, files)
- [ ] Test all critical user paths
- [ ] Test edge cases and error handling
- [ ] Verify multi-browser compatibility

### Phase 5: Integration Testing (2 days)
- [ ] Full integration in local environment
- [ ] Test HGC changes propagate to AudienceOS
- [ ] Test AudienceOS adapter changes work
- [ ] Verify database queries work
- [ ] Verify authentication/RLS

### Phase 6: Documentation (1 day)
- [ ] Update CLAUDE.md for both projects
- [ ] Create adapter implementation guide
- [ ] Document folder structure
- [ ] Create troubleshooting guide
- [ ] Document how to add RevOS to monorepo

### Phase 7: Deployment (1 day)
- [ ] Merge to main
- [ ] Deploy AudienceOS with new structure
- [ ] Monitor for errors
- [ ] Verify all tests passing in CI/CD
- [ ] Update runbooks

**Total:** ~14-15 days

---

## 📋 VERIFICATION CHECKLIST (Before Implementation)

**Before any code is written, verify:**

- [ ] Monorepo structure is clear (no ambiguity)
- [ ] Adapter pattern is well-defined (implementers know what to do)
- [ ] Test strategy covers all scenarios (unit + integration + E2E)
- [ ] Migration sequence is step-by-step and reversible
- [ ] No breaking changes to HGC public API
- [ ] All 396 HGC tests will continue to pass
- [ ] Documentation will be updated
- [ ] RevOS can follow same pattern (future-proof)

---

## 🎯 SUCCESS CRITERIA

This monorepo is successful when:

✅ Single source of truth: HGC changes → AudienceOS gets changes automatically
✅ Tests pass everywhere: Unit + Integration + E2E all green
✅ Zero code duplication: No copy-paste between projects
✅ Adapter pattern clear: New projects can implement in <4 hours
✅ Performance: No monorepo overhead (same speed as separate repos)
✅ Documentation: Clear instructions for adding new consumer projects
✅ Production-ready: Zero technical debt, no shortcuts

---

## ⚠️ RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Monorepo complexity | LOW | MEDIUM | Clear folder structure + documentation |
| Test runner conflicts | LOW | MEDIUM | Unified Jest config |
| Dependency conflicts | MEDIUM | HIGH | npm workspaces handles isolation |
| CI/CD complexity | MEDIUM | MEDIUM | Keep same CI/CD approach per project |
| Integration breaks | LOW | HIGH | Comprehensive E2E tests before merge |

---

## 📞 NEXT STEPS

**Awaiting your approval on:**

1. ✅ Monorepo structure (packages/hgc + packages/audiences-os + packages/revo-os)
2. ✅ Adapter pattern design (IContextProvider + IFunctionRegistry)
3. ✅ Test strategy (unit + integration + E2E with Claude in Chrome)
4. ✅ Migration sequence (14-15 days, phased approach)
5. ✅ Success criteria (single source of truth, zero duplication)

**Once approved, I will:**
1. Create detailed day-by-day implementation plan
2. Create all test files (scaffolding)
3. Start Phase 1: Monorepo setup
4. TDD approach: test first, code second

---

**This is your opus. This is perfect.** Ready to build it right.

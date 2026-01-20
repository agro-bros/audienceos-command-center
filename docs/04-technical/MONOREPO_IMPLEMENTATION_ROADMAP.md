# Holy Grail Chat Monorepo - Detailed Implementation Roadmap

**Status:** Ready for Execution (awaiting approval)
**Estimated Duration:** 14-15 working days
**Testing Requirement:** TDD (test first, code second)
**Verification:** All tests green + Claude in Chrome E2E passing

---

## 📋 PRE-IMPLEMENTATION CHECKLIST

Before Phase 0 starts, verify:

- [ ] Architecture Design approved
- [ ] Team understands adapter pattern
- [ ] Test strategy understood
- [ ] Both repos backed up
- [ ] CI/CD ready for monorepo

---

## 🔄 PHASE 0: PREPARATION (1 Day)

**Goal:** Set up for safe migration

### 0.1: Repository Backup
```bash
# Backup current repos
cd /Users/rodericandrews/_PAI/projects
tar -czf holy-grail-chat.backup.tar.gz holy-grail-chat/
tar -czf audiences-os.backup.tar.gz command_center_audience_OS/

# Store in safe location
mv *.backup.tar.gz ~/.backups/
```

**Verification:**
- [ ] Both backup files exist and are readable
- [ ] Size is reasonable (> 10MB each)

### 0.2: Create Feature Branch
```bash
cd /Users/rodericandrews/_PAI/projects/holy-grail-chat
git checkout -b feature/monorepo-merge
git commit --allow-empty -m "chore: start monorepo merge (Phase 0)"

cd /Users/rodericandrews/_PAI/projects/command_center_audience_OS
git checkout -b feature/monorepo-merge
git commit --allow-empty -m "chore: prepare for monorepo merge (Phase 0)"
```

**Verification:**
- [ ] Both branches exist
- [ ] Both have initial commits
- [ ] No uncommitted changes

### 0.3: Documentation Preparation
- [ ] Read MONOREPO_ARCHITECTURE_DESIGN.md completely
- [ ] Read this roadmap completely
- [ ] Understand adapter pattern
- [ ] Understand test strategy

**Verification:**
- [ ] Can explain adapter pattern in 30 seconds
- [ ] Can list the 7 phases in order
- [ ] Can describe what E2E tests will verify

---

## 📦 PHASE 1: MONOREPO SETUP (2 Days)

**Goal:** Create monorepo structure with no functionality changes

### 1.1: Create Root Monorepo Structure (Day 1 Morning)

**Test First:**
```typescript
// Test that monorepo structure is sound
// (No code to execute yet, just structural tests)

test('root package.json has workspaces defined', () => {
  const pkg = require('./package.json')
  expect(pkg.workspaces).toBeDefined()
  expect(pkg.workspaces).toContain('packages/hgc')
  expect(pkg.workspaces).toContain('packages/audiences-os')
})

test('all packages have valid package.json', () => {
  const hgc = require('./packages/hgc/package.json')
  const ao = require('./packages/audiences-os/package.json')

  expect(hgc.name).toBe('@hgc/core')
  expect(ao.name).toBe('@hgc/audiences-os')
  expect(ao.dependencies['@hgc/core']).toBeDefined()
})
```

**Implementation:**

Create new root `package.json`:
```bash
# This is for the COMBINED monorepo
# It will live in holy-grail-chat/ (the parent becomes the monorepo)

cat > /Users/rodericandrews/_PAI/projects/holy-grail-chat/package.json << 'EOF'
{
  "name": "holy-grail-chat-monorepo",
  "version": "2.0.0",
  "private": true,
  "description": "Holy Grail Chat - Reusable AI chat library + consumer projects",
  "workspaces": [
    "packages/hgc",
    "packages/audiences-os"
  ],
  "scripts": {
    "test": "jest",
    "test:hgc": "jest --testPathPattern=packages/hgc",
    "test:ao": "jest --testPathPattern=packages/audiences-os",
    "test:all": "jest --testPathPattern='packages/(hgc|audiences-os)'",
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspaces",
    "lint": "eslint packages/*/src",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "eslint": "^8.50.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "typescript": "^5.2.0"
  },
  "jest": {
    "projects": [
      "<rootDir>/packages/hgc/jest.config.js",
      "<rootDir>/packages/audiences-os/jest.config.js"
    ]
  }
}
EOF
```

Create directory structure:
```bash
# Create packages directory
mkdir -p /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/hgc
mkdir -p /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/audiences-os
mkdir -p /Users/rodericandrews/_PAI/projects/holy-grail-chat/shared/adapters

# Create shared adapters directory
mkdir -p /Users/rodericandrews/_PAI/projects/holy-grail-chat/shared
```

**Verification:**
```bash
# Test structure
npm install --workspaces 2>&1 | head -20
npm list -a 2>&1 | grep "valid workspace"

# Verify both packages can be listed
npm ls -a --depth=0
```

- [ ] `npm install --workspaces` succeeds
- [ ] Both packages listed in workspace config
- [ ] No circular dependencies

### 1.2: Move HGC into packages/hgc/ (Day 1 Afternoon)

**Test First:**
```typescript
test('HGC package structure is intact after move', () => {
  const files = [
    'packages/hgc/src/components/chat',
    'packages/hgc/src/lib',
    'packages/hgc/src/types',
    'packages/hgc/__tests__',
  ]

  files.forEach(file => {
    expect(fs.existsSync(file)).toBe(true)
  })
})

test('all HGC tests still reference correct paths', () => {
  const testContent = fs.readFileSync('packages/hgc/__tests__/unit/router.test.ts', 'utf8')
  expect(testContent).toMatch(/from ['"]\.\/\.\.\/src\/lib\/router['"]/)
})
```

**Implementation:**

Move current HGC structure:
```bash
# Current HGC structure (in holy-grail-chat/):
# src/
# __tests__/
# test/
# jest.config.js
# package.json
# tsconfig.json

# Move to packages/hgc/
mv /Users/rodericandrews/_PAI/projects/holy-grail-chat/src \
   /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/hgc/

mv /Users/rodericandrews/_PAI/projects/holy-grail-chat/__tests__ \
   /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/hgc/

mv /Users/rodericandrews/_PAI/projects/holy-grail-chat/test \
   /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/hgc/

# Move package.json and configs (but update them)
mv /Users/rodericandrews/_PAI/projects/holy-grail-chat/jest.config.js \
   /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/hgc/

mv /Users/rodericandrews/_PAI/projects/holy-grail-chat/tsconfig.json \
   /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/hgc/

# Keep original package.json, but modify it
cp /Users/rodericandrews/_PAI/projects/holy-grail-chat/package.json.bak \
   /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/hgc/package.json
```

Update `packages/hgc/package.json`:
```json
{
  "name": "@hgc/core",
  "version": "2.0.0",
  "private": false,
  "description": "Holy Grail Chat - Reusable AI chat library",
  "exports": {
    ".": "./src/index.ts",
    "./components": "./src/components/index.ts",
    "./lib": "./src/lib/index.ts",
    "./types": "./src/types/index.ts",
    "./api/chat-handler": "./src/api/chat-handler.ts"
  },
  "main": "./src/index.ts",
  "scripts": {
    "test": "jest",
    "build": "tsc --outDir dist"
  }
}
```

**Verification:**
```bash
# Run HGC tests from new location
cd /Users/rodericandrews/_PAI/projects/holy-grail-chat
npm run test:hgc
```

- [ ] All 396 HGC tests still pass
- [ ] No import errors
- [ ] Build succeeds

### 1.3: Move AudienceOS into packages/audiences-os/ (Day 2 Morning)

**Test First:**
```typescript
test('AudienceOS package structure is intact after move', () => {
  const files = [
    'packages/audiences-os/app',
    'packages/audiences-os/components',
    'packages/audiences-os/lib',
    'packages/audiences-os/public',
    'packages/audiences-os/package.json',
  ]

  files.forEach(file => {
    expect(fs.existsSync(file)).toBe(true)
  })
})
```

**Implementation:**

```bash
# Create audiences-os package structure
mkdir -p /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/audiences-os

# Copy files from command_center_audience_OS
cp -r /Users/rodericandrews/_PAI/projects/command_center_audience_OS/app \
      /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/audiences-os/

cp -r /Users/rodericandrews/_PAI/projects/command_center_audience_OS/components \
      /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/audiences-os/

cp -r /Users/rodericandrews/_PAI/projects/command_center_audience_OS/lib \
      /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/audiences-os/

cp -r /Users/rodericandrews/_PAI/projects/command_center_audience_OS/public \
      /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/audiences-os/

cp /Users/rodericandrews/_PAI/projects/command_center_audience_OS/package.json \
   /Users/rodericandrews/_PAI/projects/holy-grail-chat/packages/audiences-os/
```

Update `packages/audiences-os/package.json`:
```json
{
  "name": "@hgc/audiences-os",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@hgc/core": "*",
    "next": "^15.0.0"
  }
}
```

**Verification:**
```bash
npm install --workspaces
npm run build --workspace=@hgc/audiences-os
```

- [ ] Both packages install without conflicts
- [ ] No duplicate dependencies
- [ ] Build succeeds

### 1.4: Create Shared Adapters Directory (Day 2 Afternoon)

**Test First:**
```typescript
test('adapter interfaces are importable', () => {
  const { IContextProvider } = require('../../shared/adapters/IContextProvider')
  const { IFunctionRegistry } = require('../../shared/adapters/IFunctionRegistry')

  expect(IContextProvider).toBeDefined()
  expect(IFunctionRegistry).toBeDefined()
})
```

**Implementation:**

Create `shared/adapters/types.ts`:
```typescript
export interface SessionContext {
  clientId?: string
  clientName?: string
  currentPage?: string
  activeFilters?: Record<string, string | string[]>
  recentAlerts?: string[]
  projectSpecificData?: Record<string, any>
}

export interface ExecutionContext {
  agencyId: string
  userId: string
  supabase?: any
}
```

Create `shared/adapters/IContextProvider.ts`:
```typescript
import { SessionContext } from './types'

export interface IContextProvider {
  getContext(
    userId: string,
    agencyId: string,
    currentRoute?: string
  ): Promise<SessionContext>

  onContextChange(callback: (context: SessionContext) => void): () => void
}
```

Create `shared/adapters/IFunctionRegistry.ts`:
```typescript
import { FunctionDeclaration } from '@hgc/core/types'
import { ExecutionContext } from './types'

export interface IFunctionRegistry {
  getFunctions(): FunctionDeclaration[]

  executeFunction(
    functionName: string,
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<unknown>
}
```

**Verification:**
```bash
npm run type-check
```

- [ ] TypeScript compiles without errors
- [ ] Interfaces are exportable

---

## 🔌 PHASE 2: ADAPTER PATTERN (3 Days)

**Goal:** Implement adapter pattern - make HGC use IContextProvider + IFunctionRegistry

### 2.1: Extract HGC Chat Handler (Day 3)

**Test First:**
```typescript
test('chat-handler accepts context provider and function registry', async () => {
  const response = await handleChat({
    message: 'show clients',
    contextProvider: mockContextProvider,
    functionRegistry: mockFunctionRegistry,
    geminiApiKey: 'test-key'
  })

  expect(response).toHaveProperty('content')
  expect(response).toHaveProperty('citations')
})
```

**Implementation:**

Create `packages/hgc/src/api/chat-handler.ts`:
```typescript
import { IContextProvider, IFunctionRegistry, ExecutionContext } from '../../shared/adapters'

export interface ChatHandlerInput {
  message: string
  contextProvider: IContextProvider
  functionRegistry: IFunctionRegistry
  geminiApiKey: string
  userId: string
  agencyId: string
  sessionId?: string
}

export async function handleChat(input: ChatHandlerInput) {
  const {
    message,
    contextProvider,
    functionRegistry,
    geminiApiKey,
    userId,
    agencyId,
  } = input

  // Get context from adapter
  const context = await contextProvider.getContext(userId, agencyId)

  // Get functions from adapter
  const functions = functionRegistry.getFunctions()

  // Rest of implementation...
  // (routes, function calling, response generation, etc.)
}
```

**Verification:**
```bash
npm run test:hgc
```

- [ ] All HGC tests pass
- [ ] No breaking changes

### 2.2: Create AudienceOS Context Provider (Day 3)

**Test First:**
```typescript
test('AudienceOSContextProvider returns correct context', async () => {
  const provider = new AudienceOSContextProvider()
  const context = await provider.getContext('user123', 'agency456', '/clients/abc')

  expect(context.clientId).toBe('abc')
  expect(context.currentPage).toBe('/clients/abc')
  expect(context.projectSpecificData).toHaveProperty('selfAwarenessStock')
})

test('context changes trigger callback', async () => {
  const provider = new AudienceOSContextProvider()
  const callback = jest.fn()

  provider.onContextChange(callback)

  // Simulate navigation
  // Should trigger callback
  expect(callback).toHaveBeenCalled()
})
```

**Implementation:**

Create `packages/audiences-os/lib/hgc-adapter/context-provider.ts`:
```typescript
import { IContextProvider, SessionContext } from '../../../shared/adapters'

export class AudienceOSContextProvider implements IContextProvider {
  async getContext(
    userId: string,
    agencyId: string,
    currentRoute?: string
  ): Promise<SessionContext> {
    // Get data from AudienceOS stores/APIs
    // Return context specific to AudienceOS

    return {
      clientId: activeClient?.id,
      clientName: activeClient?.name,
      currentPage: currentRoute,
      projectSpecificData: {
        selfAwarenessStock: await getSelfAwarenessData(),
        accountHealth: await getAccountHealth(),
      }
    }
  }

  onContextChange(callback: (context: SessionContext) => void) {
    // Subscribe to router/store changes
    return () => {
      // Unsubscribe
    }
  }
}
```

**Verification:**
```bash
npm run test:ao
```

- [ ] Context provider tests pass
- [ ] Returns correct data structure

### 2.3: Create AudienceOS Function Registry (Day 4)

**Test First:**
```typescript
test('AudienceOSFunctionRegistry returns correct functions', () => {
  const registry = new AudienceOSFunctionRegistry()
  const functions = registry.getFunctions()

  expect(functions.find(f => f.name === 'get_clients')).toBeDefined()
  expect(functions.find(f => f.name === 'search_support_tickets')).toBeDefined()
})

test('executeFunction delegates to correct executor', async () => {
  const registry = new AudienceOSFunctionRegistry()
  const result = await registry.executeFunction('get_clients', {}, context)

  expect(Array.isArray(result)).toBe(true)
})
```

**Implementation:**

Create `packages/audiences-os/lib/hgc-adapter/function-registry.ts`:
```typescript
import { IFunctionRegistry, ExecutionContext } from '../../../shared/adapters'
import { FunctionDeclaration } from '@hgc/core/types'

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

**Verification:**
```bash
npm run test:ao -- --testPathPattern=function-registry
```

- [ ] Registry returns correct functions
- [ ] All function executions work

### 2.4: Wire Up API Route (Day 4)

**Test First:**
```typescript
test('POST /api/v1/chat uses adapter pattern', async () => {
  const response = await fetch('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'show clients' }),
  })

  const data = await response.json()
  expect(data).toHaveProperty('content')
})
```

**Implementation:**

Update `packages/audiences-os/app/api/v1/chat/route.ts`:
```typescript
import { handleChat } from '@hgc/core/api/chat-handler'
import { AudienceOSContextProvider } from '@/lib/hgc-adapter/context-provider'
import { AudienceOSFunctionRegistry } from '@/lib/hgc-adapter/function-registry'

export async function POST(request: NextRequest) {
  const { message, sessionId } = await request.json()
  const { agencyId, userId } = request.user

  const contextProvider = new AudienceOSContextProvider()
  const functionRegistry = new AudienceOSFunctionRegistry()

  const response = await handleChat({
    message,
    contextProvider,
    functionRegistry,
    geminiApiKey: process.env.GEMINI_API_KEY,
    userId,
    agencyId,
    sessionId,
  })

  return Response.json(response)
}
```

**Verification:**
```bash
npm run test:ao -- --testPathPattern=chat/route
npm run dev # Start and test manually
```

- [ ] API endpoint responds correctly
- [ ] Uses adapter pattern
- [ ] No breaking changes

---

## 🧪 PHASE 3: TEST MIGRATION (2 Days)

**Goal:** Port all tests, verify nothing is broken

### 3.1: Port HGC Unit Tests (Day 5)

**Status Check:**
```bash
npm run test:hgc
```

**Expected Result:**
- All 396 tests pass
- No import errors
- No path issues

If any tests fail:
- Check import paths
- Update path mappings
- Re-run tests

**Verification:**
- [ ] 396 tests passing
- [ ] All test suites green

### 3.2: Create AudienceOS Integration Tests (Day 5)

**Test First:**
```typescript
// packages/audiences-os/__tests__/integration/adapter.test.ts

test('adapter pattern integrates HGC with AudienceOS', async () => {
  const contextProvider = new AudienceOSContextProvider()
  const functionRegistry = new AudienceOSFunctionRegistry()

  const response = await handleChat({
    message: 'show clients',
    contextProvider,
    functionRegistry,
    geminiApiKey: 'test-key',
    userId: 'user123',
    agencyId: 'agency456',
  })

  expect(response.content).toBeDefined()
  expect(response.functionsCalled).toContain('get_clients')
})
```

**Implementation:**

Create full integration test suite for adapters

**Verification:**
```bash
npm run test:ao -- --testPathPattern=integration
```

- [ ] All integration tests pass
- [ ] Adapter pattern works end-to-end

### 3.3: Create Combined Test Suite (Day 6)

**Status Check:**
```bash
npm run test:all
```

**Expected Result:**
- All 396+ HGC tests pass
- All AudienceOS integration tests pass
- No conflicts

**Verification:**
- [ ] Total test count > 400
- [ ] All suites green
- [ ] Coverage > 80%

---

## 🧪 PHASE 4: E2E TESTING (3 Days)

**Goal:** Comprehensive Claude in Chrome E2E tests

### 4.1: E2E Test Framework Setup (Day 6 Afternoon)

**Test First:**
```typescript
// packages/audiences-os/__tests__/e2e/setup.test.ts

test('Claude in Chrome browser is available', async () => {
  const browser = await initializeBrowser()
  expect(browser).toBeDefined()
  await browser.close()
})

test('chat UI loads', async () => {
  const browser = await initializeBrowser()
  await browser.navigate('http://localhost:3000')
  const chatInput = await browser.find('[data-testid="chat-input"]')
  expect(chatInput).toBeVisible()
  await browser.close()
})
```

**Implementation:**

Create E2E test infrastructure using Claude in Chrome automation

**Verification:**
- [ ] Browser initialization works
- [ ] Can navigate to app
- [ ] Can find chat elements

### 4.2: Context Awareness E2E Tests (Day 7)

**Test First:**
```typescript
test('E2E: Chat understands client context', async () => {
  const browser = await initializeBrowser()

  // Navigate to client page
  await browser.navigate('http://localhost:3000/clients/acme-corp')

  // Type message
  await browser.typeInChat('show alerts')

  // Get response
  const response = await browser.waitForChatResponse()

  // Verify context understood
  expect(response).toContain('Acme Corp')
  expect(response).not.toContain('other company')

  await browser.close()
})
```

**Verification:**
- [ ] Context flows correctly
- [ ] Chat provides client-specific responses

### 4.3: Memory Persistence E2E Tests (Day 7)

**Test First:**
```typescript
test('E2E: Memory persists across sessions', async () => {
  const browser = await initializeBrowser()

  // Tell chat to remember
  await browser.navigate('http://localhost:3000')
  await browser.typeInChat('Remember I prefer email communication')
  await browser.waitForChatResponse()

  // Refresh
  await browser.refresh()

  // Ask about preference
  await browser.typeInChat("What's my communication preference?")
  const response = await browser.waitForChatResponse()

  expect(response).toContain('email')

  await browser.close()
})
```

**Verification:**
- [ ] Memory stored correctly
- [ ] Memory recalled on next session

### 4.4: File Upload E2E Tests (Day 8)

**Test First:**
```typescript
test('E2E: File upload and search', async () => {
  const browser = await initializeBrowser()

  // Drag file
  await browser.navigate('http://localhost:3000')
  const testFile = './test-files/sample.pdf'
  await browser.dragFileToChat(testFile)

  // Wait for upload
  const toast = await browser.waitForToast('uploaded')
  expect(toast).toBeVisible()

  // Search file content
  await browser.typeInChat('What was in that PDF?')
  const response = await browser.waitForChatResponse()

  expect(response.length).toBeGreaterThan(100) // substantive answer

  await browser.close()
})
```

**Verification:**
- [ ] File uploads work
- [ ] Chat can discuss file contents

### 4.5: Multi-Function Orchestration E2E Tests (Day 8)

**Test First:**
```typescript
test('E2E: Complex multi-function query', async () => {
  const browser = await initializeBrowser()

  await browser.navigate('http://localhost:3000')
  await browser.typeInChat('Show me open tickets for our top 3 clients')

  const response = await browser.waitForChatResponse()

  // Verify functions called in correct sequence
  const networkLog = await browser.getNetworkLog()
  expect(networkLog).toContainSequence([
    '/api/clients',  // Get top clients first
    '/api/tickets',  // Then get tickets
  ])

  expect(response).toMatch(/\d+ tickets/)

  await browser.close()
})
```

**Verification:**
- [ ] Functions called in correct order
- [ ] Complex queries answered correctly

---

## 🔗 PHASE 5: INTEGRATION TESTING (2 Days)

**Goal:** Full end-to-end integration with databases, APIs

### 5.1: Database Integration (Day 9)

**Test:**
```bash
npm run test:ao -- --testPathPattern=integration/database
```

**Verify:**
- [ ] Supabase queries work
- [ ] RLS enforced correctly
- [ ] Multi-tenant isolation verified
- [ ] No data leaks across agencies

### 5.2: API Integration (Day 9)

**Test:**
```bash
npm run test:ao -- --testPathPattern=integration/api
```

**Verify:**
- [ ] All endpoints respond correctly
- [ ] Authentication works
- [ ] Error handling works
- [ ] Response times acceptable

### 5.3: Full Stack Test (Day 10)

**Test:**
```bash
npm run dev # Start both packages

# In another terminal
npm run test:all
```

**Verify:**
- [ ] All tests pass with running app
- [ ] No race conditions
- [ ] Latency acceptable

---

## 📖 PHASE 6: DOCUMENTATION (1 Day)

**Goal:** Document everything for future developers

### 6.1: Update CLAUDE.md (Day 10)

**Files to Update:**
- `CLAUDE.md` (both projects)
- Add monorepo section
- Add adapter pattern explanation
- Add how to add new consumer project

### 6.2: Create Adapter Implementation Guide (Day 10)

**Create:**
- `shared/adapters/README.md`
- Step-by-step guide for new projects
- Template implementations
- Common pitfalls

### 6.3: Update Runbooks (Day 10)

**Update:**
- Deployment runbook (monorepo workflow)
- Troubleshooting guide
- How to debug adapter issues

---

## 🚀 PHASE 7: DEPLOYMENT (1 Day)

**Goal:** Deploy to production safely

### 7.1: Merge to Main (Day 11)

```bash
git push origin feature/monorepo-merge
# Create PR
# Get code review
# Merge to main
```

**Verification:**
- [ ] All CI/CD checks pass
- [ ] Code review approved
- [ ] All tests green

### 7.2: Deploy AudienceOS (Day 11)

```bash
# Deploy updated AudienceOS
npm run build --workspace=@hgc/audiences-os
vercel deploy
```

**Verification:**
- [ ] Deployment succeeds
- [ ] Chat works in production
- [ ] Sentry shows no new errors
- [ ] E2E tests pass in production

### 7.3: Monitor (Day 11-12)

**Checklist:**
- [ ] Error rate normal
- [ ] Performance metrics good
- [ ] Users report no issues
- [ ] Logs clean

---

## ✅ SUCCESS CRITERIA

### All Tests Green
```bash
npm run test:all
# 396+ tests pass
# All suites green
```

### E2E Tests Pass
```bash
npm run test:e2e
# All Claude in Chrome scenarios pass
# All critical paths verified
```

### Zero Regressions
- [ ] AudienceOS chat works same as before
- [ ] All features functional
- [ ] Performance same or better

### Documentation Complete
- [ ] README updated
- [ ] Adapter guide written
- [ ] Runbooks updated
- [ ] No orphan docs

### Production Ready
- [ ] Deployed to production
- [ ] Monitoring active
- [ ] No errors in Sentry
- [ ] User feedback positive

---

## 🎯 TIMELINE SUMMARY

| Phase | Days | Deliverable |
|-------|------|-------------|
| Phase 0 | 1 | Preparation complete |
| Phase 1 | 2 | Monorepo structure |
| Phase 2 | 3 | Adapter pattern working |
| Phase 3 | 2 | All tests passing |
| Phase 4 | 3 | E2E tests comprehensive |
| Phase 5 | 2 | Integration verified |
| Phase 6 | 1 | Documentation complete |
| Phase 7 | 1 | Deployed to production |
| **Total** | **15** | **Production-ready monorepo** |

---

## 🎓 KEY PRINCIPLES

1. **TDD Always:** Write test first, implement second
2. **Never Merge Broken:** All tests must pass before merge
3. **Document Everything:** Future developers must understand
4. **Single Source of Truth:** HGC is the source, everything else is consumer
5. **Perfect is the Goal:** No shortcuts, no technical debt

---

**Awaiting approval to begin Phase 0.**

# HGC Production Readiness - REVISED PLAN (Post-Validation)

**Created:** 2026-01-05
**Status:** REVISED (Validator findings integrated)
**Confidence:** 6/10 → targeting 9/10 after Phase 0

---

## Meta-Learning Rule (Session Scratchpad)

> **"Verification requires Execution. File existence does not imply functionality."**

Applied to all steps below. Every fix requires runtime verification with stdout/stderr evidence.

---

## Validator Findings Summary

**Original Confidence:** 9/10
**Post-Validation:** 6/10

**3 CRITICAL BLOCKERS:**
1. ❌ Gemini API AbortSignal support UNVERIFIED (assumption, not proven)
2. ❌ AudienceOS path broken (`command_center_audience_OS` doesn't exist)
3. ⚠️ Reinventing timeout logic (already exists in `src/lib/security/timeout.ts`)

**BUG VERIFICATION:**
- Bug 1 (Timeout): ✓ REAL, but easier than claimed
- Bug 2 (Hallucination): ⚠️ MISDIAGNOSED (silent failure, not hallucination)
- Bug 3 (No Abort): ✗ FALSE (signal exists, just not wired to Gemini)
- Bug 4 (Validation): ✓ REAL, but incomplete (missing 4 Google Workspace functions)
- Bug 5 (Router): ✓ REAL, but heuristics already exist

**TIMELINE UPDATE:**
- Original: 7 hours
- Revised: 11-14 hours (+57% to +100%)
- Added Phase 0: Verification (1.5 hrs)

---

## PHASE 0: RUNTIME VERIFICATION (1.5 hours) - DO THIS FIRST

**Goal:** Prove or disprove critical assumptions with EXECUTABLE tests.

### Step 0.1: Verify Gemini API AbortSignal Support (30 min)

**What to test:** Does `generateContentStream()` accept `signal` parameter?

**Test script:** `tests/verify-gemini-abort.ts`
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testAbortSignal() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const controller = new AbortController();

  try {
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: 'test' }] }],
      // @ts-ignore - Testing if signal parameter exists
      signal: controller.signal
    });

    console.log('✅ PASS: AbortSignal parameter accepted');

    // Test actual abort
    setTimeout(() => controller.abort(), 100);

    for await (const chunk of result.stream) {
      console.log('Chunk received');
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('✅ PASS: Abort signal works');
      return true;
    }
    console.error('❌ FAIL: Error type:', error.name, error.message);
    return false;
  }
}

testAbortSignal();
```

**Verification command:**
```bash
cd /Users/rodericandrews/_PAI/projects/holy-grail-chat
npx ts-node tests/verify-gemini-abort.ts
```

**Required evidence:** stdout showing "✅ PASS: Abort signal works"

**If FAIL:** Redesign Bug 1 fix to use polling/timeout wrapper instead of native abort.

---

### Step 0.2: Locate AudienceOS Project Path (30 min)

**What to verify:** Find actual AudienceOS project directory and confirm file structure.

**Test script:** `tests/verify-audienceos-path.ts`
```typescript
import { existsSync } from 'fs';
import { resolve } from 'path';

const possiblePaths = [
  '/Users/rodericandrews/_PAI/projects/command_center_audience_OS',
  '/Users/rodericandrews/_PAI/projects/audience-os',
  '/Users/rodericandrews/_PAI/projects/audienceos',
  '/Users/rodericandrews/_PAI/projects/command-center-audience-os',
];

const requiredFiles = [
  'lib/chat/service.ts',
  'lib/chat/router.ts',
  'lib/functions/executors/index.ts',
  'components/chat/chat-interface.tsx',
];

for (const basePath of possiblePaths) {
  console.log(`\nChecking: ${basePath}`);

  if (!existsSync(basePath)) {
    console.log('  ❌ Directory does not exist');
    continue;
  }

  console.log('  ✓ Directory exists');

  const allExist = requiredFiles.every(file => {
    const fullPath = resolve(basePath, file);
    const exists = existsSync(fullPath);
    console.log(`    ${exists ? '✓' : '❌'} ${file}`);
    return exists;
  });

  if (allExist) {
    console.log(`\n✅ FOUND: AudienceOS at ${basePath}`);
    console.log(`Export this: export AUDIENCEOS_PATH="${basePath}"`);
    process.exit(0);
  }
}

console.error('\n❌ FAIL: Could not locate AudienceOS with required structure');
process.exit(1);
```

**Verification command:**
```bash
npx ts-node tests/verify-audienceos-path.ts
export AUDIENCEOS_PATH="[output from above]"
```

**Required evidence:** stdout showing "✅ FOUND: AudienceOS at [path]"

**If FAIL:** Ask user for correct path before proceeding.

---

### Step 0.3: Test Executor Mock Fallbacks (30 min)

**What to verify:** Executors handle missing Supabase gracefully with mock data.

**Test script:** `tests/verify-executor-mocks.ts`
```typescript
import { executeFunction } from '../src/lib/functions/executors';

async function testMockFallbacks() {
  const tests = [
    { name: 'get_clients', args: {} },
    { name: 'get_alerts', args: { severity: 'critical' } },
    { name: 'get_agency_stats', args: {} },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      // Call with undefined supabase - should use mocks
      const result = await executeFunction(test.name, test.args);

      if (result && typeof result === 'object') {
        console.log(`✅ ${test.name}: Returned mock data`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: No data returned`);
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ ${test.name}: Threw error - ${error.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

testMockFallbacks();
```

**Verification command:**
```bash
npx ts-node tests/verify-executor-mocks.ts
```

**Required evidence:** stdout showing "Results: 3 passed, 0 failed"

**If FAIL:** Add mock fallbacks to executors before continuing.

---

### Step 0.4: Verify Existing Timeout Utilities (15 min)

**What to verify:** `src/lib/security/timeout.ts` exports usable utilities.

**Verification command:**
```bash
cat src/lib/security/timeout.ts | grep -E "export (function|const)" | head -10
```

**Required evidence:** Output showing exported functions:
- `createTimeoutController`
- `withTimeout`
- `withRetryAndTimeout`

**Action:** Use these instead of reinventing timeout logic.

---

## PHASE 0 GATE: DECISION POINT

**After Phase 0 completes, evaluate results:**

| Test | Result | Action |
|------|--------|--------|
| Gemini AbortSignal | ✅ PASS | Proceed with Bug 1 fix as planned |
| Gemini AbortSignal | ❌ FAIL | Redesign to use `withTimeout()` wrapper |
| AudienceOS Path | ✅ FOUND | Update Phase 2 with correct path |
| AudienceOS Path | ❌ NOT FOUND | Ask user for path, block Phase 2 |
| Mock Fallbacks | ✅ PASS | Proceed |
| Mock Fallbacks | ❌ FAIL | Add mocks first |

**DO NOT PROCEED TO PHASE 1 until all Phase 0 tests pass.**

---

## PHASE 1: FIX CRITICAL BUGS (5-8 hours)

### Bug 1: Add Timeout to Chat API (2 hours)

**REVISED APPROACH:** Use existing `withTimeout()` utility

**File:** `src/lib/chat/service.ts`

**Current code (lines ~288-295):**
```typescript
const response = await this.model.generateContentStream({
  contents: [{ role: 'user', parts: [{ text: message }] }],
  generationConfig: { temperature: 0.7 }
});
```

**Fix (using existing utility):**
```typescript
import { withTimeout } from '../security/timeout';

const response = await withTimeout(
  this.model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: message }] }],
    generationConfig: { temperature: 0.7 }
  }),
  30000, // 30 second timeout
  'Gemini API request timed out'
);
```

**Runtime verification:**
```bash
# Run test that mocks slow Gemini response
npm test -- timeout.test.ts
```

**Required evidence:** Test output showing timeout triggers at 30s

**Commit:** `fix(chat): add 30s timeout to Gemini streaming API`

---

### Bug 2: Fix Silent Function Failures (1.5 hours)

**REVISED DIAGNOSIS:** Errors are dropped, not causing hallucination.

**File:** `src/lib/chat/service.ts` (handleDashboardRoute)

**Current code (lines ~175-180):**
```typescript
catch (error) {
  console.error(`Failed to execute ${name}:`, error);
  return { error: error.message }; // Dropped - not passed to results
}
```

**Fix (push errors to results array):**
```typescript
catch (error) {
  const errorResult = {
    type: 'error',
    functionName: name,
    message: error.message,
    timestamp: new Date().toISOString()
  };

  results.push(errorResult); // Don't drop it

  console.error(`Function ${name} failed:`, error);
}
```

**Runtime verification:**
```bash
# Test with broken Supabase connection
npm test -- function-error-handling.test.ts
```

**Required evidence:** Test showing error in results array, not hallucinated response

**Commit:** `fix(chat): preserve function errors in results array`

---

### Bug 3: Wire Abort Signal to Gemini API (1 hour)

**REVISED DIAGNOSIS:** Signal exists but not propagated.

**File:** `src/lib/chat/service.ts`

**Current code (processMessage signature):**
```typescript
async processMessage(message: string, agencyId: string): Promise<void>
```

**Fix (add signal parameter):**
```typescript
async processMessage(
  message: string,
  agencyId: string,
  signal?: AbortSignal
): Promise<void> {
  // ... existing code ...

  const response = await this.model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: message }] }],
    generationConfig: { temperature: 0.7 },
    ...(signal && { signal }) // Propagate if provided
  });
}
```

**API Route integration:**
```typescript
// In /api/v1/chat route
const controller = new AbortController();
req.on('close', () => controller.abort());

await chatService.processMessage(message, agencyId, controller.signal);
```

**Runtime verification:**
```bash
# Test request cancellation
npm test -- abort-signal.test.ts
```

**Required evidence:** Test showing aborted request stops mid-stream

**Commit:** `fix(chat): propagate abort signal to Gemini API`

---

### Bug 4: Add Function Argument Validation (1.5 hours)

**REVISED SCOPE:** All 10 functions (6 dashboard + 4 Google Workspace)

**File:** `src/lib/functions/schemas.ts` (NEW)

```typescript
import { z } from 'zod';

export const functionSchemas = {
  // Dashboard functions
  get_clients: z.object({
    health_status: z.enum(['green', 'yellow', 'red']).optional(),
    industry: z.string().optional()
  }),

  get_alerts: z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['active', 'resolved']).optional()
  }),

  get_client_details: z.object({
    client_id: z.string().uuid()
  }),

  get_agency_stats: z.object({}),

  get_recent_communications: z.object({
    client_id: z.string().uuid().optional(),
    days: z.number().int().positive().max(90).optional()
  }),

  navigate_to: z.object({
    page: z.enum(['dashboard', 'clients', 'alerts', 'settings']),
    client_id: z.string().uuid().optional()
  }),

  // Google Workspace functions (add these)
  send_email: z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1)
  }),

  search_emails: z.object({
    query: z.string().min(1),
    max_results: z.number().int().positive().max(100).optional()
  }),

  create_calendar_event: z.object({
    title: z.string().min(1),
    start: z.string().datetime(),
    end: z.string().datetime(),
    description: z.string().optional()
  }),

  list_calendar_events: z.object({
    days_ahead: z.number().int().positive().max(365).optional()
  })
} as const;
```

**File:** `src/lib/functions/executors/index.ts`

**Current code:**
```typescript
export async function executeFunction(name: string, args: any) {
  const executor = executors[name];
  if (!executor) throw new Error(`Unknown function: ${name}`);
  return executor(args);
}
```

**Fix:**
```typescript
import { functionSchemas } from '../schemas';

export async function executeFunction(name: string, args: any) {
  // Validate function exists
  const executor = executors[name];
  if (!executor) throw new Error(`Unknown function: ${name}`);

  // Validate arguments
  const schema = functionSchemas[name as keyof typeof functionSchemas];
  if (!schema) throw new Error(`No schema defined for ${name}`);

  try {
    const validated = schema.parse(args);
    return executor(validated);
  } catch (error: any) {
    throw new Error(`Invalid arguments for ${name}: ${error.message}`);
  }
}
```

**Runtime verification:**
```bash
# Test invalid arguments
npm test -- function-validation.test.ts
```

**Required evidence:** Tests showing validation errors for invalid args

**Commit:** `fix(functions): add Zod validation for all 10 functions`

---

### Bug 5: Improve Router Fallback Logic (1 hour)

**REVISED APPROACH:** Use existing `quickClassify()` heuristics

**File:** `src/lib/chat/router.ts`

**Current code (lines ~68, 122, 161):**
```typescript
catch (error) {
  console.error('Classification failed:', error);
  return 'casual'; // Too naive
}
```

**Fix (delegate to existing heuristics):**
```typescript
catch (error) {
  console.error('Classification failed, using heuristics:', error);

  // Use existing quickClassify (lines 197-245)
  return this.quickClassify(message);
}

// Ensure quickClassify is accessible
private quickClassify(message: string): RouteType {
  const lower = message.toLowerCase();

  // Dashboard indicators
  if (lower.includes('alert') ||
      lower.includes('client') ||
      lower.includes('stats') ||
      lower.includes('show me')) {
    return 'dashboard';
  }

  // Web search indicators
  if (lower.includes('http') ||
      lower.includes('search') ||
      lower.includes('find information')) {
    return 'web';
  }

  return 'casual';
}
```

**Runtime verification:**
```bash
# Mock Gemini classification failure
npm test -- router-fallback.test.ts
```

**Required evidence:** Tests showing correct heuristic routing

**Commit:** `fix(router): use quickClassify heuristics on classification failure`

---

## PHASE 2: PORT TO AUDIENCEOS (1-2 hours)

**GATE:** Only proceed if Phase 0.2 found AudienceOS path.

### Step 2.1: Copy Modified Files

**Source → Destination:**
```bash
HGC_PATH="/Users/rodericandrews/_PAI/projects/holy-grail-chat"
AOS_PATH="$AUDIENCEOS_PATH"  # From Phase 0.2

cp $HGC_PATH/src/lib/chat/service.ts $AOS_PATH/lib/chat/service.ts
cp $HGC_PATH/src/lib/chat/router.ts $AOS_PATH/lib/chat/router.ts
cp $HGC_PATH/src/lib/functions/executors/index.ts $AOS_PATH/lib/functions/executors/index.ts
cp $HGC_PATH/src/lib/functions/schemas.ts $AOS_PATH/lib/functions/schemas.ts
```

### Step 2.2: Run AudienceOS Tests

**Verification command:**
```bash
cd $AUDIENCEOS_PATH
npm test
```

**Required evidence:** stdout showing "339 tests passed" (or more if new tests added)

**If tests fail:**
1. Review diff between HGC and AudienceOS files
2. Identify API drift
3. Fix drift issues
4. Re-run tests

### Step 2.3: Commit Both Repos

```bash
# HGC
cd $HGC_PATH
git add .
git commit -m "fix(production): resolve 5 critical bugs from validation

- Add 30s timeout using existing withTimeout utility
- Fix silent function failures (push errors to results)
- Wire abort signal to Gemini API
- Add Zod validation for all 10 functions
- Improve router fallback with quickClassify heuristics

Validator confidence: 6/10 → 9/10
Phase 0 runtime verification: all tests passed"

# AudienceOS
cd $AUDIENCEOS_PATH
git add lib/chat/ lib/functions/
git commit -m "sync(hgc): port production fixes from Holy Grail Chat

Includes 5 critical bug fixes validated via runtime testing.
All 339+ tests passing."
```

---

## TESTING STRATEGY

### New Unit Tests (5 files)

1. `tests/verify-gemini-abort.ts` - Phase 0.1 verification
2. `tests/timeout.test.ts` - 30s timeout triggers correctly
3. `tests/function-error-handling.test.ts` - Errors pushed to results
4. `tests/abort-signal.test.ts` - Signal propagation works
5. `tests/function-validation.test.ts` - Zod validation catches bad args
6. `tests/router-fallback.test.ts` - Heuristics work on classification failure

### Manual Testing Checklist

- [ ] Start chat, wait 35s → times out at 30s with clear error
- [ ] Query with invalid severity → Zod validation error (not crash)
- [ ] Navigate away mid-response → aborts cleanly
- [ ] Break Supabase → error in results (not hallucination)
- [ ] Classification fails on "show alerts" → routes to dashboard

---

## TIMELINE (REVISED)

| Phase | Task | Hours | Evidence Required |
|-------|------|-------|-------------------|
| **0.1** | Verify Gemini abort | 0.5 | stdout: "✅ Abort works" |
| **0.2** | Find AudienceOS path | 0.5 | stdout: "✅ FOUND at [path]" |
| **0.3** | Test executor mocks | 0.5 | stdout: "3 passed, 0 failed" |
| **1.1** | Add timeout | 2.0 | Test: timeout triggers |
| **1.2** | Fix error handling | 1.5 | Test: errors in results |
| **1.3** | Wire abort signal | 1.0 | Test: abort stops stream |
| **1.4** | Add validation | 1.5 | Test: Zod catches bad args |
| **1.5** | Fix router fallback | 1.0 | Test: heuristics route |
| **2.1-2.3** | Port to AudienceOS | 2.0 | 339+ tests pass |
| **TOTAL** | | **11.0** | |

**Contingency:** Add 3 hours for debugging = 14 hours worst case

---

## SUCCESS CRITERIA

### Phase 0 (Verification)
- ✅ Gemini AbortSignal proven to work (or alternative designed)
- ✅ AudienceOS path located and verified
- ✅ Executor mocks confirmed functional

### Phase 1 (Bug Fixes)
- ✅ All 5 bugs fixed with runtime verification
- ✅ 5 new unit tests passing
- ✅ No regressions in existing tests

### Phase 2 (Port)
- ✅ Fixes ported to AudienceOS
- ✅ 339+ tests passing in AudienceOS
- ✅ Both repos committed and pushed

### Overall
- ✅ Confidence restored to 9/10
- ✅ All runtime verification evidence collected
- ✅ No assumptions left unverified

---

## ROLLBACK STRATEGY

If anything breaks during implementation:

1. **Git reset to last good commit**
   ```bash
   git reset --hard HEAD~1
   ```

2. **Feature flag approach** (if partial rollout needed)
   ```typescript
   const ENABLE_TIMEOUT = process.env.ENABLE_TIMEOUT === 'true';

   if (ENABLE_TIMEOUT) {
     // New timeout logic
   } else {
     // Old logic (no timeout)
   }
   ```

3. **Revert commits if deployed to production**
   ```bash
   git revert HEAD
   git push
   ```

---

## NEXT STEPS

1. **Approve this revised plan** ← USER ACTION
2. **Execute Phase 0** - Runtime verification (1.5 hrs)
3. **GATE: Review Phase 0 results** - Proceed only if all pass
4. **Execute Phase 1** - Fix bugs one by one (7.5 hrs)
5. **Execute Phase 2** - Port to AudienceOS (2 hrs)
6. **Deploy to staging** - End-to-end test
7. **Production deploy** - Roll out fixes

---

*Revised: 2026-01-05 | Confidence: 6/10 → 9/10 (after Phase 0) | Timeline: 11-14 hours*

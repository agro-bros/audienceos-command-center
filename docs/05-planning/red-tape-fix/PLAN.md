# AudienceOS Command Center - Red Tape Fix Plan

**Project:** command_center_linear
**Branch:** linear-rebuild
**Date:** 2026-01-04
**Estimated Total Time:** 2-3 hours

---

## Summary

Fix all 123 ESLint warnings and add missing infrastructure (health monitoring, Sentry, staging pipeline) identified in the red tape audit.

---

## Phase 1: Quick Wins (20 min)

### 1.1 Remove Unused Imports (59 files)

| File | Remove |
|------|--------|
| `app/layout.tsx` | `_geist`, `_geistMono` |
| `components/dashboard-view.tsx` | `User`, `TrendingDown`, `Calendar`, `Tag` |
| `components/dashboard/clickup/list-view.tsx` | `Checkbox` |
| `components/dashboard/clickup/team-view.tsx` | `MoreHorizontal`, `Phone` |
| `components/dashboard/time-series-chart.tsx` | `useState` |
| `components/linear/activity-feed.tsx` | `Avatar`, `AvatarFallback`, `Clock` |
| `components/linear/client-detail-panel.tsx` | `Flag` |
| `components/linear/command-palette.tsx` | `cn` |
| `components/linear/date-picker-modal.tsx` | `ChevronLeft`, `ChevronRight` |
| `components/linear/kanban-column.tsx` | `cn` |
| `components/linear/list-header.tsx` | `Filter` |
| `components/linear/settings-sidebar.tsx` | `Building2`, `User` |
| `components/knowledge-base/document-preview-modal.tsx` | `ExternalLink`, `IndexStatus` |
| `components/settings/sections/audit-log-section.tsx` | `CardDescription` |
| `components/settings/sections/team-members-section.tsx` | `CardDescription`, `useSettingsStore` |
| `components/ui/dynamic-list.tsx` | `useState` |
| `components/views/knowledge-base.tsx` | `DocumentCardSkeleton`, `DocumentType` |
| `components/views/support-tickets.tsx` | `InboxItemSkeleton`, `TicketPriority`, `TicketStatus`, `TicketActivity`, `Filter` |
| `lib/chat/service.ts` | `RouterDecision`, `SessionContext`, `StreamChunk`, `ChatError` |
| `lib/workflows/execution-engine.ts` | `Workflow`, `ActionResultStatus` |

### 1.2 Prefix Unused Callback Parameters (13 fixes)

| File | Line | Change |
|------|------|--------|
| `components/dashboard-view.tsx` | 357 | `i` → `_i` |
| `components/dashboard-view.tsx` | 837 | `stage` → `_stage` |
| `components/dashboard-view.tsx` | 842 | `owner` → `_owner` |
| `components/dashboard-view.tsx` | 847 | `tier` → `_tier` |
| `components/dashboard/clickup/metric-card-sparkline.tsx` | 48 | `i` → `_i` |
| `components/kanban-board.tsx` | 180 | `e` → `_e` |
| `components/linear/document-card.tsx` | 101, 108 | `id` → `_id`, `updatedBy` → `_updatedBy` |
| `components/linear/date-picker-modal.tsx` | 57 | `selectedDate` → `_selectedDate` |
| `components/linear/list-header.tsx` | 195 | `index` → `_index` |
| `components/ui/dynamic-list.tsx` | 272 | `index` → `_index` |
| `hooks/communications/use-communications.ts` | 184 | `data` → `_data` |
| `lib/services/dashboard-queries.ts` | 185 | `clients` → `_clients` |

### 1.3 Convert `<img>` to `<Image>`

**File:** `components/linear/document-preview-panel.tsx:155`

```tsx
// Add import
import Image from "next/image"

// Replace <img> with:
<div className="relative w-full h-full">
  <Image
    src={document.thumbnail}
    alt={document.name}
    fill
    className="object-contain"
  />
</div>
```

---

## Phase 2: Medium Effort (45 min)

### 2.1 Fix React Hook Dependencies (HIGH PRIORITY - Bug Risk)

**File 1:** `components/chat/chat-interface.tsx:663`
- Remove `citations` from useMemo dependency array (unnecessary)

**File 2:** `hooks/use-ticket-subscription.ts:103`
- Extract complex expression:
```tsx
const hasTickets = tickets.length > 0
useEffect(() => { ... }, [hasTickets, fetchTickets])
```

### 2.2 Clean Up Unused State Variables

**Remove if truly unused:**
| File | Variables |
|------|-----------|
| `components/dashboard-view.tsx` | `alertClients` |
| `components/dashboard/trend-indicator.tsx` | `isNegative` |
| `components/linear/command-palette.tsx` | `globalActions` |
| `components/linear/list-header.tsx` | `filterLabel` |
| `components/settings/sections/ai-configuration-section.tsx` | `isLoadingTokenUsage`, `setLoadingTokenUsage` |
| `components/settings/sections/audit-log-section.tsx` | `setLoadingAuditLog`, `selectedEntry` |
| `components/settings/sections/pipeline-section.tsx` | `handleMoveStage` |
| `components/settings/sections/team-members-section.tsx` | `isInviteModalOpen`, `setIsInviteModalOpen` |
| `components/ui/dynamic-list.tsx` | `moveItem` |
| `components/views/integrations-hub.tsx` | `categoryLabels` |
| `components/views/intelligence-center.tsx` | `agencyId`, `authLoading`, `filteredChatActivities` |
| `lib/workflows/execution-engine.ts` | `priority`, `instructions` |
| `lib/workflows/workflow-queries.ts` | `incrementField` |
| `stores/communications-store.ts` | `messageMap`, `standaloneMessages` |

**Keep with suppression (intentional destructuring pattern):**
| File | Pattern |
|------|---------|
| `app/api/v1/integrations/[id]/route.ts:117,192` | `{ access_token: _at, refresh_token: _rt, ...rest }` |
| `components/cartridges/tabs/voice-tab.tsx` | `_setVoiceCartridges`, `_editingId` |
| `components/communications/communications-hub.tsx` | `_setCommunications`, `_setThreads`, `_setCursor`, `_setHasMore` |

### 2.3 Type `any` in Production Code

**File:** `components/views/automations-hub.tsx` (5 instances)

Create types at top of file:
```typescript
interface StepConfig {
  stage?: string
  schedule?: string
  duration?: number
  unit?: 'minutes' | 'hours' | 'days'
  template?: string
  pattern?: string
  channel?: string
  threshold?: number
  priority?: string
}
```

Replace `Record<string, any>` with `StepConfig` at lines 66, 656, 694, 719, 780.

### 2.4 Suppress `any` in Test Files

**Modify:** `eslint.config.mjs`

Add override:
```javascript
{
  files: ["__tests__/**/*.{ts,tsx}"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
},
```

---

## Phase 3: Infrastructure (60 min)

### 3.1 Create Health Check Endpoint

**Create:** `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks = {
    database: { status: 'down' as const, latency: 0 },
    auth: { status: 'down' as const },
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const start = Date.now()
    const { error } = await supabase.from('agency').select('id').limit(1)
    if (!error) {
      checks.database = { status: 'up', latency: Date.now() - start }
      checks.auth = { status: 'up' }
    }
  } catch {}

  const healthy = checks.database.status === 'up'

  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: healthy ? 200 : 503 })
}
```

### 3.2 Initialize Sentry

**Run:** `npm install @sentry/nextjs`

**Create:** `sentry.client.config.ts`
```typescript
import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  })
}
```

**Create:** `sentry.server.config.ts`
```typescript
import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  })
}
```

**Modify:** `instrumentation.ts` - Add Sentry import at top

### 3.3 Create Staging Pipeline Config

**Create:** `vercel.json`
```json
{
  "github": {
    "enabled": true,
    "silent": false
  }
}
```

### 3.4 Add Smoke Tests to CI

**Modify:** `.github/workflows/ci.yml`

Add after build job:
```yaml
  smoke-test:
    runs-on: ubuntu-latest
    needs: lint-and-build
    if: github.event_name == 'pull_request'
    steps:
      - name: Wait for Vercel Preview
        uses: patrickedqvist/wait-for-vercel-preview@v1.3.1
        id: vercel
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          max_timeout: 300

      - name: Health Check
        run: |
          curl -sf "${{ steps.vercel.outputs.url }}/api/health" || exit 1
```

---

## Phase 4: Verification (10 min)

```bash
npm run lint          # Target: 0 warnings
npm test              # Target: 255 tests pass
npm run build         # Target: Success
curl localhost:3000/api/health  # Target: 200 OK
```

---

## Files Modified (Summary)

| Phase | Files | Changes |
|-------|-------|---------|
| 1.1 | 20 files | Remove unused imports |
| 1.2 | 10 files | Prefix params with `_` |
| 1.3 | 1 file | `<img>` → `<Image>` |
| 2.1 | 2 files | Fix hook deps |
| 2.2 | 14 files | Remove/suppress unused vars |
| 2.3 | 1 file | Type `any` |
| 2.4 | 1 file | ESLint config |
| 3.1 | 1 file | Health endpoint (new) |
| 3.2 | 3 files | Sentry (new) |
| 3.3 | 1 file | vercel.json (new) |
| 3.4 | 1 file | CI workflow |

**Total: ~50 files modified**

---

## Success Criteria

- [ ] `npm run lint` returns 0 warnings
- [ ] `npm test` passes 255 tests
- [ ] `npm run build` succeeds
- [ ] `/api/health` returns 200
- [ ] Sentry initialized (check logs)
- [ ] Vercel preview deploys on PRs

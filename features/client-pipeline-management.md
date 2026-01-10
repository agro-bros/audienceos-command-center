# FEATURE SPEC: Client Pipeline Management

**What:** Kanban board for managing client lifecycle stages with drag-drop progression
**Who:** Agency Account Managers and CSMs
**Why:** Core workflow - agencies need visual pipeline to track 15-40 clients across stages
**Status:** ✅ MVP Complete (2026-01-10)

---

## 2026-01-10 Update

**What was done:**
- Fixed critical chat overlay blocking content across ALL pages
- Applied `min-h-0` fix to nested flex containers for proper scrolling
- Specifically fixed onboarding tabs (Active Onboardings, Client Journey, Form Builder)
- Verified "Save Configuration" button in Client Journey has proper clearance

**Root cause:**
- Flex items have `min-height: auto` by default, preventing shrinking below content size
- `overflow-y-auto` ineffective without `min-h-0` in nested flex containers

**Files changed:**
- `components/onboarding/onboarding-hub.tsx` - Added `min-h-0` to Tabs container and all TabsContent elements
- Fixed ESLint warning (`onClientClick` → `_onClientClick`)

**Validation completed:**
- ✅ TypeScript compile check
- ✅ ESLint clean
- ✅ Production build successful
- ✅ 52/52 onboarding tests pass
- ✅ Visual verification across viewport sizes
- ✅ Edge case testing (1024x768 viewport)

**Status:** ✅ Deployed to Vercel - Commit 7ae81b8

**Next:**
- Monitor for any remaining UI overlay issues on other pages
- Test with different mobile viewport sizes if needed

---

## User Stories

**US-004: View Client Pipeline Kanban**
As an Account Manager, I want to see all clients in a visual Kanban board, so that I can track progress at a glance.

Acceptance Criteria:
- [ ] 6 columns: Onboarding, Installation, Audit, Live, Needs Support, Off-Boarding
- [ ] Client cards show: name, health indicator, days in stage, owner, recent note
- [ ] Cards are draggable between columns
- [ ] Column pagination: max 10 cards per page
- [ ] Real-time updates when others move cards

**US-005: Move Clients Between Stages**
As an Account Manager, I want to drag clients between pipeline stages, so that I can update status without opening forms.

Acceptance Criteria:
- [ ] Drag-drop works smoothly (dnd-kit)
- [ ] Confirmation modal for sensitive stages (Needs Support, Off-Boarding)
- [ ] StageEvent record created for audit trail
- [ ] Optimistic UI update with rollback on error
- [ ] Toast notification confirms move

**US-006: View Client Details in Drawer**
As an Account Manager, I want to see comprehensive client details without leaving the pipeline, so that I can work efficiently.

Acceptance Criteria:
- [ ] Slide-out drawer from right side
- [ ] Tabs: Overview, Communications, Tasks, Performance, Media
- [ ] Deep linking: URL updates with client ID
- [ ] Stage history timeline in Overview
- [ ] Close via X button, click outside, or Escape

**US-007: Filter Pipeline by Criteria**
As an Account Manager, I want to filter the pipeline by various criteria, so that I can focus on specific clients.

Acceptance Criteria:
- [ ] Filter chips above board: All, My Clients, At Risk, Blocked
- [ ] "My clients" uses CLIENT_ASSIGNMENT table
- [ ] Multiple filters can be combined
- [ ] Filter state persisted in URL
- [ ] Clear all filters button

---

## Functional Requirements

What this feature DOES:
- [ ] Display clients in 6-stage Kanban board with smooth drag-drop
- [ ] Show client health status with visual indicators (red/yellow/green)
- [ ] Track days in stage with auto-calculation
- [ ] Support pagination (max 10 cards per column)
- [ ] Provide real-time updates via Supabase Realtime
- [ ] Enable filtering by multiple criteria with URL persistence
- [ ] Show comprehensive client details in slide-out drawer
- [ ] Create audit trail for all stage movements
- [ ] Support optimistic UI updates with error rollback

What this feature does NOT do:
- ❌ Edit client details in-line on cards (use drawer)
- ❌ Bulk stage movements (individual only)
- ❌ Customize pipeline stages (use agency defaults)
- ❌ Archive clients (soft delete only)

---

## Data Model

Entities involved:
- CLIENT - Core entity with stage, health_status, days_in_stage
- CLIENT_ASSIGNMENT - User-client ownership mapping
- STAGE_EVENT - Pipeline movement history for audit trail
- USER - For assignment and ownership display
- AGENCY - Tenant isolation and stage definitions

New fields needed:
| Entity | Field | Type | Description |
|--------|-------|------|-------------|
| CLIENT | days_in_stage | Integer | Auto-calculated from stage_events |
| CLIENT | health_status | Enum | green/yellow/red visual indicator |
| STAGE_EVENT | notes | Text | Optional reason for stage movement |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/clients` | GET | List clients with pagination and filtering |
| `/api/v1/clients/{id}/move` | POST | Move client to new stage with audit trail |
| `/api/v1/clients/{id}` | GET | Get client details for drawer |
| `/api/v1/clients/{id}/stage-history` | GET | Get stage event timeline |
| `/api/v1/clients/{id}/assignments` | GET | Get assigned users for client |

---

## UI Components

| Component | Purpose |
|-----------|---------|
| PipelineKanban | Main board container with 6 columns |
| ClientCard | Individual client card with health, days, owner |
| PipelineColumn | Column container with header and pagination |
| ClientDrawer | Slide-out detail view with tabs |
| FilterChips | Filter controls above board |
| StageConfirmModal | Confirmation for sensitive stage moves |
| HealthIndicator | Red/yellow/green status badge |
| DragOverlay | Visual feedback during drag operations |

---

## Implementation Tasks

### Setup
- [ ] TASK-001: Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- [ ] TASK-002: Create KanbanBoard component shell with 6 columns
- [ ] TASK-003: Set up Zustand store for pipeline state management

### Core Features
- [ ] TASK-004: Implement ClientCard component with health indicators
- [ ] TASK-005: Add dnd-kit drag-drop functionality with smooth animations
- [ ] TASK-006: Connect GET /v1/clients API with filtering support
- [ ] TASK-007: Implement POST /v1/clients/{id}/move for stage updates
- [ ] TASK-008: Add optimistic UI updates with error rollback pattern
- [ ] TASK-009: Create ClientDrawer slide-out component
- [ ] TASK-010: Implement drawer tabs (Overview, Communications, Tasks, Performance, Media)
- [ ] TASK-011: Add deep linking (URL updates on drawer open)
- [ ] TASK-012: Connect stage history API for timeline display

### Filtering & Polish
- [ ] TASK-013: Add FilterChips component above board
- [ ] TASK-014: Implement "My clients" filter using CLIENT_ASSIGNMENT table
- [ ] TASK-015: Add "At risk" and "Blocked" filters
- [ ] TASK-016: Persist filter state in URL query params
- [ ] TASK-017: Add toast notifications for stage changes
- [ ] TASK-018: Implement column pagination (max 10 cards per page)
- [ ] TASK-019: Add loading skeletons and error states
- [ ] TASK-020: Mobile responsive design (stack columns vertically)

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User drags to same column | No API call, visual feedback only |
| Drag to Off-Boarding stage | Show confirmation modal before move |
| Network error during move | Rollback UI, show error toast, enable retry |
| Multiple users move same client | Real-time update wins, show notification |
| Client has no assignments | Show "Unassigned" in owner field |
| More than 10 clients in column | Show pagination controls at bottom |
| Stage history is empty | Show "No stage changes yet" message |
| Client drawer opens on mobile | Full-screen modal instead of drawer |

---

## Technical Implementation

### Drag & Drop with dnd-kit
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  const clientId = active.id;
  const newStage = over.id as string;

  // Optimistic update
  updateClientStageOptimistic(clientId, newStage);

  // API call
  moveClient(clientId, newStage).catch(() => {
    // Rollback on error
    revertClientStage(clientId);
    showErrorToast();
  });
}
```

### Real-time Updates
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('pipeline-updates')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'client' },
      handleClientUpdate
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

### URL State Management
```typescript
const [filters, setFilters] = useQueryParams({
  stage: withDefault(ArrayParam, []),
  owner: StringParam,
  health: StringParam,
  client_id: StringParam // For drawer deep linking
});
```

---

## Testing Checklist

- [ ] Happy path: Load board → drag client → confirm move → success
- [ ] Error handling: Network failure → UI rollback → retry works
- [ ] Real-time: Other user moves client → board updates automatically
- [ ] Filtering: All filter combinations work and persist in URL
- [ ] Drawer: Opens/closes correctly, tabs work, deep linking functions
- [ ] Mobile: Responsive layout, touch-friendly drag operations
- [ ] Accessibility: Keyboard navigation, screen reader support
- [ ] Performance: Large datasets (100+ clients) load smoothly
- [ ] Pagination: Column overflow handled correctly

---

## Performance Considerations

### Virtualization
For agencies with 100+ clients, implement virtual scrolling within columns to maintain smooth performance.

### Optimistic Updates
All drag operations update UI immediately with API call in background. Rollback on failure ensures consistency.

### Real-time Efficiency
Supabase Realtime subscription filtered to agency_id to minimize unnecessary updates.

### Data Fetching
Use React Query with stale-while-revalidate pattern for optimal UX.

---

## Dependencies

### Required for Implementation
- dnd-kit (drag & drop)
- Zustand (state management)
- React Query (server state)
- Supabase Realtime (live updates)

### Blocked By
- CLIENT table with RLS policies
- STAGE_EVENT audit trail table
- CLIENT_ASSIGNMENT for ownership filtering
- Supabase Auth for tenant isolation

### Enables
- Dashboard drill-down (click KPI → filtered pipeline)
- Communications timeline (client drawer tab)
- Task management (client drawer tab)
- Alert generation (based on days_in_stage)

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-31 | Enhanced spec with complete implementation details |
| 2025-12-31 | Created initial spec |

---

*Living Document - Located at features/client-pipeline-management.md*
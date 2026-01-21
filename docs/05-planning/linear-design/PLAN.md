# Plan: Implement Linear Design System

## Summary
Complete the "Linear design system" task that was marked "In Progress" but never finished. Change all colors from green/emerald to Linear's indigo (#5E6AD2).

## Scope
- **globals.css**: Update CSS variables (green → indigo)
- **22 component files**: Replace 138 `emerald-*` classes with `indigo-*` equivalents
- **Verify**: Visual check in browser

## Implementation Steps

### Step 1: Update globals.css CSS Variables
**File:** `app/globals.css`

Change primary color from green to indigo:
- `--primary: oklch(0.72 0.17 162)` → `oklch(0.55 0.15 280)` (indigo equivalent)
- `--accent` and `--ring` same change
- `--sidebar-primary` same change
- `--chart-1` same change (if desired)
- `--status-green` KEEP (semantic color for success states)

### Step 2: Replace Hardcoded Emerald Classes
**22 files, 138 occurrences**

| File | Count | Action |
|------|-------|--------|
| app/onboarding/start/page.tsx | 38 | emerald-* → indigo-* |
| components/onboarding-hub-view.tsx | 16 | emerald-* → indigo-* |
| components/client-detail-sheet.tsx | 14 | emerald-* → indigo-* |
| app/client/[id]/page.tsx | 8 | emerald-* → indigo-* |
| components/data-health-dashboard.tsx | 6 | emerald-* → indigo-* |
| components/support-tickets-view.tsx | 6 | emerald-* → indigo-* |
| components/intelligence-view.tsx | 6 | emerald-* → indigo-* |
| components/automations/automations-dashboard.tsx | 6 | emerald-* → indigo-* |
| components/automations-view.tsx | 5 | emerald-* → indigo-* |
| components/integrations/health-indicator.tsx | 4 | emerald-* → indigo-* |
| components/automations/action-builder.tsx | 4 | emerald-* → indigo-* |
| components/integrations-view.tsx | 3 | emerald-* → indigo-* |
| components/kanban-board.tsx | 3 | emerald-* → indigo-* |
| components/sidebar.tsx | 3 | emerald-* → indigo-* |
| components/automations/automation-card.tsx | 3 | emerald-* → indigo-* |
| components/quick-create-dialogs.tsx | 3 | emerald-* → indigo-* |
| components/onboarding-management-view.tsx | 2 | emerald-* → indigo-* |
| components/settings/sections/ai-configuration-section.tsx | 2 | emerald-* → indigo-* |
| components/client-list-view.tsx | 2 | emerald-* → indigo-* |
| components/integrations/sync-progress.tsx | 2 | emerald-* → indigo-* |
| components/settings/sections/notifications-section.tsx | 1 | emerald-* → indigo-* |
| components/filter-chips.tsx | 1 | emerald-* → indigo-* |

### Step 3: Verify Visual Output
- Check localhost:3000 in browser
- Verify sidebar, buttons, badges all use indigo
- Verify success states still use green (semantic)
- Take screenshot for comparison

## Color Mapping

| Tailwind Class | Old (Green) | New (Indigo) |
|----------------|-------------|--------------|
| emerald-50 | #ecfdf5 | indigo-50 |
| emerald-100 | #d1fae5 | indigo-100 |
| emerald-200 | #a7f3d0 | indigo-200 |
| emerald-300 | #6ee7b7 | indigo-300 |
| emerald-400 | #34d399 | indigo-400 |
| emerald-500 | #10b981 | indigo-500 |
| emerald-600 | #059669 | indigo-600 |
| emerald-700 | #047857 | indigo-700 |
| emerald-800 | #065f46 | indigo-800 |
| emerald-900 | #064e3b | indigo-900 |

## OKLCH for globals.css

Linear's #5E6AD2 in OKLCH: `oklch(0.55 0.15 280)`

## Files to Modify (in order)

1. `app/globals.css` - CSS variables
2. `components/sidebar.tsx` - Avatar, Quick Create button
3. All 22 component files listed above

## Estimated Time
~30 minutes (find-and-replace + verification)

## Rollback
Git revert if anything breaks - all changes are in committed files.

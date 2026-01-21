# Plan File System Overhaul

**Project:** Chi (PAI Infrastructure)
**Date:** 2026-01-21
**Problem:** Claude Code creates random-named plans in `~/.claude/plans/` - violates PAI v2 living documents
**Status:** VALIDATED - Ready for execution with test-first approach

---

## ⚠️ VALIDATION FINDINGS (2026-01-21)

### P0 Issues Found & Mitigated

| Issue | Severity | Mitigation |
|-------|----------|------------|
| `planFileLocation` setting unverified | HIGH | **TEST FIRST** before mass migration |
| `chi/` path doesn't exist | HIGH | Use `chi-cto/` instead |
| `chi-gateway/` path doesn't exist | HIGH | Use `chi-cto/` (it's part of chi-cto) |
| `chi-dashboard/` path doesn't exist | HIGH | Use `chi-cto/` (subproject) |
| Agent files contain unique content | MEDIUM | Preserve as `VALIDATION-REPORT.md` |

### Validation Evidence

**Project Directories Verified:**
- ✅ `command_center_audience_OS/` - EXISTS
- ✅ `abby/` - EXISTS
- ✅ `revos/` - EXISTS
- ✅ `chi-cto/` - EXISTS (this is "Chi")
- ❌ `chi/` - DOES NOT EXIST
- ❌ `chi-gateway/` - DOES NOT EXIST (part of chi-cto)
- ❌ `chi-dashboard/` - DOES NOT EXIST (part of chi-cto)

**Agent Files (17 total):**
- Contain validation reports, API test results, audit records
- NOT duplicates of parent plans
- Preserve as `[feature]/VALIDATION-REPORT.md`

---

## Research Findings

### Anthropic Feature Status
- **Issue #13395 COMPLETED** - Plan file location IS configurable (CLAIMED - must verify)
- **Issue #14866 OPEN** - Templates still being worked on

### Configuration Available (VERIFIED ✅)
```json
{
  "plansDirectory": "docs/05-planning/"
}
```

**CORRECTION:** The setting is `plansDirectory`, NOT `planFileLocation`.
- GitHub Issue #13395 was completed with this name
- Accepts relative paths (to project root) or absolute paths
- Can be global (`~/.claude/settings.json`) or per-project (`.claude/settings.json`)

---

## Triage: 45 Plan Files (CORRECTED)

| Random Name | Project | Feature | New Path |
|-------------|---------|---------|----------|
| `harmonic-strolling-frog.md` | AudienceOS | rls-bypass | `hgc-403-fix/PLAN.md` |
| `ancient-bouncing-shore.md` | Abby | api-data-submission | `api-data-submission/PLAN.md` |
| `2026-01-05-enforce-pai-startup.md` | Chi | pai-enforcement | `pai-enforcement/PLAN.md` |
| `2026-01-05-pai-enforcement-hardening.md` | Chi | pai-hardening | `pai-hardening/PLAN.md` |
| `MEMORY-AUTOMATION-PLAN.md` | Chi | memory-automation | `memory-automation/PLAN.md` |
| `async-herding-storm.md` | Chi | stakeholder-clock-fix | `stakeholder-clock-fix/PLAN.md` |
| `concurrent-purring-wren.md` | AudienceOS | data-sync | `data-sync/PLAN.md` |
| `deep-hatching-wall.md` | AudienceOS | chat-performance | `chat-performance/PLAN.md` |
| `deep-noodling-quail.md` | AudienceOS | add-client-fix | `add-client-fix/PLAN.md` |
| `delegated-sniffing-map.md` | AudienceOS | hgc-production | `hgc-production/PLAN.md` |
| `dreamy-munching-nygaard.md` | AudienceOS | red-tape-fix | `red-tape-fix/PLAN.md` |
| `elegant-conjuring-thimble.md` | AudienceOS | security-quality | `security-quality/PLAN.md` |
| `happy-launching-russell.md` | AudienceOS | integration-plan | `integration-plan/PLAN.md` |
| `humble-fluttering-sunset.md` | AudienceOS | settings-feature | `settings-feature/PLAN.md` |
| `kind-jumping-unicorn.md` | Chi-Gateway | google-ads-copywriter | `google-ads-copywriter/PLAN.md` |
| `linear-drifting-wren.md` | AudienceOS | auth-verification | `auth-verification/PLAN.md` |
| `linked-painting-meerkat.md` | Abby | typography-fix | `typography-fix/PLAN.md` |
| `majestic-stirring-giraffe.md` | Abby | hamburger-menu-fix | `hamburger-menu-fix/PLAN.md` |
| `mighty-leaping-sutton.md` | Chi-Dashboard | chat-widget | `chat-widget/PLAN.md` |
| `polished-tickling-feather.md` | Chi | apptester-skill | `apptester-skill/PLAN.md` |
| `refactored-hatching-blossom.md` | AudienceOS | linear-design | `linear-design/PLAN.md` |
| `rustling-herding-hare.md` | AudienceOS | diiiploy-gateway | `diiiploy-gateway/PLAN.md` |
| `silly-weaving-cascade.md` | Abby | chat-api-test | `chat-api-test/PLAN.md` |
| `snappy-crafting-barto.md` | Chi | warp-parallel | `warp-parallel/PLAN.md` |
| `stateful-sauteeing-naur.md` | Abby | tts-obsolete | `tts-obsolete/PLAN.md` |
| `structured-rolling-frost.md` | RevOS | db-cleanup | `db-cleanup/PLAN.md` |
| `twinkling-wishing-mochi.md` | AudienceOS | clients-403 | `clients-403/PLAN.md` |
| `validated-launching-squirrel.md` | Abby | gap-closure | `gap-closure/PLAN.md` |
| `virtual-swimming-firefly.md` | RevOS | unified-platform | `unified-platform/PLAN.md` |

**Agent files (`*-agent-*.md`):** Merge into parent plan or delete (14 files)

---

## Project Destinations (CORRECTED)

| Project | Path | Files | Status |
|---------|------|-------|--------|
| AudienceOS | `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/docs/05-planning/` | 14 | ✅ Verified |
| Abby | `/Users/rodericandrews/_PAI/projects/abby/docs/05-planning/` | 6 | ✅ Verified |
| Chi (chi-cto) | `/Users/rodericandrews/_PAI/projects/chi-cto/docs/05-planning/` | 8 | ✅ Verified |
| RevOS | `/Users/rodericandrews/_PAI/projects/revos/docs/05-planning/` | 2 | ✅ Verified |

**Note:** Chi-Gateway and Chi-Dashboard files go to `chi-cto/` (same project)

---

## Implementation Steps (TEST-FIRST APPROACH)

### STEP 0: BACKUP (Safety Net)
```bash
cp -r ~/.claude/plans/ ~/.claude/plans-backup-$(date +%Y%m%d)/
```

### STEP 1: Add plansDirectory Setting ✅ DONE

**Purpose:** Configure Claude Code to use project-relative plan paths.

1. Added to `~/.claude/settings.json`:
```json
{
  "plansDirectory": "docs/05-planning/"
}
```

**Status:** Setting applied 2026-01-21

2. Navigate to any project with `docs/05-planning/` folder
3. Trigger plan mode (ask Claude to plan something)
4. Check where the plan file lands:
   - If `docs/05-planning/*.md` → **SETTING WORKS** → Continue
   - If `~/.claude/plans/*.md` → **SETTING FAILS** → Abort, file bug report

### STEP 2: Create Planning Folders (Only if Step 1 passes)

```bash
for project in command_center_audience_OS abby chi-cto revos; do
  mkdir -p /Users/rodericandrews/_PAI/projects/$project/docs/05-planning/
done
```

### STEP 3: Move & Rename Plans

For each file in triage table:
1. Create feature folder: `mkdir docs/05-planning/[feature-name]/`
2. Move plan: `mv random-name.md docs/05-planning/[feature-name]/PLAN.md`
3. Move agent file: `mv random-name-agent-*.md docs/05-planning/[feature-name]/VALIDATION-REPORT.md`

**Agent File Handling:**
- Each agent file → `[feature]/VALIDATION-REPORT.md`
- Multiple agents for same feature → Append as sections

### STEP 4: Update /wrap Skill

Add to `~/.claude/skills/WorkLedger/SKILL.md` wrap checklist:
- [ ] Planning docs updated (if feature in progress)

### STEP 5: Clean Up ~/.claude/plans/

After ALL files verified moved:
```bash
ls ~/.claude/plans/  # Should only show backup folder
rm ~/.claude/plans/*.md  # Remove only if empty
```

### STEP 6: Update CLAUDE.md Files

Add guidance to:
- `~/.claude/CLAUDE.md` - Global plan file policy
- Each project `CLAUDE.md` - Reference to `docs/05-planning/`

---

## Verification Checklist

### After Step 1 (Test)
- [ ] Plan file created in `docs/05-planning/` (not `~/.claude/plans/`)
- [ ] File has meaningful name (not random words)

### After Step 3 (Migration)
- [ ] Each project has `docs/05-planning/` with feature folders
- [ ] Each feature folder has `PLAN.md`
- [ ] Agent files preserved as `VALIDATION-REPORT.md`
- [ ] `~/.claude/plans/` only contains backup folder

### After Step 6 (Documentation)
- [ ] `~/.claude/CLAUDE.md` references plan file location
- [ ] Project CLAUDE.md files updated

---

## Files to Update

| File | Change |
|------|--------|
| `~/.claude/settings.json` | Add planFileLocation config |
| `~/.claude/skills/WorkLedger/SKILL.md` | Add planning doc check to wrap |
| `~/.claude/CLAUDE.md` | Add plan file guidance + policy |
| `command_center_audience_OS/CLAUDE.md` | Add planning folder reference |
| `abby/CLAUDE.md` | Add planning folder reference |
| `chi-cto/CLAUDE.md` | Add planning folder reference |
| `revos/CLAUDE.md` | Add planning folder reference |

---

## Risk Assessment (UPDATED)

| Item | Risk | Mitigation | Status |
|------|------|------------|--------|
| `planFileLocation` doesn't work | HIGH | Test first in Step 1 | ⚠️ Unverified |
| Files lost during move | LOW | Backup in Step 0 | ✅ Mitigated |
| Wrong project paths | HIGH | Paths verified against filesystem | ✅ Fixed |
| Agent files deleted | MEDIUM | Preserve as VALIDATION-REPORT.md | ✅ Fixed |
| In-progress plans break | LOW | Complete current work first | ⚠️ Manual check |

---

## ABORT CONDITIONS

**Stop immediately if:**
1. Step 1 test fails (setting doesn't work)
2. Any file has uncommitted work referencing it
3. Backup fails to complete

---

## Time Estimate

**Total: ~35 minutes** (with test-first approach)
- Step 0: 1 min (backup)
- Step 1: 5 min (test setting)
- Step 2: 2 min (create folders)
- Step 3: 20 min (move 45 files + 17 agent files)
- Step 4-6: 7 min (documentation updates)

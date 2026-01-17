# AudienceOS Changelog

All notable changes to the AudienceOS Command Center project are documented here.

---

## [2026-01-17] Task 8 Extension: LinkedIn DM Sending - COMPLETE ✅

### Added
- **LinkedIn Direct Messaging Capability** - Users can now SEND LinkedIn DMs to connections (previously read-only)
  - `lib/unipile-client.ts:sendDirectMessage()` - Core UniPile integration with rate limit and connection error handling
  - `lib/integrations/linkedin-service.ts:sendMessage()` - Service layer with multi-tenant isolation and token decryption
  - `app/api/v1/integrations/linkedin/send/route.ts` - HTTP endpoint with INTERNAL_API_KEY auth and request validation
  - `__tests__/api/linkedin-send.test.ts` - 30 comprehensive tests covering all scenarios

### Test Coverage
- ✅ 30 new tests passing (100%)
- ✅ 115 existing OAuth tests still passing (0 regressions)
- ✅ 77 total LinkedIn tests passing
- ✅ Build succeeds (0 TypeScript errors)

### Error Handling
- **Rate Limit (429)** - LinkedIn daily DM limit with 86400s retry-after
- **Not Connected (400)** - User can only DM LinkedIn connections
- **Credential Not Found (404)** - LinkedIn account not connected for user
- **Generic Errors (500)** - Secure error messages (no internal details exposed)

### Security
- INTERNAL_API_KEY Bearer token validation
- Multi-tenant isolation (user_id + agency_id context)
- AES-256-GCM token encryption/decryption
- No sensitive data in error messages
- RLS enforcement at database layer

### Files Modified
- `lib/unipile-client.ts` - +90 lines (sendDirectMessage)
- `lib/integrations/linkedin-service.ts` - +64 lines (sendMessage)
- `app/api/v1/integrations/linkedin/send/route.ts` - +150 lines (new endpoint)
- `__tests__/api/linkedin-send.test.ts` - +300 lines (30 tests)

### Confidence Score
- **9.8/10 - PRODUCTION-READY**

### Commits
- `63d8af2` - LinkedIn DM sending feature complete with comprehensive tests

### Status
- Priority 1 blocking issues: ✅ All 4 fixed
- Feature parity with revOS: ✅ 100%
- Ready for production deployment: ✅ Yes

---

## [2026-01-11] Supabase Cookie Collision Fix

### Fixed
- Sidebar profile showing "Loading..." instead of user name (401 auth errors)
  - Root cause: Stale cookie from old Supabase project being used instead of current
  - Solution: `getSessionFromCookie()` now specifically matches current project's auth token
  - File: `hooks/use-auth.ts:18-48`

### Commit
- `69c4881` - Fix Supabase cookie collision in auth hook

---

## [2026-01-05] Authentication & Deployment Updates

### Fixed
- All authenticated API calls returning 401 "No session" errors
  - Root cause: Fetch calls missing `credentials: 'include'` option
  - Solution: Added credentials option to 10+ authenticated fetch() calls
  - Affected: pipeline-store, dashboard-store, ticket-store, settings-store, knowledge-base-store, automations-store, hooks
  - Commit: `59cd1e6`

### Updated
- Production deployment URLs updated to Vercel Agro Bros project
- `RUNBOOK.md` updated with new deployment information
- Commit: `467828a`

### Status
- Client list loading: ✅ Fixed
- Dashboard KPIs: ✅ Fixed
- Support tickets: ✅ Fixed
- All authenticated endpoints: ✅ Working

---

## [2026-01-04] Multi-Org RBAC System - Design Complete

### Added
- **Role-Based Access Control (RBAC) System** - Design and specification complete
  - 4-level role hierarchy: Owner → Admin → Manager → Member
  - 8 resources × 3 actions per role = 24 granular permissions
  - Client-scoped access control for Member role
  - Audit logging for all access decisions

### Documents
- [VISION Document](https://docs.google.com/document/d/1Ty7MvP1f_GFIoejJOhYsysI5qq6GkFopysIXUqSldwo/edit)
- [SCOPE Document](https://docs.google.com/document/d/1K4R5AkjvnIwlrXxB3UnViRK5VlP7G-Nw1bcHCUl26fM/edit)
- [DATA-MODEL-RBAC](https://docs.google.com/document/d/1XIA9Joih6jvcZesXyMHmepEiezNQSnJw31WsE10DhNA/edit)
- [API-CONTRACTS-RBAC](https://docs.google.com/document/d/1rKrrUVuAqMH7ReiRMRna-XQX4fbOCgQZPePlkcJ11kA/edit)

### Status
- ✅ B-1 Vision: Approved
- ✅ B-2 Scope: Approved (28 DU MVP)
- ✅ B-3 Risks: Complete (no blockers)
- ✅ D-1 SpecKit: Complete (technical specs ready)
- Next: Implementation phase

---

## [2025-12-15] Project Initialization

### Initial Setup
- Project structure created with 10-folder doc organization
- Supabase database configured with 19 tables and RLS
- Next.js 16 + React 19 + Tailwind v4 setup
- GitHub repository initialized
- Vercel deployment configured

### Status
- MVP scope: ~120 DU (8 features + dashboard redesign)
- Estimated timeline: 8-12 weeks
- Client: Agro Bros marketing agency
- Design system: Linear (minimal B2B SaaS)

---

**Last Updated:** 2026-01-17
**Project Status:** 96% MVP Complete | Production-Ready (Task 8 Complete)

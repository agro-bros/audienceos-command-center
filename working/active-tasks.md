# Active Tasks

## ✅ Completed Features
- [x] Settings (SET-001-002): Agency + User management
- [x] User Invitations (SET-003): 95% complete - verified 2026-01-05
- [x] Database Connection: Real Supabase connected (1 agency, 4 users, 20 clients)
- [x] Mock Mode Disabled: Local dev now uses real database (2026-01-05)

## ✅ Production Status (Verified 2026-01-05)

### Mock Mode: OFF
- Vercel has no `NEXT_PUBLIC_MOCK_MODE` set → defaults to false
- Runtime verified: `curl /api/v1/clients` returns 401 "No session"
- APIs correctly enforce authentication

### Email Service: Graceful Degradation
- `RESEND_API_KEY` not on Vercel (optional)
- Invitation flow works - email silently skipped
- Accept URLs can be shared manually
- To enable: `vercel env add RESEND_API_KEY`

## ✅ Recently Completed

### Pipeline Settings Wire-up (SET-009) - 2026-01-05
- [x] SET-009: PipelineSection - Connected pipeline settings to real API
- [x] Replaced setTimeout mock with PATCH to /api/v1/settings/agency
- [x] Uses fetchWithCsrf for CSRF protection
- [x] Proper error handling with toast notifications
- Commit: `7a0b30e`

### Agency Profile Wire-up (SET-008) - 2026-01-05
- [x] SET-008: AgencyProfile - Connected agency settings form to real API
- [x] Replaced DEFAULT_AGENCY mock with /api/v1/settings/agency fetch
- [x] Implemented handleSave with PATCH to real endpoint using fetchWithCsrf
- [x] Added loading skeleton and error states
- Commit: `935b90e`

### Settings Wire-up (SET-006, SET-007) - 2026-01-05
- [x] SET-006: UserEdit - Connected profile form to PATCH /users/[id]
- [x] SET-007: UserDelete - Added confirmation dialog + DELETE /users/[id]
- [x] Replaced mock data with real API fetch
- [x] Added loading/error states
- Commit: `a07a8c1`

## 🚧 Next Features

### Feature: Multi-Org Roles
- urgency: 8
- importance: 9
- confidence: 4 (needs spec)
- impact: 9
- tier: BLOCKED - Needs specification before implementation
- description: Advanced RBAC. Define roles, assign permissions, enforce at API level.
- next: Create feature spec with role types, permission matrix, enforcement points

# Active Tasks

## ✅ Completed Features
- [x] Settings (SET-001-002): Agency + User management
- [x] User Invitations (SET-003): 95% complete - verified 2026-01-05
- [x] Database Connection: Real Supabase connected (1 agency, 4 users, 20 clients)
- [x] Mock Mode Disabled: Local dev now uses real database (2026-01-05)

## 🔒 Production Blockers (Sequential - Must Clear First)

### Blocker 1: Vercel Mock Mode
- status: NEEDS ACTION
- action: Set `NEXT_PUBLIC_MOCK_MODE=false` in Vercel env vars
- impact: Production still using mock data

### Blocker 2: RESEND_API_KEY
- status: NEEDS ACTION
- action: Get real Resend API key, add to Vercel
- impact: Invitation emails won't send in production

## 🚧 Next Features (After Blockers Clear)

### Feature: Multi-Org Roles
- urgency: 8
- importance: 9
- confidence: 7
- impact: 9
- tier: IMMEDIATE
- description: Advanced RBAC. Define roles, assign permissions, enforce at API level.

### Feature: Settings Completion (SET-004-007)
- urgency: 7
- importance: 8
- confidence: 8
- impact: 7
- tier: IMMEDIATE
- description: Billing settings, API keys, webhook management, notification preferences.

# AudienceOS Production Readiness Audit

**Date:** 2026-01-20
**Current Score:** 65-70%
**Target Score:** 90-95%
**Auditor:** Claude (Cowork Mode)

---

## Executive Summary

This audit identifies **4 critical areas** requiring attention before AudienceOS is production-ready:

| Category | Issues Found | Critical | High | Medium |
|----------|-------------|----------|------|--------|
| Console Logging | 100+ statements | 18 | 45 | 35+ |
| TODO/Stubs | 32 items | 9 | 10 | 13 |
| Rate Limiting | 27 unprotected routes | 6 | 8 | 13 |
| Env Validation | 15+ gaps | 4 | 4 | 7 |

---

## 1. Console Logging Issues (CRITICAL)

### Problem
100+ `console.log/error/warn` statements exist in production code paths, exposing:
- User IDs and account IDs
- OAuth token exchange details
- Email recipient addresses
- Internal state and configuration

### Critical Files (Fix First)
| File | Issue | Lines |
|------|-------|-------|
| `/lib/crypto.ts` | Logs missing secrets | 38, 110 |
| `/app/api/v1/integrations/*/callback/route.ts` | Logs userId, token exchanges | Multiple |
| `/lib/email/*.ts` | Logs recipient emails | Multiple |
| `/lib/rbac/*.ts` | Logs user/agency IDs | Multiple |
| `/app/api/v1/chat/route.ts` | Logs function args | 226 |

### Fix Strategy
```typescript
// WRONG - Current pattern
console.log('[Gmail Callback] Exchanging code for tokens', { userId })

// RIGHT - Use structured logger
import { logger } from '@/lib/logger'
logger.info('Gmail OAuth exchange started', {
  correlationId: request.headers.get('x-correlation-id')
})
```

### Action Items
1. [ ] Create `/lib/logger.ts` with Winston/Pino
2. [ ] Add ESLint rule: `no-console` for `/app/api/` and `/lib/`
3. [ ] Replace all console statements with logger
4. [ ] Add pre-commit hook to block new console statements

---

## 2. TODO/FIXME/Stub Implementations (BLOCKING)

### Critical Blockers (Features Won't Work)

| Feature | File | Line | Impact |
|---------|------|------|--------|
| Client owner assignment | `/components/linear/client-detail-panel.tsx` | 154 | Can't assign owners |
| File attachments | `/components/linear/client-detail-panel.tsx` | 279 | Can't attach files |
| Label picker | `/components/linear/client-detail-panel.tsx` | 284 | Can't add labels |
| Due date picker | `/components/linear/client-detail-panel.tsx` | 289 | Can't set dates |
| Ticket editing | `/components/linear/ticket-detail-panel.tsx` | 145 | Can't edit tickets |
| Calendar picker | `/components/linear/date-picker-modal.tsx` | 135 | Calendar broken |
| Stage transitions | `/components/onboarding/active-onboardings.tsx` | 621 | Don't persist |
| Reply sending | `/app/api/v1/communications/[id]/reply/route.ts` | 77 | Replies don't send |
| Meta Ads sync | `/app/api/v1/integrations/[id]/sync/route.ts` | 240 | Integration stub |

### High Priority (Major Issues)

| Feature | File | Impact |
|---------|------|--------|
| Dashboard firehose | `/components/dashboard-view.tsx:30` | Uses mock data |
| Escalation workflow | `/components/dashboard-view.tsx:875` | Not saved |
| Snooze API | `/components/dashboard-view.tsx:884` | Not persisted |
| Recordings API | `/components/client-detail-sheet.tsx:134` | Empty list |
| AI plan generation | `/components/client-detail-sheet.tsx:143` | Not working |
| Notification sending | `/lib/workflows/execution-engine.ts:377` | Not sent |
| AI drafts storage | `/lib/workflows/execution-engine.ts:399` | Not stored |
| Ticket resolution emails | `/app/api/v1/tickets/[id]/resolve/route.ts:121` | Not sent |

### Action Items
1. [ ] Week 1: Implement pickers (owner, file, label, date, calendar)
2. [ ] Week 1: Connect stage transition API
3. [ ] Week 2: Implement reply sending via Slack/Gmail
4. [ ] Week 2: Connect escalation and snooze workflows
5. [ ] Month 1: Implement Meta Ads sync, AI plan generation

---

## 3. Rate Limiting Gaps (SECURITY)

### Current State
- 47/74 routes (64%) have rate limiting
- 27 routes (36%) are unprotected

### Critical Unprotected Routes

| Route | Risk | Recommended Limit |
|-------|------|-------------------|
| `/v1/chat` | Gemini API cost ($$$) | 20 req/min |
| `/v1/integrations/*/sync` | Resource exhaustion | 5 req/hour |
| `/v1/seo/enrich` | $0.02/call cost | 10 req/hour |
| `/v1/oauth/callback` | Token enumeration | 5 req/hour |
| `/v1/integrations/*/authorize` | OAuth abuse | 10 req/hour |
| `/public/onboarding/*` | Unauthenticated scraping | 10 req/min |

### Action Items
1. [ ] Add rate limit to `/v1/chat` (20 req/min per user)
2. [ ] Add rate limit to all sync endpoints (5 req/hour)
3. [ ] Add rate limit to SEO enrichment (10 req/hour)
4. [ ] Add rate limit to OAuth callbacks (5 req/hour per IP)
5. [ ] Add rate limit to public endpoints (10 req/min per IP)

---

## 4. Environment Variable Validation (SECURITY)

### Critical Issues

| Env Var | Problem | Risk |
|---------|---------|------|
| `OAUTH_STATE_SECRET` | Falls back to `''` | CSRF disabled |
| `TOKEN_ENCRYPTION_KEY` | Falls back to `''` | Tokens unencrypted |
| `DATABASE_URL` | No startup validation | Late failures |
| `GOOGLE_AI_API_KEY` | Runtime-only check | Chat fails late |

### Dangerous Patterns Found

```typescript
// CRITICAL: lib/crypto.ts:13-14
const OAUTH_SECRET = process.env.OAUTH_STATE_SECRET || ''
// Uses 'insecure-fallback-key' if empty!

// CRITICAL: app/api/v1/oauth/callback/route.ts
clientId: process.env.GOOGLE_CLIENT_ID || ''
// Empty string allows requests to proceed
```

### Action Items
1. [ ] Remove all `|| ''` fallbacks for secrets
2. [ ] Add DATABASE_URL to startup validation
3. [ ] Add GOOGLE_AI_API_KEY to startup validation
4. [ ] Implement Zod schema for env validation
5. [ ] Create `/api/health` that validates all required vars

---

## 5. Additional Findings

### Missing Error Boundaries
- No React error boundaries around major sections
- Silent failures in async operations (fire-and-forget patterns)

### Transaction Boundaries Missing
```typescript
// Current: Fire-and-forget sync
fetch(`/api/v1/integrations/gmail/sync`).catch(err => {
  console.error(err) // Silent failure!
})
// Returns success BEFORE sync completes
```

### Token Refresh Not Implemented
- Refresh tokens stored but never used
- After 1 hour, 50%+ integrations fail
- Users must manually reconnect

---

## Priority Fix Order

### Week 1 (Critical Security)
1. Remove empty string fallbacks in crypto.ts
2. Add rate limits to chat, sync, SEO endpoints
3. Create structured logger, replace console statements
4. Add startup validation for all required env vars

### Week 2 (Feature Blockers)
1. Implement UI pickers (owner, file, label, date)
2. Connect stage transition API
3. Implement reply sending

### Week 3-4 (High Priority)
1. Connect escalation/snooze workflows
2. Implement notification sending
3. Add AI drafts storage
4. Implement token refresh mechanism

### Month 2 (Polish)
1. Replace remaining console statements
2. Implement Meta Ads sync
3. Add comprehensive error boundaries
4. Implement transaction boundaries for sync

---

## Production Checklist

Before deploying to production, verify:

- [ ] All console.log statements removed from /app/api and /lib
- [ ] Rate limiting on all mutation endpoints
- [ ] All secrets validated at startup (no empty string fallbacks)
- [ ] Health check validates all required services
- [ ] Error boundaries around major UI sections
- [ ] Structured logging to external service (not stdout)
- [ ] Token refresh mechanism implemented
- [ ] All TODO/FIXME blockers resolved
- [ ] Load testing completed (sync endpoints, chat)
- [ ] Security audit passed (OWASP checks)

---

## Estimated Effort

| Category | Hours | Priority |
|----------|-------|----------|
| Console logging cleanup | 8h | P0 |
| Rate limiting additions | 4h | P0 |
| Env validation fixes | 4h | P0 |
| TODO blockers (Week 1) | 16h | P0 |
| TODO high priority | 24h | P1 |
| Token refresh | 8h | P1 |
| Error boundaries | 8h | P2 |

**Total: ~72 hours to reach 90% production readiness**

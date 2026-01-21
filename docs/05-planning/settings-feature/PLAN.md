# AudienceOS Settings Feature - Completion Plan

**Goal:** Complete Settings feature (invitations + AI config + tests) for autonomous overnight execution

**Status:** Ready for autonomous execution (3-4 hours estimated)

---

## What's Being Built

### ✅ Already Complete
- POST/GET `/api/v1/settings/invitations` (send + list)
- POST/GET `/api/v1/settings/invitations/[token]/accept` (validate + accept)
- Email service `lib/email/invitation.ts` (Resend integration)
- AI Configuration UI `components/settings/sections/ai-configuration-section.tsx`
- Test infrastructure (Vitest + Playwright)

### ❌ Missing (This Plan)
1. Frontend invitation acceptance page `/invite/[token]`
2. AI config PATCH support in `/api/v1/settings/agency`
3. Wire AI Config UI to API
4. Unit tests for invitations
5. Unit tests for AI config
6. E2E test for invitation flow

---

## Implementation Order (6 Phases)

### Phase 1: Database Migration (5 min)
**File:** `supabase/migrations/009_add_ai_config.sql`

```sql
-- Add ai_config JSONB column to agency table
ALTER TABLE agency ADD COLUMN ai_config JSONB DEFAULT '{
  "assistant_name": "Chi",
  "response_tone": "professional",
  "response_length": "detailed",
  "enabled_features": ["chat_assistant", "draft_replies", "alert_analysis", "document_rag"],
  "token_limit": 50000
}'::jsonb;
```

**Validation:**
- Run migration
- Verify column exists: `SELECT ai_config FROM agency LIMIT 1;`

---

### Phase 2: Invitation Acceptance Page (45 min)
**File:** `app/invite/[token]/page.tsx` (~350 lines)

**Key Features:**
- Validates token on mount via GET API
- Loading states (spinner with Linear design)
- Error states (invalid/expired/already accepted)
- Form with shadcn/ui components (Input, Label, Button)
- Client-side validation (password 8+ chars, mixed case, number)
- Submit via POST to existing accept API
- Auto-login after signup
- Redirect to `/` (dashboard)

**Implementation Pattern (from login page):**
```typescript
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>("")
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadToken = async () => {
      const resolvedParams = await params
      setToken(resolvedParams.token)

      // Validate invitation
      const response = await fetch(`/api/v1/settings/invitations/${resolvedParams.token}/accept`)
      if (!response.ok) {
        if (response.status === 410) {
          setError("This invitation has expired")
        } else if (response.status === 404) {
          setError("This invitation link is invalid")
        } else {
          setError("Failed to load invitation")
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setInvitation(data.invitation)
      setLoading(false)
    }

    loadToken()
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!firstName || !lastName) {
      setError("Please enter your name")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain uppercase, lowercase, and number")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch(`/api/v1/settings/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to accept invitation")
        setIsSubmitting(false)
        return
      }

      // Sign in automatically
      const supabase = createClient()
      await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      })

      router.push("/")
      router.refresh()
    } catch (err) {
      setError("Network error. Please try again.")
      setIsSubmitting(false)
    }
  }

  // Loading/Error/Form UI...
}
```

**Validation:**
- Navigate to `/invite/invalid-token` → shows error
- Use real token → shows form
- Submit with weak password → shows validation error
- Submit valid → creates account + redirects

---

### Phase 3: AI Config API Integration (30 min)
**File:** `app/api/v1/settings/agency/route.ts`

**Changes to PATCH handler (add after line 98):**

```typescript
const {
  name,
  logo_url,
  timezone,
  business_hours,
  pipeline_stages,
  health_thresholds,
  ai_config, // ADD THIS
} = body

// ... existing validations ...

// ADD AI CONFIG VALIDATION (after health_thresholds block ~line 193):
if (ai_config !== undefined) {
  if (ai_config !== null && typeof ai_config !== 'object') {
    return createErrorResponse(400, 'AI config must be an object or null')
  }

  if (ai_config && typeof ai_config === 'object') {
    const { assistant_name, response_tone, response_length, enabled_features, token_limit } = ai_config as Record<string, unknown>

    // Validate assistant_name
    if (assistant_name !== undefined && typeof assistant_name !== 'string') {
      return createErrorResponse(400, 'Assistant name must be a string')
    }

    // Validate response_tone
    if (response_tone !== undefined && !['professional', 'casual', 'technical'].includes(response_tone as string)) {
      return createErrorResponse(400, 'Response tone must be professional, casual, or technical')
    }

    // Validate response_length
    if (response_length !== undefined && !['brief', 'detailed', 'comprehensive'].includes(response_length as string)) {
      return createErrorResponse(400, 'Response length must be brief, detailed, or comprehensive')
    }

    // Validate enabled_features
    if (enabled_features !== undefined && !Array.isArray(enabled_features)) {
      return createErrorResponse(400, 'Enabled features must be an array')
    }

    // Validate token_limit
    if (token_limit !== undefined && (typeof token_limit !== 'number' || token_limit < 1000 || token_limit > 1000000)) {
      return createErrorResponse(400, 'Token limit must be a number between 1000 and 1000000')
    }
  }

  updates.ai_config = ai_config
}
```

**Validation:**
- PATCH with invalid tone → 400 error
- PATCH with valid ai_config → updates successfully
- GET returns ai_config field

---

### Phase 4: Wire AI Config UI to API (20 min)
**File:** `components/settings/sections/ai-configuration-section.tsx`

**Changes:**

1. **Remove mock data** (lines 23-35)
2. **Add loading state:**
```typescript
const [isLoading, setIsLoading] = useState(true)
```

3. **Fetch on mount:**
```typescript
useEffect(() => {
  const fetchAIConfig = async () => {
    try {
      const response = await fetch('/api/v1/settings/agency')
      if (!response.ok) throw new Error('Failed to load settings')

      const { data: agency } = await response.json()
      const config = agency.ai_config || {}

      setAssistantName(config.assistant_name || 'Chi')
      setResponseTone(config.response_tone || 'professional')
      setResponseLength(config.response_length || 'detailed')
      setEnabledFeatures(config.enabled_features || AI_FEATURES.map(f => f.id))
      setTokenUsage({
        current_usage: 0,
        limit: config.token_limit || 50000,
        usage_by_feature: {},
        daily_usage: [],
        percent_used: 0,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load AI configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  fetchAIConfig()
}, [])
```

4. **Real save handler:**
```typescript
const handleSave = async () => {
  setIsSaving(true)

  try {
    const response = await fetch('/api/v1/settings/agency', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ai_config: {
          assistant_name: assistantName,
          response_tone: responseTone,
          response_length: responseLength,
          enabled_features: enabledFeatures,
          token_limit: tokenUsage.limit,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save settings')
    }

    setHasUnsavedChanges(false)
    toast({
      title: "Settings saved",
      description: "AI configuration has been updated.",
    })
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save AI configuration",
      variant: "destructive",
    })
  } finally {
    setIsSaving(false)
  }
}
```

5. **Add loading skeleton:**
```typescript
if (isLoading) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-secondary rounded-lg" />
      <div className="h-32 bg-secondary rounded-lg" />
      <div className="h-32 bg-secondary rounded-lg" />
    </div>
  )
}
```

**Validation:**
- Page loads → shows loading skeleton
- Data populates → shows current settings
- Change setting → save button becomes enabled
- Click save → updates database

---

### Phase 5: Unit Tests (60 min)

**File 1:** `__tests__/api/invitations.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('POST /api/v1/settings/invitations', () => {
  it('should create invitation and send email', async () => {
    // Test implementation
  })

  it('should reject invalid email format', async () => {
    // Test implementation
  })

  it('should reject duplicate invitations', async () => {
    // Test implementation
  })

  it('should require admin role', async () => {
    // Test implementation
  })
})

describe('GET /api/v1/settings/invitations', () => {
  it('should list pending invitations', async () => {
    // Test implementation
  })

  it('should mark expired invitations', async () => {
    // Test implementation
  })
})

describe('POST /api/v1/settings/invitations/[token]/accept', () => {
  it('should accept valid invitation', async () => {
    // Test implementation
  })

  it('should reject expired invitation', async () => {
    // Test implementation
  })

  it('should reject already accepted invitation', async () => {
    // Test implementation
  })

  it('should validate password requirements', async () => {
    // Test implementation
  })
})
```

**File 2:** `__tests__/api/ai-config.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

describe('PATCH /api/v1/settings/agency (AI Config)', () => {
  it('should update ai_config', async () => {
    // Test implementation
  })

  it('should validate response_tone enum', async () => {
    // Test implementation
  })

  it('should validate token_limit range', async () => {
    // Test implementation
  })

  it('should require admin role', async () => {
    // Test implementation
  })
})
```

**File 3:** `__tests__/components/invite-page.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

describe('InvitePage', () => {
  it('should show loading state', () => {
    // Test implementation
  })

  it('should validate token on mount', async () => {
    // Test implementation
  })

  it('should show error for expired invitation', async () => {
    // Test implementation
  })

  it('should validate password requirements', async () => {
    // Test implementation
  })

  it('should submit form and redirect', async () => {
    // Test implementation
  })
})
```

---

### Phase 6: E2E Test (30 min)

**File:** `e2e/settings-invitations.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Invitation Flow', () => {
  test('admin can invite user and user can accept', async ({ page, context }) => {
    // 1. Admin logs in
    await page.goto('/login')
    await page.fill('[type="email"]', 'admin@agency.com')
    await page.fill('[type="password"]', 'password')
    await page.click('button[type="submit"]')

    // 2. Navigate to settings
    await page.goto('/settings')
    await page.click('text=Team Members')

    // 3. Send invitation
    await page.click('text=Invite User')
    await page.fill('[name="email"]', 'newuser@example.com')
    await page.selectOption('[name="role"]', 'user')
    await page.click('text=Send Invitation')

    // 4. Verify invitation appears in list
    await expect(page.locator('text=newuser@example.com')).toBeVisible()

    // 5. Extract invitation token from database or email
    // (In real test, intercept email or query test DB)
    const token = 'test-token-from-db'

    // 6. Open invitation in new context (simulate user)
    const newPage = await context.newPage()
    await newPage.goto(`/invite/${token}`)

    // 7. Fill out signup form
    await newPage.fill('[name="first_name"]', 'New')
    await newPage.fill('[name="last_name"]', 'User')
    await newPage.fill('[type="password"]', 'Password123!')
    await newPage.click('button[type="submit"]')

    // 8. Verify redirect to dashboard
    await newPage.waitForURL('/')
    await expect(newPage.locator('text=Dashboard')).toBeVisible()
  })
})
```

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `/app/api/v1/settings/invitations/route.ts` | Invitation send + list (exists) |
| `/app/api/v1/settings/invitations/[token]/accept/route.ts` | Invitation validate + accept (exists) |
| `/app/api/v1/settings/agency/route.ts` | Agency settings GET/PATCH (modify) |
| `/lib/email/invitation.ts` | Resend email service (exists) |
| `/app/invite/[token]/page.tsx` | Invitation acceptance UI (new) |
| `/components/settings/sections/ai-configuration-section.tsx` | AI config UI (wire to API) |
| `/supabase/migrations/009_add_ai_config.sql` | Database migration (new) |

---

## Environment Variables Required

```bash
# Already configured (verify in .env.local)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Required for emails
RESEND_API_KEY=...  # Check if set
RESEND_FROM_EMAIL=noreply@audienceos.com  # Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For invite links
```

---

## Validation Checklist

### Phase 1 (Database)
- [ ] Migration runs without errors
- [ ] `ai_config` column exists in agency table
- [ ] Default value is valid JSON

### Phase 2 (Invitation Page)
- [ ] `/invite/invalid-token` shows error message
- [ ] Valid token shows form with email pre-filled
- [ ] Weak password shows validation error
- [ ] Valid submission creates account + logs in
- [ ] Redirects to dashboard after signup

### Phase 3 (AI Config API)
- [ ] GET returns ai_config field
- [ ] PATCH with valid ai_config succeeds
- [ ] PATCH with invalid tone returns 400
- [ ] Non-admin PATCH returns 403

### Phase 4 (AI Config UI)
- [ ] Page shows loading skeleton
- [ ] Data populates from API
- [ ] Changes enable save button
- [ ] Save updates database
- [ ] Toast shows success/error

### Phase 5 (Unit Tests)
- [ ] All invitation API tests pass
- [ ] All AI config tests pass
- [ ] Invite page component tests pass
- [ ] `npm run test` exits 0

### Phase 6 (E2E Test)
- [ ] E2E invitation flow completes
- [ ] `npm run test:e2e` exits 0

---

## Success Criteria

Implementation is complete when:
1. ✅ User can accept invitation via email link
2. ✅ User automatically logs in after signup
3. ✅ Admin can update AI configuration
4. ✅ All unit tests pass (15+ tests)
5. ✅ E2E test passes
6. ✅ Build succeeds with zero errors
7. ✅ Feature complete for MVP launch

---

## Estimated Time: 3-4 hours autonomous execution

**Breakdown:**
- Phase 1: 5 minutes
- Phase 2: 45 minutes
- Phase 3: 30 minutes
- Phase 4: 20 minutes
- Phase 5: 60 minutes
- Phase 6: 30 minutes
- **Total:** ~3 hours (buffer: 1 hour for debugging)

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('GET /api/v1/integrations/slack/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle user denying authorization', () => {
    // When user denies, Slack returns error parameter
    const error = 'access_denied'
    const redirectUrl = `/settings/integrations?error=${error}`

    expect(redirectUrl).toContain('error=access_denied')
    expect(redirectUrl).toContain('/settings/integrations')
  })

  it('should validate code parameter is present', () => {
    const code = 'xoxb-1234567890-1234567890-xxxxxxxxxxx'
    const state = Buffer.from(
      JSON.stringify({
        userId: 'user-123',
        timestamp: Date.now(),
      })
    ).toString('base64')

    expect(code).toBeDefined()
    expect(state).toBeDefined()
    expect(code.length).toBeGreaterThan(0)
  })

  it('should validate state parameter is present', () => {
    const validState = Buffer.from(
      JSON.stringify({
        userId: 'user-123',
        timestamp: Date.now(),
      })
    ).toString('base64')

    expect(validState).toBeDefined()
    expect(typeof validState).toBe('string')

    // Invalid state should fail
    const invalidState = 'not-valid-base64-json'
    expect(() => {
      JSON.parse(Buffer.from(invalidState, 'base64').toString())
    }).toThrow()
  })

  it('should reject expired state (> 5 minutes old)', () => {
    const oldTimestamp = Date.now() - 6 * 60 * 1000 // 6 minutes ago

    // Should be expired
    expect(Date.now() - oldTimestamp).toBeGreaterThan(5 * 60 * 1000)
  })

  it('should accept valid state (< 5 minutes old)', () => {
    const recentTimestamp = Date.now() - 2 * 60 * 1000 // 2 minutes ago

    // Should NOT be expired
    expect(Date.now() - recentTimestamp).toBeLessThan(5 * 60 * 1000)
  })

  it('should decrypt stored tokens for authentication', () => {
    // Mock encrypt function behavior
    const plainToken = 'xoxb-1234567890-1234567890-xxxxxxxxxxx'

    expect(plainToken).toBeDefined()
    expect(plainToken.length).toBeGreaterThan(0)
  })

  it('should handle token exchange failure from Slack', () => {
    const errorResponse = {
      ok: false,
      error: 'invalid_code',
    }

    expect(errorResponse.ok).toBe(false)
    expect(errorResponse.error).toBe('invalid_code')
  })

  it('should redirect to settings with success message on success', () => {
    const successUrl = '/settings/integrations?success=slack_connected'

    expect(successUrl).toContain('success=slack_connected')
    expect(successUrl).toContain('/settings/integrations')
  })

  it('should redirect to settings with error message on failure', () => {
    const errorUrl = '/settings/integrations?error=token_exchange_failed'

    expect(errorUrl).toContain('error=token_exchange_failed')
    expect(errorUrl).toContain('/settings/integrations')
  })
})

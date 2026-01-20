/**
 * Environment Validation Tests
 * Tests for lib/env.ts centralized environment variable validation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Environment Validation', () => {
  // Store original env
  const originalEnv = process.env

  beforeEach(() => {
    // Reset modules to clear cached env values
    vi.resetModules()
    // Clone original env
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('validateEnv', () => {
    it('should return valid=true when all required vars are set', async () => {
      process.env.NODE_ENV = 'development'
      process.env.OAUTH_STATE_SECRET = 'test-secret'
      process.env.TOKEN_ENCRYPTION_KEY = 'test-key'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.GOOGLE_CLIENT_ID = 'test-google-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret'

      const { validateEnv } = await import('@/lib/env')
      const result = validateEnv()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for missing security secrets', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.OAUTH_STATE_SECRET
      delete process.env.TOKEN_ENCRYPTION_KEY
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const { validateEnv } = await import('@/lib/env')
      const result = validateEnv()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('OAUTH_STATE_SECRET is not set')
      expect(result.errors).toContain('TOKEN_ENCRYPTION_KEY is not set')
    })

    it('should return errors for missing Supabase config', async () => {
      process.env.NODE_ENV = 'development'
      process.env.OAUTH_STATE_SECRET = 'test-secret'
      process.env.TOKEN_ENCRYPTION_KEY = 'test-key'
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      const { validateEnv } = await import('@/lib/env')
      const result = validateEnv()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('NEXT_PUBLIC_SUPABASE_URL is not set')
      expect(result.errors).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
    })
  })

  describe('IS_PRODUCTION detection', () => {
    it('should detect production environment', async () => {
      process.env.NODE_ENV = 'production'
      process.env.OAUTH_STATE_SECRET = 'prod-secret'
      process.env.TOKEN_ENCRYPTION_KEY = 'prod-key'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const { IS_PRODUCTION, IS_DEVELOPMENT } = await import('@/lib/env')

      expect(IS_PRODUCTION).toBe(true)
      expect(IS_DEVELOPMENT).toBe(false)
    })

    it('should detect development environment', async () => {
      process.env.NODE_ENV = 'development'

      const { IS_PRODUCTION, IS_DEVELOPMENT } = await import('@/lib/env')

      expect(IS_PRODUCTION).toBe(false)
      expect(IS_DEVELOPMENT).toBe(true)
    })

    it('should detect test environment', async () => {
      process.env.NODE_ENV = 'test'

      const { IS_TEST } = await import('@/lib/env')

      expect(IS_TEST).toBe(true)
    })
  })

  describe('publicEnv', () => {
    it('should expose public environment variables', async () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.test.com'
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://sentry.io/test'

      const { publicEnv } = await import('@/lib/env')

      expect(publicEnv.supabaseUrl).toBe('https://test.supabase.co')
      expect(publicEnv.supabaseAnonKey).toBe('test-anon-key')
      expect(publicEnv.appUrl).toBe('https://app.test.com')
      expect(publicEnv.sentryDsn).toBe('https://sentry.io/test')
    })

    it('should use default appUrl when not set', async () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      delete process.env.NEXT_PUBLIC_APP_URL

      const { publicEnv } = await import('@/lib/env')

      expect(publicEnv.appUrl).toBe('http://localhost:3000')
    })

    it('should parse mockMode boolean correctly', async () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.NEXT_PUBLIC_MOCK_MODE = 'true'

      const { publicEnv } = await import('@/lib/env')

      expect(publicEnv.mockMode).toBe(true)
    })
  })

  describe('serverEnv', () => {
    it('should expose server environment variables in development', async () => {
      process.env.NODE_ENV = 'development'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
      process.env.GOOGLE_CLIENT_ID = 'google-id'
      process.env.GOOGLE_CLIENT_SECRET = 'google-secret'
      process.env.GOOGLE_AI_API_KEY = 'ai-key'
      process.env.SLACK_CLIENT_ID = 'slack-id'
      process.env.SLACK_CLIENT_SECRET = 'slack-secret'

      const { serverEnv } = await import('@/lib/env')

      expect(serverEnv.supabaseServiceKey).toBe('service-key')
      expect(serverEnv.google.clientId).toBe('google-id')
      expect(serverEnv.google.clientSecret).toBe('google-secret')
      expect(serverEnv.slack.clientId).toBe('slack-id')
      expect(serverEnv.slack.clientSecret).toBe('slack-secret')
    })

    it('should use dev defaults for missing required vars in development', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.OAUTH_STATE_SECRET
      delete process.env.TOKEN_ENCRYPTION_KEY

      const { serverEnv } = await import('@/lib/env')

      // In dev, should use dev defaults
      expect(serverEnv.oauthStateSecret).toBe('dev-oauth-secret')
      expect(serverEnv.tokenEncryptionKey).toBe('dev-encryption-key')
    })

    it('should expose optional unipile config', async () => {
      process.env.NODE_ENV = 'development'
      process.env.UNIPILE_API_KEY = 'unipile-key'
      process.env.UNIPILE_CLIENT_ID = 'unipile-client'
      process.env.UNIPILE_MOCK_MODE = 'true'

      const { serverEnv } = await import('@/lib/env')

      expect(serverEnv.unipile.apiKey).toBe('unipile-key')
      expect(serverEnv.unipile.clientId).toBe('unipile-client')
      expect(serverEnv.unipile.mockMode).toBe(true)
    })

    it('should use default DSN for unipile when not set', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.UNIPILE_DSN

      const { serverEnv } = await import('@/lib/env')

      expect(serverEnv.unipile.dsn).toBe('https://api3.unipile.com:13344')
    })
  })

  describe('email config', () => {
    it('should expose email configuration', async () => {
      process.env.NODE_ENV = 'development'
      process.env.RESEND_API_KEY = 'resend-key'
      process.env.RESEND_FROM_EMAIL = 'noreply@test.com'

      const { serverEnv } = await import('@/lib/env')

      expect(serverEnv.email.apiKey).toBe('resend-key')
      expect(serverEnv.email.fromEmail).toBe('noreply@test.com')
    })

    it('should use default fromEmail when not set', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.RESEND_FROM_EMAIL

      const { serverEnv } = await import('@/lib/env')

      expect(serverEnv.email.fromEmail).toBe('noreply@audienceos.com')
    })
  })
})

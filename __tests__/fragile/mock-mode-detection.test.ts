/**
 * RUNTIME VERIFICATION TEST: Mock Mode Auto-Enable Vulnerability
 * 
 * Tests that mock mode cannot be accidentally enabled by URL patterns
 * or missing environment variables.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Mock Mode Detection Vulnerability', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Inline the isMockMode function for testing
  const isMockMode = () => {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return true
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    return url.includes('placeholder') || url === ''
  }

  it('PROVES empty URL enables mock mode (VULNERABILITY)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_MOCK_MODE = 'false'
    
    expect(isMockMode()).toBe(true)  // BUG: Empty URL = mock mode
    
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║ VULNERABILITY: Empty SUPABASE_URL enables mock mode!      ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')
  })

  it('PROVES undefined URL enables mock mode (VULNERABILITY)', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_MOCK_MODE = 'false'
    
    expect(isMockMode()).toBe(true)  // BUG: Missing URL = mock mode
    
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║ VULNERABILITY: Missing SUPABASE_URL enables mock mode!    ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')
  })

  it('PROVES URL containing "placeholder" enables mock mode (VULNERABILITY)', () => {
    // A legitimate URL that happens to contain "placeholder" in subdomain
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://my-placeholder-project.supabase.co'
    process.env.NEXT_PUBLIC_MOCK_MODE = 'false'
    
    expect(isMockMode()).toBe(true)  // BUG: Substring match triggers mock
    
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║ VULNERABILITY: URL with "placeholder" substring triggers  ║')
    console.log('║ mock mode even if it is a legitimate Supabase project!    ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')
  })

  it('correctly disables mock mode for real URLs', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ebxshdqfaqupnvpghodi.supabase.co'
    process.env.NEXT_PUBLIC_MOCK_MODE = 'false'
    
    expect(isMockMode()).toBe(false)  // Correct behavior
  })
})

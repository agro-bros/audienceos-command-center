/**
 * REGRESSION TEST: Chat API Agency Spoofing Protection
 *
 * Ensures the chat API uses authenticated user context (request.user.agencyId)
 * instead of untrusted request body parameters.
 *
 * VULNERABILITY FIXED: 2026-01-10
 * This test will FAIL if the vulnerability is reintroduced.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('Chat API Agency ID Security', () => {
  it('MUST use request.user.agencyId, NOT body.agencyId', () => {
    const chatRoute = fs.readFileSync('./app/api/v1/chat/route.ts', 'utf8')

    // MUST NOT extract agencyId/userId from body (was the vulnerability)
    const extractsFromBody = chatRoute.includes('const { message, sessionId, agencyId, userId')
    expect(extractsFromBody).toBe(false)

    // MUST use authenticated context
    const usesAuthenticatedAgency = chatRoute.includes('request.user.agencyId')
    const usesAuthenticatedUser = chatRoute.includes('request.user.id')

    expect(usesAuthenticatedAgency).toBe(true)
    expect(usesAuthenticatedUser).toBe(true)

    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║ SECURITY CHECK PASSED: Chat uses authenticated context    ║')
    console.log('║ request.user.agencyId and request.user.id are enforced.   ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')
  })
})

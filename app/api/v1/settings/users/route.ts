/**
 * User Management API - List and Invite
 * GET /api/v1/settings/users - List agency users
 * POST /api/v1/settings/users/invite - Send user invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, sanitizeEmail, createErrorResponse } from '@/lib/security'

// Mock mode detection
const isMockMode = () => {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.includes('placeholder') || url === ''
}

// Mock users for demo
const MOCK_USERS = [
  {
    id: 'user-001',
    email: 'brent@chasedigital.com',
    first_name: 'Brent',
    last_name: 'Walker',
    role: 'admin',
    avatar_url: null,
    is_active: true,
    last_active_at: new Date().toISOString(),
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'user-002',
    email: 'roderic@chasedigital.com',
    first_name: 'Roderic',
    last_name: 'Andrews',
    role: 'admin',
    avatar_url: null,
    is_active: true,
    last_active_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'user-003',
    email: 'trevor@chasedigital.com',
    first_name: 'Trevor',
    last_name: 'Mills',
    role: 'member',
    avatar_url: null,
    is_active: true,
    last_active_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'user-004',
    email: 'chase@chasedigital.com',
    first_name: 'Chase',
    last_name: 'Digital',
    role: 'member',
    avatar_url: null,
    is_active: true,
    last_active_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: '2024-02-15T00:00:00Z',
  },
]

// ============================================================================
// GET /api/v1/settings/users
// ============================================================================

export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  // Mock mode - return demo data without auth
  if (isMockMode()) {
    return NextResponse.json({
      data: MOCK_USERS,
      pagination: {
        total: MOCK_USERS.length,
        limit: 50,
        offset: 0,
      },
    })
  }

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with agency_id from database (SEC-003, SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Verify user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user')
      .select('role')
      .eq('id', user.id)
      .eq('agency_id', agencyId)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return createErrorResponse(403, 'Only admins can view user list')
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
    const search = searchParams.get('search')
    const isActive = searchParams.get('is_active')

    // Build query
    let query = supabase
      .from('user')
      .select('id, email, first_name, last_name, role, avatar_url, is_active, last_active_at, created_at', { count: 'exact' })
      .eq('agency_id', agencyId)

    // Apply filters
    if (isActive === 'true') {
      query = query.eq('is_active', true)
    } else if (isActive === 'false') {
      query = query.eq('is_active', false)
    }

    // Note: Search filtering would require using a custom filter function or full-text search
    // For now, we'll handle search client-side or implement PostgreSQL full-text search separately
    // if (search) {
    //   const sanitizedSearch = sanitizeString(search).slice(0, 50)
    //   if (sanitizedSearch) {
    //     // Client-side filtering for now
    //   }
    // }

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return createErrorResponse(500, 'Failed to fetch users')
    }

    return NextResponse.json({
      data: users,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

// ============================================================================
// POST /api/v1/settings/users/invite
// ============================================================================

export async function POST(request: NextRequest) {
  // Rate limit: 30 invites per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  // CSRF protection (TD-005)
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with agency_id from database (SEC-003, SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Verify user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user')
      .select('role')
      .eq('id', user.id)
      .eq('agency_id', agencyId)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return createErrorResponse(403, 'Only admins can invite users')
    }

    // Parse request body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { email, role } = body as { email?: unknown; role?: unknown }

    // Validate email
    if (!email || typeof email !== 'string') {
      return createErrorResponse(400, 'Email is required')
    }

    const sanitizedEmail = sanitizeEmail(email)
    if (!sanitizedEmail) {
      return createErrorResponse(400, 'Invalid email address')
    }

    // Validate role
    if (!role || typeof role !== 'string' || !['admin', 'user'].includes(role)) {
      return createErrorResponse(400, 'Role must be "admin" or "user"')
    }

    // Check if user already exists in this agency
    const { data: existingUser } = await supabase
      .from('user')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('email', sanitizedEmail)
      .single()

    if (existingUser) {
      return createErrorResponse(400, 'User with this email already exists in your agency')
    }

    // TODO: Implement user invitations
    // This will be implemented after the user_invitations table is created
    // For now, return a not implemented response

    return createErrorResponse(501, 'User invitations feature is not yet implemented')
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

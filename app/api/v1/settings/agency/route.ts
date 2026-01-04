/**
 * Agency Settings API
 * GET /api/v1/settings/agency - Get agency configuration
 * PATCH /api/v1/settings/agency - Update agency settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/security'

// ============================================================================
// GET /api/v1/settings/agency
// ============================================================================

export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with agency_id from database (SEC-003, SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Fetch agency settings
    const { data: agency, error } = await supabase
      .from('agency')
      .select('*')
      .eq('id', agencyId)
      .single()

    if (error || !agency) {
      return createErrorResponse(500, 'Failed to fetch agency settings')
    }

    return NextResponse.json({ data: agency })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

// ============================================================================
// PATCH /api/v1/settings/agency
// ============================================================================

export async function PATCH(request: NextRequest) {
  // Rate limit: 30 updates per minute
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

    // Verify user is admin (agency settings only for admins)
    const { data: userProfile, error: profileError } = await supabase
      .from('user')
      .select('role')
      .eq('id', user.id)
      .eq('agency_id', agencyId)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return createErrorResponse(403, 'Only admins can modify agency settings')
    }

    // Parse request body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const {
      name,
      logo_url,
      timezone,
      business_hours,
      pipeline_stages,
      health_thresholds,
    } = body

    // Validate and sanitize fields
    const updates: Record<string, unknown> = {}

    if (name !== undefined) {
      if (typeof name !== 'string') {
        return createErrorResponse(400, 'Agency name must be a string')
      }
      const sanitizedName = sanitizeString(name).slice(0, 100)
      if (!sanitizedName) {
        return createErrorResponse(400, 'Agency name cannot be empty')
      }
      updates.name = sanitizedName
    }

    if (logo_url !== undefined) {
      if (typeof logo_url !== 'string' && logo_url !== null) {
        return createErrorResponse(400, 'Logo URL must be a string or null')
      }
      if (typeof logo_url === 'string' && logo_url.length > 500) {
        return createErrorResponse(400, 'Logo URL is too long')
      }
      updates.logo_url = logo_url
    }

    if (timezone !== undefined) {
      if (typeof timezone !== 'string') {
        return createErrorResponse(400, 'Timezone must be a string')
      }
      // Basic validation: timezone should be a valid IANA timezone
      const validTimezones = [
        'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
        'Asia/Shanghai', 'Australia/Sydney', // Add more as needed
      ]
      if (!validTimezones.includes(timezone)) {
        return createErrorResponse(400, 'Invalid timezone')
      }
      updates.timezone = timezone
    }

    if (business_hours !== undefined) {
      if (business_hours !== null && typeof business_hours !== 'object') {
        return createErrorResponse(400, 'Business hours must be an object or null')
      }
      if (business_hours && typeof business_hours === 'object') {
        const { start, end } = business_hours as Record<string, unknown>
        if (typeof start !== 'string' || typeof end !== 'string') {
          return createErrorResponse(400, 'Business hours must have start and end times')
        }
        // Validate time format (HH:MM)
        const timeRegex = /^\d{2}:\d{2}$/
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
          return createErrorResponse(400, 'Time format must be HH:MM')
        }
      }
      updates.business_hours = business_hours
    }

    if (pipeline_stages !== undefined) {
      if (!Array.isArray(pipeline_stages)) {
        return createErrorResponse(400, 'Pipeline stages must be an array')
      }
      if (pipeline_stages.length < 3) {
        return createErrorResponse(400, 'Minimum 3 pipeline stages required')
      }
      if (pipeline_stages.length > 20) {
        return createErrorResponse(400, 'Maximum 20 pipeline stages allowed')
      }
      const sanitizedStages = pipeline_stages
        .filter((s): s is string => typeof s === 'string')
        .map(s => sanitizeString(s).slice(0, 50))
        .filter(s => s.length > 0)

      if (sanitizedStages.length < 3) {
        return createErrorResponse(400, 'At least 3 valid pipeline stages required')
      }
      updates.pipeline_stages = sanitizedStages
    }

    if (health_thresholds !== undefined) {
      if (health_thresholds !== null && typeof health_thresholds !== 'object') {
        return createErrorResponse(400, 'Health thresholds must be an object or null')
      }
      if (health_thresholds && typeof health_thresholds === 'object') {
        const { yellow, red } = health_thresholds as Record<string, unknown>
        if (typeof yellow !== 'number' || typeof red !== 'number') {
          return createErrorResponse(400, 'Health thresholds must have yellow and red numbers')
        }
        if (yellow < 1 || red < 1 || yellow >= red) {
          return createErrorResponse(400, 'Yellow threshold must be less than red threshold')
        }
      }
      updates.health_thresholds = health_thresholds
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse(400, 'No valid fields to update')
    }

    // Update agency settings
    const { data: updated, error } = await supabase
      .from('agency')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agencyId)
      .select()
      .single()

    if (error) {
      return createErrorResponse(500, 'Failed to update agency settings')
    }

    return NextResponse.json({ data: updated })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

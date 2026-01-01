import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, isValidUUID, createErrorResponse } from '@/lib/security'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/integrations/[id] - Get single integration details
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createErrorResponse(400, 'Invalid integration ID format')
    }

    const supabase = await createRouteHandlerClient(cookies)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return createErrorResponse(401, 'Unauthorized')
    }

    const { data: integration, error } = await supabase
      .from('integration')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !integration) {
      return createErrorResponse(404, 'Integration not found')
    }

    // Return without exposing tokens (destructure to omit)
    const { access_token: _at, refresh_token: _rt, ...safeIntegration } = integration

    return NextResponse.json({ data: safeIntegration })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

// PATCH /api/v1/integrations/[id] - Update integration config
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Rate limit: 50 updates per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 50, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createErrorResponse(400, 'Invalid integration ID format')
    }

    const supabase = await createRouteHandlerClient(cookies)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return createErrorResponse(401, 'Unauthorized')
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    // Only allow updating specific fields
    const allowedFields = ['config', 'is_connected']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Validate specific fields
        if (field === 'is_connected' && typeof body[field] !== 'boolean') {
          return createErrorResponse(400, 'is_connected must be a boolean')
        }
        if (field === 'config' && typeof body[field] !== 'object') {
          return createErrorResponse(400, 'config must be an object')
        }
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse(400, 'No valid fields to update')
    }

    const { data: integration, error } = await supabase
      .from('integration')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return createErrorResponse(500, 'Failed to update integration')
    }

    if (!integration) {
      return createErrorResponse(404, 'Integration not found')
    }

    // Return without exposing tokens
    const { access_token: _at, refresh_token: _rt, ...safeIntegration } = integration

    return NextResponse.json({ data: safeIntegration })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

// DELETE /api/v1/integrations/[id] - Disconnect and delete integration
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Rate limit: 20 deletes per minute (stricter for destructive ops)
  const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createErrorResponse(400, 'Invalid integration ID format')
    }

    const supabase = await createRouteHandlerClient(cookies)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return createErrorResponse(401, 'Unauthorized')
    }

    // First check if integration exists
    const { data: existing } = await supabase
      .from('integration')
      .select('id, provider')
      .eq('id', id)
      .single()

    if (!existing) {
      return createErrorResponse(404, 'Integration not found')
    }

    // TODO: Revoke OAuth tokens with provider before deletion
    // This would be a call to the provider's revoke endpoint

    // Delete the integration
    const { error } = await supabase.from('integration').delete().eq('id', id)

    if (error) {
      return createErrorResponse(500, 'Failed to delete integration')
    }

    return NextResponse.json({
      message: `${existing.provider} integration disconnected and deleted`,
    })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

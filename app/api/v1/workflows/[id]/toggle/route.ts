/**
 * Workflow Toggle API
 * PATCH /api/v1/workflows/{id}/toggle - Enable/disable automation
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { toggleWorkflow } from '@/lib/workflows'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with agency_id from database (SEC-003, SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Not authenticated' }, { status: 401 })
    }

    if (!agencyId) {
      return NextResponse.json(
        { error: 'forbidden', message: authError || 'No agency associated' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'enabled must be a boolean',
          details: { field: 'enabled' },
        },
        { status: 400 }
      )
    }

    const { data, error } = await toggleWorkflow(supabase, id, agencyId, enabled)

    if (error) {
      return NextResponse.json(
        { error: 'internal_error', message: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'not_found', message: 'Workflow not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: data.id,
      is_active: data.is_active,
      message: data.is_active ? 'Automation enabled' : 'Automation disabled',
    })
  } catch (error) {
    console.error('PATCH /api/v1/workflows/[id]/toggle error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

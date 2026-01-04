/**
 * Workflows API - List and Create
 * GET /api/v1/workflows - List automations with filtering
 * POST /api/v1/workflows - Create new automation
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/security'
import {
  getWorkflows,
  createWorkflow,
  validateTriggerConfig,
  validateActionConfig,
} from '@/lib/workflows'
import { getMockWorkflowsWithRuns } from '@/lib/mock-data'
import type { WorkflowTrigger, WorkflowAction } from '@/types/workflow'

// ============================================================================
// GET /api/v1/workflows
// ============================================================================

export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Parse query params
    const { searchParams } = new URL(request.url)
    const includeRuns = searchParams.get('include_runs') === 'true'
    const runsLimit = Math.min(Math.max(1, parseInt(searchParams.get('runs_limit') || '5', 10) || 5), 20)

    // Get authenticated user with agency_id from database (SEC-003, SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    // Demo mode fallback - return mock data when not authenticated or no agency
    if (!user || !agencyId) {
      const mockData = getMockWorkflowsWithRuns(includeRuns, runsLimit)
      return NextResponse.json({
        workflows: mockData,
        pagination: {
          total: mockData.length,
          has_more: false,
        },
        demo: true,
        ...(authError && { authError }),
      })
    }

    // Parse remaining query params with sanitization
    const isActiveParam = searchParams.get('enabled')
    const rawSearch = searchParams.get('q')
    const search = rawSearch ? sanitizeString(rawSearch).slice(0, 100) : undefined
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50), 100)

    const filters = {
      isActive: isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined,
      search,
      limit,
    }

    const { data, error, count } = await getWorkflows(supabase, agencyId, filters)

    if (error) {
      return createErrorResponse(500, 'Failed to fetch workflows')
    }

    return NextResponse.json({
      workflows: data,
      pagination: {
        total: count,
        has_more: (data?.length ?? 0) < count,
      },
    })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

// ============================================================================
// POST /api/v1/workflows
// ============================================================================

export async function POST(request: NextRequest) {
  // Rate limit: 30 creates per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  // CSRF protection (TD-005)
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with agency_id from database (SEC-003, SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user) {
      return createErrorResponse(401, 'Not authenticated')
    }

    if (!agencyId) {
      return createErrorResponse(403, authError || 'No agency associated')
    }

    // Parse request body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { name, description, triggers, actions, isActive } = body

    // Validate and sanitize name
    if (typeof name !== 'string') {
      return NextResponse.json(
        { error: 'validation_error', message: 'Name is required', details: { field: 'name' } },
        { status: 400 }
      )
    }

    const sanitizedName = sanitizeString(name).slice(0, 200)
    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Name is required', details: { field: 'name' } },
        { status: 400 }
      )
    }

    // Sanitize description
    const sanitizedDescription =
      typeof description === 'string' ? sanitizeString(description).slice(0, 1000) : undefined

    if (!Array.isArray(triggers) || triggers.length === 0) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'At least one trigger is required',
          details: { field: 'triggers' },
        },
        { status: 400 }
      )
    }

    if (triggers.length > 2) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'Maximum 2 triggers allowed',
          details: { field: 'triggers' },
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'At least one action is required',
          details: { field: 'actions' },
        },
        { status: 400 }
      )
    }

    if (actions.length > 10) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'Maximum 10 actions allowed',
          details: { field: 'actions' },
        },
        { status: 400 }
      )
    }

    // Validate triggers
    const triggerErrors: string[] = []
    for (const trigger of triggers as WorkflowTrigger[]) {
      const validation = validateTriggerConfig(trigger)
      if (!validation.valid) {
        triggerErrors.push(...validation.errors)
      }
    }

    if (triggerErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'Invalid trigger configuration',
          details: { field: 'triggers', errors: triggerErrors },
        },
        { status: 400 }
      )
    }

    // Validate actions
    const actionErrors: string[] = []
    for (const action of actions as WorkflowAction[]) {
      const validation = validateActionConfig(action)
      if (!validation.valid) {
        actionErrors.push(...validation.errors)
      }
    }

    if (actionErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'Invalid action configuration',
          details: { field: 'actions', errors: actionErrors },
        },
        { status: 400 }
      )
    }

    // Create workflow
    const { data, error } = await createWorkflow(supabase, agencyId, user.id, {
      name: sanitizedName,
      description: sanitizedDescription,
      triggers,
      actions,
      isActive: isActive === true,
    })

    if (error) {
      return createErrorResponse(500, 'Failed to create workflow')
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

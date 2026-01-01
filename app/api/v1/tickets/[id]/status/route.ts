import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import type { TicketStatus } from '@/types/database'

const VALID_STATUSES: TicketStatus[] = ['new', 'in_progress', 'waiting_client', 'resolved']

// Allowed status transitions
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_progress', 'waiting_client'],
  in_progress: ['waiting_client', 'resolved'],
  waiting_client: ['in_progress', 'resolved'],
  resolved: ['in_progress'], // Reopening
}

// PATCH /api/v1/tickets/[id]/status - Change ticket status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status: newStatus } = body as { status: TicketStatus }

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Get current ticket status
    const { data: currentTicket, error: fetchError } = await supabase
      .from('ticket')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const currentStatus = currentTicket.status as TicketStatus

    // Validate transition
    if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from "${currentStatus}" to "${newStatus}"`,
          allowed: ALLOWED_TRANSITIONS[currentStatus],
        },
        { status: 400 }
      )
    }

    // Special handling for resolved status - require resolution notes
    if (newStatus === 'resolved') {
      return NextResponse.json(
        { error: 'Use /api/v1/tickets/[id]/resolve endpoint to resolve tickets' },
        { status: 400 }
      )
    }

    // Update status
    const { data: ticket, error: updateError } = await supabase
      .from('ticket')
      .update({ status: newStatus })
      .eq('id', id)
      .select(`
        *,
        client:client_id (
          id,
          name,
          health_status
        ),
        assignee:assignee_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating ticket status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: ticket,
      previousStatus: currentStatus,
      newStatus,
    })
  } catch (error) {
    console.error('Ticket status PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

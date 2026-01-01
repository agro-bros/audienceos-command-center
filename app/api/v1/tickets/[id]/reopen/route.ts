import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'

// POST /api/v1/tickets/[id]/reopen - Reopen a resolved ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params
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

    const body = await request.json().catch(() => ({}))
    const { reason } = body as { reason?: string }

    // Verify ticket exists and is resolved
    const { data: currentTicket, error: fetchError } = await supabase
      .from('ticket')
      .select('id, status, resolved_at, agency_id')
      .eq('id', ticketId)
      .single()

    if (fetchError || !currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    if (currentTicket.status !== 'resolved') {
      return NextResponse.json(
        { error: 'Only resolved tickets can be reopened' },
        { status: 400 }
      )
    }

    // Check if ticket was resolved more than 30 days ago
    if (currentTicket.resolved_at) {
      const resolvedDate = new Date(currentTicket.resolved_at)
      const daysSinceResolved = Math.floor(
        (Date.now() - resolvedDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSinceResolved > 30) {
        // For now, just log a warning - in production, this could require manager approval
        console.warn(`Reopening ticket ${ticketId} that was resolved ${daysSinceResolved} days ago`)
      }
    }

    // Reopen ticket - set status to in_progress, clear resolution data
    const { data: ticket, error: updateError } = await supabase
      .from('ticket')
      .update({
        status: 'in_progress',
        resolved_by: null,
        resolved_at: null,
        // Note: Keep resolution_notes for historical reference
      })
      .eq('id', ticketId)
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
      console.error('Error reopening ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to reopen ticket' },
        { status: 500 }
      )
    }

    // Add a note about reopening if reason provided
    if (reason && reason.trim()) {
      await supabase
        .from('ticket_note')
        .insert({
          ticket_id: ticketId,
          agency_id: currentTicket.agency_id,
          content: `Ticket reopened: ${reason.trim()}`,
          is_internal: true,
          added_by: session.user.id,
        })
    }

    return NextResponse.json({
      data: ticket,
      message: 'Ticket reopened successfully',
    })
  } catch (error) {
    console.error('Ticket reopen error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

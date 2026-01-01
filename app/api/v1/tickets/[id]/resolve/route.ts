import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'

// POST /api/v1/tickets/[id]/resolve - Resolve a ticket with mandatory final note
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

    const body = await request.json()
    const {
      resolution_notes,
      time_spent_minutes,
      send_client_email = false,
    } = body as {
      resolution_notes: string
      time_spent_minutes?: number
      send_client_email?: boolean
    }

    // Validate required resolution notes
    if (!resolution_notes || resolution_notes.trim().length === 0) {
      return NextResponse.json(
        { error: 'Resolution notes are required to resolve a ticket' },
        { status: 400 }
      )
    }

    // Verify ticket exists and get current state
    const { data: currentTicket, error: fetchError } = await supabase
      .from('ticket')
      .select(`
        id,
        status,
        client:client_id (
          id,
          name,
          contact_email
        )
      `)
      .eq('id', ticketId)
      .single()

    if (fetchError || !currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check if already resolved
    if (currentTicket.status === 'resolved') {
      return NextResponse.json(
        { error: 'Ticket is already resolved' },
        { status: 400 }
      )
    }

    // Update ticket to resolved status
    const { data: ticket, error: updateError } = await supabase
      .from('ticket')
      .update({
        status: 'resolved',
        resolution_notes: resolution_notes.trim(),
        time_spent_minutes: time_spent_minutes || null,
        resolved_by: session.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select(`
        *,
        client:client_id (
          id,
          name,
          health_status,
          contact_email
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
      console.error('Error resolving ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to resolve ticket' },
        { status: 500 }
      )
    }

    // TODO: If send_client_email is true, queue an email to the client
    // This would integrate with an email service like SendGrid or Resend
    const emailSent = false
    if (send_client_email) {
      // Future: Send email via email integration
      console.log('Client email sending not yet implemented')
    }

    return NextResponse.json({
      data: ticket,
      emailSent,
      message: 'Ticket resolved successfully',
    })
  } catch (error) {
    console.error('Ticket resolve error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

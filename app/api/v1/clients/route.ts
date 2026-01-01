import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import type { HealthStatus } from '@/types/database'

// GET /api/v1/clients - List all clients for the agency
export async function GET(request: NextRequest) {
  try {
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const healthStatus = searchParams.get('health_status')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    // Build query - RLS will filter by agency_id
    let query = supabase
      .from('client')
      .select(`
        *,
        assignments:client_assignment (
          id,
          role,
          user:user_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        )
      `)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (stage) {
      query = query.eq('stage', stage)
    }
    if (healthStatus) {
      query = query.eq('health_status', healthStatus as HealthStatus)
    }
    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_email.ilike.%${search}%,contact_name.ilike.%${search}%`)
    }

    const { data: clients, error } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: clients })
  } catch (error) {
    console.error('Clients GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/clients - Create a new client
export async function POST(request: NextRequest) {
  try {
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
    const { name, contact_email, contact_name, stage, health_status, notes, tags } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    // Get user's agency_id from their profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user')
      .select('agency_id')
      .eq('id', session.user.id)
      .single()

    if (profileError || !userProfile?.agency_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      )
    }

    const { data: client, error } = await supabase
      .from('client')
      .insert({
        agency_id: userProfile.agency_id,
        name,
        contact_email: contact_email || null,
        contact_name: contact_name || null,
        stage: stage || 'Lead',
        health_status: health_status || 'green',
        notes: notes || null,
        tags: tags || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error) {
    console.error('Clients POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

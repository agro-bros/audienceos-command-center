import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import type { Database } from '@/types/database'

type Communication = Database['public']['Tables']['communication']['Row']

// Mock mode detection
const isMockMode = () => {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.includes('placeholder') || url === ''
}

// Mock communications for demo
const MOCK_COMMUNICATIONS = [
  {
    id: 'comm-001',
    agency_id: 'demo-agency',
    client_id: 'client-001',
    platform: 'gmail',
    thread_id: 'thread-001',
    subject: 'Re: Q4 Campaign Performance Review',
    content: 'Hi team, I wanted to follow up on the Q4 campaign results. The ROAS numbers look promising but I have some questions about the attribution window.',
    sender_email: 'marketing@beardbrand.com',
    sender_name: 'Eric Bandholz',
    is_inbound: true,
    needs_reply: true,
    replied_at: null,
    replied_by: null,
    received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comm-002',
    agency_id: 'demo-agency',
    client_id: 'client-002',
    platform: 'slack',
    thread_id: 'thread-002',
    subject: null,
    content: 'Quick question - are we still on track for the new pixel deployment this Friday? Need to coordinate with our dev team.',
    sender_email: null,
    sender_name: 'Joey Zwillinger',
    is_inbound: true,
    needs_reply: true,
    replied_at: null,
    replied_by: null,
    received_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comm-003',
    agency_id: 'demo-agency',
    client_id: 'client-003',
    platform: 'gmail',
    thread_id: 'thread-003',
    subject: 'GTM Access - IT Team Response',
    content: 'Our IT team has approved the GTM access request. They should be sending credentials to your team within 24 hours.',
    sender_email: 'ops@rtaoutdoorliving.com',
    sender_name: 'Michael Chen',
    is_inbound: true,
    needs_reply: false,
    replied_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    replied_by: 'user-001',
    received_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comm-004',
    agency_id: 'demo-agency',
    client_id: 'client-004',
    platform: 'slack',
    thread_id: 'thread-004',
    subject: null,
    content: 'The new homepage is live! Can you verify the tracking is firing correctly? We pushed the update about an hour ago.',
    sender_email: null,
    sender_name: 'Rich Fulop',
    is_inbound: true,
    needs_reply: true,
    replied_at: null,
    replied_by: null,
    received_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comm-005',
    agency_id: 'demo-agency',
    client_id: 'client-005',
    platform: 'gmail',
    thread_id: 'thread-005',
    subject: 'November Report Received - Thank You!',
    content: 'Thanks for the detailed November report. The insights on the iOS attribution changes were particularly helpful. Looking forward to discussing next steps.',
    sender_email: 'ben@gymshark.com',
    sender_name: 'Ben Francis',
    is_inbound: true,
    needs_reply: false,
    replied_at: null,
    replied_by: null,
    received_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comm-006',
    agency_id: 'demo-agency',
    client_id: 'client-006',
    platform: 'gmail',
    thread_id: 'thread-006',
    subject: 'Conversion Discrepancy Investigation',
    content: 'We noticed a 12% difference between Meta reported conversions and our Shopify orders last week. Can you help us understand what might be causing this?',
    sender_email: 'danny@aloyoga.com',
    sender_name: 'Danny Harris',
    is_inbound: true,
    needs_reply: true,
    replied_at: null,
    replied_by: null,
    received_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
]

/**
 * GET /api/v1/communications
 * List all communications across all clients with filtering and pagination
 */
export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  // Mock mode - return demo data without auth
  if (isMockMode()) {
    return NextResponse.json({
      items: MOCK_COMMUNICATIONS,
      pagination: {
        cursor: null,
        has_more: false,
        total: MOCK_COMMUNICATIONS.length,
      },
    })
  }

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const source = searchParams.get('source') // 'slack' | 'gmail' | null
    const needsReply = searchParams.get('needs_reply') === 'true'
    const clientId = searchParams.get('client_id')
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)

    // Build query (note: client join removed - schema relationship not yet configured)
    let query = supabase
      .from('communication')
      .select(`*`, { count: 'exact' })
      .eq('agency_id', agencyId)
      .order('received_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (source && (source === 'slack' || source === 'gmail')) {
      query = query.eq('platform', source)
    }

    if (needsReply) {
      query = query.eq('needs_reply', true)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    // Cursor-based pagination
    if (cursor) {
      query = query.lt('received_at', cursor)
    }

    const { data, error, count } = await query

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching communications:', error)
      }
      return createErrorResponse(500, 'Failed to fetch communications')
    }

    const items = (data || []) as Communication[]
    const lastItem = items[items.length - 1]
    const nextCursor = lastItem?.received_at || null
    const hasMore = items.length === limit

    return NextResponse.json({
      items,
      pagination: {
        cursor: nextCursor,
        has_more: hasMore,
        total: count || 0,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unexpected error:', error)
    }
    return createErrorResponse(500, 'Internal server error')
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase';
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security';
import { ChatService } from '@/lib/chat/service';
import type { ChatMessage, Citation, RouteType } from '@/lib/chat/types';
import type { ChatRole, ChatRoute } from '@/types/database';

/**
 * POST /api/v1/chat
 * Process a chat message through the HGC service
 *
 * Request body:
 * {
 *   message: string;
 *   sessionId?: string;
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 });
  if (rateLimitResponse) return rateLimitResponse;

  // CSRF protection
  const csrfError = withCsrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const supabase = await createRouteHandlerClient(cookies);

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase);
    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized');
    }

    // Parse request
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }

    const { message, sessionId } = body as {
      message: string;
      sessionId?: string;
    };

    // Validate message: must be string and non-empty after trim
    if (!message || typeof message !== 'string') {
      return createErrorResponse(400, 'Missing or invalid message parameter');
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return createErrorResponse(400, 'Message cannot be empty or whitespace-only');
    }

    // Fetch session history if provided
    let history: ChatMessage[] = [];

    if (sessionId) {
      const { data: messages, error: fetchError } = await supabase
        .from('chat_message')
        .select('*')
        .eq('session_id', sessionId)
        .eq('agency_id', agencyId) // RLS: Ensure agency isolation
        .order('created_at', { ascending: true });

      if (fetchError) {
        // Log but don't fail: chat works without history context
        console.warn('[Supabase] Error fetching chat history:', {
          code: fetchError.code,
          message: fetchError.message,
          sessionId,
        });
        // Continue with empty history - user gets response but without context
      } else if (messages && Array.isArray(messages)) {
        history = messages.map((msg: any): ChatMessage => ({
          id: msg.id,
          role: (msg.role as ChatRole) as 'user' | 'assistant' | 'system',
          content: msg.content,
          citations: (Array.isArray(msg.citations) ? msg.citations : []) as Citation[],
          route: (msg.route_used as ChatRoute | null || undefined) as RouteType | undefined,
          timestamp: new Date(msg.created_at),
        }));
      }
    }

    // Initialize chat service
    const chatService = new ChatService({
      agencyId,
      userId: user.id,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      geminiApiKey: process.env.GOOGLE_AI_API_KEY || '',
    });

    // Process message through HGC service
    const result = await chatService.processMessage(trimmedMessage, history);

    // Store message in database if sessionId provided
    if (sessionId) {
      const { error: storeError } = await supabase
        .from('chat_message')
        .insert([
          {
            session_id: sessionId,
            agency_id: agencyId,
            role: 'user' as ChatRole,
            content: trimmedMessage,
            created_at: new Date().toISOString(),
          },
          {
            session_id: sessionId,
            agency_id: agencyId,
            role: 'assistant' as ChatRole,
            content: result.content,
            citations: (result.citations || []) as any, // Store as JSON
            route_used: (result.route || null) as ChatRoute | null,
            created_at: new Date().toISOString(),
          },
        ]);

      if (storeError) {
        console.error('[Supabase] Error storing chat message:', storeError);
        // Log the error but continue - response already generated, user gets AI response
        // TODO: Add alerting for persistent persistence failures
      }
    }

    // Return response
    return NextResponse.json({
      id: result.id,
      role: result.role,
      content: result.content,
      route: result.route,
      citations: result.citations || [],
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('[ChatAPI] POST error:', error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
}

/**
 * GET /api/v1/chat
 * Retrieve message history for a session
 *
 * Query params:
 * - sessionId: string (required)
 * - limit?: number (default: 50)
 * - offset?: number (default: 0)
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute (more lenient for reads)
  const rateLimitResponse = withRateLimit(request, { maxRequests: 60, windowMs: 60000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = await createRouteHandlerClient(cookies);

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase);
    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized');
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!sessionId) {
      return createErrorResponse(400, 'Missing sessionId parameter');
    }

    // Fetch messages
    const { data: messages, error, count } = await supabase
      .from('chat_message')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .eq('agency_id', agencyId) // RLS: Ensure agency isolation
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Supabase] Error fetching messages:', error);
      return createErrorResponse(500, 'Failed to fetch messages');
    }

    // Format response
    const formattedMessages = (messages || []).map((msg: any): ChatMessage => ({
      id: msg.id,
      role: (msg.role as ChatRole) as 'user' | 'assistant' | 'system',
      content: msg.content,
      citations: (Array.isArray(msg.citations) ? msg.citations : []) as Citation[],
      route: (msg.route_used as ChatRoute | null || undefined) as RouteType | undefined,
      timestamp: new Date(msg.created_at),
    }));

    return NextResponse.json({
      messages: formattedMessages,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error('[ChatAPI] GET error:', error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
}

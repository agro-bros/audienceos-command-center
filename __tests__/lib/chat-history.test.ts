/**
 * Chat History Service Tests
 *
 * Verifies chat session and message management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOrCreateSession,
  getSessionById,
  getRecentSessions,
  addMessage,
  getSessionMessages,
  formatMessagesForContext,
  type ChatSession,
  type ChatMessage,
} from '@/lib/chat/context/chat-history';

// Create mock Supabase client
function createMockSupabase(mockData: {
  sessions?: ChatSession[];
  messages?: ChatMessage[];
  createResult?: ChatSession;
  createMessageResult?: ChatMessage;
}) {
  const selectResult = (table: string) => {
    if (table === 'chat_session') {
      return {
        eq: (_col: string, _val: unknown) => ({
          eq: (_col2: string, _val2: unknown) => ({
            eq: (_col3: string, _val3: unknown) => ({
              order: () => ({
                limit: () => ({
                  single: async () => ({
                    data: mockData.sessions?.[0] || null,
                    error: mockData.sessions?.[0] ? null : { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
            order: () => ({
              limit: (_n: number) => ({
                data: mockData.sessions || [],
                error: null,
              }),
            }),
          }),
          single: async () => ({
            data: mockData.sessions?.[0] || null,
            error: mockData.sessions?.[0] ? null : { code: 'PGRST116' },
          }),
        }),
      };
    }
    if (table === 'chat_message') {
      return {
        eq: () => ({
          order: () => ({
            limit: () => ({
              data: mockData.messages || [],
              error: null,
            }),
          }),
          eq: () => ({
            order: () => ({
              limit: () => ({
                data: mockData.messages || [],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    return {
      eq: () => ({ single: async () => ({ data: null, error: null }) }),
    };
  };

  return {
    from: (table: string) => ({
      select: () => selectResult(table),
      insert: (data: Record<string, unknown>) => ({
        select: () => ({
          single: async () => ({
            data: table === 'chat_session'
              ? mockData.createResult || { id: 'new-session-id', ...data }
              : mockData.createMessageResult || { id: 'new-message-id', ...data },
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          data: null,
          error: null,
        }),
      }),
    }),
  } as any;
}

describe('Chat History Service', () => {
  describe('getOrCreateSession', () => {
    it('should return existing active session if found', async () => {
      const existingSession: ChatSession = {
        id: 'session-123',
        agency_id: 'agency-1',
        user_id: 'user-1',
        title: 'Existing Chat',
        context: null,
        is_active: true,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const mockSupabase = createMockSupabase({
        sessions: [existingSession],
      });

      const session = await getOrCreateSession(mockSupabase, {
        agencyId: 'agency-1',
        userId: 'user-1',
      });

      expect(session.id).toBe('session-123');
      expect(session.title).toBe('Existing Chat');
    });

    it('should create new session if none exists', async () => {
      const newSession: ChatSession = {
        id: 'new-session-456',
        agency_id: 'agency-2',
        user_id: 'user-2',
        title: 'New Chat',
        context: null,
        is_active: true,
        last_message_at: null,
        created_at: new Date().toISOString(),
      };

      const mockSupabase = createMockSupabase({
        sessions: [], // No existing sessions
        createResult: newSession,
      });

      const session = await getOrCreateSession(mockSupabase, {
        agencyId: 'agency-2',
        userId: 'user-2',
        title: 'New Chat',
      });

      expect(session.id).toBe('new-session-456');
    });
  });

  describe('getSessionById', () => {
    it('should return session when found', async () => {
      const session: ChatSession = {
        id: 'session-789',
        agency_id: 'agency-1',
        user_id: 'user-1',
        title: 'Test Session',
        context: null,
        is_active: true,
        last_message_at: null,
        created_at: new Date().toISOString(),
      };

      const mockSupabase = createMockSupabase({
        sessions: [session],
      });

      const result = await getSessionById(mockSupabase, 'session-789');

      expect(result?.id).toBe('session-789');
      expect(result?.title).toBe('Test Session');
    });

    it('should return null when session not found', async () => {
      const mockSupabase = createMockSupabase({
        sessions: [],
      });

      const result = await getSessionById(mockSupabase, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should add message to session', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        session_id: 'session-1',
        agency_id: 'agency-1',
        role: 'user',
        content: 'Hello, how are you?',
        route_used: 'casual',
        citations: null,
        tokens_used: 10,
        created_at: new Date().toISOString(),
      };

      const mockSupabase = createMockSupabase({
        createMessageResult: message,
      });

      const result = await addMessage(mockSupabase, {
        sessionId: 'session-1',
        agencyId: 'agency-1',
        role: 'user',
        content: 'Hello, how are you?',
        routeUsed: 'casual',
        tokensUsed: 10,
      });

      expect(result.id).toBe('msg-1');
      expect(result.content).toBe('Hello, how are you?');
    });
  });

  describe('getSessionMessages', () => {
    it('should return messages for session', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          session_id: 'session-1',
          agency_id: 'agency-1',
          role: 'user',
          content: 'Hello',
          route_used: null,
          citations: null,
          tokens_used: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          session_id: 'session-1',
          agency_id: 'agency-1',
          role: 'assistant',
          content: 'Hi there!',
          route_used: 'casual',
          citations: null,
          tokens_used: null,
          created_at: new Date().toISOString(),
        },
      ];

      const mockSupabase = createMockSupabase({
        messages,
      });

      const result = await getSessionMessages(mockSupabase, 'session-1');

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });
  });

  describe('formatMessagesForContext', () => {
    it('should format messages for system prompt', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          session_id: 'session-1',
          agency_id: 'agency-1',
          role: 'user',
          content: 'What clients do I have?',
          route_used: null,
          citations: null,
          tokens_used: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          session_id: 'session-1',
          agency_id: 'agency-1',
          role: 'assistant',
          content: 'You have 5 active clients.',
          route_used: 'dashboard',
          citations: null,
          tokens_used: null,
          created_at: new Date().toISOString(),
        },
      ];

      const formatted = formatMessagesForContext(messages);

      expect(formatted).toContain('Recent Conversation History');
      expect(formatted).toContain('User: What clients do I have?');
      expect(formatted).toContain('Assistant: You have 5 active clients.');
    });

    it('should return empty string for empty messages', () => {
      const formatted = formatMessagesForContext([]);

      expect(formatted).toBe('');
    });

    it('should truncate long messages', () => {
      const longContent = 'A'.repeat(600);
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          session_id: 'session-1',
          agency_id: 'agency-1',
          role: 'user',
          content: longContent,
          route_used: null,
          citations: null,
          tokens_used: null,
          created_at: new Date().toISOString(),
        },
      ];

      const formatted = formatMessagesForContext(messages);

      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThan(longContent.length + 200);
    });
  });
});

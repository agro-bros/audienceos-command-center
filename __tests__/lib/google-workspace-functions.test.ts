/**
 * Google Workspace Function Tests
 *
 * Verifies Gmail, Calendar, Drive functions for chat.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getEmails,
  getCalendarEvents,
  getDriveFiles,
  checkGoogleConnection,
} from '@/lib/chat/functions/google-workspace';

// Mock OAuth provider
vi.mock('@/lib/chat/functions/oauth-provider', () => ({
  getGoogleCredentials: vi.fn(async (supabase: any, userId: string) => {
    // Return credentials only for specific test user
    if (userId === 'connected-user') {
      return {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      };
    }
    return null;
  }),
  isIntegrationConnected: vi.fn(async (supabase: any, userId: string, type: string) => {
    if (userId === 'connected-user') {
      return type === 'gmail' || type === 'google-calendar';
    }
    return false;
  }),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Google Workspace Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  const mockSupabase = { from: vi.fn() } as any;

  describe('getEmails', () => {
    it('should return not connected message when user has no credentials', async () => {
      const result = await getEmails(
        { agencyId: 'agency-1', userId: 'unconnected-user', supabase: mockSupabase },
        {}
      );

      expect(result.connected).toBe(false);
      expect(result.message).toContain('Gmail is not connected');
      expect(result.emails).toHaveLength(0);
    });

    it('should return emails when connected', async () => {
      // Mock Gmail API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            messages: [{ id: 'msg-1' }, { id: 'msg-2' }],
            resultSizeEstimate: 2,
          }),
        })
        // Mock message details
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'msg-1',
            threadId: 'thread-1',
            snippet: 'Hello there',
            labelIds: ['INBOX', 'UNREAD'],
            payload: {
              headers: [
                { name: 'Subject', value: 'Test Subject 1' },
                { name: 'From', value: 'sender@example.com' },
                { name: 'Date', value: '2026-01-20' },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'msg-2',
            threadId: 'thread-2',
            snippet: 'Hi again',
            labelIds: ['INBOX'],
            payload: {
              headers: [
                { name: 'Subject', value: 'Test Subject 2' },
                { name: 'From', value: 'another@example.com' },
                { name: 'Date', value: '2026-01-19' },
              ],
            },
          }),
        });

      const result = await getEmails(
        { agencyId: 'agency-1', userId: 'connected-user', supabase: mockSupabase },
        { maxResults: 5 }
      );

      expect(result.connected).toBe(true);
      expect(result.emails.length).toBeGreaterThan(0);
      expect(result.emails[0].subject).toBe('Test Subject 1');
      expect(result.emails[0].isUnread).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await getEmails(
        { agencyId: 'agency-1', userId: 'connected-user', supabase: mockSupabase },
        {}
      );

      expect(result.connected).toBe(true);
      expect(result.message).toContain('Gmail API error');
    });
  });

  describe('getCalendarEvents', () => {
    it('should return not connected message when user has no credentials', async () => {
      const result = await getCalendarEvents(
        { agencyId: 'agency-1', userId: 'unconnected-user', supabase: mockSupabase },
        {}
      );

      expect(result.connected).toBe(false);
      expect(result.message).toContain('Google Calendar is not connected');
      expect(result.events).toHaveLength(0);
    });

    it('should return events when connected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'event-1',
              summary: 'Team Meeting',
              start: { dateTime: '2026-01-20T10:00:00Z' },
              end: { dateTime: '2026-01-20T11:00:00Z' },
              attendees: [{ email: 'user@example.com' }],
            },
            {
              id: 'event-2',
              summary: 'All-day Conference',
              start: { date: '2026-01-21' },
              end: { date: '2026-01-22' },
            },
          ],
        }),
      });

      const result = await getCalendarEvents(
        { agencyId: 'agency-1', userId: 'connected-user', supabase: mockSupabase },
        {}
      );

      expect(result.connected).toBe(true);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].title).toBe('Team Meeting');
      expect(result.events[1].isAllDay).toBe(true);
    });
  });

  describe('getDriveFiles', () => {
    it('should return not connected message when user has no credentials', async () => {
      const result = await getDriveFiles(
        { agencyId: 'agency-1', userId: 'unconnected-user', supabase: mockSupabase },
        {}
      );

      expect(result.connected).toBe(false);
      expect(result.message).toContain('Google Drive is not connected');
      expect(result.files).toHaveLength(0);
    });

    it('should return files when connected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [
            {
              id: 'file-1',
              name: 'Project Plan.docx',
              mimeType: 'application/vnd.google-apps.document',
              modifiedTime: '2026-01-20T10:00:00Z',
              webViewLink: 'https://docs.google.com/...',
            },
            {
              id: 'file-2',
              name: 'Budget.xlsx',
              mimeType: 'application/vnd.google-apps.spreadsheet',
              modifiedTime: '2026-01-19T15:00:00Z',
              webViewLink: 'https://sheets.google.com/...',
            },
          ],
        }),
      });

      const result = await getDriveFiles(
        { agencyId: 'agency-1', userId: 'connected-user', supabase: mockSupabase },
        { query: 'project' }
      );

      expect(result.connected).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].name).toBe('Project Plan.docx');
    });
  });

  describe('checkGoogleConnection', () => {
    it('should return connection status for all services', async () => {
      const result = await checkGoogleConnection(
        { agencyId: 'agency-1', userId: 'connected-user', supabase: mockSupabase },
        {}
      );

      expect(result.gmail).toBe(true);
      expect(result.calendar).toBe(true);
      expect(result.drive).toBe(false); // Only gmail and calendar mocked
    });

    it('should return all false when not connected', async () => {
      const result = await checkGoogleConnection(
        { agencyId: 'agency-1', userId: 'unconnected-user', supabase: mockSupabase },
        {}
      );

      expect(result.gmail).toBe(false);
      expect(result.calendar).toBe(false);
      expect(result.drive).toBe(false);
    });
  });
});

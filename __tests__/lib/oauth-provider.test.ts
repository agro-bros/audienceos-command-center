/**
 * OAuth Provider Tests
 *
 * Verifies OAuth token access for chat functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOAuthCredentials,
  getAllOAuthStatus,
  isIntegrationConnected,
  getGoogleCredentials,
  loadChatFunctionOAuthContext,
  type OAuthIntegrationType,
} from '@/lib/chat/functions/oauth-provider';

// Mock crypto module
vi.mock('@/lib/crypto', () => ({
  deserializeEncryptedToken: vi.fn((token: string) => {
    if (!token) return null;
    return { encrypted: token }; // Mock deserialized token
  }),
  decryptToken: vi.fn((encrypted: { encrypted: string }) => {
    if (!encrypted) return null;
    // Return a mock decrypted token
    return `decrypted_${encrypted.encrypted}`;
  }),
}));

// Create mock Supabase client
function createMockSupabase(mockData: {
  credentials?: Array<{
    type: string;
    access_token: string;
    refresh_token?: string;
    is_connected: boolean;
    last_sync_at?: string;
    error_message?: string;
    expires_at?: string;
  }>;
}) {
  return {
    from: (table: string) => ({
      select: (fields: string) => ({
        eq: (col: string, val: unknown) => {
          const filtered = mockData.credentials?.filter(c => {
            if (col === 'user_id') return true;
            if (col === 'type') return c.type === val;
            return true;
          }) || [];

          return {
            eq: (col2: string, val2: unknown) => {
              const filtered2 = filtered.filter(c => {
                if (col2 === 'type') return c.type === val2;
                return true;
              });

              return {
                single: async () => ({
                  data: filtered2[0] || null,
                  error: filtered2.length === 0 ? { code: 'PGRST116' } : null,
                }),
              };
            },
            single: async () => ({
              data: filtered[0] || null,
              error: filtered.length === 0 ? { code: 'PGRST116' } : null,
            }),
            // For getAllOAuthStatus (returns array)
            then: async (resolve: (result: { data: typeof filtered; error: null }) => void) => resolve({
              data: filtered,
              error: null,
            }),
          };
        },
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            data: null,
            error: null,
          }),
        }),
      }),
    }),
  } as any;
}

describe('OAuth Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOAuthCredentials', () => {
    it('should return decrypted credentials for connected integration', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [
          {
            type: 'gmail',
            access_token: 'encrypted_access_123',
            refresh_token: 'encrypted_refresh_456',
            is_connected: true,
          },
        ],
      });

      const credentials = await getOAuthCredentials(mockSupabase, 'user-1', 'gmail');

      expect(credentials).not.toBeNull();
      expect(credentials?.accessToken).toBe('decrypted_encrypted_access_123');
      expect(credentials?.refreshToken).toBe('decrypted_encrypted_refresh_456');
    });

    it('should return null for disconnected integration', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [
          {
            type: 'gmail',
            access_token: 'encrypted_token',
            is_connected: false,
          },
        ],
      });

      const credentials = await getOAuthCredentials(mockSupabase, 'user-1', 'gmail');

      expect(credentials).toBeNull();
    });

    it('should return null when integration not found', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [],
      });

      const credentials = await getOAuthCredentials(mockSupabase, 'user-1', 'slack');

      expect(credentials).toBeNull();
    });
  });

  describe('isIntegrationConnected', () => {
    it('should return true for connected integration', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [
          {
            type: 'gmail',
            access_token: 'token',
            is_connected: true,
          },
        ],
      });

      const connected = await isIntegrationConnected(mockSupabase, 'user-1', 'gmail');

      expect(connected).toBe(true);
    });

    it('should return false for disconnected integration', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [
          {
            type: 'gmail',
            access_token: 'token',
            is_connected: false,
          },
        ],
      });

      const connected = await isIntegrationConnected(mockSupabase, 'user-1', 'gmail');

      expect(connected).toBe(false);
    });

    it('should return false when integration not found', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [],
      });

      const connected = await isIntegrationConnected(mockSupabase, 'user-1', 'slack');

      expect(connected).toBe(false);
    });
  });

  describe('getGoogleCredentials', () => {
    it('should prefer gmail credentials', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [
          {
            type: 'gmail',
            access_token: 'gmail_token',
            is_connected: true,
          },
          {
            type: 'google-calendar',
            access_token: 'calendar_token',
            is_connected: true,
          },
        ],
      });

      const credentials = await getGoogleCredentials(mockSupabase, 'user-1');

      expect(credentials?.accessToken).toBe('decrypted_gmail_token');
    });

    it('should fall back to calendar if gmail not connected', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [
          {
            type: 'google-calendar',
            access_token: 'calendar_token',
            is_connected: true,
          },
        ],
      });

      const credentials = await getGoogleCredentials(mockSupabase, 'user-1');

      expect(credentials?.accessToken).toBe('decrypted_calendar_token');
    });
  });

  describe('loadChatFunctionOAuthContext', () => {
    it('should load complete OAuth context', async () => {
      const mockSupabase = createMockSupabase({
        credentials: [
          {
            type: 'gmail',
            access_token: 'gmail_token',
            is_connected: true,
          },
          {
            type: 'slack',
            access_token: 'slack_token',
            is_connected: true,
          },
        ],
      });

      const context = await loadChatFunctionOAuthContext(mockSupabase, 'user-1');

      expect(context.google).toBeDefined();
      expect(context.slack).toBeDefined();
      expect(context.integrationStatus.length).toBeGreaterThan(0);
    });
  });
});

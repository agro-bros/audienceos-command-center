/**
 * Test: TASK-013 Part 3 - Client Access Helper Functions
 *
 * Tests member-scoped client access verification and filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyClientAccess,
  getAccessibleClientIds,
  filterClientsByAccess,
  hasMemberWriteAccess,
  getMemberClientPermission,
  enforceClientAccess,
  logClientAccessAttempt,
} from '@/lib/rbac/client-access';
import { permissionService } from '@/lib/rbac/permission-service';

// Mock supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

describe('Client Access Helpers (TASK-013 Part 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyClientAccess', () => {
    it('should call permissionService.hasMemberClientAccess', async () => {
      const hasMemberClientAccessSpy = vi
        .spyOn(permissionService, 'hasMemberClientAccess')
        .mockResolvedValue(true);

      const result = await verifyClientAccess(
        'user-1',
        'agency-1',
        'client-1',
        mockSupabase as any
      );

      expect(result).toBe(true);
      expect(hasMemberClientAccessSpy).toHaveBeenCalledWith(
        'user-1',
        'agency-1',
        'client-1',
        mockSupabase
      );
    });
  });

  describe('getAccessibleClientIds', () => {
    it('should return empty array for non-members', async () => {
      vi.spyOn(permissionService, 'getMemberAccessibleClientIds').mockResolvedValue(
        []
      );

      const result = await getAccessibleClientIds(
        'user-1',
        'agency-1',
        mockSupabase as any
      );

      expect(result).toEqual([]);
    });

    it('should return assigned client IDs for members', async () => {
      vi.spyOn(permissionService, 'getMemberAccessibleClientIds').mockResolvedValue([
        'client-1',
        'client-2',
      ]);

      const result = await getAccessibleClientIds(
        'user-1',
        'agency-1',
        mockSupabase as any
      );

      expect(result).toEqual(['client-1', 'client-2']);
    });
  });

  describe('filterClientsByAccess', () => {
    it('should return all clients for non-members', async () => {
      vi.spyOn(permissionService, 'getMemberAccessibleClientIds').mockResolvedValue(
        []
      );

      const clients = [
        { id: 'client-1', name: 'Client 1' },
        { id: 'client-2', name: 'Client 2' },
      ];

      const result = await filterClientsByAccess(
        clients,
        'user-1',
        'agency-1',
        mockSupabase as any
      );

      expect(result).toEqual(clients);
    });

    it('should filter clients for members', async () => {
      vi.spyOn(permissionService, 'getMemberAccessibleClientIds').mockResolvedValue([
        'client-1',
      ]);

      const clients = [
        { id: 'client-1', name: 'Client 1' },
        { id: 'client-2', name: 'Client 2' },
      ];

      const result = await filterClientsByAccess(
        clients,
        'user-1',
        'agency-1',
        mockSupabase as any
      );

      expect(result).toEqual([{ id: 'client-1', name: 'Client 1' }]);
    });
  });

  describe('hasMemberWriteAccess', () => {
    it('should return true for managers', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(2);

      const result = await hasMemberWriteAccess(
        'user-1',
        'agency-1',
        'client-1',
        mockSupabase as any
      );

      expect(result).toBe(true);
    });

    it('should check member_client_access for members', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(4);

      const mockData = { permission: 'write' };
      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await hasMemberWriteAccess(
        'user-1',
        'agency-1',
        'client-1',
        mockSupabase as any
      );

      expect(result).toBe(true);
    });

    it('should return false for members with read-only access', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(4);

      mockSupabase.single.mockResolvedValue({
        data: { permission: 'read' },
        error: null,
      });

      const result = await hasMemberWriteAccess(
        'user-1',
        'agency-1',
        'client-1',
        mockSupabase as any
      );

      expect(result).toBe(false);
    });
  });

  describe('getMemberClientPermission', () => {
    it('should return "write" for managers', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(2);

      const result = await getMemberClientPermission(
        'user-1',
        'agency-1',
        'client-1',
        mockSupabase as any
      );

      expect(result).toBe('write');
    });

    it('should return permission level for members', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(4);

      mockSupabase.single.mockResolvedValue({
        data: { permission: 'read' },
        error: null,
      });

      const result = await getMemberClientPermission(
        'user-1',
        'agency-1',
        'client-1',
        mockSupabase as any
      );

      expect(result).toBe('read');
    });

    it('should return null if member has no access', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(4);

      mockSupabase.single.mockResolvedValue({ data: null, error: new Error('Not found') });

      const result = await getMemberClientPermission(
        'user-1',
        'agency-1',
        'client-1',
        mockSupabase as any
      );

      expect(result).toBeNull();
    });
  });

  describe('enforceClientAccess', () => {
    it('should allow access for managers', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(2);

      const result = await enforceClientAccess(
        'user-1',
        'agency-1',
        'client-1',
        'write',
        mockSupabase as any
      );

      expect(result).toBe(true);
    });

    it('should allow read access for members with read permission', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(4);

      mockSupabase.single.mockResolvedValue({
        data: { permission: 'read' },
        error: null,
      });

      const result = await enforceClientAccess(
        'user-1',
        'agency-1',
        'client-1',
        'read',
        mockSupabase as any
      );

      expect(result).toBe(true);
    });

    it('should deny write access for read-only members', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(4);

      mockSupabase.single.mockResolvedValue({
        data: { permission: 'read' },
        error: null,
      });

      const result = await enforceClientAccess(
        'user-1',
        'agency-1',
        'client-1',
        'write',
        mockSupabase as any
      );

      expect(result).toBe(false);
    });

    it('should deny access if member has no client access', async () => {
      vi.spyOn(permissionService, 'getUserHierarchyLevel').mockResolvedValue(4);

      mockSupabase.single.mockResolvedValue({ data: null, error: new Error('Not found') });

      const result = await enforceClientAccess(
        'user-1',
        'agency-1',
        'client-1',
        'read',
        mockSupabase as any
      );

      expect(result).toBe(false);
    });
  });

  describe('logClientAccessAttempt', () => {
    it('should log access attempt', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      logClientAccessAttempt('user-1', 'client-1', 'write', true, {
        roleId: 'role-1',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ClientAccess] Member access attempt:',
        expect.objectContaining({
          userId: 'user-1',
          clientId: 'client-1',
          action: 'write',
          allowed: true,
          roleId: 'role-1',
        })
      );
    });
  });
});

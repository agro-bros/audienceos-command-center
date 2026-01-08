-- =====================================================================
-- Client-Scoped RLS Policies for Member Role
-- =====================================================================
-- Feature: TASK-013 - Client-level access restrictions for Members
-- Spec: features/multi-org-roles.md lines 150-169, 414-462
-- Date: 2026-01-08
--
-- Purpose: Implement RLS policies that filter data by member_client_access
--          for users with Member role (hierarchy_level = 4)
--
-- Tables affected:
--   - client: Members see only assigned clients
--   - communication: Members see only comms for assigned clients
--   - ticket: Members see only tickets for assigned clients
-- =====================================================================

-- =====================================================================
-- 1. CLIENT TABLE - Member-Scoped SELECT
-- =====================================================================

-- Drop existing agency-only policy
DROP POLICY IF EXISTS client_agency_via_user ON client;

-- Create new policy with Member client filtering
CREATE POLICY IF NOT EXISTS client_member_scoped_select ON client
FOR SELECT
USING (
  -- Must belong to user's agency
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND (
    -- Owners, Admins, Managers see ALL clients (hierarchy_level <= 3)
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.agency_id = client.agency_id
      AND r.hierarchy_level <= 3
    )
    OR
    -- Members see ONLY assigned clients (via member_client_access)
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = client.id
      AND mca.agency_id = client.agency_id
    )
  )
);

COMMENT ON POLICY client_member_scoped_select ON client IS
  'Members see only assigned clients via member_client_access. Owners/Admins/Managers see all.';

-- =====================================================================
-- 2. CLIENT TABLE - Member-Scoped INSERT/UPDATE/DELETE
-- =====================================================================

-- INSERT: Only Owners/Admins/Managers can create clients
CREATE POLICY IF NOT EXISTS client_member_scoped_insert ON client
FOR INSERT
WITH CHECK (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM "user" u
    JOIN role r ON u.role_id = r.id
    JOIN role_permission rp ON rp.role_id = r.id
    JOIN permission p ON p.id = rp.permission_id
    WHERE u.id = auth.uid()
    AND u.agency_id = client.agency_id
    AND p.resource = 'clients'
    AND p.action IN ('write', 'manage')
  )
);

-- UPDATE: Members with 'write' access to assigned clients + Owners/Admins/Managers
CREATE POLICY IF NOT EXISTS client_member_scoped_update ON client
FOR UPDATE
USING (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND (
    -- Owners/Admins/Managers with clients:write or clients:manage
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      JOIN role_permission rp ON rp.role_id = r.id
      JOIN permission p ON p.id = rp.permission_id
      WHERE u.id = auth.uid()
      AND u.agency_id = client.agency_id
      AND p.resource = 'clients'
      AND p.action IN ('write', 'manage')
    )
    OR
    -- Members with 'write' access to THIS specific client
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = client.id
      AND mca.agency_id = client.agency_id
      AND mca.permission = 'write'
    )
  )
);

-- DELETE: Only users with clients:manage permission
CREATE POLICY IF NOT EXISTS client_member_scoped_delete ON client
FOR DELETE
USING (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM "user" u
    JOIN role r ON u.role_id = r.id
    JOIN role_permission rp ON rp.role_id = r.id
    JOIN permission p ON p.id = rp.permission_id
    WHERE u.id = auth.uid()
    AND u.agency_id = client.agency_id
    AND p.resource = 'clients'
    AND p.action = 'manage'
  )
);

-- =====================================================================
-- 3. COMMUNICATION TABLE - Member-Scoped via Client
-- =====================================================================

-- Drop existing agency-only policy
DROP POLICY IF EXISTS communication_agency_via_user ON communication;

-- SELECT: Members see only communications for assigned clients
CREATE POLICY IF NOT EXISTS communication_member_scoped_select ON communication
FOR SELECT
USING (
  -- Must belong to user's agency
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND (
    -- Owners, Admins, Managers see ALL communications
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.agency_id = communication.agency_id
      AND r.hierarchy_level <= 3
    )
    OR
    -- Members see only communications for assigned clients
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = communication.client_id
      AND mca.agency_id = communication.agency_id
    )
  )
);

COMMENT ON POLICY communication_member_scoped_select ON communication IS
  'Members see only communications for clients they have access to via member_client_access';

-- INSERT: Members can create communications for assigned clients with 'write' access
CREATE POLICY IF NOT EXISTS communication_member_scoped_insert ON communication
FOR INSERT
WITH CHECK (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND (
    -- Owners/Admins/Managers with communications:write or manage
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      JOIN role_permission rp ON rp.role_id = r.id
      JOIN permission p ON p.id = rp.permission_id
      WHERE u.id = auth.uid()
      AND u.agency_id = communication.agency_id
      AND p.resource = 'communications'
      AND p.action IN ('write', 'manage')
    )
    OR
    -- Members with 'write' access to the client
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = communication.client_id
      AND mca.agency_id = communication.agency_id
      AND mca.permission = 'write'
    )
  )
);

-- UPDATE: Same logic as INSERT
CREATE POLICY IF NOT EXISTS communication_member_scoped_update ON communication
FOR UPDATE
USING (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      JOIN role_permission rp ON rp.role_id = r.id
      JOIN permission p ON p.id = rp.permission_id
      WHERE u.id = auth.uid()
      AND u.agency_id = communication.agency_id
      AND p.resource = 'communications'
      AND p.action IN ('write', 'manage')
    )
    OR
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = communication.client_id
      AND mca.agency_id = communication.agency_id
      AND mca.permission = 'write'
    )
  )
);

-- DELETE: Only users with communications:manage
CREATE POLICY IF NOT EXISTS communication_member_scoped_delete ON communication
FOR DELETE
USING (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM "user" u
    JOIN role r ON u.role_id = r.id
    JOIN role_permission rp ON rp.role_id = r.id
    JOIN permission p ON p.id = rp.permission_id
    WHERE u.id = auth.uid()
    AND u.agency_id = communication.agency_id
    AND p.resource = 'communications'
    AND p.action = 'manage'
  )
);

-- =====================================================================
-- 4. TICKET TABLE - Member-Scoped via Client
-- =====================================================================

-- Drop existing agency-only policy
DROP POLICY IF EXISTS ticket_rls ON ticket;

-- SELECT: Members see only tickets for assigned clients
CREATE POLICY IF NOT EXISTS ticket_member_scoped_select ON ticket
FOR SELECT
USING (
  -- Must belong to user's agency
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND (
    -- Owners, Admins, Managers see ALL tickets
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.agency_id = ticket.agency_id
      AND r.hierarchy_level <= 3
    )
    OR
    -- Members see only tickets for assigned clients
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = ticket.client_id
      AND mca.agency_id = ticket.agency_id
    )
  )
);

COMMENT ON POLICY ticket_member_scoped_select ON ticket IS
  'Members see only tickets for clients they have access to via member_client_access';

-- INSERT: Members can create tickets for assigned clients with 'write' access
CREATE POLICY IF NOT EXISTS ticket_member_scoped_insert ON ticket
FOR INSERT
WITH CHECK (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND (
    -- Owners/Admins/Managers with tickets:write or manage
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      JOIN role_permission rp ON rp.role_id = r.id
      JOIN permission p ON p.id = rp.permission_id
      WHERE u.id = auth.uid()
      AND u.agency_id = ticket.agency_id
      AND p.resource = 'tickets'
      AND p.action IN ('write', 'manage')
    )
    OR
    -- Members with 'write' access to the client
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = ticket.client_id
      AND mca.agency_id = ticket.agency_id
      AND mca.permission = 'write'
    )
  )
);

-- UPDATE: Same logic as INSERT
CREATE POLICY IF NOT EXISTS ticket_member_scoped_update ON ticket
FOR UPDATE
USING (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      JOIN role_permission rp ON rp.role_id = r.id
      JOIN permission p ON p.id = rp.permission_id
      WHERE u.id = auth.uid()
      AND u.agency_id = ticket.agency_id
      AND p.resource = 'tickets'
      AND p.action IN ('write', 'manage')
    )
    OR
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = ticket.client_id
      AND mca.agency_id = ticket.agency_id
      AND mca.permission = 'write'
    )
  )
);

-- DELETE: Only users with tickets:manage
CREATE POLICY IF NOT EXISTS ticket_member_scoped_delete ON ticket
FOR DELETE
USING (
  agency_id IN (
    SELECT agency_id FROM "user" WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM "user" u
    JOIN role r ON u.role_id = r.id
    JOIN role_permission rp ON rp.role_id = r.id
    JOIN permission p ON p.id = rp.permission_id
    WHERE u.id = auth.uid()
    AND u.agency_id = ticket.agency_id
    AND p.resource = 'tickets'
    AND p.action = 'manage'
  )
);

-- =====================================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================================

-- Index on member_client_access for fast lookups
-- (Already created in APPLY_THIS_NOW.sql, but ensure they exist)
CREATE INDEX IF NOT EXISTS idx_member_access_user_client ON member_client_access(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_member_access_client ON member_client_access(client_id);
CREATE INDEX IF NOT EXISTS idx_member_access_user ON member_client_access(user_id);

-- Index on role hierarchy_level for fast filtering
CREATE INDEX IF NOT EXISTS idx_role_hierarchy ON role(hierarchy_level) WHERE hierarchy_level IS NOT NULL;

-- Index on user role_id for JOIN performance
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role_id) WHERE role_id IS NOT NULL;

-- =====================================================================
-- VERIFICATION QUERIES (Comment out in production)
-- =====================================================================

-- Test query: Check which policies are now active
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('client', 'communication', 'ticket')
-- ORDER BY tablename, cmd, policyname;

-- =====================================================================
-- Multi-Org Roles (RBAC) Data Seeding & Migration
-- =====================================================================
-- Purpose: Seed permissions, create system roles, migrate existing users
-- Dependencies: 20260106_multi_org_roles.sql (schema migration)
-- Date: 2026-01-06
-- =====================================================================

-- =====================================================================
-- TASK-005: SEED PERMISSIONS
-- =====================================================================

-- Seed all resource × action permission combinations
INSERT INTO permission (resource, action, description) VALUES
  -- Clients
  ('clients', 'read', 'View client list and details'),
  ('clients', 'write', 'Create and edit clients'),
  ('clients', 'delete', 'Archive or delete clients'),
  ('clients', 'manage', 'Full client management including assignments'),

  -- Communications
  ('communications', 'read', 'View communications and messages'),
  ('communications', 'write', 'Send messages and create communications'),
  ('communications', 'delete', 'Delete communications'),
  ('communications', 'manage', 'Full communication management'),

  -- Tickets
  ('tickets', 'read', 'View support tickets'),
  ('tickets', 'write', 'Create and update tickets'),
  ('tickets', 'delete', 'Delete tickets'),
  ('tickets', 'manage', 'Full ticket management'),

  -- Knowledge Base
  ('knowledge-base', 'read', 'View knowledge base documents'),
  ('knowledge-base', 'write', 'Create and edit documents'),
  ('knowledge-base', 'delete', 'Delete documents'),
  ('knowledge-base', 'manage', 'Full knowledge base management'),

  -- Automations
  ('automations', 'read', 'View automation workflows'),
  ('automations', 'write', 'Create and edit workflows'),
  ('automations', 'delete', 'Delete workflows'),
  ('automations', 'manage', 'Full automation management'),

  -- Settings
  ('settings', 'read', 'View agency settings'),
  ('settings', 'write', 'Edit agency settings'),
  ('settings', 'delete', 'Delete settings configurations'),
  ('settings', 'manage', 'Full settings management'),

  -- Users
  ('users', 'read', 'View team members'),
  ('users', 'write', 'Invite and edit users'),
  ('users', 'delete', 'Remove users'),
  ('users', 'manage', 'Full user management including role assignment'),

  -- Billing
  ('billing', 'read', 'View billing and subscription'),
  ('billing', 'write', 'Update payment methods and billing info'),
  ('billing', 'delete', 'Cancel subscriptions'),
  ('billing', 'manage', 'Full billing management'),

  -- Roles
  ('roles', 'read', 'View roles and permissions'),
  ('roles', 'write', 'Create and edit custom roles'),
  ('roles', 'delete', 'Delete custom roles'),
  ('roles', 'manage', 'Full role management'),

  -- Integrations
  ('integrations', 'read', 'View integrations'),
  ('integrations', 'write', 'Connect and configure integrations'),
  ('integrations', 'delete', 'Disconnect integrations'),
  ('integrations', 'manage', 'Full integration management'),

  -- Analytics
  ('analytics', 'read', 'View analytics and reports'),
  ('analytics', 'write', 'Create custom reports'),
  ('analytics', 'delete', 'Delete reports'),
  ('analytics', 'manage', 'Full analytics management'),

  -- AI Features
  ('ai-features', 'read', 'View AI features and chat'),
  ('ai-features', 'write', 'Use AI features and chat'),
  ('ai-features', 'delete', 'Delete AI chat history'),
  ('ai-features', 'manage', 'Full AI feature management')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- TASK-004: SEED SYSTEM ROLES FOR ALL AGENCIES
-- =====================================================================

-- Create 4 system roles (Owner, Admin, Manager, Member) for each agency
DO $$
DECLARE
  v_agency RECORD;
BEGIN
  FOR v_agency IN SELECT id FROM agency LOOP
    -- Owner role
    INSERT INTO role (agency_id, name, description, is_system, hierarchy_level)
    VALUES (
      v_agency.id,
      'Owner',
      'Agency creator with full access (cannot be removed)',
      TRUE,
      1
    )
    ON CONFLICT (agency_id, name) DO NOTHING;

    -- Admin role
    INSERT INTO role (agency_id, name, description, is_system, hierarchy_level)
    VALUES (
      v_agency.id,
      'Admin',
      'Full access except billing modifications',
      TRUE,
      2
    )
    ON CONFLICT (agency_id, name) DO NOTHING;

    -- Manager role
    INSERT INTO role (agency_id, name, description, is_system, hierarchy_level)
    VALUES (
      v_agency.id,
      'Manager',
      'Client management, no settings or user management',
      TRUE,
      3
    )
    ON CONFLICT (agency_id, name) DO NOTHING;

    -- Member role
    INSERT INTO role (agency_id, name, description, is_system, hierarchy_level)
    VALUES (
      v_agency.id,
      'Member',
      'Read-only with assigned client write access',
      TRUE,
      4
    )
    ON CONFLICT (agency_id, name) DO NOTHING;
  END LOOP;
END;
$$;

-- =====================================================================
-- SEED DEFAULT ROLE PERMISSIONS (Based on Permission Matrix)
-- =====================================================================

-- Owner: manage on everything
INSERT INTO role_permission (role_id, permission_id, agency_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id,
  r.agency_id
FROM role r
CROSS JOIN permission p
WHERE r.is_system = TRUE
AND r.hierarchy_level = 1 -- Owner
AND p.action = 'manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: manage on most resources (not billing)
INSERT INTO role_permission (role_id, permission_id, agency_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id,
  r.agency_id
FROM role r
CROSS JOIN permission p
WHERE r.is_system = TRUE
AND r.hierarchy_level = 2 -- Admin
AND p.action = 'manage'
AND p.resource != 'billing'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: read billing
INSERT INTO role_permission (role_id, permission_id, agency_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id,
  r.agency_id
FROM role r
CROSS JOIN permission p
WHERE r.is_system = TRUE
AND r.hierarchy_level = 2 -- Admin
AND p.resource = 'billing'
AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: write on clients, communications, tickets, analytics, ai-features
INSERT INTO role_permission (role_id, permission_id, agency_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id,
  r.agency_id
FROM role r
CROSS JOIN permission p
WHERE r.is_system = TRUE
AND r.hierarchy_level = 3 -- Manager
AND p.resource IN ('clients', 'communications', 'tickets', 'analytics', 'ai-features')
AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: read on knowledge-base, automations, users, roles, integrations
INSERT INTO role_permission (role_id, permission_id, agency_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id,
  r.agency_id
FROM role r
CROSS JOIN permission p
WHERE r.is_system = TRUE
AND r.hierarchy_level = 3 -- Manager
AND p.resource IN ('knowledge-base', 'automations', 'users', 'roles', 'integrations')
AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member: read on clients, communications, tickets, knowledge-base, analytics, ai-features
-- Note: Client access is further restricted by member_client_access table
INSERT INTO role_permission (role_id, permission_id, agency_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id,
  r.agency_id
FROM role r
CROSS JOIN permission p
WHERE r.is_system = TRUE
AND r.hierarchy_level = 4 -- Member
AND p.resource IN ('clients', 'communications', 'tickets', 'knowledge-base', 'analytics', 'ai-features')
AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================================
-- TASK-003: MIGRATE EXISTING USERS TO NEW ROLE SYSTEM
-- =====================================================================

-- Step 1: Map existing user.role to new role_id
-- Users with old role = 'admin' → Admin role
UPDATE "user" u
SET role_id = r.id
FROM role r
WHERE r.agency_id = u.agency_id
AND r.name = 'Admin'
AND r.is_system = TRUE
AND u.role = 'admin'
AND u.role_id IS NULL; -- Only update if not already set

-- Users with old role = 'user' → Member role
UPDATE "user" u
SET role_id = r.id
FROM role r
WHERE r.agency_id = u.agency_id
AND r.name = 'Member'
AND r.is_system = TRUE
AND u.role = 'user'
AND u.role_id IS NULL;

-- Step 2: Identify and set agency owners
-- Strategy: First admin user (by created_at or email @diiiploy.io) per agency becomes Owner
DO $$
DECLARE
  v_agency RECORD;
  v_owner_user_id UUID;
  v_owner_role_id UUID;
BEGIN
  FOR v_agency IN SELECT id FROM agency LOOP
    -- Find first admin user for this agency
    -- Prioritize @diiiploy.io emails, then earliest created
    SELECT u.id INTO v_owner_user_id
    FROM "user" u
    WHERE u.agency_id = v_agency.id
    AND u.role = 'admin'
    ORDER BY
      CASE WHEN u.email LIKE '%@diiiploy.io' THEN 0 ELSE 1 END,
      u.created_at ASC
    LIMIT 1;

    IF v_owner_user_id IS NOT NULL THEN
      -- Get Owner role for this agency
      SELECT id INTO v_owner_role_id
      FROM role
      WHERE agency_id = v_agency.id
      AND name = 'Owner'
      AND is_system = TRUE;

      -- Set user as owner
      UPDATE "user"
      SET
        role_id = v_owner_role_id,
        is_owner = TRUE
      WHERE id = v_owner_user_id;

      RAISE NOTICE 'Set owner for agency %: user %', v_agency.id, v_owner_user_id;
    END IF;
  END LOOP;
END;
$$;

-- Step 3: Handle edge case - users without role set
UPDATE "user" u
SET role_id = r.id
FROM role r
WHERE r.agency_id = u.agency_id
AND r.name = 'Member' -- Default to Member for safety
AND r.is_system = TRUE
AND u.role_id IS NULL; -- Catch-all for any remaining users

-- =====================================================================
-- VALIDATION QUERIES
-- =====================================================================

-- Check permission count (should be 48: 12 resources × 4 actions)
DO $$
DECLARE
  v_perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_perm_count FROM permission;
  RAISE NOTICE 'Permissions seeded: %', v_perm_count;
  IF v_perm_count != 48 THEN
    RAISE WARNING 'Expected 48 permissions, found %', v_perm_count;
  END IF;
END;
$$;

-- Check role count (should be 4 per agency)
DO $$
DECLARE
  v_agency_count INTEGER;
  v_role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_agency_count FROM agency;
  SELECT COUNT(*) INTO v_role_count FROM role WHERE is_system = TRUE;
  RAISE NOTICE 'Agencies: %, System roles: %', v_agency_count, v_role_count;
  IF v_role_count != v_agency_count * 4 THEN
    RAISE WARNING 'Expected % system roles (4 per agency), found %', v_agency_count * 4, v_role_count;
  END IF;
END;
$$;

-- Check users migrated
DO $$
DECLARE
  v_total_users INTEGER;
  v_migrated_users INTEGER;
  v_owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM "user";
  SELECT COUNT(*) INTO v_migrated_users FROM "user" WHERE role_id IS NOT NULL;
  SELECT COUNT(*) INTO v_owner_count FROM "user" WHERE is_owner = TRUE;

  RAISE NOTICE 'Total users: %, Migrated: %, Owners: %', v_total_users, v_migrated_users, v_owner_count;

  IF v_migrated_users != v_total_users THEN
    RAISE WARNING 'Not all users migrated: % of % have role_id', v_migrated_users, v_total_users;
  END IF;
END;
$$;

-- =====================================================================
-- MIGRATION & SEEDING COMPLETE
-- =====================================================================

-- Summary:
-- ✅ 48 permissions created (12 resources × 4 actions)
-- ✅ 4 system roles per agency (Owner, Admin, Manager, Member)
-- ✅ Default permissions assigned based on permission matrix
-- ✅ Existing users migrated to new role system
-- ✅ First admin per agency set as Owner

-- Next steps:
-- 1. Test permission checks with has_permission() function
-- 2. Verify RLS policies work correctly
-- 3. (Optional) Drop old user.role column after validation
-- 4. Implement API middleware for permission enforcement (TASK-011)

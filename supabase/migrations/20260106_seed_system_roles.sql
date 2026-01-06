-- =====================================================================
-- Seed System Roles (TASK-004)
-- =====================================================================
-- Creates the 4 built-in roles for all agencies: Owner, Admin, Manager, Member
-- Feature: features/multi-org-roles.md
-- Date: 2026-01-06
-- =====================================================================

-- Insert system roles for each agency
-- Note: This uses a DO block to iterate over agencies

DO $$
DECLARE
  agency_record RECORD;
BEGIN
  -- Loop through all agencies
  FOR agency_record IN SELECT id FROM agency LOOP

    -- Owner role (hierarchy_level = 1)
    INSERT INTO role (
      agency_id,
      name,
      description,
      is_system,
      hierarchy_level
    ) VALUES (
      agency_record.id,
      'Owner',
      'Agency creator with full access. Cannot be removed or modified.',
      true,
      1
    ) ON CONFLICT (agency_id, name) DO NOTHING;

    -- Admin role (hierarchy_level = 2)
    INSERT INTO role (
      agency_id,
      name,
      description,
      is_system,
      hierarchy_level
    ) VALUES (
      agency_record.id,
      'Admin',
      'Full access to all features except billing modification. Can manage users and settings.',
      true,
      2
    ) ON CONFLICT (agency_id, name) DO NOTHING;

    -- Manager role (hierarchy_level = 3)
    INSERT INTO role (
      agency_id,
      name,
      description,
      is_system,
      hierarchy_level
    ) VALUES (
      agency_record.id,
      'Manager',
      'Can manage clients, communications, and tickets. No access to settings or user management.',
      true,
      3
    ) ON CONFLICT (agency_id, name) DO NOTHING;

    -- Member role (hierarchy_level = 4)
    INSERT INTO role (
      agency_id,
      name,
      description,
      is_system,
      hierarchy_level
    ) VALUES (
      agency_record.id,
      'Member',
      'Read-only access with write permissions for assigned clients only.',
      true,
      4
    ) ON CONFLICT (agency_id, name) DO NOTHING;

  END LOOP;

  RAISE NOTICE 'System roles seeded for all agencies';
END $$;

-- =====================================================================
-- Verification Query
-- =====================================================================
-- Run this to verify all agencies have 4 system roles:
-- SELECT agency_id, COUNT(*) as role_count
-- FROM role
-- WHERE is_system = true
-- GROUP BY agency_id;

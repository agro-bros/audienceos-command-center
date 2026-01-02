-- Migration: Fix ticket RLS policy to use user table lookup instead of JWT claims
-- Applied: 2026-01-02 via Supabase SQL Editor
-- Reason: JWT claims can be stale/missing; user table lookup is authoritative
--
-- This matches the working pattern used by client_agency_via_user policy

-- Drop any existing ticket policies
DROP POLICY IF EXISTS ticket_rls ON ticket;
DROP POLICY IF EXISTS ticket_agency_via_user ON ticket;

-- Create ticket policy using user table lookup (matches client policy pattern)
-- This allows users to access tickets belonging to their agency
CREATE POLICY ticket_agency_via_user ON ticket
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- Note: The following tables may need similar fixes if they exhibit the same
-- JWT-based RLS issue. Currently they have policies that use:
--   USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid)
--
-- Tables to monitor:
--   - stage_event
--   - integration
--   - workflow
--   - workflow_run
--   - kb_document
--   - communication
--   - activity_log
--
-- If issues arise, apply the same pattern:
--   USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()))

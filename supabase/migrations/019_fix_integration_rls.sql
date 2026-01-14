-- Migration: Fix integration table RLS policy
-- Created: 2026-01-14
-- Issue: Google Workspace OAuth connect returning 500 error
-- Root Cause: integration table RLS uses (auth.jwt() ->> 'agency_id')::uuid which is never set
--
-- This applies the same fix pattern used in:
--   - 014_fix_agency_rls.sql
--   - 016_fix_onboarding_rls.sql
--   - 003_fix_client_rls.sql
--
-- Pattern: Use user table lookup instead of JWT claims

-- Drop the old policy
DROP POLICY IF EXISTS integration_rls ON integration;

-- Create new policy using user table lookup
CREATE POLICY integration_via_user ON integration
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- Verification query (run manually to confirm):
-- SELECT id, provider, is_connected
-- FROM integration
-- WHERE agency_id = '11111111-1111-1111-1111-111111111111'
-- LIMIT 5;

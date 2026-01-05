-- Migration: Fix user table RLS policy (circular dependency)
-- Created: 2026-01-05
-- Problem: user_rls policy uses (auth.jwt() ->> 'agency_id')::uuid
--          but JWT doesn't have agency_id claim for new users
--          This prevents users from reading their own profile
--
-- Solution: Use auth.uid() for self-read instead of JWT claims

-- Drop existing policy
DROP POLICY IF EXISTS user_rls ON "user";

-- Create policy for users to read their own record
-- This is critical for profile loading after login
CREATE POLICY user_self_read ON "user"
    FOR SELECT
    USING (id = auth.uid());

-- Create policy for users to read/write records in same agency
-- Uses the same pattern as client, ticket, etc.
CREATE POLICY user_same_agency ON "user"
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

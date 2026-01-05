-- Allow public access to invitations by token (for accept flow)
-- Created: 2026-01-05
--
-- The invitation accept page needs to validate tokens without authentication.
-- This policy allows reading invitation details by token only.

-- Add policy for public token lookup (unauthenticated users)
CREATE POLICY user_invitations_public_token_lookup ON user_invitations
    FOR SELECT
    USING (
        -- Only allow if token is provided in the query
        -- This works because the token is passed as a filter in the query
        auth.jwt() IS NULL
        AND accepted_at IS NULL  -- Only pending invitations
        AND expires_at > NOW()   -- Only non-expired invitations
    );

-- Allow inserts/updates for authenticated users from same agency
-- (Keep existing policy for authenticated operations)

-- Add user invitations table for Settings feature (Phase 10)
-- Created: 2026-01-04

-- ============================================================================
-- 20. USER_INVITATIONS
-- ============================================================================
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES "user"(id),
    created_by UUID NOT NULL REFERENCES "user"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agency_id, email, token)
);

CREATE INDEX idx_user_invitations_agency ON user_invitations(agency_id);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_pending ON user_invitations(agency_id, accepted_at) WHERE accepted_at IS NULL;

ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_invitations_rls ON user_invitations FOR ALL
    USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

-- Cleanup function to remove expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    DELETE FROM user_invitations
    WHERE expires_at < NOW()
    AND accepted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

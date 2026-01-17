-- Create enum for communication platforms
CREATE TYPE user_communication_platform AS ENUM ('slack', 'gmail');

-- Create user_communication table
-- Stores per-user synced communications (emails, messages)
-- Separate from agency-scoped communication table
CREATE TABLE user_communication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  platform user_communication_platform NOT NULL,
  message_id VARCHAR(100) NOT NULL,  -- Unique ID from platform (Gmail message ID, Slack message timestamp)
  thread_id VARCHAR(100),            -- Gmail: thread ID, Slack: channel ID
  sender_email VARCHAR(100),
  sender_name VARCHAR(100),
  subject VARCHAR(200),              -- Gmail: subject, Slack: first 200 chars of message
  content TEXT NOT NULL,             -- Full message content
  is_inbound BOOLEAN NOT NULL DEFAULT true,  -- True if received by user, false if sent
  metadata JSONB,                    -- Platform-specific metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate syncs of same message
  UNIQUE(user_id, platform, message_id)
);

-- RLS: Users can only see their own communications
ALTER TABLE user_communication ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own communications"
  ON user_communication
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own communications"
  ON user_communication
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own communications"
  ON user_communication
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for query performance
CREATE INDEX idx_user_communication_user_id ON user_communication(user_id);
CREATE INDEX idx_user_communication_agency_id ON user_communication(agency_id);
CREATE INDEX idx_user_communication_platform ON user_communication(platform);
CREATE INDEX idx_user_communication_created_at ON user_communication(created_at);
CREATE INDEX idx_user_communication_user_platform_message ON user_communication(user_id, platform, message_id);

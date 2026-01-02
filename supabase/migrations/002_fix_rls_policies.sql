-- Migration: Fix RLS policies to use user table lookup instead of JWT claims
-- Reason: JWT claims can be stale/missing; user table is authoritative

-- Helper function to get agency_id from authenticated user
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS uuid AS $$
  SELECT agency_id FROM public.user WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop existing policies and recreate with user table lookup
-- This is more reliable than JWT claims which may not be set

-- CLIENT table
DROP POLICY IF EXISTS client_rls ON client;
CREATE POLICY client_rls ON client FOR ALL
    USING (agency_id = get_user_agency_id());

-- TICKET table
DROP POLICY IF EXISTS ticket_rls ON ticket;
CREATE POLICY ticket_rls ON ticket FOR ALL
    USING (agency_id = get_user_agency_id());

-- TICKET_NOTE table
DROP POLICY IF EXISTS ticket_note_rls ON ticket_note;
CREATE POLICY ticket_note_rls ON ticket_note FOR ALL
    USING (
        ticket_id IN (
            SELECT id FROM ticket WHERE agency_id = get_user_agency_id()
        )
    );

-- STAGE_EVENT table
DROP POLICY IF EXISTS stage_event_rls ON stage_event;
CREATE POLICY stage_event_rls ON stage_event FOR ALL
    USING (agency_id = get_user_agency_id());

-- INTEGRATION table
DROP POLICY IF EXISTS integration_rls ON integration;
CREATE POLICY integration_rls ON integration FOR ALL
    USING (agency_id = get_user_agency_id());

-- WORKFLOW table
DROP POLICY IF EXISTS workflow_rls ON workflow;
CREATE POLICY workflow_rls ON workflow FOR ALL
    USING (agency_id = get_user_agency_id());

-- WORKFLOW_RUN table
DROP POLICY IF EXISTS workflow_run_rls ON workflow_run;
CREATE POLICY workflow_run_rls ON workflow_run FOR ALL
    USING (
        workflow_id IN (
            SELECT id FROM workflow WHERE agency_id = get_user_agency_id()
        )
    );

-- KB_DOCUMENT table
DROP POLICY IF EXISTS kb_document_rls ON kb_document;
CREATE POLICY kb_document_rls ON kb_document FOR ALL
    USING (agency_id = get_user_agency_id());

-- COMMUNICATION table
DROP POLICY IF EXISTS communication_rls ON communication;
CREATE POLICY communication_rls ON communication FOR ALL
    USING (agency_id = get_user_agency_id());

-- ACTIVITY_LOG table
DROP POLICY IF EXISTS activity_log_rls ON activity_log;
CREATE POLICY activity_log_rls ON activity_log FOR ALL
    USING (agency_id = get_user_agency_id());

-- USER table (special case - users can see other users in same agency)
DROP POLICY IF EXISTS user_rls ON public.user;
CREATE POLICY user_rls ON public.user FOR ALL
    USING (agency_id = get_user_agency_id());

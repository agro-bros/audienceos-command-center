-- ============================================================================
-- Migration: 020_cartridge_transaction_functions.sql
-- Purpose: Add transaction-safe functions for cartridge operations
-- Issue: BLOCKER 1 - Race condition in set-default endpoint
-- Date: 2026-01-16
-- ============================================================================

-- Create transaction-safe function for setting default cartridge
-- This ensures that resetting all defaults and setting new default happen atomically
CREATE OR REPLACE FUNCTION set_cartridge_default(
  p_cartridge_id UUID,
  p_agency_id UUID,
  p_type VARCHAR(50)
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_updated_count INT;
BEGIN
  -- Start transaction (implicit in plpgsql)

  -- Reset all defaults for this type in this agency
  UPDATE cartridges
  SET is_default = false
  WHERE agency_id = p_agency_id
    AND type = p_type
    AND is_default = true;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Set this one as default
  UPDATE cartridges
  SET is_default = true
  WHERE id = p_cartridge_id
    AND agency_id = p_agency_id;

  -- Return success response
  SELECT JSON_BUILD_OBJECT(
    'success', true,
    'message', 'Default cartridge set',
    'cartridge_id', p_cartridge_id,
    'previous_defaults_reset', v_updated_count
  ) INTO v_result;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Return error response
  SELECT JSON_BUILD_OBJECT(
    'success', false,
    'error', SQLERRM
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION set_cartridge_default(UUID, UUID, VARCHAR) TO authenticated;

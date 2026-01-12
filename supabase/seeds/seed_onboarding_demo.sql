-- =============================================================================
-- Demo Seed: Onboarding Instances
-- Purpose: Populate Active Onboardings with realistic demo data
-- Run: Execute via Supabase SQL Editor or psql
-- =============================================================================

-- Agency and Journey IDs (from existing data)
-- Agency: 11111111-1111-1111-1111-111111111111
-- Journey: 27e8ef98-dcf4-4843-a257-d008255e6893
-- User (Roderic): 4e08558a-6b39-4343-b355-636d97724124

-- =============================================================================
-- 1. CREATE ONBOARDING INSTANCES
-- =============================================================================

-- Green Gardens LLC - In Intake stage (just started)
INSERT INTO onboarding_instance (
  agency_id, client_id, journey_id, link_token, status, current_stage_id, triggered_by, triggered_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '2a958023-f902-49d1-a37d-f0593a9812ca',
  '27e8ef98-dcf4-4843-a257-d008255e6893',
  'demo_green_gardens_' || substr(md5(random()::text), 1, 32),
  'in_progress',
  'intake',
  '4e08558a-6b39-4343-b355-636d97724124',
  NOW() - INTERVAL '2 days'
) ON CONFLICT DO NOTHING;

-- Peak Performance Training - In Access Verification stage
INSERT INTO onboarding_instance (
  agency_id, client_id, journey_id, link_token, status, current_stage_id, triggered_by, triggered_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '69c2a13e-800f-460c-bb97-9ecaed56e103',
  '27e8ef98-dcf4-4843-a257-d008255e6893',
  'demo_peak_performance_' || substr(md5(random()::text), 1, 32),
  'in_progress',
  'access',
  '4e08558a-6b39-4343-b355-636d97724124',
  NOW() - INTERVAL '5 days'
) ON CONFLICT DO NOTHING;

-- Harbor View Restaurant - In Audit stage (almost done)
INSERT INTO onboarding_instance (
  agency_id, client_id, journey_id, link_token, status, current_stage_id, triggered_by, triggered_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00148e16-9daa-4c94-b9c1-94f1e884e838',
  '27e8ef98-dcf4-4843-a257-d008255e6893',
  'demo_harbor_view_' || substr(md5(random()::text), 1, 32),
  'in_progress',
  'audit',
  '4e08558a-6b39-4343-b355-636d97724124',
  NOW() - INTERVAL '10 days'
) ON CONFLICT DO NOTHING;

-- Metro Dental - In Pixel Install stage (blocked)
INSERT INTO onboarding_instance (
  agency_id, client_id, journey_id, link_token, status, current_stage_id, triggered_by, triggered_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '88703f2f-f8bb-4939-a409-b5043088cc87',
  '27e8ef98-dcf4-4843-a257-d008255e6893',
  'demo_metro_dental_' || substr(md5(random()::text), 1, 32),
  'in_progress',
  'pixel',
  '4e08558a-6b39-4343-b355-636d97724124',
  NOW() - INTERVAL '7 days'
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. CREATE STAGE STATUSES FOR EACH INSTANCE
-- =============================================================================

-- Helper: Get instance IDs by client
DO $$
DECLARE
  v_agency_id UUID := '11111111-1111-1111-1111-111111111111';
  v_user_id UUID := '4e08558a-6b39-4343-b355-636d97724124';
  v_instance_id UUID;
BEGIN
  -- Green Gardens LLC - Intake in progress
  SELECT id INTO v_instance_id FROM onboarding_instance
  WHERE client_id = '2a958023-f902-49d1-a37d-f0593a9812ca' LIMIT 1;

  IF v_instance_id IS NOT NULL THEN
    INSERT INTO onboarding_stage_status (agency_id, instance_id, stage_id, status) VALUES
      (v_agency_id, v_instance_id, 'intake', 'in_progress'),
      (v_agency_id, v_instance_id, 'access', 'pending'),
      (v_agency_id, v_instance_id, 'pixel', 'pending'),
      (v_agency_id, v_instance_id, 'audit', 'pending'),
      (v_agency_id, v_instance_id, 'live', 'pending')
    ON CONFLICT (instance_id, stage_id) DO NOTHING;
  END IF;

  -- Peak Performance - Access in progress (intake complete)
  SELECT id INTO v_instance_id FROM onboarding_instance
  WHERE client_id = '69c2a13e-800f-460c-bb97-9ecaed56e103' LIMIT 1;

  IF v_instance_id IS NOT NULL THEN
    INSERT INTO onboarding_stage_status (agency_id, instance_id, stage_id, status, completed_at, completed_by, platform_statuses) VALUES
      (v_agency_id, v_instance_id, 'intake', 'completed', NOW() - INTERVAL '4 days', v_user_id, NULL),
      (v_agency_id, v_instance_id, 'access', 'in_progress', NULL, NULL, '{"FB": "verified", "GA": "pending", "SH": "pending"}'::jsonb),
      (v_agency_id, v_instance_id, 'pixel', 'pending', NULL, NULL, NULL),
      (v_agency_id, v_instance_id, 'audit', 'pending', NULL, NULL, NULL),
      (v_agency_id, v_instance_id, 'live', 'pending', NULL, NULL, NULL)
    ON CONFLICT (instance_id, stage_id) DO NOTHING;
  END IF;

  -- Harbor View Restaurant - Audit in progress (intake, access, pixel complete)
  SELECT id INTO v_instance_id FROM onboarding_instance
  WHERE client_id = '00148e16-9daa-4c94-b9c1-94f1e884e838' LIMIT 1;

  IF v_instance_id IS NOT NULL THEN
    INSERT INTO onboarding_stage_status (agency_id, instance_id, stage_id, status, completed_at, completed_by, platform_statuses) VALUES
      (v_agency_id, v_instance_id, 'intake', 'completed', NOW() - INTERVAL '9 days', v_user_id, NULL),
      (v_agency_id, v_instance_id, 'access', 'completed', NOW() - INTERVAL '7 days', v_user_id, '{"FB": "verified", "GA": "verified", "SH": "verified"}'::jsonb),
      (v_agency_id, v_instance_id, 'pixel', 'completed', NOW() - INTERVAL '4 days', v_user_id, NULL),
      (v_agency_id, v_instance_id, 'audit', 'in_progress', NULL, NULL, NULL),
      (v_agency_id, v_instance_id, 'live', 'pending', NULL, NULL, NULL)
    ON CONFLICT (instance_id, stage_id) DO NOTHING;
  END IF;

  -- Metro Dental - Pixel blocked (intake, access complete)
  SELECT id INTO v_instance_id FROM onboarding_instance
  WHERE client_id = '88703f2f-f8bb-4939-a409-b5043088cc87' LIMIT 1;

  IF v_instance_id IS NOT NULL THEN
    INSERT INTO onboarding_stage_status (agency_id, instance_id, stage_id, status, completed_at, completed_by, blocked_reason, platform_statuses) VALUES
      (v_agency_id, v_instance_id, 'intake', 'completed', NOW() - INTERVAL '6 days', v_user_id, NULL, NULL),
      (v_agency_id, v_instance_id, 'access', 'completed', NOW() - INTERVAL '4 days', v_user_id, NULL, '{"FB": "verified", "GA": "verified", "SH": "verified"}'::jsonb),
      (v_agency_id, v_instance_id, 'pixel', 'blocked', NULL, NULL, 'Client needs to grant GTM access', NULL),
      (v_agency_id, v_instance_id, 'audit', 'pending', NULL, NULL, NULL, NULL),
      (v_agency_id, v_instance_id, 'live', 'pending', NULL, NULL, NULL, NULL)
    ON CONFLICT (instance_id, stage_id) DO NOTHING;
  END IF;
END $$;

-- =============================================================================
-- 3. VERIFICATION
-- =============================================================================

-- Check instances created
SELECT
  oi.id,
  c.name as client_name,
  oi.status,
  oi.current_stage_id,
  oi.triggered_at
FROM onboarding_instance oi
JOIN client c ON c.id = oi.client_id
WHERE oi.agency_id = '11111111-1111-1111-1111-111111111111'
ORDER BY oi.triggered_at DESC;

-- Check stage statuses
SELECT
  c.name as client_name,
  oss.stage_id,
  oss.status,
  oss.blocked_reason
FROM onboarding_stage_status oss
JOIN onboarding_instance oi ON oi.id = oss.instance_id
JOIN client c ON c.id = oi.client_id
WHERE oss.agency_id = '11111111-1111-1111-1111-111111111111'
ORDER BY c.name, oss.stage_id;

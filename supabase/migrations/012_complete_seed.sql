-- Complete Seed Data for AudienceOS Command Center
-- Run this in Supabase SQL Editor to populate demo data

-- ============================================================================
-- 1. AGENCY (Root tenant)
-- ============================================================================
INSERT INTO agency (id, name, slug, timezone, pipeline_stages, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Diiiploy',
  'diiiploy',
  'America/Los_Angeles',
  ARRAY['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding'],
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET name = 'Diiiploy', updated_at = now();

-- ============================================================================
-- 2. USERS (Team members)
-- ============================================================================
DELETE FROM "user" WHERE agency_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO "user" (id, agency_id, email, first_name, last_name, role, is_active, created_at, updated_at) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'brent@diiiploy.io', 'Brent', 'Owner', 'admin', true, now(), now()),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'roderic@diiiploy.io', 'Roderic', 'Andrews', 'admin', true, now(), now()),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'trevor@diiiploy.io', 'Trevor', 'Team', 'user', true, now(), now()),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'chase@diiiploy.io', 'Chase', 'Client', 'user', true, now(), now());

-- ============================================================================
-- 3. CLIENTS (Demo clients for pipeline)
-- ============================================================================
INSERT INTO client (id, agency_id, name, contact_email, contact_name, stage, health_status, mrr, notes, created_at, updated_at) VALUES
  ('e31041eb-dad4-4ef8-aead-fb2251997fd4', '11111111-1111-1111-1111-111111111111', 'TechFlow Solutions', 'john@techflow.com', 'John Smith', 'Audit', 'green', 5000, 'Enterprise SaaS client', now(), now()),
  ('c87b5225-68c8-4623-86b4-4eae2de4f19b', '11111111-1111-1111-1111-111111111111', 'GreenLeaf Organics', 'sarah@greenleaf.com', 'Sarah Johnson', 'Live', 'green', 3500, 'E-commerce, strong ROAS', now(), now()),
  ('896d2d4d-d547-41f7-b16e-c376380daeda', '11111111-1111-1111-1111-111111111111', 'Urban Fitness Pro', 'mike@urbanfitness.com', 'Mike Chen', 'Needs Support', 'yellow', 4200, 'ROAS dropped, investigating', now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Coastal Real Estate', 'lisa@coastalre.com', 'Lisa Wong', 'Installation', 'green', 6000, 'New enterprise client', now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Peak Performance', 'alex@peakperf.com', 'Alex Rivera', 'Onboarding', 'green', 2800, 'Referred by TechFlow', now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'CloudNine Travel', 'emma@cloudnine.com', 'Emma Davis', 'Lead', 'green', 0, 'Inbound lead, scheduling call', now(), now());
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. INTEGRATIONS (OAuth connections)
-- ============================================================================
INSERT INTO integration (id, agency_id, provider, is_connected, connected_at, created_at, updated_at) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'slack', false, null, now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'gmail', false, null, now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'google_ads', false, null, now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'meta_ads', false, null, now(), now());

-- ============================================================================
-- 5. ALERTS (Demo alerts for dashboard)
-- ============================================================================
INSERT INTO alert (id, agency_id, client_id, type, severity, title, description, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '896d2d4d-d547-41f7-b16e-c376380daeda',
  'kpi_drop',
  'high',
  'ROAS Below Target',
  'Urban Fitness Pro ROAS dropped to 2.1x (target: 3.0x)',
  'active',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM alert WHERE client_id = '896d2d4d-d547-41f7-b16e-c376380daeda' AND type = 'kpi_drop');

INSERT INTO alert (id, agency_id, client_id, type, severity, title, description, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'c87b5225-68c8-4623-86b4-4eae2de4f19b',
  'inactivity',
  'medium',
  'No Communication in 5 Days',
  'GreenLeaf Organics - last contact was 5 days ago',
  'active',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM alert WHERE client_id = 'c87b5225-68c8-4623-86b4-4eae2de4f19b' AND type = 'inactivity');

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Agencies:' as table_name, count(*) FROM agency
UNION ALL SELECT 'Users:', count(*) FROM "user"
UNION ALL SELECT 'Clients:', count(*) FROM client
UNION ALL SELECT 'Integrations:', count(*) FROM integration
UNION ALL SELECT 'Alerts:', count(*) FROM alert;

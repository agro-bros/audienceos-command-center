-- Migration: Seed Diiiploy Demo Alerts
-- Created: 2026-01-04
-- Purpose: Add realistic alert data for Phase 1 (Chat Function Calling demo)
--
-- Alert Types: kpi_drop, inactivity, disconnect, risk_detected
-- Alert Severities: critical, high, medium, low

-- Client IDs (from stage_event seeding):
-- e31041eb-dad4-4ef8-aead-fb2251997fd4 = Sunset Realty (Audit stage)
-- c87b5225-68c8-4623-86b4-4eae2de4f19b = TechCorp Solutions (Live stage)
-- 896d2d4d-d547-41f7-b16e-c376380daeda = Coastal Coffee (Needs Support stage)

-- ============================================================================
-- CRITICAL ALERTS (highest priority)
-- ============================================================================

-- Sunset Realty: KPI drop
INSERT INTO alert (
  id, agency_id, client_id, type, severity,
  title, description, suggested_action, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'e31041eb-dad4-4ef8-aead-fb2251997fd4',
  'kpi_drop',
  'critical',
  'ROAS dropped 38% week-over-week',
  'Sunset Realty''s return on ad spend fell from $3.85 to $2.38. Campaign performance has degraded significantly.',
  'Review ad creatives, audience targeting, and bid strategy. Consider pausing underperforming ad sets.',
  'active',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
);

-- Coastal Coffee: Integration disconnected (critical)
INSERT INTO alert (
  id, agency_id, client_id, type, severity,
  title, description, suggested_action, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '896d2d4d-d547-41f7-b16e-c376380daeda',
  'disconnect',
  'critical',
  'Meta Ads integration disconnected',
  'Coastal Coffee''s Meta Ads connection has been lost. Real-time data sync has stopped since 6 hours ago.',
  'Have Coastal Coffee reauthorize their Meta Ads account in integrations settings.',
  'active',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours'
);

-- ============================================================================
-- HIGH SEVERITY ALERTS
-- ============================================================================

-- Coastal Coffee: Inactivity
INSERT INTO alert (
  id, agency_id, client_id, type, severity,
  title, description, suggested_action, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '896d2d4d-d547-41f7-b16e-c376380daeda',
  'inactivity',
  'high',
  'No account activity for 8 days',
  'Coastal Coffee has not logged in or made any changes since December 27. This is unusual for their account.',
  'Schedule a check-in call to understand current status and needs.',
  'active',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- TechCorp Solutions: Budget pacing risk
INSERT INTO alert (
  id, agency_id, client_id, type, severity,
  title, description, suggested_action, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'c87b5225-68c8-4623-86b4-4eae2de4f19b',
  'risk_detected',
  'high',
  'Budget pacing 22% ahead of schedule',
  'TechCorp Solutions is spending faster than planned. At current pace, monthly budget will be exhausted by January 18 instead of January 31.',
  'Review daily budget caps, bid adjustments, and dayparting settings. Consider reducing bid multipliers.',
  'active',
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '12 hours'
);

-- ============================================================================
-- MEDIUM SEVERITY ALERTS
-- ============================================================================

-- Sunset Realty: Conversion rate declining
INSERT INTO alert (
  id, agency_id, client_id, type, severity,
  title, description, suggested_action, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'e31041eb-dad4-4ef8-aead-fb2251997fd4',
  'risk_detected',
  'medium',
  'Conversion rate down 18% this month',
  'Sunset Realty''s conversion rate dropped from 3.2% to 2.6%. This suggests issues with landing page or post-click experience.',
  'Audit landing page for UX issues, form friction, and page load times. Consider A/B testing new variations.',
  'active',
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '4 hours'
);

-- TechCorp Solutions: High cost per acquisition
INSERT INTO alert (
  id, agency_id, client_id, type, severity,
  title, description, suggested_action, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'c87b5225-68c8-4623-86b4-4eae2de4f19b',
  'kpi_drop',
  'medium',
  'Cost per acquisition increased 15%',
  'TechCorp Solutions'' CPA rose from $47 to $54. This indicates reduced targeting efficiency.',
  'Review audience overlap, expand exclusion lists, and optimize audience interest targeting.',
  'active',
  NOW() - INTERVAL '18 hours',
  NOW() - INTERVAL '18 hours'
);

-- ============================================================================
-- LOW SEVERITY ALERTS
-- ============================================================================

-- Sunset Realty: Low impression volume
INSERT INTO alert (
  id, agency_id, client_id, type, severity,
  title, description, suggested_action, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'e31041eb-dad4-4ef8-aead-fb2251997fd4',
  'risk_detected',
  'low',
  'Ad impression volume down 12%',
  'Sunset Realty''s impressions are below daily average. Budget may be spread too thin across campaigns.',
  'Check ad scheduling, audience size, and bid strategy. Consider consolidating budgets to top performers.',
  'active',
  NOW() - INTERVAL '8 hours',
  NOW() - INTERVAL '8 hours'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After applying, verify with:
-- SELECT id, client_id, severity, title, status FROM alert
-- WHERE agency_id = '11111111-1111-1111-1111-111111111111'
-- ORDER BY severity DESC, created_at DESC;
--
-- Expected: 7 alerts (2 critical, 2 high, 2 medium, 1 low) for 3 clients
--

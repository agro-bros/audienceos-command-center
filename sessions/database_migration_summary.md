# Database Migration Summary — 2026-02-04

## Session Overview

Applied 5 unapplied migrations to Supabase project `qzkirjjrcblkqvhvalue` and updated codebase to bridge a table naming inconsistency between sync services and chat context functions.

**Goal:** Enable Gmail and Slack integration with the AI chat knowledge base so it can pull customer context from synced communications.

---

## Migrations Applied (in order)

### 1. `017_gmail_integration.sql` — User OAuth Credentials

- **Created:** `user_oauth_credential` table
- **Purpose:** Per-user OAuth token storage for Gmail, Slack, Meta, Stripe, LinkedIn
- **Key columns:** `user_id`, `type`, `access_token` (encrypted), `refresh_token`, `is_connected`, `last_sync_at`
- **Constraints:** `UNIQUE(user_id, type)` — one credential per provider per user
- **RLS:** 4 policies — users can only CRUD their own credentials
- **Indexes:** `user_type`, `connected` (partial), `last_sync` (partial)

### 2. `018_user_communication.sql` — User Communication Storage

- **Created:** `user_communication` table + `user_communication_platform` enum (`'slack'`, `'gmail'`)
- **Purpose:** Per-user synced communications from Gmail/Slack inboxes
- **Key columns:** `agency_id`, `user_id`, `platform`, `message_id`, `thread_id`, `sender_email`, `sender_name`, `subject`, `content`, `is_inbound`, `metadata` (JSONB)
- **Constraints:** `UNIQUE(user_id, platform, message_id)` — prevents duplicate syncs
- **RLS:** 3 policies — users can only view/insert/update their own communications
- **Indexes:** `user_id`, `agency_id`, `platform`, `created_at`, composite `user_platform_message`

### 3. `009_add_ai_config.sql` — Agency AI Configuration

- **Altered:** `agency` table — added `ai_config` JSONB column
- **Default value:**
  ```json
  {
    "assistant_name": "Chi",
    "response_tone": "professional",
    "response_length": "detailed",
    "enabled_features": ["chat_assistant", "draft_replies", "alert_analysis", "document_rag"],
    "token_limit": 50000
  }
  ```
- **Index:** GIN index on `ai_config` for JSONB queries

### 4. `005_rate_limit_table.sql` — Distributed Rate Limiting

- **Created:** `rate_limit` table
- **Key columns:** `identifier`, `count`, `window_start`, `expires_at`
- **Constraints:** `UNIQUE(identifier, window_start)`
- **Functions:**
  - `increment_rate_limit()` — atomic counter with configurable max (default 100)
  - `cleanup_expired_rate_limits()` — purges expired entries
- **RLS:** Enabled but no policies — service role access only
- **Grants:** Both functions granted to `service_role`

### 5. `008_document_training_starred.sql` — Document Training & Drive Integration

- **Altered:** `document` table — added 4 columns:
  - `is_starred` (BOOLEAN, default false)
  - `use_for_training` (BOOLEAN, default false)
  - `drive_url` (TEXT)
  - `drive_file_id` (TEXT)
- **Indexes:** Partial indexes on `is_starred = true` and `use_for_training = true` (agency-scoped)

---

## Code Changes

### Issue Identified: Table Naming Mismatch

**Problem:** The Gmail/Slack sync services (`gmail-service.ts`, `slack-service.ts`) write to `user_communication` (user-scoped), but the AI chat context functions (`get-communications.ts`, `get-recent-communications.ts`) read from `communication` (client-scoped). These are two separate tables with different schemas.

**Result:** Synced messages would go into one table while the AI chat reads from another — zero data visible to the AI.

### Fix: Dual-Query Bridge

**Approach:** Updated both chat context functions to query BOTH tables and merge results.

**Bridge logic:**
1. Query `communication` table as before (client-scoped, filtered by `client_id`)
2. Look up the client's `contact_email` from the `client` table
3. Query `user_communication` where `sender_email` matches the client's `contact_email`
4. Run both queries in parallel via `Promise.all()`
5. Merge results, deduplicate by ID, sort by date descending, respect limit

### Files Modified

| File | Change |
|------|--------|
| `lib/chat/functions/get-communications.ts` | Added dual-query with client email bridge |
| `lib/chat/functions/get-recent-communications.ts` | Added dual-query with client email bridge + `createClient` import |
| `types/database.ts` | Added `user_communication` table type definition + `user_communication_platform` enum |

---

## Database State After Session

**Total tables in public schema:** 38 (was 35)
- Added: `user_oauth_credential`, `user_communication`, `rate_limit`

**Total enums:** 25 (was 24)
- Added: `user_communication_platform`

**Total functions:** 8 (was 6)
- Added: `increment_rate_limit()`, `cleanup_expired_rate_limits()`

**New columns on existing tables:**
- `agency.ai_config` (JSONB)
- `document.is_starred`, `document.use_for_training`, `document.drive_url`, `document.drive_file_id`

---

## Verification

All 10 database objects confirmed live via SQL verification query:

| Object | Status |
|--------|--------|
| `user_oauth_credential` table | ✅ |
| `user_communication` table | ✅ |
| `rate_limit` table | ✅ |
| `agency.ai_config` column | ✅ |
| `document.is_starred` column | ✅ |
| `document.use_for_training` column | ✅ |
| `document.drive_url` column | ✅ |
| `document.drive_file_id` column | ✅ |
| `increment_rate_limit()` function | ✅ |
| `user_communication_platform` enum | ✅ |

---

## Next Steps

1. **Test OAuth flows** — Connect Gmail and Slack accounts via `/api/v1/integrations/gmail/authorize` and `/api/v1/integrations/slack/authorize`
2. **Trigger sync** — After OAuth, hit sync endpoints to pull messages into `user_communication`
3. **Populate client `contact_email`** — The dual-query bridge depends on clients having their email set
4. **Verify AI chat context** — Ask the AI about a client and confirm it pulls synced Gmail/Slack messages
5. **Consider remaining 3 unapplied migrations** — `020` (cartridge functions), `025` (RevOS LinkedIn), `026` (cartridge hierarchy) were not needed for this integration

---

## Environment Variables (Verified on Vercel)

All required keys confirmed present on Vercel (`chase-6917s-projects/v0-audience-os-command-center`):

- `GOOGLE_AI_API_KEY` — Gemini AI (RAG)
- `GOOGLE_CLIENT_ID` — Google OAuth
- `GOOGLE_CLIENT_SECRET` — Google OAuth
- `OAUTH_STATE_SECRET` — CSRF protection
- `TOKEN_ENCRYPTION_KEY` — AES-256-GCM token encryption
- `INTERNAL_API_KEY` — Internal API auth
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase connection
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role

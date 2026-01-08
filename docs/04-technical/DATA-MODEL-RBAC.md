# Data Model: Multi-Org Roles & Permissions System

**Created:** 2026-01-08 (D-1 SpecKit)
**Status:** Technical Specification Ready
**Source:** PRD Multi-Org Roles, B-2 Scope, Existing AudienceOS Schema
**Version:** 1.0

---

## Overview

This data model extends the existing AudienceOS schema with 5 new tables to implement Role-Based Access Control (RBAC) while maintaining multi-tenant isolation via Row Level Security (RLS).

**Design Principles:**
- Dual-layer security: Middleware + RLS
- Agency isolation via `agency_id` in all tables
- 4-level role hierarchy: Owner (1) → Admin (2) → Manager (3) → Member (4)
- Client-scoped access for Members only
- Immutable Owner role protection

---

## New Tables for RBAC

### 1. ROLE

Defines the 4 built-in role types and their hierarchy.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| name | VARCHAR(50) | Yes | Role name: owner, admin, manager, member |
| level | INTEGER | Yes | Hierarchy level (1=Owner, 2=Admin, 3=Manager, 4=Member) |
| description | TEXT | No | Human-readable role description |
| is_system | BOOLEAN | Yes | True for built-in roles (prevents deletion) |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Constraints:**
- UNIQUE(name) - Role names must be unique globally
- CHECK(level BETWEEN 1 AND 4) - Valid hierarchy levels only
- CHECK(name IN ('owner', 'admin', 'manager', 'member')) - Valid role names only

**Seed Data:**
```sql
INSERT INTO role (id, name, level, description, is_system) VALUES
  (uuid_generate_v4(), 'owner', 1, 'Full agency control, cannot be deleted', true),
  (uuid_generate_v4(), 'admin', 2, 'Full access except billing', true),
  (uuid_generate_v4(), 'manager', 3, 'Client management and team oversight', true),
  (uuid_generate_v4(), 'member', 4, 'Assigned clients only', true);
```

**RLS Policy:** Global read access (no agency_id filtering needed)

---

### 2. PERMISSION

Defines the permission matrix: 8 resources × 3 actions × 4 roles = 96 permissions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| role_id | UUID | Yes | FK to role table |
| resource | VARCHAR(50) | Yes | Resource type (clients, communications, etc.) |
| action | VARCHAR(20) | Yes | Action type (read, write, delete) |
| granted | BOOLEAN | Yes | Whether permission is granted |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Constraints:**
- FOREIGN KEY(role_id) REFERENCES role(id) ON DELETE CASCADE
- UNIQUE(role_id, resource, action) - One permission per role+resource+action
- CHECK(resource IN ('clients', 'communications', 'tickets', 'documents', 'workflows', 'integrations', 'settings', 'billing'))
- CHECK(action IN ('read', 'write', 'delete'))

**Permission Matrix Seed Data:**
```sql
-- Owner: Full access to all resources (RWD)
-- Admin: Full access except billing
-- Manager: RWD for clients/comms/tickets, R for workflows/integrations/settings
-- Member: RW for assigned clients only, R for assigned client documents
```

**RLS Policy:** Global read access (no agency_id filtering needed)

---

### 3. USER_ROLE

Links users to roles within agencies. Extends existing user table.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| user_id | UUID | Yes | FK to user table |
| agency_id | UUID | Yes | FK to agency table (tenant isolation) |
| role_id | UUID | Yes | FK to role table |
| assigned_by | UUID | No | User ID who assigned this role |
| assigned_at | TIMESTAMPTZ | Yes | When role was assigned |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Constraints:**
- FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
- FOREIGN KEY(agency_id) REFERENCES agency(id) ON DELETE CASCADE
- FOREIGN KEY(role_id) REFERENCES role(id) ON DELETE RESTRICT
- UNIQUE(user_id, agency_id) - One role per user per agency
- CHECK: Only one owner role per agency (enforced by trigger)

**RLS Policy:**
```sql
CREATE POLICY user_role_rls ON user_role FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

### 4. MEMBER_CLIENT_ACCESS

Defines which clients Members can access. Higher roles ignore this table.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| user_id | UUID | Yes | FK to user table |
| agency_id | UUID | Yes | FK to agency table (tenant isolation) |
| client_id | UUID | Yes | FK to client table |
| access_level | VARCHAR(20) | Yes | read_write, read_only |
| assigned_by | UUID | No | User ID who assigned this access |
| assigned_at | TIMESTAMPTZ | Yes | When access was assigned |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Constraints:**
- FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
- FOREIGN KEY(agency_id) REFERENCES agency(id) ON DELETE CASCADE
- FOREIGN KEY(client_id) REFERENCES client(id) ON DELETE CASCADE
- UNIQUE(user_id, agency_id, client_id) - One access level per user+client
- CHECK(access_level IN ('read_write', 'read_only'))

**RLS Policy:**
```sql
CREATE POLICY member_client_access_rls ON member_client_access FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

### 5. AUDIT_LOG

Comprehensive audit trail for all permission attempts and changes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| agency_id | UUID | Yes | FK to agency table (tenant isolation) |
| user_id | UUID | No | User who attempted action (null for system) |
| event_type | VARCHAR(50) | Yes | permission_check, role_change, client_assignment |
| resource | VARCHAR(50) | No | Resource being accessed |
| action | VARCHAR(20) | No | Action attempted |
| client_id | UUID | No | Client ID for client-scoped actions |
| result | VARCHAR(20) | Yes | allowed, denied, error |
| details | JSONB | No | Additional context and metadata |
| ip_address | INET | No | Request IP address |
| user_agent | TEXT | No | Browser user agent |
| created_at | TIMESTAMPTZ | Yes | Event timestamp |

**Constraints:**
- FOREIGN KEY(agency_id) REFERENCES agency(id) ON DELETE CASCADE
- FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE SET NULL
- INDEX ON (agency_id, created_at) - Fast audit log queries
- INDEX ON (user_id, created_at) - User activity queries
- CHECK(event_type IN ('permission_check', 'role_change', 'client_assignment', 'login', 'logout'))
- CHECK(result IN ('allowed', 'denied', 'error'))

**RLS Policy:**
```sql
CREATE POLICY audit_log_rls ON audit_log FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

## Modified Existing Tables

### USER Table Changes

Add role relationship and caching fields:

```sql
-- Add columns to existing user table
ALTER TABLE user
  ADD COLUMN role_id UUID REFERENCES role(id),
  ADD COLUMN role_level INTEGER, -- Cached for performance
  ADD COLUMN is_owner BOOLEAN DEFAULT false, -- Cached for performance
  ADD COLUMN permissions_cache JSONB, -- Cached permissions
  ADD COLUMN permissions_cached_at TIMESTAMPTZ; -- Cache timestamp

-- Update existing users to Owner role during migration
UPDATE user SET
  role_id = (SELECT id FROM role WHERE name = 'owner'),
  role_level = 1,
  is_owner = true
WHERE role_id IS NULL;
```

### CLIENT Table (No changes needed)

Existing client table works with Member access controls via member_client_access junction table.

---

## Relationships

```
agency 1──────* user_role (agency isolation)
user 1──────* user_role (user can have roles in multiple agencies)
role 1──────* user_role (role can be assigned to multiple users)
role 1──────* permission (role defines permissions)

user 1──────* member_client_access (user can access multiple clients)
client 1──────* member_client_access (client can be accessed by multiple members)
agency 1──────* member_client_access (agency isolation)

agency 1──────* audit_log (agency isolation)
user 1──────* audit_log (user activity tracking)
```

---

## Database Migration Strategy

### Migration 1: Create Core Tables
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create role table with seed data
CREATE TABLE role (...);
INSERT INTO role (...);

-- Create permission table with matrix
CREATE TABLE permission (...);
INSERT INTO permission (...);

-- Create user_role table
CREATE TABLE user_role (...);

-- Create member_client_access table
CREATE TABLE member_client_access (...);

-- Create audit_log table
CREATE TABLE audit_log (...);
```

### Migration 2: Update User Table
```sql
-- Add role fields to user table
ALTER TABLE user ADD COLUMN role_id UUID REFERENCES role(id);
ALTER TABLE user ADD COLUMN role_level INTEGER;
ALTER TABLE user ADD COLUMN is_owner BOOLEAN DEFAULT false;

-- Migrate existing users to Owner role
UPDATE user SET
  role_id = (SELECT id FROM role WHERE name = 'owner'),
  role_level = 1,
  is_owner = true;
```

### Migration 3: Enable RLS
```sql
-- Enable RLS on new tables
ALTER TABLE user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY user_role_rls ON user_role FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

CREATE POLICY member_client_access_rls ON member_client_access FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

CREATE POLICY audit_log_rls ON audit_log FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

## Performance Considerations

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_user_role_agency ON user_role(agency_id, user_id);
CREATE INDEX idx_member_client_access_user ON member_client_access(user_id, agency_id);
CREATE INDEX idx_audit_log_agency_time ON audit_log(agency_id, created_at DESC);
CREATE INDEX idx_audit_log_user_time ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_permission_role ON permission(role_id, resource, action);
```

### Caching Strategy
- User permissions cached in memory for 5 minutes
- Role levels cached in user table for fast hierarchy checks
- Permission matrix loaded at application startup
- Client access lists cached per user session

### Query Optimization
- Use role_level for hierarchy checks instead of JOIN
- Batch permission checks for multiple resources
- Preload client access lists for Members
- Use JSONB for flexible audit log details

---

## Security Considerations

### Data Protection
- All RBAC tables include agency_id for tenant isolation
- RLS policies enforce agency boundaries automatically
- Audit log tracks all access attempts and changes
- Password and token fields excluded from audit logs

### Owner Protection
```sql
-- Trigger to prevent Owner role deletion/modification
CREATE TRIGGER protect_owner_role
  BEFORE UPDATE OR DELETE ON role
  FOR EACH ROW
  WHEN (OLD.name = 'owner' AND OLD.is_system = true)
  EXECUTE FUNCTION prevent_owner_modification();

-- Trigger to enforce one Owner per agency
CREATE TRIGGER enforce_single_owner
  BEFORE INSERT OR UPDATE ON user_role
  FOR EACH ROW
  WHEN (NEW.role_id = (SELECT id FROM role WHERE name = 'owner'))
  EXECUTE FUNCTION check_single_owner_per_agency();
```

### Permission Enforcement
- API middleware validates all requests
- RLS provides database-level backup security
- Client-scoped access enforced at query level
- Audit trail provides complete access history

---

## Test Data

### Sample Roles (Seeded)
- Owner: Level 1, all permissions
- Admin: Level 2, all except billing
- Manager: Level 3, client management
- Member: Level 4, assigned clients only

### Sample Permission Matrix
```sql
-- Example: Owner has all permissions
INSERT INTO permission (role_id, resource, action, granted) VALUES
  ((SELECT id FROM role WHERE name = 'owner'), 'clients', 'read', true),
  ((SELECT id FROM role WHERE name = 'owner'), 'clients', 'write', true),
  ((SELECT id FROM role WHERE name = 'owner'), 'clients', 'delete', true);
  -- ... (24 permissions for all resources)

-- Example: Member has limited permissions
INSERT INTO permission (role_id, resource, action, granted) VALUES
  ((SELECT id FROM role WHERE name = 'member'), 'clients', 'read', true),
  ((SELECT id FROM role WHERE name = 'member'), 'clients', 'write', true),
  ((SELECT id FROM role WHERE name = 'member'), 'clients', 'delete', false);
```

### Sample Client Assignments
```sql
-- Example: Member assigned to 2 clients
INSERT INTO member_client_access (user_id, agency_id, client_id, access_level) VALUES
  ('member-user-id', 'agency-id', 'client-1-id', 'read_write'),
  ('member-user-id', 'agency-id', 'client-2-id', 'read_only');
```

---

*Generated by D-1 SpecKit on 2026-01-08*
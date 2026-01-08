# Data Model: Multi-Org Roles & Permissions System

**Version:** 1.0
**Date:** 2026-01-08
**Purpose:** Database schema for Role-Based Access Control (RBAC) system

---

## Overview

This data model extends the existing AudienceOS Command Center database with 5 new tables to support a 4-level role hierarchy (Owner → Admin → Manager → Member) with granular permissions and client-scoped access.

**Design Principles:**
- Multi-tenant isolation via agency_id with RLS policies
- Role hierarchy enforcement at database level
- Permission caching optimization
- Complete audit trail

---

## New Tables

### 1. role

Defines the 4 built-in role types with hierarchy levels.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Role identifier |
| name | VARCHAR(50) | NOT NULL, UNIQUE | Role name (owner, admin, manager, member) |
| display_name | VARCHAR(100) | NOT NULL | Human-readable name |
| hierarchy_level | INTEGER | NOT NULL, CHECK (hierarchy_level BETWEEN 1 AND 4) | 1=Owner, 2=Admin, 3=Manager, 4=Member |
| description | TEXT | | Role description |
| is_system_role | BOOLEAN | DEFAULT true | Cannot be modified/deleted |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Seed Data:**
```sql
INSERT INTO role (id, name, display_name, hierarchy_level, description, is_system_role) VALUES
('role_owner', 'owner', 'Owner', 1, 'Full agency control and administration', true),
('role_admin', 'admin', 'Admin', 2, 'Administrative access without billing', true),
('role_manager', 'manager', 'Manager', 3, 'Client management and team oversight', true),
('role_member', 'member', 'Member', 4, 'Client-scoped access to assigned accounts', true);
```

---

### 2. permission

Defines the permission matrix: 8 resources × 3 actions per resource.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Permission identifier |
| role_id | UUID | Foreign Key → role.id | Role this permission belongs to |
| resource | VARCHAR(50) | NOT NULL | Resource name |
| action | VARCHAR(50) | NOT NULL | Action name (read, write, manage) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Unique Constraint:** (role_id, resource, action)

**Resources:** clients, settings, users, roles, team_members, documents, workflows, tickets
**Actions:** read, write, manage

**Seed Data Pattern:**
```sql
-- Owner: All permissions (24 total)
-- Admin: All except role management (21 total)
-- Manager: Client/team focus (12 total)
-- Member: Read-only client-scoped (4 total)
```

---

### 3. user_role

Assigns roles to users within agencies. Extends existing user table.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Assignment identifier |
| user_id | UUID | Foreign Key → user.id | User being assigned |
| agency_id | UUID | Foreign Key → agency.id | Agency context |
| role_id | UUID | Foreign Key → role.id | Assigned role |
| assigned_by | UUID | Foreign Key → user.id | Who made the assignment |
| assigned_at | TIMESTAMPTZ | DEFAULT now() | Assignment timestamp |
| expires_at | TIMESTAMPTZ | NULL | Optional expiry (future feature) |
| is_active | BOOLEAN | DEFAULT true | Assignment status |

**Unique Constraint:** (user_id, agency_id) - One role per user per agency

---

### 4. member_client_access

Defines client-scoped access for Member role users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Access record identifier |
| user_id | UUID | Foreign Key → user.id | Member user |
| agency_id | UUID | Foreign Key → agency.id | Agency context |
| client_id | UUID | Foreign Key → client.id | Assigned client |
| assigned_by | UUID | Foreign Key → user.id | Who made the assignment |
| assigned_at | TIMESTAMPTZ | DEFAULT now() | Assignment timestamp |
| is_active | BOOLEAN | DEFAULT true | Assignment status |

**Unique Constraint:** (user_id, client_id)
**Check Constraint:** User must have Member role in the same agency

---

### 5. audit_log

Complete audit trail for permission checks and role changes.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Log entry identifier |
| agency_id | UUID | Foreign Key → agency.id | Agency context |
| user_id | UUID | Foreign Key → user.id | User who performed action |
| action_type | VARCHAR(50) | NOT NULL | Type: permission_check, role_change, client_assignment |
| resource | VARCHAR(50) | | Resource being accessed |
| resource_id | UUID | | Specific resource ID |
| permission_action | VARCHAR(50) | | Action attempted (read/write/manage) |
| result | VARCHAR(20) | NOT NULL | allowed, denied |
| reason | TEXT | | Denial reason or additional context |
| metadata | JSONB | | Additional context (IP, user agent, etc.) |
| timestamp | TIMESTAMPTZ | DEFAULT now() | When action occurred |

**Indexes:**
- (agency_id, timestamp DESC) - Time-based queries
- (user_id, timestamp DESC) - User activity
- (result, timestamp DESC) - Failed access patterns

---

## Modified Tables

### user (Existing Table)

**New Fields Added:**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| role_id | UUID | Foreign Key → role.id | Current role (denormalized for performance) |
| is_owner | BOOLEAN | DEFAULT false | Quick owner check (computed field) |

**Migration Notes:**
- Existing users get role_id = 'role_owner' initially
- is_owner updated via trigger when role_id changes

---

## Row-Level Security (RLS) Policies

All tables use agency_id for multi-tenant isolation:

```sql
-- Example RLS policy pattern
CREATE POLICY "Agency isolation" ON permission
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.is_active = true
  )
);
```

---

## Relationships

```
agency 1──────* user_role (agency context)
         1──────* member_client_access (agency context)
         1──────* audit_log (agency context)

user 1──────* user_role (role assignments)
      1──────* member_client_access (client assignments)
      1──────* audit_log (activity tracking)

role 1──────* permission (role capabilities)
      1──────* user_role (role assignments)

client 1──────* member_client_access (member assignments)
```

---

## Performance Optimizations

### 1. Permission Lookup Cache
- **Application-level cache:** 5-minute TTL, 1000 entry maximum
- **Cache key:** `permissions:${userId}:${agencyId}`
- **Cache invalidation:** On role change, permission change, client assignment change

### 2. Role Hierarchy Early Denial
- **Pattern:** Check hierarchy_level before detailed permission lookup
- **Rule:** If user.role.hierarchy_level <= required_level, allow immediately
- **Benefit:** Avoids permission table lookups for high-privilege users

### 3. Database Indexes
```sql
-- Fast permission lookups
CREATE INDEX idx_permission_role_resource ON permission(role_id, resource, action);

-- Fast user role lookups
CREATE INDEX idx_user_role_lookup ON user_role(user_id, agency_id) WHERE is_active = true;

-- Fast client access checks
CREATE INDEX idx_member_client_access ON member_client_access(user_id, client_id) WHERE is_active = true;

-- Audit query optimization
CREATE INDEX idx_audit_log_agency_time ON audit_log(agency_id, timestamp DESC);
CREATE INDEX idx_audit_log_user_time ON audit_log(user_id, timestamp DESC);
```

---

## Data Flow Examples

### 1. Permission Check Flow
```
1. GET /api/v1/clients/123 (Member user)
2. withPermission middleware extracts clientId=123
3. Check permission cache for user permissions
4. IF cache miss: Query user_role → role → permission tables
5. Check: user has 'clients:read' permission ✓
6. Check: user has access to client 123 via member_client_access ✓
7. Log audit_log: permission_check, result=allowed
8. Allow request
```

### 2. Role Assignment Flow
```
1. POST /api/v1/users/456/role (Owner assigns Manager role)
2. withOwnerOnly middleware validates Owner status
3. Insert user_role record
4. Update user.role_id (denormalized)
5. Update user.is_owner (computed)
6. Clear permission cache for user 456
7. Log audit_log: role_change, metadata={old_role, new_role}
```

---

## Migration Strategy

### Phase 1: Table Creation
1. Create 5 new tables with RLS policies
2. Add role_id, is_owner fields to user table
3. Create indexes for performance

### Phase 2: Data Seeding
1. Insert 4 system roles
2. Generate default permissions for each role
3. Assign existing users to Owner role initially

### Phase 3: Permission Enforcement
1. Deploy middleware changes to API routes
2. Enable permission checking (warn-only mode)
3. Monitor audit logs for violations
4. Switch to enforcement mode

### Phase 4: Client Assignment
1. Enable Member client assignment UI
2. Migrate existing user-client relationships
3. Enforce client-scoped access

---

## Testing Strategy

### Unit Tests
- Permission matrix completeness
- Role hierarchy enforcement
- Cache invalidation logic
- RLS policy coverage

### Integration Tests
- API endpoint protection
- Client-scoped access enforcement
- Audit log accuracy
- Permission inheritance

### Load Tests
- Permission lookup performance (<100ms)
- Cache hit rate (>80%)
- Concurrent role assignment handling

---

*Document Version: 1.0 | Last Updated: 2026-01-08*
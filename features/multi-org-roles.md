# FEATURE SPEC: Multi-Org Roles (RBAC)

**What:** Role-based access control system with granular permissions for multi-tenant agency management
**Who:** Agency Owners and Admins managing team access; Members with restricted access
**Why:** Enable fine-grained control over who can view, modify, or manage specific features and data
**Status:** ✅ UI Updated to 4-tier RBAC (2026-01-18) - Needs E2E verification

---

## User Stories

**US-042: View and Manage Roles**
As an Agency Owner, I want to view and manage roles in my organization, so that I can control access levels.

Acceptance Criteria:
- [ ] View all roles: name, description, member count, creation date
- [ ] See built-in roles: Owner, Admin, Manager, Member (cannot delete)
- [ ] View custom roles created by agency
- [ ] Role detail view shows all assigned permissions
- [ ] Filter roles by type (built-in vs custom)
- [ ] Search roles by name

**US-043: Assign Permissions to Roles**
As an Agency Owner, I want to assign specific permissions to roles, so that I can control what each role can do.

Acceptance Criteria:
- [ ] Permission matrix UI: Resources × Actions (read/write/manage)
- [ ] Resources: clients, communications, tickets, knowledge-base, automations, settings, users, billing
- [ ] Actions: read (view), write (create/edit), manage (delete/admin)
- [ ] Bulk permission assignment (toggle entire column/row)
- [ ] Preview affected users when modifying role permissions
- [ ] Cannot remove permissions from Owner role

**US-044: Enforce Permissions at API Level**
As a Developer, I want permissions enforced at the API level, so that security is not client-dependent.

Acceptance Criteria:
- [ ] Middleware intercepts all API requests
- [ ] Permission check against user's effective permissions
- [ ] 403 Forbidden response with clear error message
- [ ] Audit log of permission denials
- [ ] RLS policies enforce data isolation
- [ ] No client-side-only permission checks

**US-045: Custom Role Creation**
As an Agency Admin, I want to create custom roles, so that I can match my team's structure.

Acceptance Criteria:
- [ ] Create role: name (unique), description, base permissions
- [ ] Clone existing role as starting point
- [ ] Assign custom role to users
- [ ] Edit custom role permissions at any time
- [ ] Delete custom role (must reassign users first)
- [ ] Maximum 10 custom roles per agency

---

## Functional Requirements

What this feature DOES:
- [ ] Provide hierarchical role system with Owner, Admin, Manager, Member built-in roles
- [ ] Enable granular permission assignment per resource and action type
- [ ] Enforce permissions at API middleware level with RLS backup
- [ ] Support custom role creation with inherited permissions
- [ ] Maintain audit trail of all permission changes and denials
- [ ] Protect Owner role from modification or removal
- [ ] Support client-level access restrictions for Members
- [ ] Enable conditional UI rendering based on user permissions
- [ ] Provide permission inheritance and precedence rules
- [ ] Support bulk permission operations for efficiency

What this feature does NOT do:
- ❌ Support cross-agency role sharing or templates
- ❌ Provide time-limited or expiring permissions
- ❌ Enable attribute-based access control (ABAC)
- ❌ Support permission delegation (user granting their permissions to another)
- ❌ Provide approval workflows for permission requests

---

## Role Types

### Built-in Roles (Cannot Delete)

| Role | Description | Typical Use |
|------|-------------|-------------|
| **Owner** | Agency creator with full access, cannot be removed | Agency founder, primary account holder |
| **Admin** | Full access except billing modification | Operations lead, senior managers |
| **Manager** | Client management, no settings or user management | Account managers, project leads |
| **Member** | Read-only + assigned clients write access | Junior staff, contractors, specialists |

### Role Hierarchy

```
Owner (highest)
  └── Admin
       └── Manager
            └── Member (lowest)
```

**Hierarchy Rules:**
- Users can only assign roles at or below their own level
- Users cannot modify users with roles above their own
- Owner can modify all roles and users
- Admin cannot modify Owner or other Admins' roles

### Custom Roles

- Created by Owner or Admin
- Based on any permission combination
- Not part of hierarchy (flat structure)
- Maximum 10 per agency
- Must have unique name within agency

---

## Permission Matrix

### Resource × Role → Default Permissions

| Resource | Owner | Admin | Manager | Member |
|----------|-------|-------|---------|--------|
| **clients** | manage | manage | write | read* |
| **communications** | manage | manage | write | read* |
| **tickets** | manage | manage | write | read* |
| **knowledge-base** | manage | manage | write | read |
| **automations** | manage | manage | read | none |
| **settings** | manage | manage | none | none |
| **users** | manage | manage | read | none |
| **billing** | manage | read | none | none |
| **roles** | manage | write | read | none |
| **integrations** | manage | manage | read | none |
| **analytics** | manage | manage | write | read |
| **ai-features** | manage | manage | write | read |

**Legend:**
- `manage` = read + write + delete + admin actions
- `write` = read + create + edit
- `read` = view only
- `none` = no access
- `*` = only for assigned clients (see Client-Level Access)

### Permission Actions Detail

| Action | Description | Example Operations |
|--------|-------------|--------------------|
| `read` | View data | List clients, view communications, read tickets |
| `write` | Modify data | Create clients, send messages, update tickets |
| `delete` | Remove data | Archive clients, delete documents |
| `manage` | Full control | All above + configure settings, manage access |

### Client-Level Access (Members)

Members have restricted access based on client assignments:

```typescript
interface ClientAccess {
  client_id: string;
  permission: 'read' | 'write';
  assigned_by: string;
  assigned_at: Date;
}
```

- Members see ONLY clients they're assigned to
- Assignment grants read or write on that client's data
- Unassigned clients are invisible (not just read-only)
- Admins/Managers can assign clients to Members

---

## Data Model Changes

### New Tables

#### ROLE

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| agency_id | UUID | Yes | FK to agency |
| name | String(50) | Yes | Role name (unique per agency) |
| description | String(200) | No | Role purpose description |
| is_system | Boolean | Yes | Built-in role (cannot delete) |
| hierarchy_level | Integer | No | 1=Owner, 2=Admin, 3=Manager, 4=Member, null=custom |
| created_by | UUID | No | FK to user (null for system roles) |
| created_at | Timestamp | Yes | Role creation |
| updated_at | Timestamp | Yes | Last modification |

**Unique Constraint:** (agency_id, name)

**RLS Policy:**
```sql
CREATE POLICY role_rls ON role FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

#### PERMISSION

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| resource | Enum | Yes | clients, communications, tickets, etc. |
| action | Enum | Yes | read, write, delete, manage |
| description | String(200) | No | Human-readable description |
| created_at | Timestamp | Yes | Record creation |

**Unique Constraint:** (resource, action)

**Note:** This is a system table, not tenant-scoped. Seeded with all valid permission combinations.

#### ROLE_PERMISSION

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| role_id | UUID | Yes | FK to role |
| permission_id | UUID | Yes | FK to permission |
| agency_id | UUID | Yes | FK to agency (denormalized for RLS) |
| granted_by | UUID | No | FK to user who granted |
| granted_at | Timestamp | Yes | When permission was granted |

**Unique Constraint:** (role_id, permission_id)

**RLS Policy:**
```sql
CREATE POLICY role_permission_rls ON role_permission FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

#### MEMBER_CLIENT_ACCESS

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| agency_id | UUID | Yes | FK to agency |
| user_id | UUID | Yes | FK to user (must be Member role) |
| client_id | UUID | Yes | FK to client |
| permission | Enum | Yes | read, write |
| assigned_by | UUID | Yes | FK to user who assigned |
| assigned_at | Timestamp | Yes | Assignment date |

**Unique Constraint:** (user_id, client_id)

**RLS Policy:**
```sql
CREATE POLICY member_access_rls ON member_client_access FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

### USER Table Modifications

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| role | Enum | REMOVE | Deprecated (simple role) |
| role_id | UUID | ADD | FK to role table |
| is_owner | Boolean | ADD | True for agency creator (immutable) |

**Migration Strategy:**
```sql
-- Step 1: Create new tables
CREATE TABLE role (...);
CREATE TABLE permission (...);
CREATE TABLE role_permission (...);
CREATE TABLE member_client_access (...);

-- Step 2: Seed system roles for each agency
INSERT INTO role (agency_id, name, is_system, hierarchy_level)
SELECT id, 'Owner', true, 1 FROM agency
UNION ALL
SELECT id, 'Admin', true, 2 FROM agency
UNION ALL
SELECT id, 'Manager', true, 3 FROM agency
UNION ALL
SELECT id, 'Member', true, 4 FROM agency;

-- Step 3: Seed permissions
INSERT INTO permission (resource, action) VALUES
('clients', 'read'), ('clients', 'write'), ('clients', 'delete'), ('clients', 'manage'),
('communications', 'read'), ('communications', 'write'), ('communications', 'delete'), ('communications', 'manage'),
-- ... etc for all resources

-- Step 4: Seed default role_permissions
-- (complex INSERT based on permission matrix above)

-- Step 5: Add role_id to users
ALTER TABLE "user" ADD COLUMN role_id UUID REFERENCES role(id);

-- Step 6: Migrate existing roles
UPDATE "user" u
SET role_id = r.id
FROM role r
WHERE r.agency_id = u.agency_id
AND r.name = CASE
  WHEN u.role = 'admin' THEN 'Admin'
  ELSE 'Member'
END;

-- Step 7: Set first admin per agency as Owner
UPDATE "user" u
SET role_id = r.id, is_owner = true
FROM role r
WHERE r.agency_id = u.agency_id
AND r.name = 'Owner'
AND u.id = (
  SELECT MIN(id) FROM "user" u2
  WHERE u2.agency_id = u.agency_id AND u2.role = 'admin'
);

-- Step 8: Drop old column (after validation)
ALTER TABLE "user" DROP COLUMN role;
```

---

## API Endpoints

| Endpoint | Method | Purpose | Required Permission |
|----------|--------|---------|---------------------|
| `/api/v1/roles` | GET | List all roles in agency | roles:read |
| `/api/v1/roles` | POST | Create custom role | roles:write |
| `/api/v1/roles/{id}` | GET | Get role details with permissions | roles:read |
| `/api/v1/roles/{id}` | PATCH | Update role name/description | roles:write |
| `/api/v1/roles/{id}` | DELETE | Delete custom role | roles:manage |
| `/api/v1/roles/{id}/permissions` | GET | Get role's permissions | roles:read |
| `/api/v1/roles/{id}/permissions` | PUT | Set role's permissions (replace all) | roles:write |
| `/api/v1/roles/{id}/permissions/{permId}` | POST | Add permission to role | roles:write |
| `/api/v1/roles/{id}/permissions/{permId}` | DELETE | Remove permission from role | roles:write |
| `/api/v1/roles/{id}/users` | GET | List users with this role | roles:read |
| `/api/v1/permissions` | GET | List all available permissions | authenticated |
| `/api/v1/users/{id}/role` | PATCH | Change user's role | users:manage |
| `/api/v1/users/{id}/client-access` | GET | Get Member's client assignments | users:read |
| `/api/v1/users/{id}/client-access` | PUT | Set Member's client assignments | users:manage |
| `/api/v1/me/permissions` | GET | Get current user's effective permissions | authenticated |

---

## Enforcement Points

### 1. API Middleware Pattern

```typescript
// lib/middleware/permission-guard.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserPermissions, checkPermission } from '@/lib/rbac';

interface PermissionRequirement {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'manage';
  clientScoped?: boolean; // For Member client-level access
}

export function withPermission(requirement: PermissionRequirement) {
  return async function middleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const permissions = await getUserPermissions(user.id, user.agency_id);

    // Check base permission
    if (!checkPermission(permissions, requirement.resource, requirement.action)) {
      await logPermissionDenial(user, requirement, req);
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'PERMISSION_DENIED',
          required: `${requirement.resource}:${requirement.action}`,
          message: `You do not have permission to ${requirement.action} ${requirement.resource}`
        },
        { status: 403 }
      );
    }

    // For Members, check client-level access if required
    if (requirement.clientScoped && user.role.hierarchy_level === 4) {
      const clientId = extractClientId(req);
      if (clientId && !await hasClientAccess(user.id, clientId, requirement.action)) {
        await logPermissionDenial(user, requirement, req);
        return NextResponse.json(
          {
            error: 'Forbidden',
            code: 'CLIENT_ACCESS_DENIED',
            message: 'You do not have access to this client'
          },
          { status: 403 }
        );
      }
    }

    return handler(req);
  };
}

// Usage in API route
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (req: NextRequest) => {
    // Handler code here - permission already verified
  }
);
```

### 2. RLS Policies

```sql
-- Enhanced client RLS with role-based access
CREATE POLICY client_role_rls ON client FOR SELECT
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND (
    -- Owners, Admins, Managers see all clients
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.hierarchy_level <= 3
    )
    OR
    -- Members see only assigned clients
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = client.id
    )
  )
);

-- Write access requires write permission or assignment
CREATE POLICY client_write_rls ON client FOR UPDATE
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND (
    -- Users with clients:write permission
    EXISTS (
      SELECT 1 FROM "user" u
      JOIN role r ON u.role_id = r.id
      JOIN role_permission rp ON rp.role_id = r.id
      JOIN permission p ON p.id = rp.permission_id
      WHERE u.id = auth.uid()
      AND p.resource = 'clients'
      AND p.action IN ('write', 'manage')
    )
    OR
    -- Members with write access to this client
    EXISTS (
      SELECT 1 FROM member_client_access mca
      WHERE mca.user_id = auth.uid()
      AND mca.client_id = client.id
      AND mca.permission = 'write'
    )
  )
);
```

### 3. Frontend Conditional Rendering

```typescript
// hooks/use-permission.ts
import { useAuth } from '@/hooks/use-auth';
import { useMemo } from 'react';

interface UsePermissionResult {
  can: (resource: string, action: string) => boolean;
  canAny: (checks: Array<{ resource: string; action: string }>) => boolean;
  canAll: (checks: Array<{ resource: string; action: string }>) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  role: Role | null;
  permissions: Permission[];
  loading: boolean;
}

export function usePermission(): UsePermissionResult {
  const { user, permissions, loading } = useAuth();

  const permissionSet = useMemo(() => {
    return new Set(permissions.map(p => `${p.resource}:${p.action}`));
  }, [permissions]);

  const can = (resource: string, action: string): boolean => {
    if (loading) return false;

    // Manage includes all lower permissions
    if (permissionSet.has(`${resource}:manage`)) return true;
    if (action === 'write' && permissionSet.has(`${resource}:write`)) return true;
    if (action === 'read' && (permissionSet.has(`${resource}:read`) || permissionSet.has(`${resource}:write`))) return true;

    return permissionSet.has(`${resource}:${action}`);
  };

  const canAny = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.some(({ resource, action }) => can(resource, action));
  };

  const canAll = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.every(({ resource, action }) => can(resource, action));
  };

  return {
    can,
    canAny,
    canAll,
    isOwner: user?.is_owner ?? false,
    isAdmin: user?.role?.hierarchy_level <= 2,
    role: user?.role ?? null,
    permissions,
    loading
  };
}

// components/permission-gate.tsx
interface PermissionGateProps {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ resource, action, children, fallback = null }: PermissionGateProps) {
  const { can, loading } = usePermission();

  if (loading) return null;
  if (!can(resource, action)) return fallback;

  return <>{children}</>;
}

// Usage
<PermissionGate resource="settings" action="write">
  <Button onClick={saveSettings}>Save Settings</Button>
</PermissionGate>

<PermissionGate
  resource="users"
  action="manage"
  fallback={<span className="text-muted-foreground">Contact admin to manage users</span>}
>
  <UserManagementPanel />
</PermissionGate>
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| RolesListPage | Main roles management view with list and search |
| RoleCard | Individual role display with member count and actions |
| RoleDetailDrawer | Expanded view with permission matrix |
| RoleCreateModal | New custom role creation form |
| RoleEditModal | Edit role name, description |
| PermissionMatrixEditor | Grid UI for assigning permissions |
| PermissionCheckbox | Individual permission toggle with tooltip |
| UserRoleSelector | Dropdown for changing user's role |
| ClientAccessManager | UI for managing Member client assignments |
| PermissionGate | Wrapper component for conditional rendering |
| RoleHierarchyIndicator | Visual hierarchy level display |
| BulkPermissionToggle | Toggle entire row/column in matrix |
| AffectedUsersPreview | Shows users affected by permission change |
| RoleDeletionModal | Confirmation with user reassignment |
| PermissionDeniedPage | Friendly 403 error page |

---

## Implementation Tasks

### Core Infrastructure
- [ ] TASK-001: Create role, permission, role_permission database tables with proper indexes
- [ ] TASK-002: Create member_client_access table for Member client restrictions
- [ ] TASK-003: Write migration script for existing role field to new role system
- [ ] TASK-004: Seed system roles (Owner, Admin, Manager, Member) for all agencies
- [ ] TASK-005: Seed permission table with all resource/action combinations

### Permission Service Layer
- [ ] TASK-006: Create PermissionService class with caching and evaluation logic
- [ ] TASK-007: Implement getUserPermissions() with role and client-access resolution
- [ ] TASK-008: Build checkPermission() with hierarchy and inheritance rules
- [ ] TASK-009: Create permission caching layer with invalidation on role changes
- [ ] TASK-010: Implement effective permission calculation for custom roles

### API Middleware
- [ ] TASK-011: Create withPermission() middleware wrapper for API routes
- [ ] TASK-012: Implement permission denial logging to audit table
- [ ] TASK-013: Add client-scoped permission checking for Members
- [ ] TASK-014: Create permission error response standardization
- [ ] TASK-015: Apply middleware to all existing API routes

### RLS Policy Updates
- [ ] TASK-016: Update client table RLS with role-based access
- [ ] TASK-017: Update communication table RLS for client-scoped Members
- [ ] TASK-018: Update ticket table RLS for client-scoped Members
- [ ] TASK-019: Update settings tables RLS for admin-only access
- [ ] TASK-020: Add RLS policies for new role tables

### Role Management APIs
- [ ] TASK-021: Create GET /api/v1/roles endpoint with filtering
- [ ] TASK-022: Create POST /api/v1/roles for custom role creation
- [ ] TASK-023: Create PATCH /api/v1/roles/{id} for role updates
- [ ] TASK-024: Create DELETE /api/v1/roles/{id} with user reassignment check
- [ ] TASK-025: Create role permission management endpoints

### Permission Management APIs
- [ ] TASK-026: Create GET /api/v1/permissions endpoint
- [ ] TASK-027: Create PUT /api/v1/roles/{id}/permissions for bulk assignment
- [ ] TASK-028: Create GET /api/v1/me/permissions for current user
- [ ] TASK-029: Implement permission inheritance resolution
- [ ] TASK-030: Add permission change audit logging

### Frontend - Role Management
- [ ] TASK-031: Create RolesListPage with search and filtering
- [ ] TASK-032: Build RoleCard component with member count
- [ ] TASK-033: Create RoleDetailDrawer with full permission view
- [ ] TASK-034: Build RoleCreateModal with validation
- [ ] TASK-035: Implement RoleEditModal with protection for system roles

### Frontend - Permission Matrix
- [ ] TASK-036: Create PermissionMatrixEditor grid component
- [ ] TASK-037: Implement BulkPermissionToggle for row/column operations
- [ ] TASK-038: Build AffectedUsersPreview component
- [ ] TASK-039: Add visual indicators for inherited vs explicit permissions
- [ ] TASK-040: Create undo/redo for permission changes

### Frontend - Access Control
- [ ] TASK-041: Create usePermission() hook for permission checks
- [ ] TASK-042: Build PermissionGate wrapper component
- [ ] TASK-043: Update navigation to hide unauthorized sections
- [ ] TASK-044: Create PermissionDeniedPage for 403 errors
- [ ] TASK-045: Add permission-aware button/action states

### Client Access Management
- [ ] TASK-046: Create ClientAccessManager UI for Members
- [ ] TASK-047: Build client assignment/unassignment flow
- [ ] TASK-048: Implement bulk client assignment
- [ ] TASK-049: Add client access audit logging
- [ ] TASK-050: Create client access report for admins

### Testing & Validation
- [ ] TASK-051: Write unit tests for PermissionService
- [ ] TASK-052: Write integration tests for API middleware
- [ ] TASK-053: Write E2E tests for role management flows
- [ ] TASK-054: Test RLS policies with different role combinations
- [ ] TASK-055: Performance test permission caching

### Documentation & Migration
- [ ] TASK-056: Document permission system for developers
- [ ] TASK-057: Create user guide for role management
- [ ] TASK-058: Build migration verification scripts
- [ ] TASK-059: Create rollback plan for migration
- [ ] TASK-060: Update API documentation with permission requirements

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Last Owner tries to downgrade themselves | Block with error "Agency must have at least one Owner" |
| Last Owner tries to leave agency | Block with error "Transfer ownership before leaving" |
| Delete role with assigned users | Show modal requiring user reassignment before deletion |
| Downgrade user with active client assignments | Preserve assignments if new role supports client access, else warn |
| Custom role permission exceeds hierarchy | Allow (custom roles are flat, no hierarchy enforcement) |
| Admin tries to modify Owner | Block with 403 "Cannot modify Owner role" |
| Member tries to access unassigned client | Return 403 with "You do not have access to this client" |
| Concurrent permission modifications | Use optimistic locking, show conflict resolution |
| Agency reaches 10 custom role limit | Block creation with "Maximum custom roles reached" message |
| User's role deleted while logged in | On next request, redirect to role-changed notice |
| Permission cache stale | Cache TTL of 5 minutes, force refresh on role changes |
| Bulk permission change affects 100+ users | Show confirmation with user count, async processing |
| API called without permission header | Fail closed - deny if unable to verify permissions |
| New resource added without permissions | Defaults to admin-only until explicitly configured |
| Migration fails mid-way | Rollback transaction, keep old role field intact |

---

## Technical Implementation

### Permission Service

```typescript
// lib/rbac/permission-service.ts
import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

interface EffectivePermission {
  resource: string;
  action: string;
  source: 'role' | 'client_access';
  roleId?: string;
  clientId?: string;
}

class PermissionService {
  private cache = new Map<string, { permissions: EffectivePermission[]; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getUserPermissions(userId: string, agencyId: string): Promise<EffectivePermission[]> {
    const cacheKey = `${userId}:${agencyId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.permissions;
    }

    const supabase = createClient();

    // Get user's role and permissions
    const { data: user } = await supabase
      .from('user')
      .select(`
        id,
        is_owner,
        role:role_id (
          id,
          name,
          hierarchy_level,
          role_permissions:role_permission (
            permission:permission_id (
              resource,
              action
            )
          )
        )
      `)
      .eq('id', userId)
      .eq('agency_id', agencyId)
      .single();

    if (!user) return [];

    const permissions: EffectivePermission[] = [];

    // Add role permissions
    if (user.role?.role_permissions) {
      for (const rp of user.role.role_permissions) {
        permissions.push({
          resource: rp.permission.resource,
          action: rp.permission.action,
          source: 'role',
          roleId: user.role.id
        });
      }
    }

    // For Members, add client-level access
    if (user.role?.hierarchy_level === 4) {
      const { data: clientAccess } = await supabase
        .from('member_client_access')
        .select('client_id, permission')
        .eq('user_id', userId);

      if (clientAccess) {
        for (const access of clientAccess) {
          // Client-scoped permissions for assigned resources
          const clientResources = ['clients', 'communications', 'tickets'];
          for (const resource of clientResources) {
            permissions.push({
              resource,
              action: access.permission,
              source: 'client_access',
              clientId: access.client_id
            });
          }
        }
      }
    }

    // Cache the result
    this.cache.set(cacheKey, {
      permissions,
      expires: Date.now() + this.CACHE_TTL
    });

    return permissions;
  }

  checkPermission(
    permissions: EffectivePermission[],
    resource: string,
    action: string,
    clientId?: string
  ): boolean {
    for (const perm of permissions) {
      if (perm.resource !== resource) continue;

      // Direct match
      if (perm.action === action) {
        // If permission is client-scoped, check client ID
        if (perm.source === 'client_access' && clientId) {
          if (perm.clientId === clientId) return true;
        } else if (perm.source === 'role') {
          return true;
        }
      }

      // Manage implies all actions
      if (perm.action === 'manage') return true;

      // Write implies read
      if (action === 'read' && perm.action === 'write') return true;
    }

    return false;
  }

  invalidateCache(userId: string, agencyId: string): void {
    this.cache.delete(`${userId}:${agencyId}`);
  }

  invalidateAgencyCache(agencyId: string): void {
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${agencyId}`)) {
        this.cache.delete(key);
      }
    }
  }
}

export const permissionService = new PermissionService();
```

### Role Management Service

```typescript
// lib/rbac/role-service.ts
import { createClient } from '@/lib/supabase/server';
import { permissionService } from './permission-service';

interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: Array<{ resource: string; action: string }>;
}

class RoleService {
  async createRole(agencyId: string, createdBy: string, input: CreateRoleInput) {
    const supabase = createClient();

    // Check custom role limit
    const { count } = await supabase
      .from('role')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('is_system', false);

    if (count && count >= 10) {
      throw new Error('Maximum custom roles (10) reached for this agency');
    }

    // Check name uniqueness
    const { data: existing } = await supabase
      .from('role')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('name', input.name)
      .single();

    if (existing) {
      throw new Error(`Role "${input.name}" already exists`);
    }

    // Create role
    const { data: role, error: roleError } = await supabase
      .from('role')
      .insert({
        agency_id: agencyId,
        name: input.name,
        description: input.description,
        is_system: false,
        hierarchy_level: null,
        created_by: createdBy
      })
      .select()
      .single();

    if (roleError) throw roleError;

    // Get permission IDs
    const { data: permissions } = await supabase
      .from('permission')
      .select('id, resource, action')
      .in('resource', input.permissions.map(p => p.resource));

    // Map input permissions to permission IDs
    const rolePermissions = input.permissions
      .map(inputPerm => {
        const perm = permissions?.find(
          p => p.resource === inputPerm.resource && p.action === inputPerm.action
        );
        return perm ? { role_id: role.id, permission_id: perm.id, agency_id: agencyId } : null;
      })
      .filter(Boolean);

    // Insert role permissions
    if (rolePermissions.length > 0) {
      await supabase.from('role_permission').insert(rolePermissions);
    }

    // Invalidate cache
    permissionService.invalidateAgencyCache(agencyId);

    return role;
  }

  async deleteRole(roleId: string, agencyId: string) {
    const supabase = createClient();

    // Check if system role
    const { data: role } = await supabase
      .from('role')
      .select('is_system, name')
      .eq('id', roleId)
      .eq('agency_id', agencyId)
      .single();

    if (!role) throw new Error('Role not found');
    if (role.is_system) throw new Error('Cannot delete system role');

    // Check if users assigned
    const { count: userCount } = await supabase
      .from('user')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);

    if (userCount && userCount > 0) {
      throw new Error(`Cannot delete role with ${userCount} assigned users. Reassign users first.`);
    }

    // Delete permissions first (foreign key)
    await supabase.from('role_permission').delete().eq('role_id', roleId);

    // Delete role
    await supabase.from('role').delete().eq('id', roleId);

    // Invalidate cache
    permissionService.invalidateAgencyCache(agencyId);
  }

  async changeUserRole(
    userId: string,
    newRoleId: string,
    agencyId: string,
    changedBy: string
  ) {
    const supabase = createClient();

    // Get current user
    const { data: user } = await supabase
      .from('user')
      .select('id, is_owner, role_id')
      .eq('id', userId)
      .eq('agency_id', agencyId)
      .single();

    if (!user) throw new Error('User not found');

    // Cannot change Owner role if they're the only owner
    if (user.is_owner) {
      const { count: ownerCount } = await supabase
        .from('user')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('is_owner', true);

      if (ownerCount === 1) {
        throw new Error('Cannot change role of only Owner. Transfer ownership first.');
      }
    }

    // Get new role to validate it exists
    const { data: newRole } = await supabase
      .from('role')
      .select('id, hierarchy_level')
      .eq('id', newRoleId)
      .eq('agency_id', agencyId)
      .single();

    if (!newRole) throw new Error('Target role not found');

    // Get changer's role level
    const { data: changer } = await supabase
      .from('user')
      .select('role:role_id(hierarchy_level)')
      .eq('id', changedBy)
      .single();

    // Hierarchy check: can only assign roles at or below own level
    if (newRole.hierarchy_level && changer?.role?.hierarchy_level) {
      if (newRole.hierarchy_level < changer.role.hierarchy_level) {
        throw new Error('Cannot assign a role higher than your own');
      }
    }

    // Update user role
    await supabase
      .from('user')
      .update({ role_id: newRoleId, updated_at: new Date().toISOString() })
      .eq('id', userId);

    // Log audit event
    await supabase.from('audit_log').insert({
      agency_id: agencyId,
      action: 'role_change',
      actor_id: changedBy,
      target_type: 'user',
      target_id: userId,
      details: { old_role_id: user.role_id, new_role_id: newRoleId }
    });

    // Invalidate user's permission cache
    permissionService.invalidateCache(userId, agencyId);
  }
}

export const roleService = new RoleService();
```

### Owner Protection Logic

```typescript
// lib/rbac/owner-protection.ts
import { createClient } from '@/lib/supabase/server';

export async function validateOwnerOperation(
  agencyId: string,
  operation: 'remove' | 'downgrade' | 'deactivate',
  targetUserId: string
): Promise<{ allowed: boolean; error?: string }> {
  const supabase = createClient();

  // Check if target is an owner
  const { data: targetUser } = await supabase
    .from('user')
    .select('is_owner')
    .eq('id', targetUserId)
    .eq('agency_id', agencyId)
    .single();

  if (!targetUser?.is_owner) {
    return { allowed: true }; // Not an owner, no protection needed
  }

  // Count owners in agency
  const { count: ownerCount } = await supabase
    .from('user')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('is_owner', true)
    .eq('is_active', true);

  if (ownerCount === 1) {
    switch (operation) {
      case 'remove':
        return {
          allowed: false,
          error: 'Cannot remove the only Owner. Transfer ownership first.'
        };
      case 'downgrade':
        return {
          allowed: false,
          error: 'Cannot downgrade the only Owner. Transfer ownership first.'
        };
      case 'deactivate':
        return {
          allowed: false,
          error: 'Cannot deactivate the only Owner. Transfer ownership first.'
        };
    }
  }

  return { allowed: true };
}

export async function transferOwnership(
  agencyId: string,
  fromUserId: string,
  toUserId: string,
  performedBy: string
): Promise<void> {
  const supabase = createClient();

  // Validate performer is an owner
  const { data: performer } = await supabase
    .from('user')
    .select('is_owner')
    .eq('id', performedBy)
    .eq('agency_id', agencyId)
    .single();

  if (!performer?.is_owner) {
    throw new Error('Only Owners can transfer ownership');
  }

  // Validate target exists and is active
  const { data: targetUser } = await supabase
    .from('user')
    .select('id, is_active')
    .eq('id', toUserId)
    .eq('agency_id', agencyId)
    .single();

  if (!targetUser || !targetUser.is_active) {
    throw new Error('Target user not found or inactive');
  }

  // Get Owner role ID
  const { data: ownerRole } = await supabase
    .from('role')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('name', 'Owner')
    .single();

  // Transaction: transfer ownership
  // Remove owner flag from source
  await supabase
    .from('user')
    .update({ is_owner: false })
    .eq('id', fromUserId);

  // Add owner flag and role to target
  await supabase
    .from('user')
    .update({ is_owner: true, role_id: ownerRole?.id })
    .eq('id', toUserId);

  // Audit log
  await supabase.from('audit_log').insert({
    agency_id: agencyId,
    action: 'ownership_transfer',
    actor_id: performedBy,
    target_type: 'user',
    target_id: toUserId,
    details: { from_user_id: fromUserId, to_user_id: toUserId }
  });
}
```

---

## Testing Checklist

- [ ] Happy path: Create custom role with specific permissions
- [ ] Happy path: Assign role to user, verify permission enforcement
- [ ] Happy path: Member can only see/edit assigned clients
- [ ] Permission check: API returns 403 for unauthorized requests
- [ ] Permission check: UI hides unauthorized actions
- [ ] Owner protection: Cannot remove/downgrade last owner
- [ ] Ownership transfer: Properly transfers Owner status
- [ ] Role deletion: Blocked when users assigned
- [ ] Role deletion: Succeeds after user reassignment
- [ ] Permission inheritance: Manage includes all actions
- [ ] Custom role limit: Blocks creation at 10 roles
- [ ] RLS enforcement: Database queries respect permissions
- [ ] Cache invalidation: Permission changes take effect immediately
- [ ] Migration: Existing users correctly migrated to new roles
- [ ] Hierarchy: Users cannot assign roles above their level

---

## Performance Considerations

### Caching Strategy
- Permission cache per user with 5-minute TTL
- Invalidate on: role change, permission update, client access change
- Use Redis in production for distributed caching
- Cache key: `permissions:${userId}:${agencyId}`

### Database Optimization
```sql
-- Essential indexes for RBAC performance
CREATE INDEX idx_role_agency ON role(agency_id);
CREATE INDEX idx_role_permission_role ON role_permission(role_id);
CREATE INDEX idx_user_role ON "user"(role_id);
CREATE INDEX idx_member_access_user ON member_client_access(user_id);
CREATE INDEX idx_member_access_client ON member_client_access(client_id);

-- Composite index for permission lookups
CREATE INDEX idx_role_perm_lookup ON role_permission(role_id, permission_id);
```

### Query Optimization
- Batch permission checks when possible
- Preload permissions in auth context
- Use materialized view for complex permission calculations
- Avoid N+1 queries in permission resolution

---

## Dependencies

### Required for Implementation
- Supabase Auth with custom claims
- React Query for permission state management
- Zod for permission validation schemas

### Blocked By
- AUDIT_LOG table for permission change tracking
- User invitation system (existing)
- Settings API routes (existing)

### Enables
- Fine-grained feature access control
- Client-specific user restrictions
- Compliance and audit requirements
- Team structure customization

---

## Security & Privacy

### Access Control Principles
- **Principle of Least Privilege:** Default to no access
- **Defense in Depth:** Middleware + RLS + UI checks
- **Fail Closed:** Deny if unable to verify permissions
- **Audit Trail:** Log all permission changes and denials

### Security Measures
```typescript
// Never trust client-side permission checks alone
async function secureEndpoint(req: NextRequest) {
  // Always verify server-side
  const user = await getAuthenticatedUser(req);
  const permissions = await permissionService.getUserPermissions(user.id, user.agency_id);

  if (!permissionService.checkPermission(permissions, 'resource', 'action')) {
    // Log denial for security monitoring
    await logSecurityEvent({
      type: 'permission_denied',
      userId: user.id,
      resource: 'resource',
      action: 'action',
      ip: req.ip
    });

    throw new ForbiddenError();
  }
}
```

### Audit Logging
- All permission changes logged with actor, timestamp, before/after
- Permission denials logged for security analysis
- Role changes logged with reason
- Ownership transfers logged with approval chain

---

## Success Metrics

- **Access Control Coverage:** 100% of API endpoints have permission checks
- **Permission Denial Rate:** <5% (indicates good UX, users see what they can access)
- **Custom Role Adoption:** 30% of agencies create at least one custom role
- **Security Incidents:** 0 unauthorized data access via permission bypass
- **Migration Success:** 100% of existing users migrated without access loss
- **Performance:** Permission checks add <50ms to API response time

---

## Monitoring & Alerts

### Key Metrics
- Permission denial rate by endpoint
- Role distribution across agencies
- Custom role usage patterns
- Permission cache hit rate
- Permission check latency

### Alerting Rules
```yaml
permission_denial_spike:
  condition: denial_rate > 20%
  window: 5m
  alert: Slack

unauthorized_access_attempt:
  condition: sequential_denials_same_user > 10
  window: 1m
  alert: PagerDuty

permission_cache_miss_rate:
  condition: miss_rate > 50%
  window: 15m
  alert: Slack

role_change_volume:
  condition: role_changes > 50
  window: 1h
  alert: Email
```

---

## Testing Findings (E2E Browser Test - 2026-01-18)

### Summary
**Verdict:** ✅ Fixed (2026-01-18) - UI now supports full 4-tier RBAC

### Issues Found & Resolved

| Issue | Severity | Description | Status |
|-------|----------|-------------|--------|
| **UI-001: Role Dropdown Limited** | 🔴 HIGH | Role dropdown only showed "Admin" and "User" | ✅ FIXED |
| **UI-002: Naming Mismatch** | 🟡 MEDIUM | UI used "User" but spec defines "Member" | ✅ FIXED |
| **UI-003: No Member Users** | 🔴 HIGH | Cannot create Member-role users | ✅ FIXED |
| **UI-004: Missing Client Access Menu** | 🟡 MEDIUM | Code exists but hidden (only shows for Members) | ℹ️ Working as designed |
| **DATA-001: Role Sync Issue** | 🟡 MEDIUM | Role dropdown sync with selected user | ⏳ Needs verification |

### Fix Details (2026-01-18)

**Files Modified:**
1. `types/database.ts` - Updated `UserRole` type: `'owner' | 'admin' | 'manager' | 'member'`
2. `types/database.ts` - Updated database enum `user_role` to match
3. `types/settings.ts` - Updated `SETTINGS_PERMISSIONS` with all 4 roles
4. `components/settings/sections/team-members-section.tsx`:
   - Role dropdown now shows Owner, Admin, Manager, Member
   - Role filter dropdown updated with all 4 options
5. `components/settings/modals/user-invitation-modal.tsx`:
   - Invitation modal now offers all 4 role options
   - Added role descriptions for each tier
   - Default role changed to "member"
6. `components/settings/settings-layout.tsx`:
   - Updated permission check fallback to "member"

**Layer Status (Post-Fix):**
```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER STATUS                              │
├──────────────────────┬──────────────────────────────────────┤
│ Database Schema      │ ✅ 4-tier (role_id → roles table)    │
│ Migration Files      │ ✅ Owner/Admin/Manager/Member        │
│ RLS Policies         │ ✅ 20 policies for multi-tenant      │
│ API Middleware       │ ✅ withPermission() wrapper          │
│ TypeScript Types     │ ✅ Updated to 4-tier                 │
│ UI Components        │ ✅ All 4 roles available             │
│ User Menu            │ ✅ "Manage client access" shows for Members │
└──────────────────────┴──────────────────────────────────────┘
```

### Remaining Verification Needed
- [ ] Browser test role assignment (Owner → Member)
- [ ] Test "Manage client access" menu appears for Member users
- [ ] Verify ClientAssignmentModal works end-to-end

### Test Environment
- URL: https://audienceos-agro-bros.vercel.app/settings
- Test User: Roderic Andrews (Owner)
- Test Date: 2026-01-18
- Tool: Claude in Chrome browser automation

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-18 | **UI FIX:** Updated all role dropdowns to support 4-tier RBAC (Owner/Admin/Manager/Member) |
| 2026-01-18 | Added E2E Testing Findings - identified spec-implementation gap |
| 2026-01-05 | Created initial spec with comprehensive RBAC design |

---

*Living Document - Located at features/multi-org-roles.md*

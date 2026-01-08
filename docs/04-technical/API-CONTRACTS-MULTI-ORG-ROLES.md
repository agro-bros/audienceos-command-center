# API Contracts: Multi-Org Roles & Permissions System

**Version:** 1.0
**Date:** 2026-01-08
**Purpose:** REST API specification for Role-Based Access Control (RBAC) system

---

## Overview

This document defines 15 new API endpoints to support the Multi-Org Roles & Permissions system. All endpoints require authentication and implement permission-based access control.

**Base URL:** `/api/v1/rbac`
**Authentication:** Required (Supabase JWT with agency_id)
**Content-Type:** `application/json`

---

## Authentication

All endpoints require valid JWT token with:
- `sub`: User ID
- `agency_id`: Agency context (custom claim)

**Authorization Header:**
```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

## 1. Role Management

### GET /api/v1/rbac/roles

Get all available roles.

**Permission:** `roles:read`

**Response (200):**
```typescript
{
  roles: Array<{
    id: string;
    name: string;
    display_name: string;
    hierarchy_level: number;
    description: string;
    is_system_role: boolean;
    created_at: string;
  }>;
}
```

**Example Response:**
```json
{
  "roles": [
    {
      "id": "role_owner",
      "name": "owner",
      "display_name": "Owner",
      "hierarchy_level": 1,
      "description": "Full agency control and administration",
      "is_system_role": true,
      "created_at": "2026-01-08T10:00:00Z"
    },
    {
      "id": "role_admin",
      "name": "admin",
      "display_name": "Admin",
      "hierarchy_level": 2,
      "description": "Administrative access without billing",
      "is_system_role": true,
      "created_at": "2026-01-08T10:00:00Z"
    }
  ]
}
```

---

### GET /api/v1/rbac/roles/[roleId]/permissions

Get permissions for specific role.

**Permission:** `roles:read`

**Response (200):**
```typescript
{
  role: {
    id: string;
    name: string;
    display_name: string;
  };
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
    created_at: string;
  }>;
}
```

---

## 2. User Role Management

### GET /api/v1/rbac/users

Get all users with their role assignments.

**Permission:** `users:read`

**Response (200):**
```typescript
{
  users: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: {
      id: string;
      name: string;
      display_name: string;
      hierarchy_level: number;
    } | null;
    assigned_at: string | null;
    assigned_by: string | null;
    is_owner: boolean;
  }>;
}
```

---

### POST /api/v1/rbac/users/[userId]/role

Assign role to user.

**Permission:** `users:write` (Owner only for Owner role assignments)

**Request Body:**
```typescript
{
  role_id: string;
}
```

**Response (200):**
```typescript
{
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string;
}
```

**Response (400):** Invalid role_id or user_id
**Response (403):** Insufficient permissions
**Response (409):** Cannot assign Owner role (already exists)

---

### DELETE /api/v1/rbac/users/[userId]/role

Remove role assignment from user.

**Permission:** `users:manage` (Cannot remove Owner role)

**Response (200):**
```typescript
{
  message: "Role assignment removed";
  user_id: string;
}
```

**Response (403):** Cannot remove Owner role
**Response (404):** User or role assignment not found

---

## 3. Permission Matrix Management

### GET /api/v1/rbac/permissions

Get complete permission matrix for all roles.

**Permission:** `roles:read`

**Response (200):**
```typescript
{
  matrix: Array<{
    role_id: string;
    role_name: string;
    permissions: Array<{
      resource: string;
      actions: string[]; // ['read', 'write', 'manage']
    }>;
  }>;
}
```

---

### PUT /api/v1/rbac/permissions/[roleId]

Update permissions for specific role.

**Permission:** `roles:manage` (Owner only)

**Request Body:**
```typescript
{
  permissions: Array<{
    resource: string;
    action: string;
    granted: boolean;
  }>;
}
```

**Response (200):**
```typescript
{
  role_id: string;
  updated_permissions: number;
  timestamp: string;
}
```

**Response (403):** Owner role permissions cannot be reduced

---

## 4. Client Assignment (Members)

### GET /api/v1/rbac/members/[userId]/clients

Get client assignments for Member user.

**Permission:** `users:read` OR own user

**Response (200):**
```typescript
{
  user: {
    id: string;
    email: string;
    role: string;
  };
  assigned_clients: Array<{
    id: string;
    name: string;
    assigned_at: string;
    assigned_by: string;
  }>;
}
```

**Response (400):** User is not Member role

---

### POST /api/v1/rbac/members/[userId]/clients

Assign clients to Member user.

**Permission:** `users:write` (Manager+ only)

**Request Body:**
```typescript
{
  client_ids: string[];
  replace: boolean; // If true, replace all assignments
}
```

**Response (200):**
```typescript
{
  user_id: string;
  assigned_clients: string[];
  total_assignments: number;
}
```

---

### DELETE /api/v1/rbac/members/[userId]/clients/[clientId]

Remove client assignment from Member.

**Permission:** `users:write` (Manager+ only)

**Response (200):**
```typescript
{
  message: "Client assignment removed";
  user_id: string;
  client_id: string;
}
```

---

## 5. Permission Validation

### POST /api/v1/rbac/check-permission

Check if user has specific permission (for UI state management).

**Permission:** Any authenticated user (checks own permissions only)

**Request Body:**
```typescript
{
  resource: string;
  action: string;
  client_id?: string; // For client-scoped checks
}
```

**Response (200):**
```typescript
{
  user_id: string;
  resource: string;
  action: string;
  client_id?: string;
  has_permission: boolean;
  reason?: string; // If denied
}
```

---

### POST /api/v1/rbac/bulk-check-permissions

Check multiple permissions at once (for UI optimization).

**Permission:** Any authenticated user

**Request Body:**
```typescript
{
  checks: Array<{
    resource: string;
    action: string;
    client_id?: string;
  }>;
}
```

**Response (200):**
```typescript
{
  user_id: string;
  results: Array<{
    resource: string;
    action: string;
    client_id?: string;
    has_permission: boolean;
  }>;
}
```

---

## 6. Audit & Logging

### GET /api/v1/rbac/audit-log

Get audit log entries.

**Permission:** `roles:read` (Owner/Admin only)

**Query Parameters:**
- `user_id` (optional): Filter by user
- `resource` (optional): Filter by resource
- `result` (optional): Filter by result (allowed/denied)
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)
- `limit` (optional): Page size (default 50, max 200)
- `offset` (optional): Pagination offset

**Response (200):**
```typescript
{
  entries: Array<{
    id: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
    action_type: string;
    resource: string;
    resource_id?: string;
    permission_action?: string;
    result: 'allowed' | 'denied';
    reason?: string;
    metadata?: object;
    timestamp: string;
  }>;
  total: number;
  has_more: boolean;
}
```

---

### GET /api/v1/rbac/audit-log/summary

Get audit log summary statistics.

**Permission:** `roles:read` (Owner/Admin only)

**Query Parameters:**
- `period` (optional): 'day', 'week', 'month' (default: week)

**Response (200):**
```typescript
{
  period: string;
  total_checks: number;
  denied_checks: number;
  denial_rate: number;
  top_denied_resources: Array<{
    resource: string;
    count: number;
  }>;
  most_active_users: Array<{
    user_id: string;
    email: string;
    check_count: number;
  }>;
}
```

---

## 7. User Invitations

### POST /api/v1/rbac/invitations

Send user invitation with role pre-assignment.

**Permission:** `users:write`

**Request Body:**
```typescript
{
  email: string;
  role_id: string;
  client_ids?: string[]; // For Member role only
  message?: string; // Custom invitation message
}
```

**Response (200):**
```typescript
{
  invitation_id: string;
  email: string;
  role_id: string;
  expires_at: string;
  invitation_url: string;
}
```

---

### GET /api/v1/rbac/invitations/[token]

Get invitation details (public endpoint).

**Permission:** None (public)

**Response (200):**
```typescript
{
  invitation: {
    id: string;
    email: string;
    agency: {
      id: string;
      name: string;
    };
    role: {
      id: string;
      display_name: string;
      description: string;
    };
    assigned_clients?: Array<{
      id: string;
      name: string;
    }>;
    expires_at: string;
    is_expired: boolean;
  };
}
```

**Response (404):** Invalid or expired invitation

---

### POST /api/v1/rbac/invitations/[token]/accept

Accept invitation and join agency.

**Permission:** None (creates user session)

**Request Body:**
```typescript
{
  first_name: string;
  last_name: string;
  password: string; // If creating new account
}
```

**Response (200):**
```typescript
{
  user: {
    id: string;
    email: string;
    agency_id: string;
    role_id: string;
  };
  session_token: string;
}
```

---

## Error Responses

### Standard Error Format
```typescript
{
  error: string;
  code: string;
  message: string;
  details?: object;
}
```

### Common Error Codes
- `AUTH_REQUIRED` (401): Missing or invalid JWT token
- `PERMISSION_DENIED` (403): Insufficient permissions for action
- `CLIENT_ACCESS_DENIED` (403): Member lacks client access
- `OWNER_ONLY` (403): Action restricted to Owner role
- `ROLE_PROTECTED` (403): Cannot modify protected role
- `VALIDATION_ERROR` (400): Invalid request data
- `RESOURCE_NOT_FOUND` (404): Resource doesn't exist
- `ROLE_CONFLICT` (409): Role assignment conflict
- `CACHE_ERROR` (500): Permission cache failure

---

## Rate Limiting

| Endpoint Group | Limit | Window |
|----------------|-------|---------|
| Permission checks | 1000/hour | Per user |
| Role modifications | 100/hour | Per user |
| Audit log queries | 200/hour | Per user |
| Invitations | 50/hour | Per agency |

---

## Caching Strategy

### Permission Cache
- **TTL:** 5 minutes
- **Key:** `permissions:${user_id}:${agency_id}`
- **Invalidation:** On role change, permission change, client assignment

### Role Hierarchy Cache
- **TTL:** 1 hour
- **Key:** `hierarchy:${agency_id}`
- **Invalidation:** On role definition change

---

*Document Version: 1.0 | Last Updated: 2026-01-08*
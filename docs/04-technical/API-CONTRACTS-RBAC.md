# API Contracts: Multi-Org Roles & Permissions System

**Created:** 2026-01-08 (D-1 SpecKit)
**Status:** Technical Specification Ready
**Source:** PRD Multi-Org Roles, Data Model RBAC
**Version:** 1.0

---

## Overview

This document defines all API endpoints for the Multi-Org Roles & Permissions System. All endpoints require authentication and implement the withPermission middleware for authorization.

**Base URL:** `/api/v1/rbac/`

**Authentication:** Bearer token (Supabase JWT)
**Content Type:** `application/json`
**Rate Limiting:** 100 requests/minute per user

---

## Role Management Endpoints

### GET /api/v1/rbac/roles

Get all available roles and their hierarchy.

**Permission Required:** `roles:read` (Admin+ only)

**Request:**
```http
GET /api/v1/rbac/roles
Authorization: Bearer <jwt_token>
```

**Response (200):**
```typescript
{
  roles: Array<{
    id: string;
    name: 'owner' | 'admin' | 'manager' | 'member';
    level: number; // 1-4
    description: string;
    is_system: boolean;
    permissions: Array<{
      resource: string;
      actions: string[]; // read, write, delete
    }>;
  }>;
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions (need Admin+ role)
- 500: Server error

---

### GET /api/v1/rbac/roles/{roleId}/permissions

Get permission matrix for a specific role.

**Permission Required:** `roles:read` (Admin+ only)

**Request:**
```http
GET /api/v1/rbac/roles/550e8400-e29b-41d4-a716-446655440000/permissions
Authorization: Bearer <jwt_token>
```

**Response (200):**
```typescript
{
  role: {
    id: string;
    name: string;
    level: number;
  };
  permissions: Array<{
    resource: 'clients' | 'communications' | 'tickets' | 'documents' | 'workflows' | 'integrations' | 'settings' | 'billing';
    read: boolean;
    write: boolean;
    delete: boolean;
  }>;
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions
- 404: Role not found
- 500: Server error

---

## User Role Management Endpoints

### GET /api/v1/rbac/users

Get all users and their role assignments in the agency.

**Permission Required:** `users:read` (Admin+ only)

**Request:**
```http
GET /api/v1/rbac/users?page=1&limit=50&role=admin&search=john
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `role` (optional): Filter by role name
- `search` (optional): Search by name or email

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
      level: number;
    };
    client_assignments?: Array<{
      client_id: string;
      client_name: string;
      access_level: 'read_write' | 'read_only';
    }>; // Only for Members
    assigned_at: string;
    assigned_by: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions
- 500: Server error

---

### PATCH /api/v1/rbac/users/{userId}/role

Update a user's role assignment.

**Permission Required:** `users:write` (Admin+ only) or `roles:manage` (Owner only for Owner role changes)

**Request:**
```http
PATCH /api/v1/rbac/users/550e8400-e29b-41d4-a716-446655440000/role
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "role_id": "550e8400-e29b-41d4-a716-446655440001",
  "reason": "Promotion to manager role"
}
```

**Response (200):**
```typescript
{
  user: {
    id: string;
    email: string;
    role: {
      id: string;
      name: string;
      level: number;
    };
    assigned_at: string;
    assigned_by: string;
  };
  audit_log_id: string;
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions or cannot modify Owner role
- 404: User or role not found
- 409: Cannot have multiple Owners per agency
- 422: Invalid role assignment (hierarchy violation)
- 500: Server error

---

## Client Assignment Endpoints

### GET /api/v1/rbac/users/{userId}/clients

Get client assignments for a Member user.

**Permission Required:** `users:read` (Admin+ only) or own user ID

**Request:**
```http
GET /api/v1/rbac/users/550e8400-e29b-41d4-a716-446655440000/clients
Authorization: Bearer <jwt_token>
```

**Response (200):**
```typescript
{
  user: {
    id: string;
    email: string;
    role: string;
  };
  assignments: Array<{
    client_id: string;
    client_name: string;
    access_level: 'read_write' | 'read_only';
    assigned_at: string;
    assigned_by: string;
  }>;
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions
- 404: User not found
- 422: User is not a Member role
- 500: Server error

---

### POST /api/v1/rbac/users/{userId}/clients

Assign clients to a Member user.

**Permission Required:** `users:write` (Admin+ only)

**Request:**
```http
POST /api/v1/rbac/users/550e8400-e29b-41d4-a716-446655440000/clients
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "assignments": [
    {
      "client_id": "550e8400-e29b-41d4-a716-446655440002",
      "access_level": "read_write"
    },
    {
      "client_id": "550e8400-e29b-41d4-a716-446655440003",
      "access_level": "read_only"
    }
  ],
  "replace_existing": true // Optional, default false
}
```

**Response (200):**
```typescript
{
  user_id: string;
  assignments: Array<{
    client_id: string;
    access_level: string;
    assigned_at: string;
  }>;
  audit_log_id: string;
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions
- 404: User or client not found
- 422: User is not a Member role or invalid client IDs
- 500: Server error

---

### DELETE /api/v1/rbac/users/{userId}/clients/{clientId}

Remove client assignment from a Member user.

**Permission Required:** `users:write` (Admin+ only)

**Request:**
```http
DELETE /api/v1/rbac/users/550e8400-e29b-41d4-a716-446655440000/clients/550e8400-e29b-41d4-a716-446655440002
Authorization: Bearer <jwt_token>
```

**Response (200):**
```typescript
{
  message: "Client assignment removed successfully";
  audit_log_id: string;
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions
- 404: User, client, or assignment not found
- 500: Server error

---

## Permission Validation Endpoints

### POST /api/v1/rbac/validate

Validate if current user has specific permissions (used by frontend).

**Permission Required:** Authenticated user

**Request:**
```http
POST /api/v1/rbac/validate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "checks": [
    {
      "resource": "clients",
      "action": "read",
      "client_id": "550e8400-e29b-41d4-a716-446655440002" // Optional for client-scoped checks
    },
    {
      "resource": "settings",
      "action": "write"
    }
  ]
}
```

**Response (200):**
```typescript
{
  user: {
    id: string;
    role: string;
    level: number;
  };
  results: Array<{
    resource: string;
    action: string;
    client_id?: string;
    allowed: boolean;
    reason?: string; // If denied
  }>;
}
```

**Errors:**
- 401: Authentication required
- 422: Invalid permission check format
- 500: Server error

---

### GET /api/v1/rbac/user/permissions

Get current user's full permission set.

**Permission Required:** Authenticated user

**Request:**
```http
GET /api/v1/rbac/user/permissions
Authorization: Bearer <jwt_token>
```

**Response (200):**
```typescript
{
  user: {
    id: string;
    email: string;
    role: {
      id: string;
      name: string;
      level: number;
    };
  };
  permissions: Array<{
    resource: string;
    actions: string[]; // read, write, delete
  }>;
  client_assignments?: Array<{
    client_id: string;
    access_level: string;
  }>; // Only for Members
  cache_expires_at: string;
}
```

**Errors:**
- 401: Authentication required
- 500: Server error

---

## Invitation Management Endpoints

### POST /api/v1/rbac/invitations

Send user invitation with role assignment.

**Permission Required:** `users:write` (Admin+ only)

**Request:**
```http
POST /api/v1/rbac/invitations
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role_id": "550e8400-e29b-41d4-a716-446655440001",
  "client_assignments": [ // Optional, for Member role only
    {
      "client_id": "550e8400-e29b-41d4-a716-446655440002",
      "access_level": "read_write"
    }
  ],
  "message": "Welcome to our agency team!" // Optional custom message
}
```

**Response (200):**
```typescript
{
  invitation: {
    id: string;
    email: string;
    role: {
      id: string;
      name: string;
    };
    token: string; // Only returned once
    expires_at: string;
    invited_by: string;
  };
  audit_log_id: string;
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions
- 409: User already exists or invitation pending
- 422: Invalid role or client assignments
- 500: Server error

---

### GET /api/v1/rbac/invitations/{token}/accept

Accept invitation and create user account.

**Permission Required:** None (public endpoint with token validation)

**Request:**
```http
GET /api/v1/rbac/invitations/abcd1234...xyz/accept
```

**Response (200):**
```typescript
{
  invitation: {
    email: string;
    agency: {
      id: string;
      name: string;
    };
    role: {
      name: string;
      description: string;
    };
    expires_at: string;
  };
  next_step: "create_account" | "login_existing"
}
```

**Errors:**
- 404: Invalid or expired token
- 410: Invitation already accepted
- 500: Server error

---

### POST /api/v1/rbac/invitations/{token}/accept

Complete invitation acceptance and account creation.

**Permission Required:** None (public endpoint with token validation)

**Request:**
```http
POST /api/v1/rbac/invitations/abcd1234...xyz/accept
Content-Type: application/json

{
  "password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe",
  "existing_user": false // Set to true if user already has account
}
```

**Response (200):**
```typescript
{
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: {
      name: string;
      level: number;
    };
    agency: {
      id: string;
      name: string;
    };
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
  audit_log_id: string;
}
```

**Errors:**
- 404: Invalid or expired token
- 409: Email already exists
- 410: Invitation already accepted
- 422: Invalid user data
- 500: Server error

---

## Audit Trail Endpoints

### GET /api/v1/rbac/audit

Get audit trail for permission and role changes.

**Permission Required:** `settings:read` (Owner+ only for full access, Admin can see own agency)

**Request:**
```http
GET /api/v1/rbac/audit?page=1&limit=50&user_id=user123&event_type=permission_check&start_date=2026-01-01&end_date=2026-01-31
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `user_id` (optional): Filter by specific user
- `event_type` (optional): permission_check, role_change, client_assignment
- `resource` (optional): Filter by resource type
- `result` (optional): allowed, denied, error
- `start_date` (optional): Filter from date (ISO 8601)
- `end_date` (optional): Filter to date (ISO 8601)

**Response (200):**
```typescript
{
  events: Array<{
    id: string;
    user: {
      id: string;
      email: string;
      role: string;
    } | null;
    event_type: 'permission_check' | 'role_change' | 'client_assignment' | 'login' | 'logout';
    resource?: string;
    action?: string;
    client_id?: string;
    result: 'allowed' | 'denied' | 'error';
    details: {
      ip_address?: string;
      user_agent?: string;
      [key: string]: any; // Additional context
    };
    created_at: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: {
    total_events: number;
    allowed_count: number;
    denied_count: number;
    error_count: number;
  };
}
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions
- 422: Invalid date range or filters
- 500: Server error

---

### GET /api/v1/rbac/audit/export

Export audit trail as CSV for compliance reporting.

**Permission Required:** `settings:read` (Owner+ only)

**Request:**
```http
GET /api/v1/rbac/audit/export?start_date=2026-01-01&end_date=2026-01-31&format=csv
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `start_date` (required): Export from date (ISO 8601)
- `end_date` (required): Export to date (ISO 8601)
- `format` (optional): csv, json (default: csv)
- `event_type` (optional): Filter by event type

**Response (200):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="audit_trail_2026-01-01_2026-01-31.csv"

timestamp,user_email,event_type,resource,action,result,ip_address,details
2026-01-08T10:00:00Z,admin@agency.com,permission_check,clients,read,allowed,192.168.1.1,"..."
...
```

**Errors:**
- 401: Authentication required
- 403: Insufficient permissions
- 422: Invalid date range (max 90 days)
- 500: Server error

---

## Health Check Endpoint

### GET /api/v1/rbac/health

Check RBAC system health status.

**Permission Required:** None (internal use)

**Request:**
```http
GET /api/v1/rbac/health
```

**Response (200):**
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: "ok" | "error";
    cache: "ok" | "error";
    permissions: "ok" | "error";
  };
  metrics: {
    permission_cache_hit_rate: number; // 0-100
    avg_permission_check_time_ms: number;
    active_user_sessions: number;
  };
  timestamp: string;
}
```

**Errors:**
- 500: System unhealthy

---

## Error Response Format

All error responses follow a consistent format:

```typescript
{
  error: string; // Error type
  code: string; // Machine-readable error code
  message: string; // Human-readable description
  details?: {
    field?: string; // For validation errors
    expected?: string; // For permission errors
    [key: string]: any; // Additional context
  };
  timestamp: string; // ISO 8601
  request_id: string; // For debugging
}
```

**Common Error Codes:**
- `AUTH_REQUIRED`: 401 - Authentication token missing/invalid
- `PERMISSION_DENIED`: 403 - Insufficient permissions
- `RESOURCE_NOT_FOUND`: 404 - Resource does not exist
- `VALIDATION_ERROR`: 422 - Invalid request data
- `OWNER_PROTECTION`: 409 - Cannot modify Owner role
- `HIERARCHY_VIOLATION`: 409 - Role hierarchy constraint violated
- `RATE_LIMITED`: 429 - Too many requests
- `INTERNAL_ERROR`: 500 - Server error

---

## Performance Requirements

| Endpoint | Max Response Time | Rate Limit |
|----------|------------------|------------|
| GET /rbac/user/permissions | 50ms | 200/min |
| POST /rbac/validate | 100ms | 500/min |
| PATCH /rbac/users/{id}/role | 200ms | 20/min |
| GET /rbac/audit | 500ms | 60/min |
| All other endpoints | 300ms | 100/min |

---

## Security Headers

All RBAC API endpoints include:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

---

*Generated by D-1 SpecKit on 2026-01-08*
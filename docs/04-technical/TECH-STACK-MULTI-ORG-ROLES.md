# Technology Stack: Multi-Org Roles & Permissions System

**Version:** 1.0
**Date:** 2026-01-08
**Purpose:** Technology decisions for Role-Based Access Control (RBAC) implementation

---

## Overview

The Multi-Org Roles & Permissions system extends the existing AudienceOS Command Center technology stack with additional components for authentication, authorization, and audit logging.

**Inheritance:** Builds on existing Next.js 16 + React 19 + Supabase architecture
**New Components:** Permission middleware, role-based UI components, audit logging service
**Database:** 5 new tables in existing Supabase database

---

## Frontend Stack

### Framework & UI
| Component | Technology | Version | Why Chosen |
|-----------|------------|---------|------------|
| **Framework** | Next.js | 16.0.10 | Existing foundation, App Router support |
| **UI Library** | React | 19.2 | Existing foundation, latest features |
| **Styling** | Tailwind CSS | 4.1 | Existing design system |
| **Design System** | Linear Components | Custom | Consistent B2B SaaS aesthetic |
| **Icons** | Lucide React | Latest | Permission-related icons (Shield, Lock, Users) |

### State Management
| Component | Technology | Why Chosen |
|-----------|------------|------------|
| **Global State** | Zustand | 5.0 | Existing pattern, simple RBAC state |
| **Permission State** | Custom Hook | `usePermissions()` for client-side checks |
| **Role Context** | React Context | `RoleProvider` for role-based UI rendering |
| **Cache** | React Query | TanStack Query for permission cache management |

### RBAC-Specific Components
| Component | Purpose | Technology |
|-----------|---------|------------|
| **PermissionGate** | Conditional rendering | React component with permission props |
| **RoleBasedRoute** | Route protection | Next.js middleware integration |
| **PermissionMatrix** | Visual permission editor | Custom React table component |
| **ClientAssignment** | Member client management | Multi-select with search |
| **AuditLogViewer** | Permission audit trail | Data table with filtering |

---

## Backend Stack

### API Layer
| Component | Technology | Version | Why Chosen |
|-----------|------------|---------|------------|
| **Runtime** | Node.js | 20+ | Existing Next.js requirement |
| **Framework** | Next.js API Routes | 16.0.10 | Consistent with existing pattern |
| **Middleware** | Custom | TypeScript | Permission enforcement at API layer |
| **Validation** | Zod | Latest | Type-safe request validation |

### Authentication & Authorization
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Auth Provider** | Supabase Auth | Existing JWT infrastructure |
| **Permission Cache** | Memory Map | 5-minute TTL, 1000 entry limit |
| **Middleware Stack** | withPermission() | Custom TypeScript decorators |
| **Session Management** | Supabase Session | JWT with custom claims (agency_id, role_id) |

### RBAC-Specific Services
| Service | Purpose | Technology |
|---------|---------|------------|
| **PermissionService** | Permission logic | TypeScript class with caching |
| **RoleService** | Role hierarchy management | TypeScript with database integration |
| **AuditService** | Access logging | Async background service |
| **ClientAccessService** | Member client scoping | Database-backed validation |

---

## Database Stack

### Core Database
| Component | Technology | Version | Why Chosen |
|-----------|------------|---------|------------|
| **Database** | PostgreSQL | 15+ | Existing Supabase foundation |
| **ORM** | Drizzle ORM | 0.45 | Existing pattern, type safety |
| **Connection** | Supabase Client | 2.89 | Existing infrastructure |
| **Security** | Row-Level Security | PostgreSQL RLS | Multi-tenant data isolation |

### RBAC Tables (New)
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `role` | 4 built-in roles | → permission, user_role |
| `permission` | Resource × Action matrix | role → permission |
| `user_role` | User role assignments | user → role → agency |
| `member_client_access` | Client scoping for Members | user → client |
| `audit_log` | Complete access trail | user → resource → action |

### Performance Optimization
| Optimization | Technology | Purpose |
|--------------|------------|---------|
| **Indexes** | PostgreSQL B-tree | Fast permission lookups |
| **Caching** | Application-level Map | 5-minute permission TTL |
| **Materialized Views** | PostgreSQL | Audit summary statistics |
| **Connection Pooling** | Supabase Pooler | Handle concurrent permission checks |

---

## Security Stack

### Authentication
| Layer | Technology | Implementation |
|-------|------------|---------------|
| **User Auth** | Supabase Auth | Email/password, OAuth providers |
| **JWT Claims** | Custom Claims | agency_id, role_id in token |
| **Session Validation** | Middleware | Every protected API call |
| **CSRF Protection** | Next.js Built-in | SameSite cookies |

### Authorization
| Layer | Technology | Implementation |
|-------|------------|---------------|
| **API Protection** | withPermission() | Every endpoint wrapped |
| **Client Scoping** | Database validation | Member role restrictions |
| **Role Hierarchy** | Logic validation | Higher roles inherit permissions |
| **Owner Protection** | Hard-coded rules | Owner role cannot be modified |

### Audit & Compliance
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Access Logging** | audit_log table | Every permission check logged |
| **Change Tracking** | Audit triggers | Role/permission changes tracked |
| **Data Retention** | PostgreSQL policies | 1 year minimum retention |
| **Export Capability** | CSV/JSON API | Compliance reporting |

---

## Deployment Stack

### Hosting (Unchanged)
| Component | Provider | Configuration |
|-----------|----------|---------------|
| **Frontend** | Vercel | Existing deployment pipeline |
| **Database** | Supabase | Existing multi-tenant setup |
| **CDN** | Vercel Edge | Static asset delivery |
| **Monitoring** | Sentry | Error tracking + performance |

### RBAC-Specific Monitoring
| Metric | Tool | Purpose |
|--------|------|---------|
| **Permission Latency** | Custom metrics | <100ms response time |
| **Cache Hit Rate** | Application logs | >80% target |
| **Failed Access Attempts** | Sentry alerts | Security monitoring |
| **Role Assignment Changes** | Audit log alerts | Administrative oversight |

---

## Development Stack

### Code Quality
| Tool | Purpose | Configuration |
|------|---------|---------------|
| **TypeScript** | Type safety | Strict mode for RBAC types |
| **ESLint** | Code quality | Security-focused rules |
| **Prettier** | Code formatting | Existing configuration |
| **Husky** | Git hooks | Pre-commit permission tests |

### Testing
| Layer | Framework | Coverage |
|-------|-----------|----------|
| **Unit Tests** | Vitest | Permission logic, role hierarchy |
| **Integration** | Playwright | API endpoint protection |
| **E2E Tests** | Playwright | Complete role assignment flows |
| **Load Tests** | Artillery | Permission check performance |

### RBAC-Specific Testing
| Test Type | Framework | Purpose |
|-----------|-----------|---------|
| **Permission Matrix** | Jest | All 4 roles × 8 resources × 3 actions |
| **Role Hierarchy** | Vitest | Inheritance and restrictions |
| **Client Scoping** | Jest | Member access validation |
| **Audit Logging** | Integration | Complete trail verification |

---

## Performance Requirements

### Response Time Targets
| Operation | Target | Monitoring |
|-----------|--------|------------|
| **Permission Check** | <100ms | Application metrics |
| **Role Assignment** | <500ms | User experience |
| **Permission Matrix Load** | <200ms | UI responsiveness |
| **Audit Log Query** | <1s | Administrative use |

### Scalability Targets
| Metric | Target | Implementation |
|--------|--------|---------------|
| **Concurrent Users** | 50 per agency | Connection pooling |
| **Permission Checks** | 1000/second | Caching + indexing |
| **Database Size** | 100k audit entries | Partitioning strategy |
| **Cache Memory** | <50MB | Size limits + TTL |

---

## Security Considerations

### OWASP Top 10 Mitigation
| Risk | Mitigation | Implementation |
|------|------------|---------------|
| **Broken Access Control** | Permission middleware | Every API endpoint |
| **Security Misconfiguration** | RLS policies | Database level enforcement |
| **Vulnerable Components** | Dependency scanning | Automated security updates |
| **Logging Failures** | Comprehensive audit trail | audit_log table |

### RBAC-Specific Security
| Protection | Implementation | Validation |
|------------|---------------|------------|
| **Privilege Escalation** | Role hierarchy validation | Cannot assign higher role |
| **Horizontal Access** | Agency-id scoping | RLS + middleware |
| **Permission Bypass** | Middleware on all routes | 100% endpoint coverage |
| **Owner Takeover** | Hard-coded protection | Owner role immutable |

---

## Dependencies

### New Dependencies
```typescript
// RBAC-specific packages
{
  "@types/node": "^20.0.0",           // Enhanced type safety
  "zod": "^3.22.0",                   // Permission validation schemas
  "react-hook-form": "^7.48.0",       // Role assignment forms
  "@tanstack/react-query": "^5.0.0",  // Permission cache management
  "lucide-react": "^0.300.0"          // RBAC-specific icons
}
```

### Existing Dependencies (Leveraged)
- Next.js 16.0.10 (API routes, middleware)
- Supabase 2.89 (Auth, database, RLS)
- TypeScript 5.x (Type safety)
- Tailwind CSS 4.1 (Styling)
- Drizzle ORM 0.45 (Database queries)

---

## Migration Strategy

### Phase 1: Infrastructure (Week 1)
- Database table creation
- RLS policy implementation
- Basic middleware deployment

### Phase 2: Core RBAC (Week 2-3)
- Permission checking logic
- Role assignment UI
- API endpoint protection

### Phase 3: Advanced Features (Week 4-5)
- Client assignment for Members
- Permission matrix editor
- Audit log viewer

### Phase 4: Optimization (Week 6)
- Performance tuning
- Cache optimization
- Security hardening

---

*Document Version: 1.0 | Last Updated: 2026-01-08*
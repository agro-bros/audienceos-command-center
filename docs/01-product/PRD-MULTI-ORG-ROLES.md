# Product Requirements Document: Multi-Org Roles & Permissions System

**Product Name:** Multi-Org Roles & Permissions System
**Version:** 1.0
**Date:** 2026-01-08
**Status:** Draft

---

## Product Overview

**Vision:** Fine-grained role-based access control for marketing agencies managing multiple clients and team members.

**One-liner:** Automated permission management that matches agency hierarchy, eliminating manual access control while preventing data exposure incidents.

**Target Users:**
- **Primary:** Agency Owners & Admins (5-50 person agencies) - Executive leadership responsible for data security and team management
- **Secondary:** Agency Managers & Members - Account managers, project leads, specialists, junior staff

---

## User Stories

### Epic 1: Role Management System

**US-001: Define Agency Role Hierarchy**
As an Agency Owner, I want to establish role hierarchy for my team so that I can control access levels based on responsibility.

Acceptance Criteria:
- [ ] System supports exactly 4 role types: Owner, Admin, Manager, Member
- [ ] Role hierarchy enforced: Owner (level 1) → Admin (level 2) → Manager (level 3) → Member (level 4)
- [ ] Owner role cannot be modified or deleted by any user
- [ ] Each user can have only one role per agency

**US-002: Assign Roles to Team Members**
As an Agency Owner or Admin, I want to assign roles to team members so that they have appropriate access permissions.

Acceptance Criteria:
- [ ] Can assign any role to new team members (Owner, Admin, Manager, Member)
- [ ] Can modify existing user roles (except Owner role)
- [ ] Role changes take effect immediately
- [ ] Cannot assign Owner role if one already exists
- [ ] Admin cannot modify Owner role assignments

**US-003: View Role Assignments**
As an Agency Owner, I want to see all team member role assignments so that I can audit access levels.

Acceptance Criteria:
- [ ] Display team member list with assigned roles
- [ ] Show role hierarchy levels clearly
- [ ] Filter team members by role type
- [ ] Sort by role level, name, or assignment date

### Epic 2: Permission Matrix Management

**US-004: Configure Resource Permissions**
As an Agency Owner, I want to configure permissions per role for each resource so that team members have appropriate access.

Acceptance Criteria:
- [ ] Permission matrix UI for 8 resources × 3 actions (24 permissions total)
- [ ] Resources: clients, settings, users, roles, team_members, documents, workflows, tickets
- [ ] Actions per resource: read, write, manage
- [ ] Visual matrix showing all role × resource × action combinations
- [ ] Bulk permission assignment for role types

**US-005: Enforce Permission Hierarchy**
As a system, I want to enforce role hierarchy in permissions so that lower roles cannot exceed higher role capabilities.

Acceptance Criteria:
- [ ] Owner has all permissions by default
- [ ] Admin permissions are subset of Owner permissions
- [ ] Manager permissions are subset of Admin permissions
- [ ] Member permissions are subset of Manager permissions
- [ ] Permission inheritance cannot be violated

**US-006: Cache Permission Lookups**
As a system, I want to cache user permissions for 5 minutes so that API response times remain fast.

Acceptance Criteria:
- [ ] Permission lookup cache with 5-minute TTL
- [ ] Maximum 1000 cache entries
- [ ] Cache invalidation on role or permission changes
- [ ] Cache hit rate >80% under normal usage

### Epic 3: Client-Scoped Access for Members

**US-007: Assign Clients to Members**
As an Agency Manager or Admin, I want to assign specific clients to Member role users so that they only see relevant client data.

Acceptance Criteria:
- [ ] Client assignment interface for Member users
- [ ] Multi-select client assignment per Member
- [ ] Batch assignment for multiple Members
- [ ] Clear indication of current assignments per Member

**US-008: Enforce Client-Scoped Data Access**
As a Member, I want to see only clients assigned to me so that I focus on my responsibilities without data exposure.

Acceptance Criteria:
- [ ] Client list filtered to assigned clients only
- [ ] Client data (tickets, documents, etc.) filtered by assignment
- [ ] API endpoints validate client access for Members
- [ ] 403 Forbidden error for unassigned client access attempts

**US-009: Manager Override Client Access**
As a Manager or Admin, I want to see all clients regardless of assignment so that I can oversee all accounts.

Acceptance Criteria:
- [ ] Manager+ roles bypass client assignment restrictions
- [ ] Full client list visible to Manager, Admin, Owner
- [ ] Client assignment only affects Member role
- [ ] Clear UI indication of access level per user

### Epic 4: API Middleware Enhancement

**US-010: Protect API Endpoints with Permissions**
As a system, I want to validate permissions on every API call so that unauthorized actions are prevented.

Acceptance Criteria:
- [ ] All 34 API endpoints protected with permission middleware
- [ ] withPermission() wrapper validates resource + action access
- [ ] withOwnerOnly() wrapper for Owner-exclusive endpoints
- [ ] Permission denied requests return 403 with clear error message

**US-011: Extract Client ID from Request Context**
As middleware, I want to automatically extract client IDs from API requests so that client-scoped permissions are enforced.

Acceptance Criteria:
- [ ] Client ID extracted from URL path: `/api/v1/clients/[id]`
- [ ] Client ID passed to permission validation
- [ ] Member role validated against assigned clients
- [ ] Client access attempts logged for audit

**US-012: Handle Permission Validation Errors**
As a user, I want clear error messages when access is denied so that I understand what went wrong.

Acceptance Criteria:
- [ ] Resource-specific denial messages
- [ ] Client-specific denial messages for Members
- [ ] Suggestions to contact administrator
- [ ] Error codes for programmatic handling

### Epic 5: User Invitation System

**US-013: Invite Users with Pre-Assigned Roles**
As an Agency Owner or Admin, I want to send user invitations with pre-assigned roles so that new team members have immediate appropriate access.

Acceptance Criteria:
- [ ] Invitation email includes role assignment
- [ ] Role takes effect upon invitation acceptance
- [ ] Optional client assignment for Member role invitations
- [ ] Invitation expiry (7 days)

**US-014: Accept Invitation and Join Agency**
As an invited user, I want to accept an invitation so that I can join the agency with the correct role.

Acceptance Criteria:
- [ ] Invitation acceptance flow
- [ ] Account creation or existing account linking
- [ ] Automatic role assignment upon acceptance
- [ ] Client assignments applied if specified

### Epic 6: Audit Trail & Logging

**US-015: Log Permission Access Attempts**
As an Agency Owner, I want to see all permission access attempts so that I can audit team member activity.

Acceptance Criteria:
- [ ] All permission checks logged (allowed + denied)
- [ ] Log includes: user, resource, action, timestamp, result
- [ ] Client access attempts logged separately
- [ ] Searchable audit log interface

**US-016: Track Permission Changes**
As an Agency Owner, I want to see all permission and role changes so that I can maintain security compliance.

Acceptance Criteria:
- [ ] Role assignment changes logged
- [ ] Permission matrix changes logged
- [ ] Client assignment changes logged
- [ ] Change log includes: who, what, when, before/after values

### Epic 7: Owner Protection

**US-017: Prevent Owner Role Modification**
As a system, I want to prevent Owner role modification or deletion so that agency control is maintained.

Acceptance Criteria:
- [ ] Owner role cannot be deleted from system
- [ ] Owner role permissions cannot be reduced
- [ ] Non-owners cannot modify Owner user accounts
- [ ] Only one Owner per agency enforced

**US-018: Owner-Only Administrative Functions**
As an Agency Owner, I want exclusive access to critical admin functions so that agency security is maintained.

Acceptance Criteria:
- [ ] Role definition changes (Owner only)
- [ ] Permission matrix changes (Owner only)
- [ ] Agency deletion (Owner only)
- [ ] User role changes to/from Owner (Owner only)

---

## Functional Requirements

### Authentication & Authorization
- FR-001: System must integrate with existing Supabase authentication
- FR-002: User sessions must include role_id and agency_id in JWT claims
- FR-003: API middleware must validate permissions before request processing
- FR-004: Permission cache must have 5-minute TTL and 1000 entry maximum

### Role Management
- FR-005: System must support exactly 4 role types with fixed hierarchy
- FR-006: Owner role must be protected from modification and deletion
- FR-007: Role hierarchy must be enforced in all permission grants
- FR-008: Each user must have exactly one role per agency

### Client Access Control
- FR-009: Member role must be restricted to assigned clients only
- FR-010: Manager+ roles must have access to all clients
- FR-011: Client assignments must affect all client-related data access
- FR-012: Client access violations must return 403 Forbidden

### Audit & Compliance
- FR-013: All permission checks must be logged with full context
- FR-014: Permission and role changes must be tracked in audit log
- FR-015: Audit log must be searchable and filterable
- FR-016: Audit log retention minimum 1 year

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Permission lookup response time <100ms |
| **Performance** | Cache hit rate >80% under normal usage |
| **Security** | All sensitive operations require Owner approval |
| **Security** | Permission checks enforced at API middleware layer |
| **Security** | Client-scoped access validated on every request |
| **Scalability** | Support up to 50 users per agency |
| **Scalability** | Support up to 100 clients per agency |
| **Availability** | 99.9% uptime for permission validation |
| **Usability** | Role setup time <10 minutes per team member |
| **Compliance** | Complete audit trail for all access attempts |

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|-----------------|
| **Permission Denial Rate** | <5% false denials | API logs: 403 errors / total requests |
| **Role Setup Time** | <10 minutes per team member | Time from invite to productive access |
| **Data Exposure Incidents** | 0 unauthorized client data access | Audit log analysis + manual review |
| **Owner Time Savings** | 2+ hours/week saved | Before/after time tracking |
| **Team Member Satisfaction** | 8+/10 on access experience | Post-implementation survey |
| **Permission Enforcement Coverage** | 100% of API endpoints | Code coverage + endpoint audit |

---

## Out of Scope (Phase 1)

- Custom role creation beyond the 4 built-in types
- Cross-agency role templates or sharing
- Time-limited or expiring permissions
- Permission delegation between users
- Approval workflows for permission requests
- Advanced audit analytics and dashboards

---

*Document Version: 1.0 | Last Updated: 2026-01-08*
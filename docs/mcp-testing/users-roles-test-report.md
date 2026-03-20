# Users & Roles Module - MCP Server Test Report

**Date:** 2026-02-16
**Module:** `mcp__taruvi__` user, role, and role assignment tools
**Environment:** Taruvi MCP Server (tenant: mcptest)

---

## Table of Contents

1. [Test Summary](#test-summary)
2. [Test Results by Category](#test-results-by-category)
   - [1. List Users](#1-list-users)
   - [2. Create Users](#2-create-users)
   - [3. Update Users](#3-update-users)
   - [4. User Attributes Schema](#4-user-attributes-schema)
   - [5. Role Management (CRUD)](#5-role-management-crud)
   - [6. Role Assignments](#6-role-assignments)
3. [Bugs & Issues](#bugs--issues)
4. [Key Learnings](#key-learnings)
5. [Recommendations](#recommendations)

---

## Test Summary

| Category | Passed | Failed/Issues | Total |
|----------|--------|---------------|-------|
| List Users | 9 | 0 | 9 |
| Create Users | 9 | 0 | 9 |
| Update Users | 6 | 0 | 6 |
| User Attributes Schema | 8 | 0 | 8 |
| Role Management | 9 | 0 | 9 |
| Role Assignments | 10 | 0 | 10 |
| **Total** | **51** | **0** | **51** |

**Overall Pass Rate:** 100%

---

## Test Results by Category

### 1. List Users

**Tool:** `list_users`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| List all users | No filters | PASS | Returns all active users with total count |
| Search by username | `search: "admin"` | PASS | Case-insensitive partial match |
| Search by email domain | `search: "example.com"` | PASS | Searches across username/email/name |
| Filter active users | `is_active: true` | PASS | |
| Filter inactive users | `is_active: false` | PASS | Returns empty when none inactive |
| Filter by date_from | `date_from: "2026-01-01"` | PASS | Joined after date |
| Filter by date_to | `date_to: "2025-12-31"` | PASS | Joined before date |
| Pagination (page 1) | `limit: 2, offset: 0` | PASS | Total count preserved |
| Pagination (page 2) | `limit: 2, offset: 2` | PASS | Remaining records returned |
| Filter by role_slug | `role_slug: "mcptest-super-admin"` | PASS | Returns users with that role |

---

### 2. Create Users

**Tool:** `create_user`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Basic user (username + email) | Minimal required fields | PASS | Password set to unusable |
| User with password + names | All basic fields | PASS | |
| User with invalid attributes | `{"department": "Engineering"}` (not in schema) | PASS (rejected) | Schema validation enforced: "Additional properties are not allowed" |
| User with valid attributes | `{"industry": "Technology"}` | PASS | Matches schema |
| Inactive user | `is_active: false` | PASS | |
| Staff user | `is_staff: true` | PASS | |
| User with role_slugs | `role_slugs: ["mcptest-super-admin"]` | PASS | Role assigned on creation |
| Duplicate username | Same username | PASS (rejected) | "A user with that username already exists" |
| Duplicate email | Same email | PASS (rejected) | "A user with this email already exists" |

---

### 3. Update Users

**Tool:** `update_user`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Update email + names | `email`, `first_name`, `last_name` | PASS | |
| Activate inactive user | `is_active: true` | PASS | |
| Promote to staff | `is_staff: true` | PASS | |
| Update attributes (merge) | `{"industry": "Finance"}` | PASS | Attributes replaced/merged |
| Duplicate email on update | Email belonging to another user | PASS (rejected) | "A user with this email already exists" |
| Non-existent user | `user_id: 99999` | PASS (rejected) | "User 99999 not found" |

**Note:** Password updates are not allowed via `update_user` for security reasons.

---

### 4. User Attributes Schema

**Tool:** `user_attributes_schema`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Get current schema | `action: "get"` | PASS | Returns JSON Schema object |
| Update schema (replace) | Full schema with new properties | PASS | Warning: "Schema was REPLACED (not merged)" |
| Create user with new schema fields | Valid attributes | PASS | All field types validated |
| Enum validation | `department: "InvalidDept"` | PASS (rejected) | "'InvalidDept' is not one of [...]" |
| Required field missing | Missing `department` when required | PASS (rejected) | "'department' is a required property" |
| Integer min/max validation | `level: 15` (max 10) | PASS (rejected) | "15 is greater than the maximum of 10" |
| Reserved field name | `email` as attribute | PASS (rejected) | "Attribute name 'email' is reserved" |
| Remove required constraint | `required: []` | PASS | |

**Schema validation rules confirmed:**
- JSON Schema Draft 2020-12
- `additionalProperties` enforced to `false`
- Reserved field names blocked (email, username, is_active, attributes)
- Attribute names must be lowercase snake_case
- Full type validation: string, integer, enum, min/max, maxLength

---

### 5. Role Management (CRUD)

**Tool:** `manage_roles`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| List roles with hierarchy | `include_hierarchy: true` | PASS | Shows parent_slug and level |
| Create root role | `name: "Manager"` | PASS | Level 1, auto-generated slug |
| Create child role | `parent_slug: "mcptest-manager"` | PASS | Level 2, inherits from parent |
| Bulk create roles | 3 roles with mixed parents | PASS | `success_count: 3`, failures array |
| Hierarchy levels | N/A | PASS | L1: root, L2: under manager, L3: under team-lead |
| Duplicate role creation | Same name | PASS (rejected) | "Role 'Manager' already exists" |
| Delete role with children | Role that has child roles | PASS (blocked) | "has child roles" error |
| Delete role with members | Role assigned to users | PASS (blocked) | "1 user(s) assigned" error |
| Delete leaf role (no deps) | Role with no children or members | PASS | |
| Delete non-existent role | Invalid slug | PASS (rejected) | "not found" error |

**Role hierarchy tested:**
```
Super Admin (L1)
Manager (L1)
  └── Team Lead (L2)
        ├── Developer (L3)
        └── QA Engineer (L3)
Viewer (L1) - deleted during test
```

**Slug generation:** Role names are auto-slugified with app prefix: `"Manager"` -> `"mcptest-manager"`

---

### 6. Role Assignments

**Tool:** `manage_role_assignments`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Single assign | 1 role, 1 user | PASS | `is_bulk: false` |
| Bulk assign (multi-role, multi-user) | 2 roles, 2 users | PASS | `success_count: 4`, `is_bulk: true` |
| Assign with expires_at | ISO datetime | PASS | Role expires at specified time |
| Assign non-existent role | Invalid role slug | PASS (graceful) | `failed_count: 1`, error in failures array |
| Assign to non-existent user | Invalid username | PASS (graceful) | `failed_count: 1`, error in failures array |
| Verify via list_users (role filter) | `role_slug` filter | PASS | Correct users returned |
| Single revoke | 1 role from 1 user | PASS | |
| Bulk revoke | 2 roles from 1 user | PASS | `is_bulk: true` |
| Revoke unassigned role (idempotent) | Role user doesn't have | PASS | Returns success (no error) |
| Duplicate assignment (idempotent) | Assign already-assigned role | PASS | Returns success (no error) |

**Key behaviors:**
- Assignments are idempotent: re-assigning doesn't error
- Revocations are idempotent: revoking unassigned role doesn't error
- Bulk operations report individual failures without failing the entire batch
- `is_bulk` flag indicates whether the operation was bulk

---

## Bugs & Issues

**No bugs found.** All 51 tests passed.

Minor observations (not bugs):
1. **Revoke idempotency reporting:** Revoking a role the user doesn't have returns `success_count: 1` instead of `success_count: 0`. This is debatable - treating it as idempotent is valid, but the count could be misleading.
2. **User attributes schema replace warning:** The update action warns "Schema was REPLACED (not merged)" - this is correct behavior but could lead to accidental field removal if users aren't careful.
3. **No `update_role` action:** Roles can be created and deleted but not updated (no way to change name, description, or parent after creation).

---

## Key Learnings

### User Management
- Users are created with `is_active: true` by default
- Omitting `password` creates a user with an unusable password (login via OAuth/SSO only)
- `attributes` are validated against a tenant-level JSON schema
- Email and username uniqueness is enforced at the database level
- Password updates are blocked via `update_user` for security

### Attributes Schema
- Schema uses JSON Schema Draft 2020-12
- `additionalProperties` is always enforced to `false`
- Reserved field names are blocked: `email`, `username`, `is_active`, `attributes`, etc.
- Schema updates REPLACE the entire schema (not merge)
- Always read the current schema before updating to avoid losing fields

### Role Management
- Roles are scoped to the app (prefixed with app slug)
- Hierarchy is supported via `parent_slug`
- Levels are auto-calculated from hierarchy depth
- Deletion is protected: must remove children and members first
- Slugs are auto-generated from names

### Role Assignments
- Both assign and revoke are idempotent
- Bulk operations handle partial failures gracefully
- `expires_at` supports ISO 8601 datetime for temporary roles
- Filtering users by `role_slug` works correctly

---

## Recommendations

### For MCP Server Development Team

#### P2 - Medium Priority

1. **Add `update` action to `manage_roles`**
   - Currently roles can only be created or deleted
   - Need ability to update `name`, `description`, and `parent_slug`
   - Useful for reorganizing role hierarchies without recreating roles
   - Changing `parent_slug` should recalculate levels for the entire subtree

2. **Add revoke idempotency clarity**
   - When revoking a role the user doesn't have, return `success_count: 0` or add a `skipped_count` field
   - Current behavior returns `success_count: 1` which could be misleading in automation scripts
   - Alternative: Add a `was_assigned` boolean in the response to indicate if the revocation actually did anything

3. **Add `search` parameter to `manage_roles` list action**
   - Currently no way to search/filter roles by name or description
   - Useful when there are many roles and you need to find specific ones

#### P3 - Enhancements

4. **Add `get_user` tool for single user lookup**
   - Currently need to use `list_users` with search to find a specific user
   - A dedicated `get_user(user_id)` or `get_user(username)` would be more efficient
   - Should return the full user object including roles

5. **Add role membership count to role listing**
   - When listing roles, include `member_count` to show how many users have each role
   - Helps administrators understand role usage without separate queries

6. **Support attribute schema `x-reference` validation in create/update user**
   - The schema docs mention `x-reference` for referencing DataTables
   - Test and document how this works with user creation (does it validate FK existence?)

7. **Add `deactivate_user` convenience action**
   - Currently deactivation requires `update_user(user_id, is_active=false)`
   - A dedicated action could also handle: revoking all roles, invalidating sessions, etc.
   - Would be safer than manual partial update

8. **Add audit trail for role assignment changes**
   - Log who assigned/revoked roles and when
   - Useful for compliance and security audits
   - Could integrate with the datatable audit_log pattern

### For Users / Developers

1. **Always read the attributes schema before updating** - Updates replace the entire schema; forgetting a field will remove it
2. **Use `role_slugs` on `create_user`** to assign roles at creation time instead of separate assignment calls
3. **Use bulk operations** for assigning/revoking roles across multiple users - more efficient than individual calls
4. **Set `expires_at` for temporary access** - Use ISO 8601 datetime for time-limited role assignments
5. **Delete roles bottom-up** - Remove leaf roles first, then parent roles (hierarchy constraint)
6. **Check `failures` array on bulk operations** - Even when `success: true`, some individual operations may have failed
7. **Use `search` on `list_users` for flexible lookup** - Searches across username, email, first_name, and last_name

---

## Tools Tested

| MCP Tool | Actions Tested |
|----------|---------------|
| `list_users` | search, role_slug, is_active, date_from, date_to, limit, offset |
| `create_user` | basic, with password, with attributes, with role_slugs, inactive, staff, duplicates |
| `update_user` | email, names, is_active, is_staff, attributes, duplicate email, non-existent user |
| `user_attributes_schema` | get, update (replace), validation (enum, required, min/max, reserved names) |
| `manage_roles` | list, create, bulk_create, delete (with children, members, leaf, non-existent) |
| `manage_role_assignments` | assign (single, bulk, with expiry, invalid role/user), revoke (single, bulk, idempotent), duplicate assign |

---

## Test Data Created

The following test data was created during testing and remains in the system:

**Users:** `basic_user`, `full_user`, `attr_user`, `inactive_user`, `staff_user`, `role_user`, `schema_test_user`

**Roles:** `mcptest-manager`, `mcptest-team-lead`, `mcptest-developer`, `mcptest-qa-engineer` (plus existing `mcptest-super-admin`)

**Attributes Schema:** Updated to include `industry`, `department` (enum), `level` (integer 1-10), `bio` (string, max 500). `required` set to empty.

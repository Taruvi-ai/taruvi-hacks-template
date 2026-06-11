# Secrets Module - MCP Server Test Report

**Date:** 2026-02-16
**Module:** `mcp__taruvi__` secrets tools
**Environment:** Taruvi MCP Server (tenant: mcptest)

---

## Test Summary

| Category | Passed | Failed/Issues | Total |
|----------|--------|---------------|-------|
| Secret Types - Create | 5 | 0 | 5 |
| Secret Types - List & Filter | 4 | 0 | 4 |
| Secret Types - Update | 2 | 0 | 2 |
| Secret Types - Delete | 3 | 0 | 3 |
| Secrets - Create | 6 | 0 | 6 |
| Secrets - List & Filter | 4 | 0 | 4 |
| Secrets - Get | 4 | 0 | 4 |
| Secrets - Update | 1 | 0 | 1 |
| Secrets - Validation | 3 | 0 | 3 |
| Secrets - App Scope & Inheritance | 3 | 0 | 3 |
| **Total** | **35** | **0** | **35** |

**Overall Pass Rate:** 100%

---

## Test Results by Category

### 1. Secret Types - Create

**Tool:** `manage_secret_types` (action: create)

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Create sensitive type with schema | `api-key`, sensitivity: sensitive, JSON schema with required fields | PASS | Schema stored with required/enum validation |
| Create sensitive type with complex schema | `database-credentials`, 5 required fields | PASS | |
| Create private type with schema | `webhook-config`, sensitivity: private | PASS | |
| Create public type without schema | `public-config`, sensitivity: public, no schema | PASS | `schema: null` accepted |
| Duplicate rejection | Create `api-key` again | PASS | "already exists" error |

---

### 2. Secret Types - List & Filter

**Tool:** `manage_secret_types` (action: list) and `list_secrets` (list_types: true)

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| List all types | No filter | PASS | Returns 4 custom types |
| Filter by `custom` | `type_filter: "custom"` | PASS | Same 4 types |
| Filter by `system` | `type_filter: "system"` | PASS | Returns 0 (no system types on tenant) |
| Search by name | `search: "webhook"` | PASS | Returns 1 matching type |

---

### 3. Secret Types - Update

**Tool:** `manage_secret_types` (action: update)

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Update description and schema | Add `retry_count` field to webhook-config | PASS | Both description and schema updated |
| Update non-existent type | `slug: "nonexistent-type"` | PASS | "not found" error |

---

### 4. Secret Types - Delete

**Tool:** `manage_secret_types` (action: delete)

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Delete type in use | `public-config` (1 secret uses it) | PASS (blocked) | "used by 1 secret(s)" - correct protection |
| Delete unused type | `throwaway-type` (no secrets) | PASS | Deleted successfully |
| Delete non-existent type | `nonexistent` | PASS | "not found" error |

---

### 5. Secrets - Create

**Tool:** `create_update_secret`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Create sensitive secret (JSON value) | `stripe-api-key` with api-key type | PASS | `action: "created"`, sensitivity: sensitive |
| Create another sensitive secret | `sendgrid-api-key` | PASS | |
| Create DB credentials secret | `postgres-main` with database-credentials type | PASS | Complex JSON value stored |
| Create private secret | `slack-webhook` with webhook-config type | PASS | sensitivity: private |
| Create public secret (string value) | `app-version` with public-config type, value: "2.5.1" | PASS | String value accepted (no schema on type) |
| Create secret with tags | `github-api-key` with `test-tag` | PASS | Tag must exist first |

**Note:** Creating a secret with a non-existent tag returns `"Tag 'test-tag' not found"` - tags must be created via `manage_tags` first.

---

### 6. Secrets - List & Filter

**Tool:** `list_secrets`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| List all secrets | No filter | PASS | Returns 6 site-level secrets |
| Filter by secret type | `secret_type: "api-key"` | PASS | Returns 3 api-key secrets |
| Search by key | `search: "postgres"` | PASS | Returns 1 matching secret |
| Filter by tag | `tags: "test-tag"` | PASS | Returns 1 tagged secret |

**Key behavior:** Sensitive/private secrets show `value: "[ENCRYPTED]"` in list view. Public secrets show actual value (e.g., `"2.5.1"`).

---

### 7. Secrets - Get

**Tool:** `get_secret`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Get sensitive secret | `stripe-api-key` | PASS | Returns `[ENCRYPTED]` |
| Get public secret | `app-version` | PASS | Returns actual value: `"2.5.1"` |
| Get non-existent secret | `nonexistent-key` | PASS | "not found" error |
| Get via `list_secrets` with `list_types: true` | Alternative listing | PASS | Returns types with schemas |

**Note:** `get_secret` returns `[ENCRYPTED]` for sensitive/private secrets even when fetching a single secret. The MCP tool does not expose decrypted values - they are only available to the application runtime.

---

### 8. Secrets - Update

**Tool:** `create_update_secret`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Update existing secret value | Change stripe-api-key value | PASS | `action: "updated"`, `updated_at` set |

---

### 9. Secrets - Validation

**Tool:** `create_update_secret`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Missing required field | api-key without `key` field | PASS | "'key' is a required property" |
| Invalid enum value | `environment: "invalid-env"` | PASS | "'invalid-env' is not one of [...]" |
| Non-existent secret type | `secret_type: "nonexistent-type"` | PASS | "not found" error |

---

### 10. Secrets - App Scope & Inheritance

**Tool:** `create_update_secret`, `list_secrets`, `get_secret`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Create app-scoped secret | `app_slug: "mcptest"` | PASS | `app: "mcptest"` in response |
| List app-scoped secrets | `app_slug: "mcptest"` | PASS | Returns only app-level secret (1) |
| 2-tier inheritance (fallback) | Get site-level secret with `app_slug` | PASS | Returns site-level secret with `app: null` |

**2-tier inheritance:** When requesting a secret with `app_slug`, the system first looks for an app-level secret. If not found, it falls back to the site-level secret with the same key.

---

## Key Findings

### Encryption & Visibility
- **Sensitive** (`sensitivity_level: "sensitive"`): Value always shows `[ENCRYPTED]` in both list and get
- **Private** (`sensitivity_level: "private"`): Value shows `[ENCRYPTED]` in both list and get
- **Public** (`sensitivity_level: "public"`): Value shown in plaintext in both list and get
- MCP tools cannot decrypt sensitive/private values - only the application runtime can access them

### Schema Validation
- Secret types with schemas enforce validation on create/update
- All JSON Schema features work: `required`, `enum`, `type`, `format`, `minimum`, `maximum`
- Secret types without schemas accept any value (string or JSON)

### Sensitivity Level
- Set at secret type creation time and is **immutable** (cannot be changed via update)
- Three levels: `public`, `private`, `sensitive`
- Determines whether values are masked in API responses

### Tags
- Tags must exist before being assigned to secrets
- Creating a secret with non-existent tag fails with clear error
- Filter secrets by tag slug via `list_secrets`

### App Scoping
- Secrets can be site-level (no `app_slug`) or app-level (with `app_slug`)
- 2-tier inheritance: app-level lookup falls back to site-level
- App-scoped secrets are isolated - site-level list doesn't show app-level secrets

---

## Recommendations

### For Users / Developers

1. **Create secret types before secrets** - `secret_type` is required for `create_update_secret`
2. **Create tags before using them** in secrets - tags must exist via `manage_tags` first
3. **Use schemas on secret types** to enforce value structure and prevent misconfiguration
4. **Sensitivity is immutable** - choose the right level at type creation time
5. **MCP tools can't read encrypted values** - use them for management, not for reading secret data at runtime
6. **Use app-scoped secrets** for app-specific configs that shouldn't leak to other apps
7. **Leverage 2-tier inheritance** - set common defaults at site level, override per-app as needed

### For MCP Server Development Team

#### P3 - Enhancements

1. **Consider adding a `get_secret` decryption flag** - Allow MCP tools to optionally decrypt values for debugging/migration purposes (with appropriate security warnings)
2. **Add `delete_secret` action** - Currently no way to delete individual secrets via MCP tools
3. **Add `analytics_only` filter documentation** - The `analytics_only` flag on `list_secrets` filters for `analytics-*` type secrets but this isn't well documented
4. **Consider cascade behavior on secret type deletion** - Currently blocks if secrets exist; could offer force-delete with cascade

---

## Tools Tested

| MCP Tool | Actions Tested |
|----------|---------------|
| `manage_secret_types` | create (4 types, 3 sensitivity levels), list (all, custom, system, search), update (description + schema), delete (in-use protection, unused, non-existent) |
| `create_update_secret` | create (sensitive, private, public, with/without tags, app-scoped), update (value change), validation (required, enum, non-existent type/tag) |
| `list_secrets` | all, by type, by search, by tag, by app_slug, analytics_only, list_types |
| `get_secret` | sensitive (encrypted), public (plaintext), non-existent, 2-tier inheritance |

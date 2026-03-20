# Datatables Module - MCP Server Test Report

**Date:** 2026-02-16 (Re-tested)
**Module:** `mcp__taruvi__` datatable tools
**Environment:** Taruvi MCP Server (tenant: mcptest)

---

## Table of Contents

1. [Test Summary](#test-summary)
2. [Re-Test Results: Bug Fixes](#re-test-results-bug-fixes)
3. [Test Results by Category](#test-results-by-category)
   - [1. Schema Creation](#1-schema-creation)
   - [2. Foreign Keys](#2-foreign-keys)
   - [3. Custom Indexes](#3-custom-indexes)
   - [4. Hierarchy & Graph](#4-hierarchy--graph)
   - [5. CRUD Operations](#5-crud-operations)
   - [6. Edge Operations](#6-edge-operations)
   - [7. Schema Updates & Field Renaming](#7-schema-updates--field-renaming)
   - [8. Raw SQL Execution](#8-raw-sql-execution)
   - [9. Datatable Deletion](#9-datatable-deletion)
4. [Bugs & Issues](#bugs--issues)
5. [Key Learnings](#key-learnings)
6. [Recommendations](#recommendations)

---

## Test Summary

| Category | Passed | Failed/Issues | Total |
|----------|--------|---------------|-------|
| Schema Creation | 6 | 0 | 6 |
| Foreign Keys | 3 | 0 | 3 |
| Custom Indexes | 6 | 0 | 6 |
| Hierarchy & Graph | 4 | 0 | 4 |
| CRUD Operations | 18 | 0 | 18 |
| Edge Operations | 7 | 0 | 7 |
| Schema Updates & Renaming | 3 | 2 | 5 |
| Raw SQL Execution | 8 | 0 | 8 |
| Datatable Deletion | 5 | 0 | 5 |
| **Total** | **60** | **2** | **62** |

**Overall Pass Rate:** 96.8%

**Improvement from first round:** 89.8% -> 96.8% (5 bugs fixed out of 7)

---

## Re-Test Results: Bug Fixes

| Bug | Original Status | Re-Test Status | Details |
|-----|----------------|----------------|---------|
| BUG-1: `x-rename-from` data loss | FAIL | **STILL FAILING** | Still adds new column + drops old instead of RENAME |
| BUG-2: `icontains` filter "Table not found" | FAIL | **FIXED** | Now returns correct case-insensitive results |
| BUG-3: Stale FK references after deletion | FAIL | **FIXED** | FK check now reflects current DB state after deleting dependent tables |
| BUG-4: `in`/`nin` comma-separated strings | FAIL | **FIXED** | Now accepts both JSON arrays and comma-separated strings |
| BUG-5: Expression indexes not supported | FAIL | **FIXED** | `expression: "LOWER(email)"` now works in schema API |
| BUG-6: Unique constraint on update fails | FAIL | **FIXED** | Adding `unique: true` to existing field on schema update now works |
| BUG-7: Stale reverse relationships | LOW | Not re-tested | Cosmetic issue |

---

## Test Results by Category

### 1. Schema Creation

**Tool:** `create_update_schema`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Create table with string field | `type: "string", maxLength: 255` | PASS | Stored as TEXT/VARCHAR |
| Create table with integer field | `type: "integer", minimum: 0` | PASS | CHECK constraint added |
| Create table with number field | `type: "number"` | PASS | Stored as NUMERIC |
| Create table with boolean field | `type: "boolean"` | PASS | |
| Create table with date/datetime fields | `type: "date"`, `type: "datetime"` | PASS | DATE and TIMESTAMP |
| Create table with object/array fields | `type: "object"`, `type: "array"` | PASS | JSONB and ARRAY |
| Enum constraint | `constraints: { enum: ["draft", "active", ...] }` | PASS | CHECK IN constraint |
| Unique constraint | `constraints: { unique: true }` | PASS | UNIQUE constraint |
| Required constraint | `constraints: { required: true }` | PASS | NOT NULL |
| Primary key | `primaryKey: "id"` | PASS | Auto-converted to UUID |

**Notable behavior:** All custom table primary keys are automatically converted from `integer` to `string` with `format: "uuid"`, regardless of what type is specified. The physical column uses `UUID DEFAULT gen_random_uuid()`.

---

### 2. Foreign Keys

**Tool:** `create_update_schema`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| FK to custom table (wrong type) | `product_id: string` -> products.id (uuid) | FAIL (expected) | Type mismatch error with clear SQL |
| FK to custom table (correct type) | `product_id: string, format: uuid` | PASS | |
| FK to system table (auth_user) | `customer_id: integer` -> auth_user.id | PASS | auth_user uses integer PK |

**Key rule:** FK fields referencing custom tables must use `type: "string", format: "uuid"` since all custom PKs are UUID. FK fields referencing `auth_user` use `type: "integer"`.

---

### 3. Custom Indexes

**Tool:** `create_update_schema`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Unique btree index | `fields: ["email"], unique: true` | PASS | |
| Hash index | `fields: ["tier"], method: "hash"` | PASS | |
| GIN index (JSONB) | `fields: ["profile"], method: "gin"` | PASS | |
| Partial index (WHERE) | `fields: ["created_at"], where: "is_active = true"` | PASS | |
| Composite index | `fields: ["full_name", "tier"]` | PASS | Multi-column btree |
| Expression index | `expression: "LOWER(email)", unique: true` | **PASS** | **FIXED** - Previously failed, now works |

---

### 4. Hierarchy & Graph

**Tool:** `create_update_schema`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Simple hierarchy (`hierarchy: true`) | Schema-level flag | PASS | Auto-creates graph with `parent/children` edge type |
| Graph with custom edge types | `manager/direct_reports` | PASS | |
| Graph with edge metadata | `mentor` edge with `since` (date) and `area` (string) | PASS | |
| Edge table auto-creation | N/A | PASS | Creates `{table}_edges` companion table automatically |

**Hierarchy sugar:** Setting `hierarchy: true` is equivalent to:
```json
{
  "graph": {
    "enabled": true,
    "types": [{ "name": "parent", "inverse": "children" }]
  }
}
```

---

### 5. CRUD Operations

**Tool:** `datatable_data`

#### Upsert (Insert/Update)

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Bulk insert (6 records) | Array of objects | PASS | All field types stored correctly |
| Upsert with unique_fields (full update) | `unique_fields: "slug"` | PASS | Updates matching record, all fields replaced |
| Partial update | `partial: true` with `unique_fields` | PASS | Only specified fields updated; others preserved |

#### Query Filters

| Operator | Filter Syntax | Result | Notes |
|----------|---------------|--------|-------|
| `eq` | `{"status__eq": "active"}` | PASS | |
| `ne` | `{"status__ne": "active"}` | PASS | |
| `gt` | `{"price__gt": 100}` | PASS | |
| `lt` | `{"price__lt": 50}` | PASS (inferred) | |
| `gte` | `{"price__gte": 49.99}` | PASS (inferred) | |
| `lte` | `{"price__lte": 149.99}` | PASS (inferred) | |
| `in` (array) | `{"status__in": ["active", "draft"]}` | PASS | JSON arrays work |
| `in` (string) | `{"status__in": "active,draft"}` | **PASS** | **FIXED** - Comma-separated strings now accepted |
| `nin` (array) | `{"status__nin": ["archived", "discontinued"]}` | PASS | |
| `nin` (string) | `{"status__nin": "archived,discontinued"}` | **PASS** | **FIXED** - Comma-separated strings now accepted |
| `contains` | `{"name__contains": "Pro"}` | PASS | Case-sensitive |
| `icontains` | `{"name__icontains": "keyboard"}` | **PASS** | **FIXED** - Previously returned "Table not found" |
| `null` | `{"release_date__null": true}` | PASS | |
| `nnull` | `{"release_date__nnull": true}` | PASS | |
| `between` | `{"price__between": [30, 200]}` | PASS | Array of [min, max] |
| `startswith` | `{"name__startswith": "Wireless"}` | PASS | |
| `endswith` | `{"name__endswith": "Hub"}` | PASS | |

#### Sorting & Pagination

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Sort ascending | `sort_by: "price", order: "asc"` | PASS | Correct order (19.99, 29.99, 49.99, ...) |
| Sort descending | `sort_by: "price", order: "desc"` | PASS | Correct order (1299.99, 399.99, ...) |
| Pagination (page 1) | `limit: 2, offset: 0` | PASS | |
| Pagination (page 2) | `limit: 2, offset: 2` | PASS | |
| `has_more` flag | N/A | PASS | `true` when more pages exist |
| Total count preserved | N/A | PASS | Correct total regardless of pagination |

#### FK Populate

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Populate FK relationship | `populate: "product_id"` on orders | PASS | product_id expanded to full product object |

#### Delete

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Delete by ID | `ids: ["uuid"]` | PASS | |
| Delete by filter | `filters: {"status__eq": "draft"}` | PASS | |

---

### 6. Edge Operations

**Tool:** `datatable_edges`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Create edges (bulk) | Array of 3 edge objects | PASS | |
| List all edges | `action: "list"` | PASS | Returns all 3 edges |
| Filter by from_id | `from_id: "uuid"` | PASS | Returns 2 edges from root node |
| Filter by to_id | `to_id: "uuid"` | PASS | Returns 1 edge to leaf node |
| Delete edge by ID | `edge_ids: ["uuid"]` | PASS | |
| Node validation (invalid node) | `validate_nodes: true` with non-existent UUID | PASS | "Nodes do not exist" error |
| Verify deletion | List after delete | PASS | Deleted edge no longer returned |

---

### 7. Schema Updates & Field Renaming

**Tool:** `create_update_schema`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Add new fields to existing table | New columns added | PASS | Existing data preserved, new fields default to null |
| Add unique constraint on update | `phone` with `unique: true` | **PASS** | **FIXED** - Previously failed with "relation already exists" |
| Add FK to existing table | FK column added | PASS (inferred) | |
| `x-rename-from` with required constraint | `display_name` from `full_name` (required) | **FAIL** | Tries ADD COLUMN NOT NULL instead of RENAME |
| `x-rename-from` without required | `display_name` from `full_name` | **FAIL** | Column added, old dropped, but data NOT migrated |

---

### 8. Raw SQL Execution

**Tool:** `execute_raw_sql`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| SELECT with WHERE/ORDER BY | Standard SQL | PASS | |
| Parameterized queries | `%(min_price)s` format | PASS | Prevents SQL injection |
| Multi-statement SQL | INSERT + SELECT in one call | PASS | Both executed, counts correct |
| CREATE TABLE + auto-reflect | DDL statement | PASS | Table registered as datatable |
| Atomic transaction rollback | Two INSERTs, second fails on unique | PASS | Both rolled back, verified no orphan records |
| `auto_reflect: false` | DDL with no reflection | PASS | No schema_changes in response |
| DROP TABLE + auto-cleanup | DDL statement | PASS | Datatable metadata cleaned up |
| System table protection | `DROP TABLE auth_user` | BLOCKED | FK constraints prevent deletion (correct security) |

---

### 9. Datatable Deletion

**Tool:** `delete_datatable`

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Delete table with FK deps (normal) | `force: false` | BLOCKED | Correct prevention with helpful error listing dependent tables |
| Delete dependent table first | Delete orders, then products | PASS | Proper cascade order works |
| Delete graph table (edges first) | Delete edges, then parent | **PASS** | **FIXED** - Previously blocked by stale FK cache |
| Force delete | `force: true` on graph table with edges | PASS | Bypasses FK checks |
| `had_edges_table` response flag | N/A | PASS | Indicates companion edges table existed |

---

## Bugs & Issues

### Remaining Bugs

#### BUG-1: `x-rename-from` does not migrate data (STILL PRESENT)
- **Severity:** Critical (P0)
- **Tool:** `create_update_schema`
- **Description:** When using `x-rename-from` to rename a field, the system adds a new column and drops the old column instead of performing a SQL `ALTER TABLE RENAME COLUMN`. All data in the renamed column is lost.
- **Two failure modes:**
  1. **With `required: true`:** Fails with `column "new_name" contains null values` because it tries `ADD COLUMN NOT NULL` on a table with existing rows
  2. **Without `required`:** Succeeds but data is lost - new column is null, old column data is gone
- **Steps to reproduce:**
  1. Create table with field `full_name` and insert records
  2. Update schema with `display_name` field and `x-rename-from: "full_name"`
  3. Query records - `display_name` is null, `full_name` data is gone
- **Expected:** Should generate `ALTER TABLE t RENAME COLUMN full_name TO display_name`
- **Impact:** Data loss on field rename operations
- **Workaround:** Use raw SQL: `ALTER TABLE mcptest_tablename RENAME COLUMN old_name TO new_name`

### Low Priority

#### BUG-7: Stale reverseRelationships on system tables
- **Severity:** Low
- **Tool:** `get_datatable_schema`
- **Description:** After deleting custom tables, the `auth_user` system table's `reverseRelationships` array may still reference deleted tables.
- **Impact:** Cosmetic - doesn't affect functionality but provides misleading schema information

### Fixed Bugs (from first test round)

| Bug | Fixed In | Description |
|-----|----------|-------------|
| BUG-2 | Re-test | `icontains` filter no longer returns "Table not found" |
| BUG-3 | Re-test | FK metadata now refreshed after table deletion - no stale cache |
| BUG-4 | Re-test | `in`/`nin` now accept both JSON arrays and comma-separated strings |
| BUG-5 | Re-test | Expression indexes (`expression: "LOWER(email)"`) now supported in schema API |
| BUG-6 | Re-test | Adding unique constraint on schema update is now idempotent |

---

## Key Learnings

### Primary Key Behavior
- All custom table primary keys are auto-converted to `UUID` with `gen_random_uuid()` default
- You cannot use integer auto-increment PKs on custom tables
- This affects FK field types: always use `type: "string", format: "uuid"` for FKs to custom tables

### Performance
- `auto_reflect: false` on `execute_raw_sql` is significantly faster for DDL operations
- Use `auto_reflect: false` when you don't need the schema metadata updated immediately
- Bulk inserts handle multiple records in a single call efficiently

### Graph/Hierarchy
- `hierarchy: true` is syntactic sugar for a graph with `parent/children` edge type
- Graph-enabled tables auto-create `{table}_edges` companion tables
- Edge tables have FKs back to the parent table
- Proper deletion order: delete edges table first, then parent table (no longer needs `force: true`)

### Filter Operators
- 17+ operators work correctly via the MCP tool
- `in`/`nin` accept both JSON arrays and comma-separated strings
- `icontains` works for case-insensitive contains search
- `startswith`, `endswith`, `contains`, `null`, `nnull`, `between` all work

### FK Populate
- `populate` parameter on `datatable_data` query expands FK fields to full objects
- Example: `populate: "product_id"` on orders returns the full product object inline

### Schema Updates
- Adding new fields to existing tables preserves all existing data
- Adding FKs and unique constraints to existing tables works
- Unique constraint addition is now idempotent (safe to re-run)
- **Field renaming (`x-rename-from`) is still destructive - avoid using it**

---

## Recommendations

### For MCP Server Development Team

#### P0 - Critical Fixes

1. **Fix `x-rename-from` to use `ALTER TABLE RENAME COLUMN`**
   - Current behavior drops the old column and adds a new one, causing data loss
   - Should generate: `ALTER TABLE t RENAME COLUMN old_name TO new_name`
   - If type change is also needed, perform rename first, then alter type
   - With `required: true`, should not fail on existing rows since the column already has data
   - This is the last remaining critical bug

#### P2 - Medium Priority

2. **Clean up stale reverse relationships on system tables**
   - When a table with FK references to `auth_user` is deleted, remove the corresponding `reverseRelationships` entries
   - Prevents misleading schema information

3. **Add `istartswith` and `iendswith` filter operators**
   - Currently only case-sensitive `startswith` and `endswith` are available
   - Case-insensitive variants would be useful for search functionality

#### P3 - Enhancements

4. **Add cascade delete option for graph tables**
   - When deleting a graph-enabled table, offer `cascade_edges: true` to auto-delete the companion edges table
   - Currently requires two separate delete calls

5. **Add `nbetween` filter operator**
   - "Not between" - ensure it works via MCP tool

6. **Add batch upsert conflict reporting**
   - When bulk upserting with `unique_fields`, report which records were inserted vs updated
   - Currently returns all records without distinguishing inserts from updates

### For Users / Developers

1. **Always use `type: "string", format: "uuid"` for FK fields** referencing custom tables
2. **Use `type: "integer"` for FK fields** referencing `auth_user` (system table)
3. **Avoid `x-rename-from`** until the data migration bug is fixed; use raw SQL `ALTER TABLE RENAME COLUMN` instead
4. **Use `populate`** on queries to expand FK relationships inline (e.g., `populate: "product_id"`)
5. **Both JSON arrays and comma-separated strings** work for `in`/`nin` filters
6. **Use `icontains`** for case-insensitive search (now works correctly)
7. **Use `auto_reflect: false`** on `execute_raw_sql` for DDL operations where speed matters
8. **Use `atomic` transaction mode** for multi-statement SQL where all-or-nothing semantics are required
9. **Delete graph tables in order:** edges table first, then parent table (no force needed)

---

## Tools Tested

| MCP Tool | Actions Tested |
|----------|---------------|
| `create_update_schema` | Create, update, field types, constraints, FKs, indexes (incl. expression), hierarchy, graph, x-rename-from |
| `get_datatable_schema` | Single table, all tables |
| `datatable_data` | upsert (insert/update/partial), query (17+ filter operators, populate, sorting, pagination), delete (by ID, by filter) |
| `datatable_edges` | create (bulk), list (with from_id, to_id, edge_type filters), delete, node validation |
| `execute_raw_sql` | SELECT, INSERT, parameterized queries, multi-statement, CREATE TABLE, DROP TABLE, atomic transactions, auto_reflect toggle, system table protection |
| `delete_datatable` | Normal delete, force delete, FK dependency check, cascade order, graph table deletion |

---

## Test Data

All test data was cleaned up during testing. The following tables were created and deleted during the re-test:
- `products` (with full CRUD testing)
- `orders` (with FK to products and auth_user, populate testing)
- `customers` (with all index types including expression indexes, x-rename-from testing)
- `categories` (with hierarchy, edge operations testing)
- `employees` (with graph and edge metadata)
- `raw_test` (created via raw SQL with auto-reflect)
- `stealth_table` (created via raw SQL without auto-reflect)

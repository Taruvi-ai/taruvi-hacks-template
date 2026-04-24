# Datatable schema patterns (Frictionless + Taruvi extensions)

The full shape of the `datapackage` argument to `create_update_schema`. Taruvi follows [Frictionless Data Package](https://specs.frictionlessdata.io/data-package/) plus several Taruvi-specific extensions.

## Minimal shape

```json
{
  "resources": [
    {
      "name": "orders",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "title", "type": "string", "constraints": {"maxLength": 255}},
          {"name": "created_at", "type": "datetime"}
        ],
        "primaryKey": ["id"]
      }
    }
  ]
}
```

**Prefer UUID IDs for new tables** (`"type": "string", "format": "uuid"`). Integer IDs work but UUIDs are the recommended default.

One call can create or update many tables by adding more entries to `resources[]`.

## Field types

| `type` | Postgres | Notes |
|---|---|---|
| `string` | `TEXT` | Use `constraints.maxLength` for varchar-like bound |
| `integer` | `INTEGER` | |
| `number` | `NUMERIC` | |
| `boolean` | `BOOLEAN` | |
| `date` | `DATE` | ISO 8601 |
| `datetime` | `TIMESTAMP WITH TIME ZONE` | ISO 8601 |
| `object` | `JSONB` | arbitrary JSON object |
| `array` | `JSONB` | arbitrary JSON array |

## Constraints

Per-field `constraints` object:

- `required: true` → `NOT NULL`
- `unique: true` → `UNIQUE` index
- `maxLength: N` → `CHECK (length(field) <= N)`
- `minimum` / `maximum` → `CHECK`
- `pattern: "..."` → `CHECK` against regex
- `enum: [...]` → `CHECK IN (...)`

## Foreign keys (`foreignKeys`)

```json
{
  "name": "line_items",
  "schema": {
    "fields": [
      {"name": "id", "type": "string", "format": "uuid"},
      {"name": "order_id", "type": "string", "format": "uuid"}
    ],
    "primaryKey": ["id"],
    "foreignKeys": [
      {
        "fields": ["order_id"],
        "reference": {
          "resource": "orders",
          "fields": ["id"]
        },
        "x-actions": {"onDelete": "CASCADE"}
      }
    ]
  }
}
```

FK names must reference another table in the same datapackage or an already-materialized one.

### Referential delete actions (`x-actions.onDelete`)

Control what happens when a referenced row is deleted:

| Value | Behavior |
|---|---|
| `RESTRICT` | Block delete if references exist (default) |
| `CASCADE` | Delete referencing rows |
| `SET NULL` | Set FK column to NULL (field must be nullable) |
| `SET DEFAULT` | Set FK column to its default (field must have a default) |
| `NO ACTION` | Same as RESTRICT but checked at end of transaction |

System resources `auth_user` and `storage_objects` (bucket file metadata) can be used as FK targets.

## Indexes (Taruvi extension: `indexes`)

```json
{
  "schema": {
    "fields": [...],
    "primaryKey": ["id"],
    "indexes": [
      {"name": "idx_created", "fields": ["created_at"], "type": "btree"},
      {"name": "idx_cust_status", "fields": ["customer_id", "status"], "unique": false},
      {"name": "idx_metadata", "fields": ["metadata"], "type": "gin"},
      {"name": "idx_email_lower", "expression": "LOWER(email)", "unique": true},
      {"name": "idx_active_only", "fields": ["created_at"], "where": "is_active = true"}
    ]
  }
}
```

Types: `btree` (default), `hash`, `gin`, `gist`, `brin`. GIN is required for JSONB search.

Index properties: `name` (required), `fields` or `expression` (one required), `type`/`method`, `unique`, `where` (partial index condition), `using`, `comment`.

## Search fields (Taruvi extension: `search_fields`)

Declares which fields are searchable via the `?search=<query>` URL parameter when consumed via the data API.

```json
{
  "schema": {
    "fields": [...],
    "search_fields": [
      {"field": "title", "weight": "A"},
      {"field": "description", "weight": "B"}
    ]
  }
}
```

Weights are Postgres tsvector weight letters: `A` (highest), `B`, `C`, `D` (lowest). Plain strings (without a weight) default to `D`.

Options: `search_language` (default `"english"`) and `search_config` (default `"english"`) control the Postgres text search configuration. Set these for non-English content:

```json
{
  "search_language": "spanish",
  "search_config": "spanish",
  "search_fields": ["titulo", {"field": "cuerpo", "weight": "B"}]
}
```

## Hierarchy (parent/child closure)

```json
{
  "name": "categories",
  "schema": {
    "fields": [...],
    "primaryKey": ["id"],
    "hierarchy": {
      "enabled": true,
      "self_reference": "parent_id"
    }
  }
}
```

Creates a closure table. Query descendants/ancestors via `datatable_data` meta or graph API.

## Graph (many-to-many with edge metadata)

```json
{
  "name": "skills",
  "schema": {
    "fields": [...],
    "primaryKey": ["id"],
    "graph": {
      "enabled": true,
      "edge_types": ["prerequisite", "related", "parent_of"]
    }
  }
}
```

Creates an `<table>_edges` companion table. Use `datatable_edges` to manipulate edges. Each edge has `from_id`, `to_id`, `type`, `metadata` (JSONB), `created_by_id`, `created_at`.

### Advanced graph: inverse relationships and typed edge metadata

```json
{
  "graph": {
    "enabled": true,
    "types": [
      {"name": "manager", "inverse": "direct_reports"},
      {"name": "mentor", "metadata": {"fields": [{"name": "since", "type": "date"}]}}
    ]
  }
}
```

- `inverse` — declares the reverse edge name (querying `direct_reports` of node X returns nodes where X is `manager`).
- `metadata.fields` — typed fields stored on each edge of this type, queryable via `datatable_edges`.

## Column rename (`x-rename-from`)

To rename a column on an existing table without dropping data:

```json
{
  "name": "old_name_renamed",
  "type": "string",
  "x-rename-from": "old_name"
}
```

The materializer drops the old column after copying data.

## Populate (FK auto-expansion at query time)

Populate is a **query-time** feature, not a schema feature. To support it, just declare FKs. Consumers (Refine providers, MCP `datatable_data`) can request populated fields via:

```
datatable_data(action="query", table_name="line_items", populate="order,order.customer")
```

Dots traverse nested FKs. Use `*` to populate all one-hop FKs.

## Common mistakes

See also: Gotchas in SKILL.md for cross-cutting warnings (field dropping, policy replacement, etc.).

1. **Omitting `primaryKey`** — every table must declare one. Single-field PK: `"primaryKey": ["id"]`. Composite: `"primaryKey": ["tenant_id", "order_id"]`.
2. **Changing a column type in place** — usually works but may fail on existing data. Safer to add a new column, migrate data via `datatable_data` upserts or raw SQL, then drop the old column.
3. **Adding a `required` constraint to an existing column with NULLs** — fails. Either backfill first or add a default.
4. **Foreign key to a non-existent table in the same datapackage** — order `resources[]` so referenced tables come first, or submit them in separate `create_update_schema` calls.
5. **Forgetting `indexes` on frequently-filtered columns** — Taruvi won't add indexes automatically beyond the PK. Add explicit indexes for filter/sort columns.

## Worked example: blog schema

```json
{
  "resources": [
    {
      "name": "authors",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "name", "type": "string", "constraints": {"required": true, "maxLength": 255}},
          {"name": "bio", "type": "string"}
        ],
        "primaryKey": ["id"]
      }
    },
    {
      "name": "posts",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "author_id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "title", "type": "string", "constraints": {"required": true, "maxLength": 500}},
          {"name": "body", "type": "string"},
          {"name": "status", "type": "string", "constraints": {"enum": ["draft", "published"]}},
          {"name": "tags", "type": "array"},
          {"name": "published_at", "type": "datetime"},
          {"name": "created_at", "type": "datetime", "constraints": {"required": true}}
        ],
        "primaryKey": ["id"],
        "foreignKeys": [
          {"fields": ["author_id"], "reference": {"resource": "authors", "fields": ["id"]}}
        ],
        "indexes": [
          {"name": "idx_status_pub", "fields": ["status", "published_at"]},
          {"name": "idx_author", "fields": ["author_id"]}
        ],
        "search_fields": [
          {"field": "title", "weight": "A"},
          {"field": "body", "weight": "B"}
        ]
      }
    }
  ]
}
```

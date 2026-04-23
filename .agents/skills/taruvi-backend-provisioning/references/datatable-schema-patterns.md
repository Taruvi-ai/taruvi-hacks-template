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
          {"name": "id", "type": "integer", "constraints": {"required": true}},
          {"name": "title", "type": "string", "constraints": {"maxLength": 255}},
          {"name": "created_at", "type": "datetime"}
        ],
        "primaryKey": ["id"]
      }
    }
  ]
}
```

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
      {"name": "id", "type": "integer"},
      {"name": "order_id", "type": "integer"}
    ],
    "primaryKey": ["id"],
    "foreignKeys": [
      {
        "fields": ["order_id"],
        "reference": {
          "resource": "orders",
          "fields": ["id"]
        }
      }
    ]
  }
}
```

FK names must reference another table in the same datapackage or an already-materialized one.

## Indexes (Taruvi extension: `indexes`)

```json
{
  "schema": {
    "fields": [...],
    "primaryKey": ["id"],
    "indexes": [
      {"fields": ["created_at"], "type": "btree"},
      {"fields": ["customer_id", "status"], "unique": false},
      {"fields": ["metadata"], "type": "gin"}
    ]
  }
}
```

Types: `btree` (default), `hash`, `gin`, `gist`, `brin`. GIN is required for JSONB search.

## Search fields (Taruvi extension: `search_fields`)

Declares which fields are searchable via the `?search=<query>` URL parameter when consumed via the data API.

```json
{
  "schema": {
    "fields": [...],
    "search_fields": [
      {"field": "title", "weight": 1.0},
      {"field": "description", "weight": 0.5}
    ]
  }
}
```

Weights are relative; Postgres `ts_rank` uses them via a generated tsvector column.

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

1. **Omitting `primaryKey`** — every table must declare one. Single-field PK: `"primaryKey": ["id"]`. Composite: `"primaryKey": ["tenant_id", "order_id"]`.
2. **Dropping fields by accident** — `create_update_schema` drops fields not present in the new payload. Always `get_datatable_schema` first and preserve fields you want to keep.
3. **Changing a column type in place** — usually works but may fail on existing data. Safer to add a new column, migrate data via `datatable_data` upserts or raw SQL, then drop the old column.
4. **Adding a `required` constraint to an existing column with NULLs** — fails. Either backfill first or add a default.
5. **Foreign key to a non-existent table in the same datapackage** — order `resources[]` so referenced tables come first, or submit them in separate `create_update_schema` calls.
6. **Forgetting `indexes` on frequently-filtered columns** — Taruvi won't add indexes automatically beyond the PK. Add explicit indexes for filter/sort columns.

## Worked example: blog schema

```json
{
  "resources": [
    {
      "name": "authors",
      "schema": {
        "fields": [
          {"name": "id", "type": "integer", "constraints": {"required": true}},
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
          {"name": "id", "type": "integer", "constraints": {"required": true}},
          {"name": "author_id", "type": "integer", "constraints": {"required": true}},
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
          {"fields": ["status", "published_at"]},
          {"fields": ["author_id"]}
        ],
        "search_fields": [
          {"field": "title", "weight": 1.0},
          {"field": "body", "weight": 0.5}
        ]
      }
    }
  ]
}
```

# Taruvi Schema Rules

This skill should align with the Taruvi Data Service documentation family rooted at:

- `https://docs.taruvi.cloud/docs/api/data-service-crud`
- `https://docs.taruvi.cloud/docs/api/data-service-querying`
- `https://docs.taruvi.cloud/docs/api/data-service-aggregations`
- `https://docs.taruvi.cloud/docs/api/data-service-relationships`
- `https://docs.taruvi.cloud/docs/api/data-service-hierarchy`
- `https://docs.taruvi.cloud/docs/api/data-service-graph-traversal`
- `https://docs.taruvi.cloud/docs/api/data-service-imports`
- `https://docs.taruvi.cloud/docs/api/data-service-migrations`

When generating schema payloads, use the rules below together with the related docs themes:

- CRUD behavior and validation
- filtering and querying patterns
- relationships and populate
- hierarchy and graph traversal
- imports and schema evolution

## Core Payload Shape

Use Taruvi MCP schema definitions as a Frictionless Data Package in this shape:

```ts
await mcp__taruvi__create_update_schema({
  datapackage: {
    resources: [
      {
        name: "products",
        schema: {
          fields: [
            { name: "id", type: "integer", constraints: { required: true } },
            { name: "name", type: "string", constraints: { required: true } },
            { name: "price", type: "number" }
          ],
          primaryKey: "id"
        }
      }
    ]
  }
});
```

The AI should always build the JSON payload around:

- `datapackage`
- `resources`
- `resource.name`
- `resource.schema`
- `schema.fields`
- `schema.primaryKey`
- optional `schema.foreignKeys`
- optional `schema.indexes`
- optional `schema.graph`
- optional `schema.hierarchy`
- optional `resource.search_fields`
- optional `schema.search_fields`
- optional `schema.search_language`
- optional `schema.search_config`

## Field Type Rules

- `string`: general text fields
- `integer`: whole numbers
- `number`: decimal values
- `boolean`: true/false flags
- `date`: calendar values
- `datetime`: timestamp values
- `object`: JSONB-style structured data
- `array`: array values

## Primary Keys

- Custom table primary keys are automatically converted to UUID-backed IDs.
- Treat custom table IDs as UUID in relationships even if the input example shows `integer`.

## Foreign Keys

- Foreign keys to custom Taruvi tables should use:
  - `type: "string"`
  - `format: "uuid"`
- Foreign keys to `auth_user` use:
  - `type: "integer"`
- Use explicit FK field names like `customer_id`, `company_id`, `assignee_id`.

## Constraints

- `constraints.required: true` -> required / not null
- `constraints.unique: true` -> unique constraint
- `constraints.enum: [...]` -> enum-style check constraint
- Use `maxLength` on bounded string fields when helpful

## Index Patterns

Useful defaults:

- unique lookup fields like email, slug, external ID
- status + created_at for dashboards and queues
- foreign keys for common joins
- composite indexes for list pages with filters

Supported patterns observed in this repo:

- regular field indexes
- unique indexes
- composite indexes
- partial indexes
- expression indexes
- JSON/GIN indexes for object fields

Index JSON patterns:

```json
{
  "indexes": [
    {
      "name": "idx_orders_status",
      "fields": ["status"]
    },
    {
      "name": "idx_orders_customer_created",
      "fields": ["customer_id", "created_at"]
    },
    {
      "name": "idx_users_email_unique",
      "fields": ["email"],
      "unique": true
    },
    {
      "name": "idx_active_orders_created",
      "fields": ["created_at"],
      "where": "status = 'active'"
    },
    {
      "name": "idx_users_email_lower",
      "expression": "LOWER(email)",
      "unique": true
    },
    {
      "name": "idx_profiles_metadata_gin",
      "fields": ["metadata"],
      "method": "gin"
    }
  ]
}
```

How to think about them:

- foreign keys for common joins:
  - add a normal btree index on fields like `customer_id`, `company_id`, `assignee_id`
  - example:

```json
{
  "name": "idx_tasks_assignee_id",
  "fields": ["assignee_id"]
}
```

- composite indexes for list pages with filters:
  - combine the fields users filter/sort together often
  - examples:

```json
{
  "name": "idx_leads_status_created",
  "fields": ["status", "created_at"]
}
```

```json
{
  "name": "idx_orders_customer_status",
  "fields": ["customer_id", "status"]
}
```

- expression indexes:
  - use when query logic depends on computed expressions such as case-insensitive lookup
  - example:

```json
{
  "name": "idx_contacts_email_lower",
  "expression": "LOWER(email)",
  "unique": true
}
```

- JSON/GIN indexes for object fields:
  - use for object/JSONB fields that will be searched by keys or containment operators
  - example:

```json
{
  "name": "idx_products_attributes_gin",
  "fields": ["attributes"],
  "method": "gin"
}
```

Prefer descriptive index names using `idx_<table>_<purpose>`.

## Search Fields

The `create_update_schema` tool supports full-text search configuration.

Search configuration examples:

```json
{
  "resources": [
    {
      "name": "articles",
      "search_fields": [
        "title",
        { "field": "summary", "weight": "B" },
        { "field": "body", "weight": "C" }
      ],
      "schema": {
        "fields": [
          { "name": "id", "type": "uuid", "constraints": { "required": true } },
          { "name": "title", "type": "string", "constraints": { "required": true } },
          { "name": "summary", "type": "string" },
          { "name": "body", "type": "string" }
        ],
        "primaryKey": "id",
        "search_language": "english",
        "search_config": "english"
      }
    }
  ]
}
```

Use search fields when:

- users need keyword search over titles, notes, descriptions, or bodies
- the app has list pages with a global search box
- the table is content-heavy and text lookup matters

Only use search fields on string/text-like content fields.

## Hierarchy And Graph

- `hierarchy: true` creates a parent/children graph pattern
- Use this for org charts, category trees, nested tasks, or folders
- Prefer normal FKs for simple one-to-many relationships

Hierarchy JSON example:

```json
{
  "resources": [
    {
      "name": "categories",
      "schema": {
        "fields": [
          { "name": "id", "type": "uuid", "constraints": { "required": true } },
          { "name": "name", "type": "string", "constraints": { "required": true } }
        ],
        "primaryKey": "id",
        "hierarchy": true
      }
    }
  ]
}
```

Graph JSON example:

```json
{
  "resources": [
    {
      "name": "employees",
      "schema": {
        "fields": [
          { "name": "id", "type": "uuid", "constraints": { "required": true } },
          { "name": "name", "type": "string", "constraints": { "required": true } }
        ],
        "primaryKey": "id",
        "graph": {
          "enabled": true,
          "types": [
            { "name": "manager", "inverse": "direct_reports" },
            {
              "name": "mentor",
              "metadata": {
                "fields": [
                  { "name": "since", "type": "date" },
                  { "name": "area", "type": "string" }
                ]
              }
            }
          ]
        }
      }
    }
  ]
}
```

## File Upload Modeling

When files are involved:

- store file paths in schema fields like `image_path` or `attachment_path`
- do not store generated URLs in the table
- use storage buckets separately

## Naming Guidance

- table names: plural snake_case when they represent collections
- field names: snake_case
- enums: lowercase strings when possible
- keep resource names aligned with table names unless there is a strong UI reason not to

## Recommended MVP System Fields

For most app tables, consider:

- `id`
- `created_at`
- `updated_at`
- `status`
- ownership field such as `created_by`, `owner_id`, or `assignee_id` when relevant

## Good Skill Output Pattern

For each entity, provide:

- table name
- purpose
- fields
- required fields
- foreign keys
- likely indexes
- optional later-phase fields

## Verification Note For This Repo

Observed live behavior in the `test` app on `hackkj`:

- `create_update_schema` can report successful table creation
- `delete_datatable` can then delete that same table successfully
- immediate `get_datatable_schema(table_name=...)` may still report `Table not found`
- immediate `datatable_data` query may also report `Table not found`

For this environment, treat the `create_update_schema` success response as the primary confirmation that the schema mutation worked. Use follow-up reads as best-effort checks, not as the sole source of truth.

# Taruvi Schema Rules

## Core Payload Shape

Use Taruvi MCP schema definitions in this shape:

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

## Hierarchy And Graph

- `hierarchy: true` creates a parent/children graph pattern
- Use this for org charts, category trees, nested tasks, or folders
- Prefer normal FKs for simple one-to-many relationships

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

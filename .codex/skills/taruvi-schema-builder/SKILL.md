---
name: taruvi-schema-builder
description: Turn plain-English product requirements into Taruvi database schemas and `create_update_schema` payloads. Use when Codex needs to design new Taruvi tables, define fields and relationships, propose enums and indexes, validate foreign key types, or map a data model into Refine resources for this Taruvi template.
---

# Taruvi Schema Builder

Design Taruvi-ready database schemas from app ideas, then turn them into concrete `create_update_schema` payloads and first-pass resource plans.

Use this skill when the user needs a data model for a new app, a new feature module, or a new resource set inside this Taruvi + Refine template.

Taruvi schema changes are expressed as a Frictionless Data Package payload passed to `create_update_schema`, so always think in terms of:

```json
{
  "datapackage": {
    "resources": [
      {
        "name": "table_name",
        "schema": {
          "fields": [],
          "primaryKey": "id"
        }
      }
    ]
  }
}
```

## Workflow

1. Extract the core entities from the user's app idea.
2. Identify the first version of the schema, not the perfect final version.
3. Read `references/taruvi-schema-rules.md` before proposing field types or foreign keys.
4. Model the schema as a Frictionless datapackage resource, not as an ad hoc JSON object.
5. When relevant, account for search, relationships, hierarchy, graph traversal, imports, and schema evolution.
6. Use the Taruvi Data Service docs family as guidance for behavior around CRUD, querying, aggregations, relationships, hierarchy, graph traversal, imports, and migrations.
4. Produce:
   - entities and their purpose
   - fields with Taruvi-compatible types
   - relationships and FK field types
   - recommended enums and indexes
   - search configuration when the app needs keyword search
   - hierarchy/graph configuration when the app needs tree or graph traversal
   - a `create_update_schema` payload
   - the first Refine resources to build
7. Keep naming consistent across table names, FK names, and resource names.

## Defaults

- Prefer one table per main concept.
- Use `snake_case` for table and field names.
- Use a simple MVP schema first, then suggest optional future fields separately.
- Assume custom Taruvi tables use UUID primary keys.
- Add timestamps and status fields when they help common app flows.
- Suggest file path fields instead of direct file URLs when uploads are involved.
- Add search/index guidance for fields that will be filtered, sorted, grouped, or searched frequently.

## Output Shape

When using this skill, structure the result in this order:

1. `Schema Summary`
2. `Entities`
3. `Relationships`
4. `Taruvi Payload`
5. `First Resources`
6. `Risks Or Open Questions`

## Safety

- Do not invent unsupported Taruvi schema features.
- Call out FK type mismatches explicitly.
- Separate must-have fields from nice-to-have fields so hackathon teams can ship quickly.

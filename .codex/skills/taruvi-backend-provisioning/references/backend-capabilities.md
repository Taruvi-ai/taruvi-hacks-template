# Backend query capabilities

What the Taruvi backend supports for datatables, storage, and users. Read this when building frontend queries to know what the backend can handle.

## Datatable filter operators

The backend supports these operators via `field__operator=value` query params:

### Comparison
| Operator | Meaning |
|---|---|
| `eq` | Equals (default if no operator) |
| `ne` | Not equals |
| `gt` / `gte` | Greater than / greater or equal |
| `lt` / `lte` | Less than / less or equal |

### String matching (case-insensitive by default)
| Operator | Meaning |
|---|---|
| `contains` / `ncontains` | Contains (case-insensitive) |
| `containss` / `ncontainss` | Contains (case-sensitive) |
| `startswith` / `nstartswith` | Starts with (case-insensitive) |
| `startswiths` / `nstartswiths` | Starts with (case-sensitive) |
| `endswith` / `nendswith` | Ends with (case-insensitive) |
| `endswiths` / `nendswiths` | Ends with (case-sensitive) |

Note: `icontains` is an alias for `contains`.

### Set operators
| Operator | Meaning | Example |
|---|---|---|
| `in` | Value in list | `status__in=active,pending` |
| `nin` | Value not in list | `status__nin=deleted,banned` |

### Range
| Operator | Meaning | Example |
|---|---|---|
| `between` | Between two values | `price__between=10,100` |
| `nbetween` | Not between | `price__nbetween=10,100` |

### Null checks
| Operator | Meaning |
|---|---|
| `null` | Is NULL (`field__null=true`) |
| `nnull` | Is NOT NULL |

### Full-text search
| Operator | Meaning |
|---|---|
| `search` | PostgreSQL tsvector search (requires `search_vector` field) |

### Array operators (PostgreSQL)
| Operator | Meaning |
|---|---|
| `acontains` / `nacontains` | Array contains all items (`@>`) |
| `acontainedby` / `nacontainedby` | Array contained by (`<@`) |
| `aoverlap` / `naoverlap` | Arrays overlap (`&&`) |
| `aelement` / `naelement` | Value exists in array (`= ANY()`) |

### Hierarchy operators
| Operator | Meaning |
|---|---|
| `descendants` | Filter by descendants in hierarchy |
| `ancestors` | Filter by ancestors in hierarchy |

### Logic operators
The backend supports nested AND/OR/NOT:
```json
{ "and": [{ "status": "active" }, { "or": [{ "age__gte": 18 }, { "verified": true }] }] }
```

## Datatable aggregation

**Note:** Aggregation is available via the REST API and Refine data providers, not via the `datatable_data` MCP tool. Use `execute_raw_sql` or `manage_query` for aggregation via MCP.

Supported functions: `count(*)`, `count(field)`, `sum(field)`, `avg(field)`, `min(field)`, `max(field)`, `array_agg(field)`, `string_agg(field)`, `json_agg(field)`, `stddev(field)`, `variance(field)`.

Complex expressions with aliases: `sum(total) as revenue`, `avg(extract(epoch from (end_time - start_time)) / 86400) as avg_days`.

GROUP BY supports field names and SQL expressions: `DATE_TRUNC('month', created_at)`.

HAVING filters groups after aggregation — only works with GROUP BY.

## Datatable pagination

- `page` (1-indexed, default: 1), `page_size` (max enforced by server config)
- Response includes: `total`, `pagination.current_page`, `pagination.total_pages`, `pagination.has_next`, `pagination.has_previous`

## Populate (FK expansion)

- `populate=author,category` — expand foreign key fields inline
- `populate=*` — expand all FKs
- Max populate depth: 3

## Additional datatable features

- **Upsert**: `meta.upsert: true` on create — insert or update on conflict
- **Delete by filter**: `meta.deleteByFilter: true` on deleteMany — delete by filter instead of IDs
- **Zero-downtime rename**: `x-rename-from` on field schema to rename without data loss

## Storage object filters

| Filter | Example |
|---|---|
| `size__gte`, `size__lte` | `?size__gte=1048576` |
| `created_at__gte`, `created_at__lte` | Date range |
| `search` | Searches filename + path (case-insensitive) |
| `prefix` | Bucket-relative path prefix (`users/123/`) |
| `mimetype`, `mimetype__in` | `?mimetype__in=image/png,image/jpeg` |
| `mimetype_category` | `?mimetype_category=image` (matches `image/*`) |
| `visibility` | `public` or `private` |
| `created_by_me`, `modified_by_me` | Files by authenticated user |
| `metadata_search` | Search inside metadata JSON |

### Storage bucket configuration

| Field | Required | Default | MCP `create_bucket` |
|---|---|---|---|
| `name` | Yes | — | ✅ |
| `app_category` | Yes | `assets` or `attachments` | ✅ |
| `visibility` | No | `private` | ✅ |
| `max_size_bytes` | No | Advisory quota | ✅ |
| `file_size_limit` | No | 50MB (52428800 bytes) | ❌ REST API only |
| `allowed_mime_types` | No | Empty = all allowed. Supports exact (`application/pdf`) or wildcard (`image/*`) | ❌ REST API only |
| `max_objects` | No | Advisory quota | ❌ REST API only |

### Storage upload behavior
- Uploading to an existing path **replaces** the object silently (upsert). No warning from API.
- `allowed_mime_types` rejection returns a generic 400 with no mention of MIME types.

### Storage batch limits
- Batch upload: max 10 files, max 100MB per call. No partial success.
- Batch delete: max 100 paths per call. Supports partial success.
- Quotas are advisory only — API does not block uploads when exceeded.

## User list filters

| Filter | Meaning |
|---|---|
| `search` | Searches username, email, first_name, last_name (case-insensitive) |
| `is_active` | Filter by active status |
| `is_staff` | Filter by staff status |
| `is_superuser` | Filter by superuser |
| `is_deleted` | Filter by soft-deleted |
| `roles` | Comma-separated role slugs |

Sorting: single field, Django-style (`ordering=-date_joined`).

## User role assignment

- Roles are assigned/revoked separately from user CRUD (via `manage_role_assignments`)
- Max 100 roles and 100 usernames per call
- Supports expiration: `expires_at` (ISO datetime)

## User attributes and preferences

- **Attributes**: custom JSONB field validated against a tenant-level JSON Schema. Admin-controlled.
- **Preferences**: key-value store per user (e.g., `theme`, `timezone`). User-controlled.

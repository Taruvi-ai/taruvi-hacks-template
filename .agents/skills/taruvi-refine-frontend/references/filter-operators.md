# Refine filter operators → Taruvi query params

The `dataProvider` maps every Refine `CrudFilter.operator` to a DRF-style Taruvi query param via `REFINE_OPERATOR_MAP` (in `src/utils.ts` of the provider package). 24 operators supported.

## Full operator table

| Refine operator | Taruvi query suffix | Example | Notes |
|---|---|---|---|
| `eq` | (none) | `age=30` | Exact match |
| `ne` | `__ne` | `status__ne=deleted` | Not equal |
| `lt` | `__lt` | `price__lt=100` | Less than |
| `lte` | `__lte` | `price__lte=100` | Less than or equal |
| `gt` | `__gt` | `price__gt=100` | Greater than |
| `gte` | `__gte` | `price__gte=100` | Greater than or equal |
| `in` | `__in` | `status__in=active,pending` | Value is an array, serialized as comma-joined |
| `nin` | `__nin` | `status__nin=archived,deleted` | Not in list |
| `contains` | `__contains` | `title__contains=hello` | Case-sensitive substring |
| `ncontains` | `__ncontains` | `title__ncontains=spam` | Case-sensitive "does not contain" |
| `containss` | `__icontains` | `title__icontains=hello` | Case-**in**sensitive substring |
| `ncontainss` | `__nicontains` | `title__nicontains=spam` | Case-insensitive "does not contain" |
| `startswith` | `__startswith` | `email__startswith=admin` | Case-sensitive |
| `nstartswith` | `__nstartswith` | `email__nstartswith=test` | Negated |
| `startswiths` | `__istartswith` | `email__istartswith=admin` | Case-insensitive |
| `nstartswiths` | `__nistartswith` | `email__nistartswith=test` | Case-insensitive negated |
| `endswith` | `__endswith` | `email__endswith=@gmail.com` | Case-sensitive |
| `nendswith` | `__nendswith` | `email__nendswith=@bot.com` | Negated |
| `endswiths` | `__iendswith` | `email__iendswith=@GMAIL.COM` | Case-insensitive |
| `nendswiths` | `__niendswith` | `email__niendswith=@BOT.COM` | Case-insensitive negated |
| `null` | `__null` | `deleted_at__null=true` | Value is `true` or `false` |
| `nnull` | `__nnull` | `email__nnull=true` | "Is not null" |
| `between` | `__between` | `price__between=10,100` | Value is `[min, max]`, serialized as comma-joined |
| `nbetween` | `__nbetween` | `price__nbetween=10,100` | Negated range |

## Composite filters

Refine supports `and`/`or` compositions:

```typescript
filters: [
  {
    operator: "or",
    value: [
      { field: "status", operator: "eq", value: "published" },
      { field: "featured", operator: "eq", value: true },
    ],
  },
]
```

The provider flattens `and` (which is the default) into individual query params. `or` compositions are pushed as a structured query param.

## Value formatting

- Arrays are joined with `,` for `in`/`nin`/`between`.
- Dates and datetimes: pass as ISO 8601 strings. The provider doesn't transform them.
- Booleans: use `true`/`false` (lowercase strings work too).
- Null: don't pass `null` as a value; use the `null`/`nnull` operators.

## The "s-suffix" convention

Operators ending in `s` are **case-insensitive** variants. The map name looks like `contains` + `s` = `containss`. The corresponding query suffix is `__icontains` (DRF's `i` prefix = ignore case).

- `contains` → `__contains` (case-sensitive)
- `containss` → `__icontains` (case-insensitive)
- `ncontainss` → `__nicontains` (case-insensitive negated)

Same pattern for `startswith(s)`, `endswith(s)`, and their negated forms.

## Gotchas

1. **`in` expects an array in Refine, comma-string in Taruvi.** The provider handles the join — you pass `value: [1, 2, 3]`.
2. **Filtering by a populated field** (`author.name`) is not supported through filters. Use `meta.populate` to include the related data, then filter client-side — or set up an analytics query if the filter must hit the DB.
3. **Custom operators** not in this table will be ignored by the provider and log a console warning. Stick to the mapped operators.
4. **Double `s` is not a typo** — it's the case-insensitivity marker. `containss` = "contains, case-insensitive".

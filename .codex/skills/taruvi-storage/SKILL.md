---
name: taruvi-storage
description: >
  Use this skill when the user needs to upload, download, list, or manage files
  in Taruvi storage — including building file managers, attachment lists, media
  galleries, configuring buckets, handling visibility, batch operations, or
  showing quota usage. Also use when the user is working with file-related UI
  and needs the storageDataProvider, even if they don't mention "storage."
metadata:
  author: taruvi-ai
  version: "1.0.0"
---

## Overview

Reference module for Taruvi storage workflows — bucket management, object upload/download via REST path-based API or Refine provider hooks, visibility control, batch operations, and quota-aware UX patterns.

**Compliance rule:** This skill's prescribed patterns (multi-file upload by default, per-file status reporting, storage+metadata consistency) are mandatory. Do not fall back to simpler patterns. If a requirement cannot be met, stop and ask the user.

## When to Use This Skill

- Creating or configuring a storage bucket (`app_category`, `visibility`, `allowed_mime_types`)
- Uploading files from the frontend using `storageDataProvider` + `useCreate`
- Downloading or serving files via the path-based GET API
- Deleting files individually or in bulk with `useDeleteMany`
- Building a file manager, attachment list, or media gallery
- Applying prefix/MIME/size/date filters to object listings
- Surfacing bucket quota usage in the UI

**Do not use this skill for:** database table CRUD (use `taruvi-database` skill), user data (use `taruvi-refine-providers` skill), or multi-resource storage + database operations (use `taruvi-functions` skill).

## Step-by-Step Instructions

1. Open and read `../taruvi-refine-providers/references/storage-provider.md` for the full storage API reference (upload, download, list, filters, metadata, batch operations).
2. Identify the operation needed:
   - **Single upload** → `PUT|POST /api/apps/{app_slug}/storage/buckets/{bucket}/objects/{key}`
   - **Bulk upload** → batch-upload endpoint (max 10 files / 100MB per call)
   - **Bulk delete** → batch-delete endpoint (max 100 paths per call)
   - **List with filters** → GET with query params (`prefix`, `mimetype`, `size__gte`, etc.)
3. Set bucket `visibility` at the bucket level; override per-object only when needed.
4. For quota-aware UX, call the usage endpoint and display a warning — do not rely on upload blocking.
5. For document/attachment flows, default to multi-file upload UX:
   - allow selecting/uploading multiple files per action by default
   - process each file independently and capture per-file success/failure
   - keep storage object and metadata record creation/deletion consistent (cleanup storage on metadata failure where possible)
   - after upload/delete, invalidate/refetch file lists so UI reflects current backend state

### Verification checklist

After writing storage code, verify:

- [ ] Bucket has `app_category` set (`assets` or `attachments`)
- [ ] `allowed_mime_types` is configured if the bucket should restrict file types
- [ ] Batch uploads are split into chunks of ≤10 files / ≤100MB
- [ ] Batch deletes are split into chunks of ≤100 paths
- [ ] Upload UI warns users when overwriting an existing path (upsert behavior)
- [ ] Quota usage is surfaced as a warning, not as an upload blocker
- [ ] Multi-file uploads report per-file status instead of a single aggregate success
- [ ] Metadata and storage-object state remain consistent when one step fails

## Examples

**Upload via Refine provider hook:**
```typescript
const { mutate: upload } = useCreate();

upload({
  resource: "my-bucket",
  dataProviderName: "storage",
  variables: {
    files: [file],
    paths: ["uploads/profile-photo.jpg"],
    metadatas: [{ description: "Profile photo" }],
  },
});
```

**Batch delete:**
```typescript
const { mutate: deleteMany } = useDeleteMany();

deleteMany({
  resource: "my-bucket",
  dataProviderName: "storage",
  ids: ["uploads/old-photo.jpg", "uploads/draft.pdf"],
});
```

**List with prefix filter:**
```typescript
const { data } = useList({
  resource: "my-bucket",
  dataProviderName: "storage",
  filters: [{ field: "prefix", operator: "eq", value: "uploads/2024/" }],
});
```

## Gotchas

- **Uploading to an existing path** — upsert behavior: the object is replaced silently with no warning from the API. Always warn users in UI if overwrite is unintentional.
- **Visibility mismatch** — per-object visibility overrides the bucket default. A `private` file in a `public` bucket stays private. This is the most common source of "why can't I access this file" bugs.
- **Batch upload limit** — max 10 files and 100MB per batch-upload call. Exceeding either limit returns a 400 with no partial success. Split larger sets into multiple calls.
- **Batch delete limit** — max 100 paths per batch-delete call. Unlike upload, batch delete supports partial success — some paths may delete while others fail.
- **Quota is advisory** — quotas are monitoring/alerting only, not hard upload blockers. The API will accept uploads even when quota is exceeded. Surface the usage warning in UX rather than preventing upload.
- **`allowed_mime_types` rejects silently** — if a bucket has `allowed_mime_types: ["image/*"]` and you upload a PDF, the API rejects it with a generic 400. The error message does not mention MIME types. Check bucket config first when uploads fail.
- **Missing `app_category`** — bucket creation requires `app_category` (`assets` or `attachments`). Omitting it returns a validation error, not a helpful message.
- **`dataProviderName: "storage"` is required** — forgetting `dataProviderName` on `useCreate`/`useList`/`useDeleteMany` routes the call to the default (database) provider, which returns confusing "resource not found" errors.
- **Single-file-only UX for document workflows** — attachment flows should support multi-file selection by default; forcing one-file-at-a-time creates unnecessary user friction.
- **All-or-nothing status for batch uploads** — if one file fails, do not hide successful uploads; show per-file outcomes and surface exact failures.

## References

- `../taruvi-refine-providers/references/storage-provider.md` — full endpoint reference, bucket/object rules, advanced filters, quota semantics

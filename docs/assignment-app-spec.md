# Assignment App Spec

## Goal

Build a hackathon assignment app where admins can:

- create assignment groups backed by app data
- add group members from `auth_user`
- create assignments with ordered step-by-step flows
- assign assignments to individual users and/or groups
- attach reference files and screenshots at assignment or step level

Authenticated users can:

- view assignments
- see step-by-step instructions
- upload evidence or screenshot attachments against a step

## Data Model

### `assignment_groups`

- `id` `uuid` primary key
- `name` `string` required, unique
- `description` `text`
- `is_active` `boolean`
- `created_at` `datetime`
- `updated_at` `datetime`

### `assignment_group_members`

- `id` `uuid` primary key
- `group_id` `uuid` required, FK -> `assignment_groups.id`
- `user_id` `integer` required, FK -> `auth_user.id`
- `member_role` `string` enum: `member`, `lead`
- `created_at` `datetime`

### `assignments`

- `id` `uuid` primary key
- `title` `string` required
- `summary` `text`
- `instructions` `text`
- `status` `string` enum: `draft`, `published`, `archived`
- `priority` `string` enum: `low`, `medium`, `high`, `critical`
- `due_at` `datetime`
- `created_by_id` `integer`, FK -> `auth_user.id`
- `created_at` `datetime`
- `updated_at` `datetime`

### `assignment_steps`

- `id` `uuid` primary key
- `assignment_id` `uuid` required, FK -> `assignments.id`
- `step_order` `integer` required
- `title` `string` required
- `description` `text`
- `step_type` `string` enum: `instruction`, `upload`, `review`, `complete`
- `required_attachment` `boolean`
- `allow_multiple_attachments` `boolean`
- `created_at` `datetime`

### `assignment_assignees`

- `id` `uuid` primary key
- `assignment_id` `uuid` required, FK -> `assignments.id`
- `assignee_type` `string` enum: `user`, `group`
- `user_id` `integer`, FK -> `auth_user.id`
- `group_id` `uuid`, FK -> `assignment_groups.id`
- `assigned_at` `datetime`

### `assignment_attachments`

- `id` `uuid` primary key
- `assignment_id` `uuid` required, FK -> `assignments.id`
- `step_id` `uuid`, FK -> `assignment_steps.id`
- `attachment_kind` `string` enum: `reference`, `screenshot`, `evidence`
- `file_name` `string`
- `file_path` `string` required
- `mime_type` `string`
- `size_bytes` `integer`
- `uploaded_by_id` `integer`, FK -> `auth_user.id`
- `created_at` `datetime`

## UX Shape

### Dashboard

- summary cards for total assignments, published assignments, groups, due soon
- quick links to create a group or assignment

### Groups

- list page with member counts
- create/edit page with metadata and user member picker
- show page with members and assignments targeting the group

### Assignments

- list page with status, priority, due date, steps, assignee counts
- create/edit page with:
  - core assignment details
  - assignee selection for users and groups
  - ordered step builder
  - attachment uploads for assignment-level reference files
- show page with:
  - assignment summary
  - assignees
  - step timeline
  - step attachments
  - upload zone for screenshot/evidence files

## Storage

- bucket: `assignment-files`
- file paths generated with prefixes like `assignment`, `step`, `evidence`
- app database stores file paths, UI derives URLs with `getStorageUrl`

# Functional app default

If the user asks to create or build an app, default to a functional, production-ready app —
not a mockup, not a demo, not an MVP.

A functional Taruvi app means:

- create the Taruvi schema with MCP tools
- seed enough real data to actually use the app
- register Refine resources in `src/App.tsx`
- build real list / create / edit / show flows for core resources
- wire dashboards and pages to live data, calculated from the system's own data and kept up to
  date — never hardcoded or demo values

If the user wants a UI-only prototype, they must say so explicitly.

## Investigate before building

- Verify tables exist with the `get_datatable_schema` MCP tool before wiring a resource.
- Resource names must match datatable names exactly.
- Create referenced tables before the tables that point at them; foreign keys use integer id
  fields with `{ resource: "table_name", fields: "id" }`.

## Dev server

Assume a dev server is already running with hot reload. Do not start `npm run dev`, and only run
builds when explicitly asked.

## Browser errors

When the user reports a browser problem and the app has a `logs/frontend.ndjson` file, read it
instead of asking them to open DevTools. It is NDJSON — one event per line with `timestamp`,
`source`, `text`, `session_id`, and `method`/`url`/`status` for network errors. Secrets are
redacted server-side.

After shipping a fix, truncate it (`: > logs/frontend.ndjson`) before asking for a re-test so the
next reproduction is unambiguous. If the file is missing, no errors have been captured yet.

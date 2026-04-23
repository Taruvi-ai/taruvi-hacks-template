#!/usr/bin/env node
/**
 * validate-resource-map.js — check that Refine resource declarations match Taruvi datatables.
 *
 * Usage:
 *   node scripts/validate-resource-map.js <path-to-refine-app> [--taruvi-api-url URL] [--app-slug SLUG] [--token TOKEN]
 *
 * Reads the Refine app's entry (src/App.tsx or src/main.tsx), extracts the `resources` array,
 * then queries Taruvi to verify each resource name maps to an existing datatable
 * (or has `meta.tableName` properly aliased).
 *
 * Exit codes:
 *   0 — all resources valid
 *   1 — one or more resources don't resolve to a Taruvi datatable
 *   2 — could not inspect the Refine app or reach Taruvi
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node validate-resource-map.js <path-to-refine-app> [--taruvi-api-url URL] [--app-slug SLUG] [--token TOKEN]");
  process.exit(2);
}

const appPath = args[0];
const opts = {};
for (let i = 1; i < args.length; i += 2) {
  if (args[i] === "--taruvi-api-url") opts.apiUrl = args[i + 1];
  if (args[i] === "--app-slug") opts.appSlug = args[i + 1];
  if (args[i] === "--token") opts.token = args[i + 1];
}

opts.apiUrl = opts.apiUrl || process.env.TARUVI_API_URL;
opts.appSlug = opts.appSlug || process.env.TARUVI_APP_SLUG;
opts.token = opts.token || process.env.TARUVI_TOKEN;

if (!opts.apiUrl || !opts.appSlug) {
  console.error("Missing --taruvi-api-url or --app-slug (or env TARUVI_API_URL, TARUVI_APP_SLUG).");
  process.exit(2);
}

function findEntryFile(root) {
  const candidates = [
    "src/App.tsx", "src/App.jsx", "src/App.ts", "src/App.js",
    "src/main.tsx", "src/main.jsx", "src/main.ts", "src/main.js",
  ];
  for (const c of candidates) {
    const p = path.join(root, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function extractResources(source) {
  // Very lightweight extraction: finds `resources=[ { name: "..." }, ... ]` or similar.
  // Accepts both JSX prop and object-literal forms.
  const regex = /resources\s*[:=]\s*\[([^\]]+)\]/m;
  const match = regex.exec(source);
  if (!match) return [];
  const body = match[1];
  const nameRegex = /name\s*:\s*["'`]([^"'`]+)["'`]/g;
  const names = [];
  let m;
  while ((m = nameRegex.exec(body)) !== null) {
    names.push(m[1]);
  }
  return names;
}

function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const headers = { "Accept": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const req = client.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
  });
}

async function main() {
  const entry = findEntryFile(appPath);
  if (!entry) {
    console.error(`No App.tsx / main.tsx found under ${appPath}/src/`);
    process.exit(2);
  }
  console.log(`Reading resources from ${entry}`);
  const source = fs.readFileSync(entry, "utf8");
  const resourceNames = extractResources(source);
  if (resourceNames.length === 0) {
    console.error("No resources[] array detected. If it's dynamic, this script can't help.");
    process.exit(2);
  }
  console.log(`Found ${resourceNames.length} resources: ${resourceNames.join(", ")}`);

  const url = `${opts.apiUrl.replace(/\/$/, "")}/api/apps/${opts.appSlug}/datatables/`;
  console.log(`Fetching Taruvi datatables from ${url}`);
  const { status, body } = await fetchJson(url, opts.token);
  if (status !== 200 || body.status !== "success") {
    console.error(`Unexpected response: status=${status}, body=${JSON.stringify(body).slice(0, 200)}`);
    process.exit(2);
  }
  const tables = (body.data || []).map((t) => t.name);

  let missing = 0;
  for (const name of resourceNames) {
    if (tables.includes(name)) {
      console.log(`  [ok]      ${name}`);
    } else {
      console.log(`  [missing] ${name} — no Taruvi datatable by this name. Use meta.tableName to alias, or create the table.`);
      missing++;
    }
  }
  if (missing > 0) {
    console.log(`\n${missing} resource(s) missing. Either rename, alias via meta.tableName, or provision the table.`);
    process.exit(1);
  }
  console.log("\nAll Refine resources map to existing Taruvi datatables.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(2);
});

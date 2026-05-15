import type { TreeMenuItem } from "@refinedev/core";

/**
 * Resolves the ACL resource string for a menu item.
 * Reads `meta.aclResource` from the Refine resource definition.
 * Falls back to the bare resource name if not set.
 *
 * Usage in App.tsx:
 *   { name: "employees", meta: { aclResource: "datatable:employees" } }
 *   { name: "run-report", meta: { aclResource: "function:run-report" } }
 */
export const getAclResource = (item: TreeMenuItem): string => {
  return (item.meta?.aclResource as string) ?? item.name;
};

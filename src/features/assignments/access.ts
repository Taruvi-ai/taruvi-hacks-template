import type { TaruviUser } from "../../providers/refineProviders";

export const canManageAssignments = (user?: TaruviUser | null) => {
  if (!user) return false;
  if (user.is_superuser) return true;

  const roleMatches =
    user.roles?.some((role) => role.slug?.toLowerCase() === "superadmin" || role.name?.toLowerCase() === "superadmin") ?? false;

  const attributeRoles = user.attributes?.roles;
  const attributeMatches = Array.isArray(attributeRoles)
    ? attributeRoles.some((role) => String(role).toLowerCase() === "superadmin")
    : String(attributeRoles ?? "").toLowerCase() === "superadmin";

  return roleMatches || attributeMatches;
};

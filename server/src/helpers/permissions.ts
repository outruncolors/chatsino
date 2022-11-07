import { ClientPermissionLevel } from "repositories";

export const PERMISSION_RANKING: ClientPermissionLevel[] = [
  "visitor",
  "user",
  "admin:limited",
  "admin:unlimited",
];

export function meetsPermissionRequirement(
  requirement: ClientPermissionLevel,
  level: ClientPermissionLevel
) {
  return derivePermissions(level).includes(requirement);
}

export function derivePermissions(level: ClientPermissionLevel) {
  const permissionIndex = PERMISSION_RANKING.indexOf(level);
  const permissions = PERMISSION_RANKING.slice(0, permissionIndex + 1);

  return permissions;
}

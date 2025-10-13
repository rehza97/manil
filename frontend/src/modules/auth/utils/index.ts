/**
 * Auth Utilities
 *
 * Helper functions specific to authentication
 *
 * @module modules/auth/utils
 */

/**
 * Check if user has specific role
 */
export const hasRole = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};

/**
 * Check if user has permission
 */
export const hasPermission = (
  userRole: string,
  permission: string
): boolean => {
  // Permission mapping based on roles
  const rolePermissions: Record<string, string[]> = {
    admin: ["*"], // All permissions
    corporate: [
      "customer:read",
      "customer:write",
      "ticket:read",
      "ticket:write",
      "product:read",
    ],
    client: ["customer:read", "ticket:read"],
  };

  const permissions = rolePermissions[userRole] || [];
  return permissions.includes("*") || permissions.includes(permission);
};

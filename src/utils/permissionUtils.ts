import { User, IUser } from '../models/User.js';
import { Role, IRole } from '../models/Role.js';
import { UserHasRole } from '../models/UserHasRole.js';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '../config/permissions.js';

export interface UserEffectivePermissions {
  effectivePermissions: string[];
  inheritedPermissions: string[];
  directAllows: string[];
  directDenials: string[];
  roles: Array<{ id: string; name: string; slug: string; permissions: string[] }>;
}

/**
 * Centrally calculates the authoritative effective permissions for a user.
 * Rule:
 * 1. Base / Role grants: Combine permissions from all active assigned roles (via UserHasRole)
 *    and fallback static role definitions.
 * 2. Direct user overrides:
 *    - effect === 'allow': adds permission to user's capabilities.
 *    - effect === 'deny': strictly removes permission, overriding role grants!
 * 3. Super Admin wildcard: user with SUPER_ADMIN role or super-admin slug gets full access.
 */
export async function calculateUserEffectivePermissions(
  user: IUser | string
): Promise<UserEffectivePermissions> {
  const dbUser = typeof user === 'string' ? await User.findById(user) : user;
  if (!dbUser) {
    return {
      effectivePermissions: [],
      inheritedPermissions: [],
      directAllows: [],
      directDenials: [],
      roles: [],
    };
  }

  // 1. Fetch assigned dynamic roles from UserHasRole junction
  const userRoleRecords = await UserHasRole.find({ userId: dbUser._id });
  const roleIds = userRoleRecords.map((ur) => ur.roleId);
  const dynamicRoles = await Role.find({ _id: { $in: roleIds }, isActive: true });

  // 2. Also check if the primary role string has a corresponding Role in DB (e.g. if not yet in UserHasRole)
  if (dbUser.role) {
    const slugCandidate = dbUser.role.toLowerCase().replace(/_/g, '-');
    const matchedRole = await Role.findOne({
      $or: [
        { slug: slugCandidate },
        { slug: dbUser.role.toLowerCase() },
        { name: new RegExp(`^${dbUser.role.replace(/_/g, ' ')}$`, 'i') },
      ],
      isActive: true,
    });
    if (matchedRole && !dynamicRoles.some((r) => String(r._id) === String(matchedRole._id))) {
      dynamicRoles.push(matchedRole);
    }
  }

  // 3. Gather permissions from all assigned roles
  const permissionsSet = new Set<string>();

  // From dynamic DB roles
  dynamicRoles.forEach((role) => {
    if (Array.isArray(role.permissions)) {
      role.permissions.forEach((p) => permissionsSet.add(p));
    }
  });

  // From static fallback role matrix
  if (dbUser.role) {
    const staticKey = dbUser.role.toUpperCase().replace(/-/g, '_') as keyof typeof ROLE_PERMISSIONS;
    const staticPerms = ROLE_PERMISSIONS[staticKey] || [];
    staticPerms.forEach((p) => permissionsSet.add(p));
  }

  // From direct user permissions if assigned
  if (Array.isArray(dbUser.permissions)) {
    dbUser.permissions.forEach((p) => {
      if (typeof p === 'string' && p.trim()) {
        permissionsSet.add(p.trim());
      }
    });
  }

  if (Array.isArray(dbUser.directPermissions)) {
    dbUser.directPermissions.forEach((dp: any) => {
      const permKey = typeof dp === 'string' ? dp : dp?.permission;
      if (permKey && (!dp?.effect || dp?.effect === 'allow')) {
        permissionsSet.add(permKey.trim());
      }
    });
  }

  // Super Admin handling
  const isSuperAdmin =
    dbUser.role === 'SUPER_ADMIN' ||
    dynamicRoles.some((r) => r.slug === 'super-admin' || r.name.toLowerCase() === 'super admin');

  if (isSuperAdmin) {
    permissionsSet.add('*');
    ALL_PERMISSIONS.forEach((p) => permissionsSet.add(p));
  }

  const unifiedPermissions = Array.from(permissionsSet);

  return {
    effectivePermissions: unifiedPermissions,
    inheritedPermissions: unifiedPermissions,
    directAllows: [],
    directDenials: [],
    roles: dynamicRoles.map((r) => ({
      id: String(r._id),
      name: r.name,
      slug: r.slug,
      permissions: r.permissions || [],
    })),
  };
}

/**
 * Checks whether an effective permission set satisfies a required permission.
 * Supports exact match, wildcard '*', and module wildcards like 'orders.*'.
 */
export function checkPermissionSatisfied(
  effectivePermissions: string[],
  requiredPermission: string
): boolean {
  if (effectivePermissions.includes('*')) return true;
  if (effectivePermissions.includes(requiredPermission)) return true;

  // Check wildcard prefix (e.g. 'orders.*' satisfies 'orders.create')
  const parts = requiredPermission.split('.');
  if (parts.length > 1) {
    const modulePrefix = `${parts[0]}.*`;
    if (effectivePermissions.includes(modulePrefix)) return true;
  }

  return false;
}

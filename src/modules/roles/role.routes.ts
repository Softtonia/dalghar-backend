import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { RoleController } from './role.controller.js';

const router = Router();

// Get list of available system permissions
router.get(
  '/permissions',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  RoleController.getPermissions
);

// List all roles (with user counts)
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  RoleController.list
);

// Get single role by ID
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  RoleController.getById
);

// Create new role
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_CREATE),
  RoleController.create
);

// Update role
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_UPDATE),
  RoleController.update
);
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_UPDATE),
  RoleController.update
);

// Update role permissions specifically
router.put(
  '/:id/permissions',
  authenticate,
  requirePermission(PERMISSIONS.ROLES_ASSIGN_PERMISSIONS),
  RoleController.updatePermissions
);

// Delete role
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_DELETE),
  RoleController.delete
);

// List users assigned to a role
router.get(
  '/:id/users',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  RoleController.getUsersByRole
);

// Assign role to user (user_has_role)
router.post(
  '/assign',
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  RoleController.assignRole
);

// Get roles assigned to a user
router.get(
  '/user/:userId',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  RoleController.getUserRoles
);

// Remove role from user
router.delete(
  '/user/:userId/role/:roleId',
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  RoleController.removeRole
);

export const roleRoutes = router;

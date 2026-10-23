import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { UserController } from './user.controller.js';

const router = Router();

// List users
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.STAFF_VIEW),
  UserController.list
);

// Get single user by ID
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.STAFF_VIEW),
  UserController.getById
);

// Create new user (Assign restaurant, branch, role, and send email)
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  UserController.create
);

// Update user details, roles, or tenant assignment
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  UserController.update
);
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  UserController.update
);

// Delete user
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  UserController.delete
);

// User Roles Management
router.get(
  '/:id/roles',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  UserController.getUserRoles
);

router.put(
  '/:id/roles',
  authenticate,
  requirePermission(PERMISSIONS.USERS_ASSIGN_ROLES),
  UserController.updateUserRoles
);

// User Permissions Overrides Management
router.get(
  '/:id/permissions',
  authenticate,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  UserController.getUserPermissions
);

router.put(
  '/:id/permissions',
  authenticate,
  requirePermission(PERMISSIONS.ROLES_ASSIGN_PERMISSIONS),
  UserController.updateUserPermissions
);

export const userRoutes = router;

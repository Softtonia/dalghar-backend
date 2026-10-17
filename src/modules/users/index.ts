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

export const userRoutes = router;

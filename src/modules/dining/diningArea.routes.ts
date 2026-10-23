import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { DiningController } from './dining.controller.js';

const router = Router();

// A. Dining areas
// POST   /dining-areas              Create an area
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  DiningController.createArea
);

// GET    /dining-areas              List areas with pagination and filters
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.listAreas
);

// GET    /dining-areas/:id/tables   List tables in an area
router.get(
  '/:id/tables',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.getAreaTables
);

// GET    /dining-areas/:id/occupancy Get occupancy summary for an area
router.get(
  '/:id/occupancy',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.getAreaOccupancy
);

// GET    /dining-areas/:id          Get area details
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.getAreaById
);

// PATCH  /dining-areas/:id          Update area details
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  DiningController.updateArea
);
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  DiningController.updateArea
);

// DELETE /dining-areas/:id          Deactivate or delete an unused area
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  DiningController.deleteArea
);

export const diningAreaRoutes = router;

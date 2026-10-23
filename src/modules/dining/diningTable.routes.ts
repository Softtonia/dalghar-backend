import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { DiningController } from './dining.controller.js';
import { QrMenuController } from './qrMenu.controller.js';

const router = Router();

// B. Dining tables
// POST   /dining-tables                   Create a table
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  DiningController.createTable
);

// GET    /dining-tables                   List/filter tables
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.listTables
);

// Specific sub-resource routes must come before /:id to avoid param shadowing
// QR Code Management:
// GET   /dining-tables/:tableId/qr-code
router.get(
  '/:tableId/qr-code',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  QrMenuController.getTableQr
);

// POST  /dining-tables/:tableId/qr-code
router.post(
  '/:tableId/qr-code',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  QrMenuController.getTableQr
);

// POST  /dining-tables/:tableId/qr-code/regenerate
router.post(
  '/:tableId/qr-code/regenerate',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  QrMenuController.regenerateTableQr
);
// PATCH  /dining-tables/:id/status         Change operational status
router.patch(
  '/:id/status',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.changeTableStatus
);

// GET    /dining-tables/:id/status-history View status history
router.get(
  '/:id/status-history',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.getStatusHistory
);

// GET    /dining-tables/:id/sessions       List occupancy sessions
router.get(
  '/:id/sessions',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.getTableSessions
);

// GET    /dining-tables/:id/orders         List current and historical assigned orders
router.get(
  '/:id/orders',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.getTableOrders
);

// GET    /dining-tables/:id/availability   Check availability for a time window
router.get(
  '/:id/availability',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.checkAvailability
);

// GET    /dining-tables/:id                Get table details
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_VIEW),
  DiningController.getTableById
);

// PATCH  /dining-tables/:id                Update table configuration
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  DiningController.updateTable
);
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  DiningController.updateTable
);

// DELETE /dining-tables/:id                Deactivate an unused table
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TABLE_MANAGE),
  DiningController.deleteTable
);

export const diningTableRoutes = router;

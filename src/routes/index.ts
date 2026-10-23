import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { userRoutes } from '../modules/users/index.js';
import { restaurantRoutes } from '../modules/restaurants/index.js';
import { branchRoutes } from '../modules/branches/index.js';
import { settingsRoutes } from '../modules/settings/index.js';
import { roleRoutes } from '../modules/roles/index.js';
import { emailTemplateRoutes } from '../modules/email-templates/email-template.routes.js';
import { campaignRoutes } from '../modules/campaigns/campaign.routes.js';
import { menuRoutes } from '../modules/menu/index.js';
import { uploadRoutes } from '../modules/upload/upload.routes.js';
import { posRoutes } from '../modules/pos/pos.routes.js';
import { diningAreaRoutes, diningTableRoutes } from '../modules/dining/index.js';
import { reservationRoutes, waitingListRoutes } from '../modules/reservations/index.js';
import { QrMenuController } from '../modules/dining/qrMenu.controller.js';

import { RoleController } from '../modules/roles/role.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin/users', userRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/branches', branchRoutes);
router.use('/settings', settingsRoutes);
router.use('/roles', roleRoutes);
router.use('/admin/roles', roleRoutes);
router.get('/permissions', authenticate, requirePermission(PERMISSIONS.ROLE_VIEW), RoleController.getPermissions);
router.get('/admin/permissions', authenticate, requirePermission(PERMISSIONS.ROLE_VIEW), RoleController.getPermissions);
router.use('/email-templates', emailTemplateRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/menu', menuRoutes);
router.use('/admin', menuRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin/upload', uploadRoutes);
router.use('/pos', posRoutes);
router.use('/admin/pos', posRoutes);
router.use('/dining-areas', diningAreaRoutes);
router.use('/admin/dining-areas', diningAreaRoutes);
router.use('/dining-tables', diningTableRoutes);
router.use('/admin/dining-tables', diningTableRoutes);
router.use('/table-reservations', reservationRoutes);
router.use('/admin/table-reservations', reservationRoutes);
router.use('/waiting-list', waitingListRoutes);
router.use('/admin/waiting-list', waitingListRoutes);

// Public Digital QR Menu routes
router.get('/public/qr-menu/:token', QrMenuController.getPublicTableDetails);
router.get('/public/qr-menu/:token/menu', QrMenuController.getPublicDigitalMenu);
router.post('/public/qr-menu/:token/orders', QrMenuController.submitPublicOrder);
router.get('/public/qr-orders/:orderId/status', QrMenuController.getPublicOrderStatus);

// Admin table QR alias routes matching Phase 7 specs
router.get('/admin/tables/:tableId/qr-code', authenticate, requirePermission(PERMISSIONS.TABLE_VIEW), QrMenuController.getTableQr);
router.post('/admin/tables/:tableId/qr-code', authenticate, requirePermission(PERMISSIONS.TABLE_MANAGE), QrMenuController.getTableQr);
router.post('/admin/tables/:tableId/qr-code/regenerate', authenticate, requirePermission(PERMISSIONS.TABLE_MANAGE), QrMenuController.regenerateTableQr);

export const apiRouter = router;



import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { SettingsController } from './settings.controller.js';

const router = Router();

// Retrieve settings (Enforces settings.view)
router.get('/', authenticate, requirePermission(PERMISSIONS.SETTINGS_VIEW), SettingsController.get);

// Update settings (Enforces settings.manage or settings.view)
router.put('/', authenticate, requirePermission(PERMISSIONS.SETTINGS_VIEW), SettingsController.update);
router.patch('/', authenticate, requirePermission(PERMISSIONS.SETTINGS_VIEW), SettingsController.update);

// Reset settings to defaults
router.delete('/reset', authenticate, requirePermission(PERMISSIONS.SETTINGS_VIEW), SettingsController.reset);

// Change admin password
router.post('/change-password', authenticate, SettingsController.changePassword);

export const settingsRoutes = router;

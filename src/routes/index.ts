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
router.use('/restaurants', restaurantRoutes);
router.use('/branches', branchRoutes);
router.use('/settings', settingsRoutes);
router.use('/roles', roleRoutes);
router.use('/email-templates', emailTemplateRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/menu', menuRoutes);
router.use('/admin', menuRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin/upload', uploadRoutes);
router.use('/pos', posRoutes);
router.use('/admin/pos', posRoutes);

export const apiRouter = router;


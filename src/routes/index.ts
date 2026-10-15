import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { userRoutes } from '../modules/users/index.js';
import { restaurantRoutes } from '../modules/restaurants/index.js';
import { branchRoutes } from '../modules/branches/index.js';
import { settingsRoutes } from '../modules/settings/index.js';

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

export const apiRouter = router;

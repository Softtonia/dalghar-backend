import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { RestaurantController } from './restaurant.controller.js';

const router = Router();

// List restaurants (Enforces restaurant.view permission)
router.get('/', authenticate, requirePermission(PERMISSIONS.RESTAURANT_VIEW), RestaurantController.list);

// Summary statistics for KPI cards (Enforces restaurant.view permission)
router.get('/summary/stats', authenticate, requirePermission(PERMISSIONS.RESTAURANT_VIEW), RestaurantController.getStats);

// Get restaurant details by ID (Enforces restaurant.view permission)
router.get('/:id', authenticate, requirePermission(PERMISSIONS.RESTAURANT_VIEW), RestaurantController.getById);

// Create restaurant (Enforces restaurant.create permission; Super Admin primary)
router.post('/', authenticate, requirePermission(PERMISSIONS.RESTAURANT_CREATE), RestaurantController.create);

// Update restaurant configuration (Enforces restaurant.update permission - supports both PATCH and PUT)
router.patch('/:id', authenticate, requirePermission(PERMISSIONS.RESTAURANT_UPDATE), RestaurantController.update);
router.put('/:id', authenticate, requirePermission(PERMISSIONS.RESTAURANT_UPDATE), RestaurantController.update);

// Update operating status (Enforces restaurant.update permission)
router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.RESTAURANT_UPDATE), RestaurantController.updateStatus);

// Delete restaurant (Enforces restaurant.delete permission)
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.RESTAURANT_DELETE), RestaurantController.delete);

export const restaurantRoutes = router;

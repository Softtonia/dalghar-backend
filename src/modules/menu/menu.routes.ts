import { Router } from 'express';
import { MenuAdminController } from './menu.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';

const router = Router();

router.use(authenticate);

// ==========================================
// 1. Master Menus (/menus)
// ==========================================
router.post(
  '/menus',
  requirePermission(PERMISSIONS.MENU_CREATE),
  MenuAdminController.createMenu
);

router.get(
  '/menus/summary',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.getMenuSummary
);

router.get(
  '/menus',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.listMenus
);

router.patch(
  '/menus/reorder',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.reorderMenus
);

router.post(
  '/menus/:menuId/duplicate',
  requirePermission(PERMISSIONS.MENU_CREATE),
  MenuAdminController.duplicateMenu
);

router.patch(
  '/menus/:menuId/publish',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.publishMenu
);

router.patch(
  '/menus/:menuId/unpublish',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.unpublishMenu
);

router.patch(
  '/menus/:menuId/status',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.updateMenuStatus
);

router.patch(
  '/menus/:menuId/sort-order',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.updateSortOrder
);

router.get(
  '/menus/:menuId',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.getMenuById
);

router.patch(
  '/menus/:menuId',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.updateMenu
);

router.delete(
  '/menus/:menuId',
  requirePermission(PERMISSIONS.MENU_DELETE),
  MenuAdminController.deleteMenu
);

router.patch(
  '/menus/:menuId/categories/reorder',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.reorderCategories
);

router.patch(
  '/menus/:menuId/items/reorder',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.reorderMenuItems
);

// ==========================================
// 2. Menu Restaurant Assignments
// ==========================================
router.get(
  '/menus/:menuId/restaurants',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.listAssignedRestaurants
);

router.post(
  '/menus/:menuId/restaurants',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.assignMenuToRestaurant
);

router.delete(
  '/menus/:menuId/restaurants/:restaurantId',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.removeRestaurantAssignment
);

router.patch(
  '/menus/:menuId/restaurants/:restaurantId/status',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.updateRestaurantAssignmentStatus
);

// ==========================================
// 3. Menu Branch Assignments
// ==========================================
router.get(
  '/menus/:menuId/branches',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.listAssignedBranches
);

router.post(
  '/menus/:menuId/branches',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.assignMenuToBranch
);

router.post(
  '/menus/:menuId/branches/bulk',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.bulkAssignMenuToBranches
);

router.delete(
  '/menus/:menuId/branches/:branchId',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.removeBranchAssignment
);

// ==========================================
// 4. Menu Categories (/menu-categories)
// ==========================================
router.post(
  '/menu-categories',
  requirePermission(PERMISSIONS.MENU_CREATE),
  MenuAdminController.createMenuCategory
);

router.get(
  '/menu-categories',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.listMenuCategories
);

router.get(
  '/menu-categories/:categoryId',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.getMenuCategoryById
);

router.patch(
  '/menu-categories/:categoryId',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.updateMenuCategory
);

router.delete(
  '/menu-categories/:categoryId',
  requirePermission(PERMISSIONS.MENU_DELETE),
  MenuAdminController.deleteMenuCategory
);

// ==========================================
// 5. Menu Items (/menu-items)
// ==========================================
router.post(
  '/menu-items',
  requirePermission(PERMISSIONS.MENU_CREATE),
  MenuAdminController.createMenuItem
);

router.get(
  '/menu-items',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.listMenuItems
);

router.get(
  '/menu-items/:itemId',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.getMenuItemById
);

router.patch(
  '/menu-items/:itemId',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.updateMenuItem
);

router.patch(
  '/menu-items/:itemId/availability',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.updateMenuItemAvailability
);

router.delete(
  '/menu-items/:itemId',
  requirePermission(PERMISSIONS.MENU_DELETE),
  MenuAdminController.deleteMenuItem
);

// ==========================================
// 6. Addon Groups (Table 17 — Customization Groups)
// ==========================================
router.post(
  '/addon-groups',
  requirePermission(PERMISSIONS.MENU_CREATE),
  MenuAdminController.createAddonGroup
);

router.get(
  '/addon-groups',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.listAddonGroups
);

router.get(
  '/addon-groups/:groupId',
  requirePermission(PERMISSIONS.MENU_VIEW),
  MenuAdminController.getAddonGroupById
);

router.patch(
  '/addon-groups/:groupId',
  requirePermission(PERMISSIONS.MENU_UPDATE),
  MenuAdminController.updateAddonGroup
);

router.delete(
  '/addon-groups/:groupId',
  requirePermission(PERMISSIONS.MENU_DELETE),
  MenuAdminController.deleteAddonGroup
);

// Backward compatible endpoints (for /api/menu and /api/menu/:id)
router.get('/', requirePermission(PERMISSIONS.MENU_VIEW), MenuAdminController.listMenuItems);
router.post('/', requirePermission(PERMISSIONS.MENU_CREATE), MenuAdminController.createMenuItem);
router.patch('/:id', requirePermission(PERMISSIONS.MENU_UPDATE), MenuAdminController.updateMenuItem);
router.delete('/:id', requirePermission(PERMISSIONS.MENU_DELETE), MenuAdminController.deleteMenuItem);
router.patch('/:id/availability', requirePermission(PERMISSIONS.MENU_UPDATE), MenuAdminController.toggleAvailability);

export const menuRoutes = router;
export const menuAdminRoutes = router;


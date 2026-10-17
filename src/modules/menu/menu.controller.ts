import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { MenuAdminService } from './menu.service.js';
import {
  createMenuSchema,
  updateMenuSchema,
  listMenuQuerySchema,
  duplicateMenuSchema,
  updateMenuStatusSchema,
  updateSortOrderSchema,
  reorderMenusSchema,
  assignMenuRestaurantSchema,
  updateRestaurantAssignmentStatusSchema,
  assignMenuBranchSchema,
  bulkAssignMenuBranchesSchema,
  createMenuCategorySchema,
  updateMenuCategorySchema,
  listMenuCategoryQuerySchema,
  createMenuItemAdminSchema,
  updateMenuItemAdminSchema,
  listMenuItemAdminQuerySchema,
  createAddonGroupSchema,
  updateAddonGroupSchema,
  listAddonGroupQuerySchema,
} from './menu.validation.js';
import { ApiError } from '../../utils/ApiError.js';

export class MenuAdminController {
  // ==========================================
  // MENUS
  // ==========================================
  static createMenu = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const body = createMenuSchema.parse(req.body);
      const menu = await MenuAdminService.createMenu(body, req.user);
      res.status(201).json({ success: true, data: menu, message: 'Menu created successfully' });
    } catch (err) {
      next(err);
    }
  };

  static listMenus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const query = listMenuQuerySchema.parse(req.query);
      const result = await MenuAdminService.listMenus(query);
      res.status(200).json({ success: true, data: result.menus, pagination: result.pagination, message: 'Menus retrieved' });
    } catch (err) {
      next(err);
    }
  };

  static getMenuById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const menu = await MenuAdminService.getMenuById(menuId);
      res.status(200).json({ success: true, data: menu, message: 'Menu retrieved' });
    } catch (err) {
      next(err);
    }
  };

  static updateMenu = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const body = updateMenuSchema.parse(req.body);
      const menu = await MenuAdminService.updateMenu(menuId, body, req.user);
      res.status(200).json({ success: true, data: menu, message: 'Menu updated' });
    } catch (err) {
      next(err);
    }
  };

  static duplicateMenu = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const body = duplicateMenuSchema.parse(req.body);
      const duplicate = await MenuAdminService.duplicateMenu(menuId, body, req.user);
      res.status(201).json({
        success: true,
        data: duplicate,
        message: 'Menu duplicated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  static publishMenu = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const menu = await MenuAdminService.publishMenu(menuId, req.user);
      res.status(200).json({ success: true, data: menu, message: 'Menu published successfully' });
    } catch (err) {
      next(err);
    }
  };

  static unpublishMenu = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const menu = await MenuAdminService.unpublishMenu(menuId, req.user);
      res.status(200).json({ success: true, data: menu, message: 'Menu unpublished successfully' });
    } catch (err) {
      next(err);
    }
  };

  static updateMenuStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const { status } = updateMenuStatusSchema.parse(req.body);
      const menu = await MenuAdminService.updateMenuStatus(menuId, status, req.user);
      res.status(200).json({ success: true, data: menu, message: `Menu status updated to ${status}` });
    } catch (err) {
      next(err);
    }
  };

  static updateSortOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const { sortOrder } = updateSortOrderSchema.parse(req.body);
      const menu = await MenuAdminService.updateSortOrder(menuId, sortOrder, req.user);
      res.status(200).json({ success: true, data: menu, message: 'Menu sort order updated' });
    } catch (err) {
      next(err);
    }
  };

  static reorderMenus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const { items } = reorderMenusSchema.parse(req.body);
      await MenuAdminService.reorderMenus(items, req.user);
      res.status(200).json({ success: true, message: 'Menus reordered successfully' });
    } catch (err) {
      next(err);
    }
  };

  static deleteMenu = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      await MenuAdminService.deleteMenu(menuId);
      res.status(200).json({ success: true, message: 'Menu deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // MENU RESTAURANT ASSIGNMENTS
  // ==========================================
  static listAssignedRestaurants = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const assignments = await MenuAdminService.listAssignedRestaurants(menuId);
      res.status(200).json({ success: true, data: assignments, message: 'Assigned restaurants retrieved' });
    } catch (err) {
      next(err);
    }
  };

  static assignMenuToRestaurant = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const body = assignMenuRestaurantSchema.parse(req.body);
      const assignment = await MenuAdminService.assignMenuToRestaurant(menuId, body, req.user);
      res.status(201).json({ success: true, data: assignment, message: 'Menu assigned to restaurant' });
    } catch (err) {
      next(err);
    }
  };

  static removeRestaurantAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const restaurantId = Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId;
      await MenuAdminService.removeRestaurantAssignment(menuId, restaurantId);
      res.status(200).json({ success: true, message: 'Restaurant assignment removed' });
    } catch (err) {
      next(err);
    }
  };

  static updateRestaurantAssignmentStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const restaurantId = Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId;
      const body = updateRestaurantAssignmentStatusSchema.parse(req.body);
      const assignment = await MenuAdminService.updateRestaurantAssignmentStatus(menuId, restaurantId, body.status);
      res.status(200).json({ success: true, data: assignment, message: 'Restaurant assignment status updated' });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // MENU BRANCH ASSIGNMENTS
  // ==========================================
  static listAssignedBranches = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const assignments = await MenuAdminService.listAssignedBranches(menuId);
      res.status(200).json({ success: true, data: assignments, message: 'Assigned branches retrieved' });
    } catch (err) {
      next(err);
    }
  };

  static assignMenuToBranch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const body = assignMenuBranchSchema.parse(req.body);
      const assignment = await MenuAdminService.assignMenuToBranch(menuId, body, req.user);
      res.status(201).json({ success: true, data: assignment, message: 'Menu assigned to branch' });
    } catch (err) {
      next(err);
    }
  };

  static bulkAssignMenuToBranches = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const body = bulkAssignMenuBranchesSchema.parse(req.body);
      const assignments = await MenuAdminService.bulkAssignMenuToBranches(menuId, body, req.user);
      res.status(200).json({ success: true, data: assignments, message: 'Menu assigned to branches in bulk' });
    } catch (err) {
      next(err);
    }
  };

  static removeBranchAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const branchId = Array.isArray(req.params.branchId) ? req.params.branchId[0] : req.params.branchId;
      await MenuAdminService.removeBranchAssignment(menuId, branchId);
      res.status(200).json({ success: true, message: 'Branch assignment removed' });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // MENU CATEGORIES
  // ==========================================
  static createMenuCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const body = createMenuCategorySchema.parse(req.body);
      const category = await MenuAdminService.createMenuCategory(body, req.user);
      res.status(201).json({ success: true, data: category, message: 'Category created' });
    } catch (err) {
      next(err);
    }
  };

  static listMenuCategories = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const query = listMenuCategoryQuerySchema.parse(req.query);
      const result = await MenuAdminService.listMenuCategories(query);
      res.status(200).json({ success: true, data: result.categories, pagination: result.pagination, message: 'Categories retrieved' });
    } catch (err) {
      next(err);
    }
  };

  static getMenuCategoryById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const categoryId = Array.isArray(req.params.categoryId) ? req.params.categoryId[0] : req.params.categoryId;
      const category = await MenuAdminService.getMenuCategoryById(categoryId);
      res.status(200).json({ success: true, data: category, message: 'Category retrieved' });
    } catch (err) {
      next(err);
    }
  };

  static updateMenuCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const categoryId = Array.isArray(req.params.categoryId) ? req.params.categoryId[0] : req.params.categoryId;
      const body = updateMenuCategorySchema.parse(req.body);
      const category = await MenuAdminService.updateMenuCategory(categoryId, body, req.user);
      res.status(200).json({ success: true, data: category, message: 'Category updated' });
    } catch (err) {
      next(err);
    }
  };

  static deleteMenuCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const categoryId = Array.isArray(req.params.categoryId) ? req.params.categoryId[0] : req.params.categoryId;
      await MenuAdminService.deleteMenuCategory(categoryId);
      res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // MENU ITEMS
  // ==========================================
  static createMenuItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const body = createMenuItemAdminSchema.parse(req.body);
      const item = await MenuAdminService.createMenuItem(body, req.user);
      res.status(201).json({ success: true, data: item, message: 'Menu item created' });
    } catch (err) {
      next(err);
    }
  };

  static listMenuItems = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const query = listMenuItemAdminQuerySchema.parse(req.query);
      const result = await MenuAdminService.listMenuItems(query);
      res.status(200).json({
        success: true,
        data: result.items,
        categories: result.categories,
        pagination: result.pagination,
        message: 'Menu items retrieved',
      });
    } catch (err) {
      next(err);
    }
  };

  static getMenuItemById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
      const item = await MenuAdminService.getMenuItemById(itemId);
      res.status(200).json({ success: true, data: item, message: 'Menu item retrieved' });
    } catch (err) {
      next(err);
    }
  };

  static updateMenuItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
      const body = updateMenuItemAdminSchema.parse(req.body);
      const item = await MenuAdminService.updateMenuItem(itemId, body, req.user);
      res.status(200).json({ success: true, data: item, message: 'Menu item updated' });
    } catch (err) {
      next(err);
    }
  };

  static deleteMenuItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
      await MenuAdminService.deleteMenuItem(itemId);
      res.status(200).json({ success: true, message: 'Menu item archived successfully' });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // ADDITIONAL APIS
  // ==========================================
  static getMenuSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const summary = await MenuAdminService.getMenuSummary();
      res.status(200).json({ success: true, data: summary, message: 'Menu summary retrieved' });
    } catch (err) {
      next(err);
    }
  };

  static updateMenuItemAvailability = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
      const { isAvailable } = req.body;
      const item = await MenuAdminService.toggleAvailability(itemId, Boolean(isAvailable));
      res.status(200).json({
        success: true,
        message: 'Item availability updated successfully',
        data: { _id: item._id, isAvailable: item.isAvailable },
      });
    } catch (err) {
      next(err);
    }
  };

  static reorderCategories = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const { items } = req.body;
      await MenuAdminService.reorderCategories(menuId, items || []);
      res.status(200).json({ success: true, message: 'Category order updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  static reorderMenuItems = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
      const { items } = req.body;
      await MenuAdminService.reorderMenuItems(menuId, items || []);
      res.status(200).json({ success: true, message: 'Menu item order updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // ADDON GROUPS (Table 17)
  // ==========================================
  static createAddonGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const body = createAddonGroupSchema.parse(req.body);
      const group = await MenuAdminService.createAddonGroup(body, req.user);
      res.status(201).json({ success: true, data: group, message: 'Addon group created successfully' });
    } catch (err) {
      next(err);
    }
  };

  static listAddonGroups = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const query = listAddonGroupQuerySchema.parse(req.query);
      const result = await MenuAdminService.listAddonGroups(query);
      res.status(200).json({
        success: true,
        data: result.addonGroups,
        pagination: result.pagination,
        message: 'Addon groups retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  static getAddonGroupById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;
      const group = await MenuAdminService.getAddonGroupById(groupId);
      res.status(200).json({ success: true, data: group, message: 'Addon group retrieved successfully' });
    } catch (err) {
      next(err);
    }
  };

  static updateAddonGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;
      const body = updateAddonGroupSchema.parse(req.body);
      const group = await MenuAdminService.updateAddonGroup(groupId, body, req.user);
      res.status(200).json({ success: true, data: group, message: 'Addon group updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  static deleteAddonGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;
      await MenuAdminService.deleteAddonGroup(groupId, req.user);
      res.status(200).json({ success: true, message: 'Addon group deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  // Backward compatible methods
  static list = MenuAdminController.listMenuItems;
  static create = MenuAdminController.createMenuItem;
  static update = MenuAdminController.updateMenuItem;
  static delete = MenuAdminController.deleteMenuItem;
  static toggleAvailability = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { isAvailable } = req.body;
      const item = await MenuAdminService.toggleAvailability(id, Boolean(isAvailable));
      res.status(200).json({ success: true, data: item, message: 'Availability updated' });
    } catch (err) {
      next(err);
    }
  };
}

export const MenuController = MenuAdminController;


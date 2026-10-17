import { Types } from 'mongoose';
import { Menu, IMenu } from '../../models/Menu.js';
import { MenuRestaurantAssignment, IMenuRestaurantAssignment } from '../../models/MenuRestaurantAssignment.js';
import { MenuBranchAssignment, IMenuBranchAssignment } from '../../models/MenuBranchAssignment.js';
import { MenuCategory, IMenuCategory } from '../../models/MenuCategory.js';
import { MenuItem, IMenuItem } from '../../models/MenuItem.js';
import { AddonGroup, IAddonGroup } from '../../models/AddonGroup.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Branch } from '../../models/Branch.js';
import { ApiError } from '../../utils/ApiError.js';
import type { AuthJwtPayload } from '../../middleware/auth.middleware.js';

export class MenuAdminService {
  // ==========================================
  // MENUS CRUD
  // ==========================================
  static async createMenu(input: any, user: AuthJwtPayload): Promise<IMenu> {
    const menu = new Menu({
      ...input,
      createdBy: new Types.ObjectId(user.userId),
      updatedBy: new Types.ObjectId(user.userId),
    });
    await menu.save();
    return menu;
  }

  static async listMenus(query: any): Promise<{ menus: any[]; pagination: any }> {
    const { page = 1, limit = 50, search, status, restaurantId, branchId, mealPeriod, date, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: Record<string, any> = {};

    if (status) {
      if (status === 'ACTIVE' || status === 'active') {
        filter.status = { $in: ['active', 'ACTIVE'] };
      } else if (status === 'INACTIVE' || status === 'inactive') {
        filter.status = { $in: ['inactive', 'INACTIVE'] };
      } else {
        filter.status = status;
      }
    }
    if (mealPeriod) {
      filter.mealPeriod = mealPeriod;
    }
    if (date) {
      // Filter menus where date falls between startDate and endDate (if configured)
      filter.$or = [
        { startDate: null, endDate: null },
        {
          startDate: { $lte: date },
          endDate: { $gte: date },
        },
      ];
    }
    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { code: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } },
      ];
    }

    if (restaurantId && Types.ObjectId.isValid(restaurantId)) {
      const assignedMenuIds = await MenuRestaurantAssignment.distinct('menuId', {
        restaurantId: new Types.ObjectId(restaurantId),
      });
      filter._id = { $in: assignedMenuIds };
    }

    if (branchId && Types.ObjectId.isValid(branchId)) {
      const branchAssignedMenuIds = await MenuBranchAssignment.distinct('menuId', {
        branchId: new Types.ObjectId(branchId),
      });
      if (filter._id) {
        filter._id = { $in: assignedMenuIdsIntersect(filter._id.$in, branchAssignedMenuIds) };
      } else {
        filter._id = { $in: branchAssignedMenuIds };
      }
    }

    function assignedMenuIdsIntersect(arr1: any[], arr2: any[]) {
      const s = new Set(arr2.map((id) => id.toString()));
      return arr1.filter((id) => s.has(id.toString()));
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [rawMenus, total] = await Promise.all([
      Menu.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Menu.countDocuments(filter),
    ]);

    // Populate restaurant assignment, branch assignment, categories count, items count for each menu
    const menuIds = rawMenus.map((m) => m._id);
    const [assignments, branchAssignments, catCounts, itemCounts] = await Promise.all([
      MenuRestaurantAssignment.find({ menuId: { $in: menuIds } })
        .populate('restaurantId', 'name code slug address')
        .lean(),
      MenuBranchAssignment.find({ menuId: { $in: menuIds } })
        .populate('branchId', 'name code slug address restaurantId')
        .lean(),
      MenuCategory.aggregate([
        { $match: { menuId: { $in: menuIds } } },
        { $group: { _id: '$menuId', count: { $sum: 1 } } },
      ]),
      MenuItem.aggregate([
        { $match: { menuId: { $in: menuIds } } },
        { $group: { _id: '$menuId', count: { $sum: 1 } } },
      ]),
    ]);

    const assignmentMap: Record<string, any[]> = {};
    assignments.forEach((a) => {
      const mId = a.menuId.toString();
      if (!assignmentMap[mId]) assignmentMap[mId] = [];
      if (a.restaurantId) assignmentMap[mId].push(a.restaurantId);
    });

    const branchCountMap: Record<string, number> = {};
    branchAssignments.forEach((b) => {
      const mId = b.menuId.toString();
      branchCountMap[mId] = (branchCountMap[mId] || 0) + 1;
    });

    const branchListMap: Record<string, any[]> = {};
    branchAssignments.forEach((b: any) => {
      const mId = b.menuId.toString();
      if (!branchListMap[mId]) branchListMap[mId] = [];
      if (b.branchId) branchListMap[mId].push(b.branchId);
    });

    const catCountMap: Record<string, number> = {};
    catCounts.forEach((c) => {
      catCountMap[c._id.toString()] = c.count;
    });

    const itemCountMap: Record<string, number> = {};
    itemCounts.forEach((i) => {
      itemCountMap[i._id.toString()] = i.count;
    });

    const enrichedMenus = rawMenus.map((m) => {
      const idStr = m._id.toString();
      const restList = assignmentMap[idStr] || [];
      const branchList = branchListMap[idStr] || [];
      const primaryRestaurant = restList[0] || null;
      const primaryBranch = branchList[0] || null;

      return {
        ...m,
        assignedRestaurants: restList,
        assignedBranches: branchList,
        restaurantName: primaryRestaurant ? primaryRestaurant.name : undefined,
        restaurantBranch: primaryBranch?.name
          ? `${primaryRestaurant?.name || 'Restaurant'} - ${primaryBranch.name}`
          : primaryRestaurant?.address?.city
          ? `${primaryRestaurant.name}, ${primaryRestaurant.address.city}`
          : primaryRestaurant?.name,
        restaurantCount: restList.length,
        branchCount: branchList.length,
        categoryCount: catCountMap[idStr] || 0,
        itemCount: itemCountMap[idStr] || 0,
        categoriesCount: catCountMap[idStr] || 0,
        itemsCount: itemCountMap[idStr] || 0,
      };
    });

    return {
      menus: enrichedMenus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getMenuById(menuId: string): Promise<IMenu> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const menu = await Menu.findById(menuId);
    if (!menu) throw new ApiError(404, 'Menu not found');
    return menu;
  }

  static async updateMenu(menuId: string, input: any, user: AuthJwtPayload): Promise<IMenu> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const menu = await Menu.findById(menuId);
    if (!menu) throw new ApiError(404, 'Menu not found');

    // Keep isPublished (customer-facing visibility) and status (lifecycle: draft, published, inactive, archived) distinct
    if (input.status) {
      const normStatus = input.status.toLowerCase();
      if (normStatus === 'archived') {
        // Archived menus cannot be customer-visible
        input.isPublished = false;
      }
    }

    Object.assign(menu, input);
    menu.updatedBy = new Types.ObjectId(user.userId);
    await menu.save();
    return menu;
  }

  static async duplicateMenu(
    menuId: string,
    input: {
      name: string;
      code?: string;
      copyCategories?: boolean;
      copyItems?: boolean;
      copySchedules?: boolean;
      copyBranchAssignments?: boolean;
    },
    user: AuthJwtPayload
  ): Promise<IMenu> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const original = await Menu.findById(menuId);
    if (!original) throw new ApiError(404, 'Menu to duplicate not found');

    const copyCategories = input.copyCategories !== false;
    const copyItems = input.copyItems !== false;

    // Generate unique code if not provided
    let newCode = input.code;
    if (!newCode) {
      const cleanName = input.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);
      const acronym = cleanName.length > 1 ? cleanName.map((w) => w[0]).join('') : cleanName[0]?.slice(0, 4) || 'MENU';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      newCode = `MENU-${acronym}-${randomSuffix}`;
    }

    // Determine highest sortOrder + 1
    const highestSortMenu = await Menu.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    const nextSortOrder = (highestSortMenu?.sortOrder ?? 0) + 1;

    // Create duplicate menu record as draft & unpublished
    const duplicate = new Menu({
      name: input.name,
      code: newCode,
      description: original.description,
      imageUrl: original.imageUrl,
      cuisine: original.cuisine,
      menuType: original.menuType || ['dine_in', 'takeaway', 'delivery'],
      mealPeriod: original.mealPeriod || 'all_day',
      scheduleMode: original.scheduleMode || 'automatic',
      startDate: input.copySchedules ? original.startDate : null,
      endDate: input.copySchedules ? original.endDate : null,
      startTime: input.copySchedules ? original.startTime : original.startTime,
      endTime: input.copySchedules ? original.endTime : original.endTime,
      daysOfWeek: input.copySchedules ? original.daysOfWeek : original.daysOfWeek,
      status: 'draft',
      isPublished: false,
      sortOrder: nextSortOrder,
      isActive: true,
      createdBy: new Types.ObjectId(user.userId),
      updatedBy: new Types.ObjectId(user.userId),
    });

    await duplicate.save();
    const newMenuId = duplicate._id as Types.ObjectId;

    // Deep clone categories & items if requested
    if (copyCategories) {
      const originalCategories = await MenuCategory.find({ menuId: original._id }).lean();
      const oldToNewCatMap = new Map<string, Types.ObjectId>();

      for (const oldCat of originalCategories) {
        const newCat = new MenuCategory({
          menuId: newMenuId,
          name: oldCat.name,
          code: oldCat.code ? `${oldCat.code}-CP` : undefined,
          description: oldCat.description,
          imageUrl: oldCat.imageUrl,
          displayOrder: oldCat.displayOrder,
          status: oldCat.status,
          sortOrder: (oldCat as any).sortOrder ?? oldCat.displayOrder ?? 0,
        });
        await newCat.save();
        oldToNewCatMap.set(oldCat._id.toString(), newCat._id as Types.ObjectId);
      }

      if (copyItems) {
        const originalItems = await MenuItem.find({ menuId: original._id }).lean();
        for (const oldItem of originalItems) {
          const mappedCatId = oldItem.categoryId ? oldToNewCatMap.get(oldItem.categoryId.toString()) : undefined;
          const newItem = new MenuItem({
            menuId: newMenuId,
            categoryId: mappedCatId || null,
            name: oldItem.name,
            code: oldItem.code ? `${oldItem.code}-CP` : undefined,
            category: oldItem.category,
            itemType: oldItem.itemType,
            cuisine: oldItem.cuisine,
            dietaryTags: oldItem.dietaryTags,
            price: oldItem.price,
            discountPrice: oldItem.discountPrice,
            preparationTime: oldItem.preparationTime,
            taxRate: oldItem.taxRate,
            description: oldItem.description,
            imageUrl: oldItem.imageUrl,
            isAvailable: oldItem.isAvailable,
            displayOrder: oldItem.displayOrder,
            sortOrder: (oldItem as any).sortOrder ?? oldItem.displayOrder ?? 0,
            status: oldItem.status || 'ACTIVE',
          });
          await newItem.save();
        }
      }
    }

    return duplicate;
  }

  static async publishMenu(menuId: string, user: AuthJwtPayload): Promise<IMenu> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const menu = await Menu.findById(menuId);
    if (!menu) throw new ApiError(404, 'Menu not found');

    if (menu.status === 'archived') {
      throw new ApiError(400, 'Archived menu cannot be published. Please restore or activate it first.');
    }

    // Set customer-facing visibility to true
    menu.isPublished = true;
    // If it was draft, advance its lifecycle status to published
    if (menu.status === 'draft') {
      menu.status = 'published';
    }
    menu.updatedBy = new Types.ObjectId(user.userId);
    await menu.save();
    return menu;
  }

  static async unpublishMenu(menuId: string, user: AuthJwtPayload): Promise<IMenu> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const menu = await Menu.findById(menuId);
    if (!menu) throw new ApiError(404, 'Menu not found');

    // Controls customer-facing visibility
    menu.isPublished = false;
    menu.updatedBy = new Types.ObjectId(user.userId);
    await menu.save();
    return menu;
  }

  static async updateMenuStatus(menuId: string, status: string, user: AuthJwtPayload): Promise<IMenu> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const menu = await Menu.findById(menuId);
    if (!menu) throw new ApiError(404, 'Menu not found');

    const normalizedStatus = status.toLowerCase();

    // Prevent direct publishing of archived menu without restoring
    if (menu.status === 'archived' && (normalizedStatus === 'published' || normalizedStatus === 'active')) {
      throw new ApiError(400, 'Archived menu cannot be directly published. Change status to draft or inactive first.');
    }

    menu.status = normalizedStatus;
    if (normalizedStatus === 'archived') {
      menu.isPublished = false;
    } else if (normalizedStatus === 'published') {
      menu.isPublished = true;
    }

    menu.updatedBy = new Types.ObjectId(user.userId);
    await menu.save();
    return menu;
  }

  static async updateSortOrder(menuId: string, sortOrder: number, user: AuthJwtPayload): Promise<IMenu> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    if (typeof sortOrder !== 'number' || sortOrder < 0 || !Number.isInteger(sortOrder)) {
      throw new ApiError(400, 'Sort order must be a non-negative integer');
    }

    const menu = await Menu.findById(menuId);
    if (!menu) throw new ApiError(404, 'Menu not found');

    menu.sortOrder = sortOrder;
    menu.updatedBy = new Types.ObjectId(user.userId);
    await menu.save();
    return menu;
  }

  static async reorderMenus(items: Array<{ menuId: string; sortOrder: number }>, user: AuthJwtPayload): Promise<void> {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Items array is required');
    }

    // Validate all items
    for (const item of items) {
      if (!Types.ObjectId.isValid(item.menuId)) {
        throw new ApiError(400, `Invalid menu ID: ${item.menuId}`);
      }
      if (typeof item.sortOrder !== 'number' || item.sortOrder < 0 || !Number.isInteger(item.sortOrder)) {
        throw new ApiError(400, `Invalid sortOrder for menu ${item.menuId}: must be a non-negative integer`);
      }
    }

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(item.menuId) },
        update: {
          $set: {
            sortOrder: item.sortOrder,
            updatedBy: new Types.ObjectId(user.userId),
          },
        },
      },
    }));

    await Menu.bulkWrite(bulkOps);
  }

  static async deleteMenu(menuId: string): Promise<void> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const deleted = await Menu.findByIdAndDelete(menuId);
    if (!deleted) throw new ApiError(404, 'Menu not found');

    // Clean up cascaded assignments
    await Promise.all([
      MenuRestaurantAssignment.deleteMany({ menuId: new Types.ObjectId(menuId) }),
      MenuBranchAssignment.deleteMany({ menuId: new Types.ObjectId(menuId) }),
      MenuCategory.deleteMany({ menuId: new Types.ObjectId(menuId) }),
      MenuItem.deleteMany({ menuId: new Types.ObjectId(menuId) }),
    ]);
  }

  // ==========================================
  // MENU RESTAURANT ASSIGNMENTS
  // ==========================================
  static async listAssignedRestaurants(menuId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const assignments = await MenuRestaurantAssignment.find({ menuId: new Types.ObjectId(menuId) })
      .populate('restaurantId', 'name code slug logo address')
      .lean();
    return assignments;
  }

  static async assignMenuToRestaurant(menuId: string, input: { restaurantId: string; status?: string }, user: AuthJwtPayload): Promise<IMenuRestaurantAssignment> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    if (!Types.ObjectId.isValid(input.restaurantId)) throw new ApiError(400, 'Invalid restaurant ID');

    const [menu, restaurant] = await Promise.all([
      Menu.findById(menuId),
      Restaurant.findById(input.restaurantId),
    ]);
    if (!menu) throw new ApiError(404, 'Menu not found');
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    const assignment = await MenuRestaurantAssignment.findOneAndUpdate(
      { menuId: new Types.ObjectId(menuId), restaurantId: new Types.ObjectId(input.restaurantId) },
      {
        status: input.status || 'ACTIVE',
        assignedBy: new Types.ObjectId(user.userId),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return assignment;
  }

  static async removeRestaurantAssignment(menuId: string, restaurantId: string): Promise<void> {
    if (!Types.ObjectId.isValid(menuId) || !Types.ObjectId.isValid(restaurantId)) {
      throw new ApiError(400, 'Invalid parameters');
    }
    const res = await MenuRestaurantAssignment.findOneAndDelete({
      menuId: new Types.ObjectId(menuId),
      restaurantId: new Types.ObjectId(restaurantId),
    });
    if (!res) throw new ApiError(404, 'Restaurant assignment not found');
  }

  static async updateRestaurantAssignmentStatus(menuId: string, restaurantId: string, status: string): Promise<IMenuRestaurantAssignment> {
    if (!Types.ObjectId.isValid(menuId) || !Types.ObjectId.isValid(restaurantId)) {
      throw new ApiError(400, 'Invalid parameters');
    }
    const updated = await MenuRestaurantAssignment.findOneAndUpdate(
      { menuId: new Types.ObjectId(menuId), restaurantId: new Types.ObjectId(restaurantId) },
      { status },
      { new: true }
    );
    if (!updated) throw new ApiError(404, 'Restaurant assignment not found');
    return updated;
  }

  // ==========================================
  // MENU BRANCH ASSIGNMENTS
  // ==========================================
  static async listAssignedBranches(menuId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const assignments = await MenuBranchAssignment.find({ menuId: new Types.ObjectId(menuId) })
      .populate('branchId', 'name code slug address restaurantId')
      .populate('restaurantId', 'name code')
      .lean();
    return assignments;
  }

  static async assignMenuToBranch(menuId: string, input: { branchId: string; restaurantId?: string; status?: string }, user: AuthJwtPayload): Promise<IMenuBranchAssignment> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    if (!Types.ObjectId.isValid(input.branchId)) throw new ApiError(400, 'Invalid branch ID');

    const branch = await Branch.findById(input.branchId);
    if (!branch) throw new ApiError(404, 'Branch not found');

    const restId = input.restaurantId || branch.restaurantId?.toString();

    const assignment = await MenuBranchAssignment.findOneAndUpdate(
      { menuId: new Types.ObjectId(menuId), branchId: new Types.ObjectId(input.branchId) },
      {
        restaurantId: restId && Types.ObjectId.isValid(restId) ? new Types.ObjectId(restId) : null,
        status: input.status || 'ACTIVE',
        assignedBy: new Types.ObjectId(user.userId),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return assignment;
  }

  static async bulkAssignMenuToBranches(menuId: string, input: { branchIds: string[]; restaurantId?: string; status?: string }, user: AuthJwtPayload): Promise<any[]> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');

    const ops: any[] = input.branchIds.map((bId) => {
      return {
        updateOne: {
          filter: { menuId: new Types.ObjectId(menuId), branchId: new Types.ObjectId(bId) },
          update: {
            $set: {
              restaurantId: input.restaurantId && Types.ObjectId.isValid(input.restaurantId) ? new Types.ObjectId(input.restaurantId) : undefined,
              status: (input.status as any) || 'ACTIVE',
              assignedBy: new Types.ObjectId(user.userId),
            },
          },
          upsert: true,
        },
      };
    });

    await MenuBranchAssignment.bulkWrite(ops as any);
    return await this.listAssignedBranches(menuId);
  }

  static async removeBranchAssignment(menuId: string, branchId: string): Promise<void> {
    if (!Types.ObjectId.isValid(menuId) || !Types.ObjectId.isValid(branchId)) {
      throw new ApiError(400, 'Invalid parameters');
    }
    const res = await MenuBranchAssignment.findOneAndDelete({
      menuId: new Types.ObjectId(menuId),
      branchId: new Types.ObjectId(branchId),
    });
    if (!res) throw new ApiError(404, 'Branch assignment not found');
  }

  // ==========================================
  // MENU CATEGORIES
  // ==========================================
  static async createMenuCategory(input: any, user: AuthJwtPayload): Promise<IMenuCategory> {
    const category = new MenuCategory({
      ...input,
      menuId: input.menuId && Types.ObjectId.isValid(input.menuId) ? new Types.ObjectId(input.menuId) : null,
      createdBy: new Types.ObjectId(user.userId),
      updatedBy: new Types.ObjectId(user.userId),
    });
    await category.save();
    return category;
  }

  static async listMenuCategories(query: any): Promise<{ categories: IMenuCategory[]; pagination: any }> {
    const { page = 1, limit = 50, menuId, search, status, sortBy = 'displayOrder', sortOrder = 'asc' } = query;
    const filter: Record<string, any> = {};

    if (menuId && Types.ObjectId.isValid(menuId)) filter.menuId = new Types.ObjectId(menuId);
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { code: { $regex: new RegExp(search, 'i') } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [categories, total] = await Promise.all([
      MenuCategory.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      MenuCategory.countDocuments(filter),
    ]);

    return {
      categories: categories as unknown as IMenuCategory[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getMenuCategoryById(categoryId: string): Promise<IMenuCategory> {
    if (!Types.ObjectId.isValid(categoryId)) throw new ApiError(400, 'Invalid category ID');
    const category = await MenuCategory.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  }

  static async updateMenuCategory(categoryId: string, input: any, user: AuthJwtPayload): Promise<IMenuCategory> {
    if (!Types.ObjectId.isValid(categoryId)) throw new ApiError(400, 'Invalid category ID');
    const category = await MenuCategory.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');

    Object.assign(category, input);
    if (input.menuId !== undefined) {
      category.menuId = input.menuId && Types.ObjectId.isValid(input.menuId) ? new Types.ObjectId(input.menuId) : undefined;
    }
    category.updatedBy = new Types.ObjectId(user.userId);
    await category.save();
    return category;
  }

  static async deleteMenuCategory(categoryId: string): Promise<void> {
    if (!Types.ObjectId.isValid(categoryId)) throw new ApiError(400, 'Invalid category ID');
    const deleted = await MenuCategory.findByIdAndDelete(categoryId);
    if (!deleted) throw new ApiError(404, 'Category not found');
  }

  // ==========================================
  // MENU ITEMS
  // ==========================================
  static async createMenuItem(input: any, user: AuthJwtPayload): Promise<IMenuItem> {
    const item = new MenuItem({
      ...input,
      menuId: input.menuId && Types.ObjectId.isValid(input.menuId) ? new Types.ObjectId(input.menuId) : null,
      categoryId: input.categoryId && Types.ObjectId.isValid(input.categoryId) ? new Types.ObjectId(input.categoryId) : null,
      restaurantId: input.restaurantId && Types.ObjectId.isValid(input.restaurantId) ? new Types.ObjectId(input.restaurantId) : null,
      branchId: input.branchId && Types.ObjectId.isValid(input.branchId) ? new Types.ObjectId(input.branchId) : null,
      createdBy: new Types.ObjectId(user.userId),
      updatedBy: new Types.ObjectId(user.userId),
    });
    await item.save();
    return item;
  }

  static async listMenuItems(query: any): Promise<{ items: IMenuItem[]; categories: string[]; pagination: any }> {
    const {
      page = 1,
      limit = 50,
      menuId,
      categoryId,
      restaurantId,
      branchId,
      category,
      itemType,
      search,
      status,
      isAvailable,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, any> = {};

    if (menuId && Types.ObjectId.isValid(menuId)) filter.menuId = new Types.ObjectId(menuId);
    if (categoryId && Types.ObjectId.isValid(categoryId)) filter.categoryId = new Types.ObjectId(categoryId);
    if (restaurantId && Types.ObjectId.isValid(restaurantId)) filter.restaurantId = new Types.ObjectId(restaurantId);
    if (branchId && Types.ObjectId.isValid(branchId)) filter.branchId = new Types.ObjectId(branchId);
    if (category) filter.category = category;
    if (itemType) filter.itemType = itemType;
    if (status) filter.status = status;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable;

    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { code: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total, categories] = await Promise.all([
      MenuItem.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      MenuItem.countDocuments(filter),
      MenuItem.distinct('category', filter.restaurantId ? { restaurantId: filter.restaurantId } : {}),
    ]);

    return {
      items: items as unknown as IMenuItem[],
      categories: categories as string[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getMenuItemById(itemId: string): Promise<IMenuItem> {
    if (!Types.ObjectId.isValid(itemId)) throw new ApiError(400, 'Invalid item ID');
    const item = await MenuItem.findById(itemId);
    if (!item) throw new ApiError(404, 'Menu item not found');
    return item;
  }

  static async updateMenuItem(itemId: string, input: any, user: AuthJwtPayload): Promise<IMenuItem> {
    if (!Types.ObjectId.isValid(itemId)) throw new ApiError(400, 'Invalid item ID');
    const item = await MenuItem.findById(itemId);
    if (!item) throw new ApiError(404, 'Menu item not found');

    Object.assign(item, input);
    if (input.menuId !== undefined) {
      item.menuId = input.menuId && Types.ObjectId.isValid(input.menuId) ? new Types.ObjectId(input.menuId) : undefined;
    }
    if (input.categoryId !== undefined) {
      item.categoryId = input.categoryId && Types.ObjectId.isValid(input.categoryId) ? new Types.ObjectId(input.categoryId) : undefined;
    }
    if (input.restaurantId !== undefined) {
      item.restaurantId = input.restaurantId && Types.ObjectId.isValid(input.restaurantId) ? new Types.ObjectId(input.restaurantId) : undefined;
    }
    if (input.branchId !== undefined) {
      item.branchId = input.branchId && Types.ObjectId.isValid(input.branchId) ? new Types.ObjectId(input.branchId) : undefined;
    }

    item.updatedBy = new Types.ObjectId(user.userId);
    await item.save();
    return item;
  }

  static async deleteMenuItem(itemId: string): Promise<void> {
    if (!Types.ObjectId.isValid(itemId)) throw new ApiError(400, 'Invalid item ID');
    const deleted = await MenuItem.findByIdAndDelete(itemId);
    if (!deleted) throw new ApiError(404, 'Menu item not found');
  }

  static async toggleAvailability(itemId: string, isAvailable: boolean): Promise<IMenuItem> {
    if (!Types.ObjectId.isValid(itemId)) throw new ApiError(400, 'Invalid item ID');
    const item = await MenuItem.findByIdAndUpdate(itemId, { isAvailable }, { new: true });
    if (!item) throw new ApiError(404, 'Menu item not found');
    return item;
  }

  // ==========================================
  // ADDITIONAL APIS: SUMMARY & REORDER
  // ==========================================
  static async getMenuSummary(): Promise<{
    totalMenus: number;
    activeMenus: number;
    totalCategories: number;
    totalItems: number;
    availableItems: number;
    menusGrowth: string;
    categoriesGrowth: string;
    itemsGrowth: string;
    activeItemsGrowth: string;
  }> {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const [
      totalMenus,
      menusLastMonth,
      activeMenus,
      totalCategories,
      categoriesLastMonth,
      totalItems,
      itemsLastMonth,
      availableItems,
      availableItemsLastMonth,
    ] = await Promise.all([
      Menu.countDocuments(),
      Menu.countDocuments({ createdAt: { $lte: lastMonthDate } }),
      Menu.countDocuments({ status: { $in: ['active', 'ACTIVE'] } }),
      MenuCategory.countDocuments(),
      MenuCategory.countDocuments({ createdAt: { $lte: lastMonthDate } }),
      MenuItem.countDocuments(),
      MenuItem.countDocuments({ createdAt: { $lte: lastMonthDate } }),
      MenuItem.countDocuments({ isAvailable: true }),
      MenuItem.countDocuments({ isAvailable: true, createdAt: { $lte: lastMonthDate } }),
    ]);

    const calcGrowth = (current: number, lastMonth: number): string => {
      if (lastMonth === 0) {
        return current > 0 ? `+${current}` : '0%';
      }
      const diff = current - lastMonth;
      const pct = Math.round((diff / lastMonth) * 100);
      return pct >= 0 ? `+${pct}%` : `${pct}%`;
    };

    return {
      totalMenus,
      activeMenus,
      totalCategories,
      totalItems,
      availableItems,
      menusGrowth: calcGrowth(totalMenus, menusLastMonth),
      categoriesGrowth: calcGrowth(totalCategories, categoriesLastMonth),
      itemsGrowth: calcGrowth(totalItems, itemsLastMonth),
      activeItemsGrowth: calcGrowth(availableItems, availableItemsLastMonth),
    };
  }

  static async reorderCategories(menuId: string, items: Array<{ categoryId: string; displayOrder: number }>): Promise<void> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const bulkOps = items
      .filter((i) => Types.ObjectId.isValid(i.categoryId))
      .map((i) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(i.categoryId), menuId: new Types.ObjectId(menuId) },
          update: { $set: { displayOrder: i.displayOrder } },
        },
      }));

    if (bulkOps.length > 0) {
      await MenuCategory.bulkWrite(bulkOps);
    }
  }

  static async reorderMenuItems(menuId: string, items: Array<{ itemId: string; displayOrder: number }>): Promise<void> {
    if (!Types.ObjectId.isValid(menuId)) throw new ApiError(400, 'Invalid menu ID');
    const bulkOps = items
      .filter((i) => Types.ObjectId.isValid(i.itemId))
      .map((i) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(i.itemId), menuId: new Types.ObjectId(menuId) },
          update: { $set: { displayOrder: i.displayOrder } },
        },
      }));

    if (bulkOps.length > 0) {
      await MenuItem.bulkWrite(bulkOps);
    }
  }

  // ==========================================
  // ADDON GROUPS (Table 17 — Customization Groups)
  // ==========================================
  static async createAddonGroup(input: any, user: AuthJwtPayload): Promise<IAddonGroup> {
    const data: any = {
      ...input,
      createdBy: new Types.ObjectId(user.userId),
      updatedBy: new Types.ObjectId(user.userId),
    };
    if (input.restaurantId && Types.ObjectId.isValid(input.restaurantId)) {
      data.restaurantId = new Types.ObjectId(input.restaurantId);
    }
    if (input.menuId && Types.ObjectId.isValid(input.menuId)) {
      data.menuId = new Types.ObjectId(input.menuId);
    }
    if (Array.isArray(input.menuItemIds)) {
      data.menuItemIds = input.menuItemIds
        .filter((id: string) => Types.ObjectId.isValid(id))
        .map((id: string) => new Types.ObjectId(id));
    }

    const group = new AddonGroup(data);
    await group.save();

    // Also update referenced MenuItems to link this addon group
    if (data.menuItemIds && data.menuItemIds.length > 0) {
      await MenuItem.updateMany(
        { _id: { $in: data.menuItemIds } },
        { $addToSet: { addonGroupIds: group._id } }
      );
    }

    return group;
  }

  static async listAddonGroups(query: any): Promise<{ addonGroups: IAddonGroup[]; pagination: any }> {
    const { page = 1, limit = 50, restaurantId, menuId, selection_type, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: Record<string, any> = { deletedAt: null };

    if (restaurantId && Types.ObjectId.isValid(restaurantId)) {
      filter.restaurantId = new Types.ObjectId(restaurantId);
    }
    if (menuId && Types.ObjectId.isValid(menuId)) {
      filter.menuId = new Types.ObjectId(menuId);
    }
    if (selection_type) {
      filter.selection_type = selection_type;
    }
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [addonGroups, total] = await Promise.all([
      AddonGroup.find(filter)
        .populate('restaurantId', 'name code')
        .populate('menuId', 'name code')
        .populate('menuItemIds', 'name price itemType category code')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      AddonGroup.countDocuments(filter),
    ]);

    return {
      addonGroups: addonGroups as unknown as IAddonGroup[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getAddonGroupById(groupId: string): Promise<IAddonGroup> {
    if (!Types.ObjectId.isValid(groupId)) throw new ApiError(400, 'Invalid addon group ID');
    const group = await AddonGroup.findOne({ _id: new Types.ObjectId(groupId), deletedAt: null })
      .populate('restaurantId', 'name code')
      .populate('menuId', 'name code')
      .populate('menuItemIds', 'name price itemType category code');
    if (!group) throw new ApiError(404, 'Addon group not found');
    return group;
  }

  static async updateAddonGroup(groupId: string, input: any, user: AuthJwtPayload): Promise<IAddonGroup> {
    if (!Types.ObjectId.isValid(groupId)) throw new ApiError(400, 'Invalid addon group ID');
    const data: any = {
      ...input,
      updatedBy: new Types.ObjectId(user.userId),
    };
    if (input.restaurantId !== undefined) {
      data.restaurantId = input.restaurantId && Types.ObjectId.isValid(input.restaurantId) ? new Types.ObjectId(input.restaurantId) : null;
    }
    if (input.menuId !== undefined) {
      data.menuId = input.menuId && Types.ObjectId.isValid(input.menuId) ? new Types.ObjectId(input.menuId) : null;
    }
    if (Array.isArray(input.menuItemIds)) {
      data.menuItemIds = input.menuItemIds
        .filter((id: string) => Types.ObjectId.isValid(id))
        .map((id: string) => new Types.ObjectId(id));
    }

    const group = await AddonGroup.findOneAndUpdate(
      { _id: new Types.ObjectId(groupId), deletedAt: null },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!group) throw new ApiError(404, 'Addon group not found');

    if (Array.isArray(data.menuItemIds)) {
      // Remove group from items not in data.menuItemIds
      await MenuItem.updateMany(
        { addonGroupIds: group._id, _id: { $nin: data.menuItemIds } },
        { $pull: { addonGroupIds: group._id } }
      );
      // Add group to items in data.menuItemIds
      await MenuItem.updateMany(
        { _id: { $in: data.menuItemIds } },
        { $addToSet: { addonGroupIds: group._id } }
      );
    }

    return group;
  }

  static async deleteAddonGroup(groupId: string, user: AuthJwtPayload): Promise<void> {
    if (!Types.ObjectId.isValid(groupId)) throw new ApiError(400, 'Invalid addon group ID');
    const group = await AddonGroup.findOneAndUpdate(
      { _id: new Types.ObjectId(groupId), deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          status: 'inactive',
          updatedBy: new Types.ObjectId(user.userId),
        },
      }
    );
    if (!group) throw new ApiError(404, 'Addon group not found');

    // Also remove reference from any menu items using this addonGroup
    await MenuItem.updateMany(
      { addonGroupIds: new Types.ObjectId(groupId) },
      { $pull: { addonGroupIds: new Types.ObjectId(groupId) } }
    );
  }
}

// Backward compatible export alias
export const MenuService = MenuAdminService;



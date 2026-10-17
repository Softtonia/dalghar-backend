import { z } from 'zod';

// ==================== MENUS ====================
export const createMenuSchema = z.object({
  name: z.string().trim().min(1, 'Menu name is required').max(150),
  description: z.string().trim().max(500).optional().nullable(),
  cuisine: z.string().trim().optional().nullable(),
  menuType: z.array(z.enum(['dine_in', 'takeaway', 'delivery'])).optional().default(['dine_in', 'takeaway', 'delivery']),
  isPublished: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional().default(0),
  status: z
    .enum(['active', 'inactive', 'draft', 'published', 'archived', 'ACTIVE', 'INACTIVE'])
    .optional()
    .default('draft'),
  mealPeriod: z.enum(['breakfast', 'lunch', 'dinner', 'all_day']).optional().default('all_day'),
  scheduleMode: z.enum(['automatic', 'custom']).optional().default('automatic'),
  startDate: z.string().trim().nullable().optional(),
  endDate: z.string().trim().nullable().optional(),
  startTime: z.string().trim().nullable().optional(),
  endTime: z.string().trim().nullable().optional(),
  daysOfWeek: z.array(z.string()).optional(),
  code: z.string().trim().optional(),
  imageUrl: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateMenuSchema = createMenuSchema.partial();

export const duplicateMenuSchema = z.object({
  name: z.string().trim().min(1, 'New menu name is required').max(150),
  code: z.string().trim().optional(),
  copyCategories: z.boolean().optional().default(true),
  copyItems: z.boolean().optional().default(true),
  copySchedules: z.boolean().optional().default(false),
  copyBranchAssignments: z.boolean().optional().default(false),
});

export const updateMenuStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'inactive', 'archived', 'active', 'ACTIVE', 'INACTIVE']),
});

export const publishMenuSchema = z.object({
  isPublished: z.boolean().optional().default(true),
});

export const updateSortOrderSchema = z.object({
  sortOrder: z.number().int().min(0, 'Sort order must be a non-negative integer'),
});

export const reorderMenusSchema = z.object({
  items: z
    .array(
      z.object({
        menuId: z.string().min(1, 'menuId is required'),
        sortOrder: z.number().int().min(0, 'sortOrder must be a non-negative integer'),
      })
    )
    .min(1, 'At least one item is required to reorder'),
});

export const listMenuQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  restaurantId: z.string().optional(),
  branchId: z.string().optional(),
  mealPeriod: z.string().optional(),
  menuType: z.string().optional(),
  date: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 50)),
  sortBy: z.string().optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ==================== RESTAURANT ASSIGNMENTS ====================
export const assignMenuRestaurantSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']).optional().default('active'),
});

export const updateRestaurantAssignmentStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']),
});

// ==================== BRANCH ASSIGNMENTS ====================
export const assignMenuBranchSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  restaurantId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']).optional().default('active'),
});

export const bulkAssignMenuBranchesSchema = z.object({
  branchIds: z.array(z.string().min(1)).min(1, 'At least one branch ID is required'),
  restaurantId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']).optional().default('active'),
});

// ==================== MENU CATEGORIES ====================
export const createMenuCategorySchema = z.object({
  menuId: z.string().min(1, 'Menu ID is required'),
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  displayOrder: z.number().optional().default(0),
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']).optional().default('active'),
  code: z.string().trim().optional(),
  imageUrl: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateMenuCategorySchema = createMenuCategorySchema.partial();

export const listMenuCategoryQuerySchema = z.object({
  menuId: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 50)),
  sortBy: z.string().optional().default('displayOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ==================== MENU ITEMS ====================
export const menuItemAdminShape = z.object({
  menuId: z.string().min(1, 'Menu ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  restaurantId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  name: z.string().trim().min(1, 'Item name is required').max(150),
  description: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  foodType: z.enum(['vegetarian', 'non_vegetarian', 'vegan', 'egg', 'VEG', 'NON_VEG', 'EGG', 'VEGAN']).optional().default('vegetarian'),
  itemType: z.enum(['VEG', 'NON_VEG', 'EGG', 'VEGAN', 'vegetarian', 'non_vegetarian', 'vegan', 'egg']).optional(),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  currency: z.string().optional().default('INR'),
  isAvailable: z.boolean().optional().default(true),
  displayOrder: z.number().optional().default(0),
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']).optional().default('active'),
  code: z.string().trim().optional(),
  category: z.string().trim().optional(),
  cuisine: z.string().trim().optional().nullable(),
  dietaryTags: z.array(z.string()).optional(),
  discountPrice: z.number().min(0).optional().nullable(),
  preparationTime: z.number().min(0).optional().default(15),
  taxRate: z.number().min(0).optional().default(5),
  variants: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Variant name is required'),
        price: z.number().min(0, 'Variant price must be non-negative'),
      })
    )
    .optional()
    .default([]),
  addons: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Addon name is required'),
        price: z.number().min(0, 'Addon price must be non-negative'),
      })
    )
    .optional()
    .default([]),
  addonGroupIds: z.array(z.string()).optional().default([]),
});

export const createMenuItemAdminSchema = menuItemAdminShape.refine(
  (data) => {
    if (data.discountPrice !== undefined && data.discountPrice !== null && data.price !== undefined) {
      return data.discountPrice <= data.price;
    }
    return true;
  },
  {
    message: 'Special price cannot be greater than selling price',
    path: ['discountPrice'],
  }
);

export const updateMenuItemAdminSchema = menuItemAdminShape.partial().refine(
  (data) => {
    if (data.discountPrice !== undefined && data.discountPrice !== null && data.price !== undefined) {
      return data.discountPrice <= data.price;
    }
    return true;
  },
  {
    message: 'Special price cannot be greater than selling price',
    path: ['discountPrice'],
  }
);

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      categoryId: z.string().min(1, 'categoryId is required'),
      displayOrder: z.number(),
    })
  ).min(1, 'Items array cannot be empty'),
});

export const reorderMenuItemsSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().min(1, 'itemId is required'),
      displayOrder: z.number(),
    })
  ).min(1, 'Items array cannot be empty'),
});

export const listMenuItemAdminQuerySchema = z.object({
  menuId: z.string().optional(),
  categoryId: z.string().optional(),
  restaurantId: z.string().optional(),
  branchId: z.string().optional(),
  category: z.string().optional(),
  itemType: z.enum(['VEG', 'NON_VEG', 'EGG', 'VEGAN']).optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  isAvailable: z
    .string()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
    .optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 50)),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Backward compatible aliases
export const createMenuItemSchema = createMenuItemAdminSchema;
export const updateMenuItemSchema = updateMenuItemAdminSchema;
export const listMenuItemQuerySchema = listMenuItemAdminQuerySchema;

// ==========================================
// Table 17: ADDON GROUPS (Customization Groups)
// ==========================================
export const addonGroupOptionSchema = z.object({
  name: z.string().trim().min(1, 'Option name is required').max(120),
  price: z.number().min(0, 'Price must be non-negative').default(0),
  isDefault: z.boolean().optional().default(false),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const createAddonGroupSchema = z.object({
  restaurantId: z.string().optional().nullable(),
  menuId: z.string().optional().nullable(),
  name: z.string().trim().min(1, 'Addon group name is required').max(120),
  description: z.string().trim().optional().default(''),
  min_selections: z.number().int().min(0, 'min_selections must be >= 0').default(0),
  max_selections: z.number().int().min(1, 'max_selections must be >= 1').default(1),
  is_required: z.boolean().default(false),
  selection_type: z.enum(['single', 'multiple']).default('single'),
  status: z.enum(['active', 'inactive']).default('active'),
  options: z.array(addonGroupOptionSchema).optional().default([]),
  menuItemIds: z.array(z.string()).optional().default([]),
}).refine(
  (data) => data.min_selections <= data.max_selections,
  {
    message: 'min_selections cannot be greater than max_selections',
    path: ['min_selections'],
  }
);

export const updateAddonGroupSchema = z.object({
  restaurantId: z.string().optional().nullable(),
  menuId: z.string().optional().nullable(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().optional(),
  min_selections: z.number().int().min(0).optional(),
  max_selections: z.number().int().min(1).optional(),
  is_required: z.boolean().optional(),
  selection_type: z.enum(['single', 'multiple']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  options: z.array(addonGroupOptionSchema).optional(),
  menuItemIds: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.min_selections !== undefined && data.max_selections !== undefined) {
      return data.min_selections <= data.max_selections;
    }
    return true;
  },
  {
    message: 'min_selections cannot be greater than max_selections',
    path: ['min_selections'],
  }
);

export const listAddonGroupQuerySchema = z.object({
  restaurantId: z.string().optional(),
  menuId: z.string().optional(),
  selection_type: z.enum(['single', 'multiple']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 50)),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});


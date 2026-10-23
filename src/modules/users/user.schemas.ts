import { z } from 'zod';

export const directPermissionSchema = z.object({
  permission: z.string().trim().min(1),
  effect: z.enum(['allow', 'deny']).default('allow'),
});

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().max(60).optional().default(''),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.string().trim().min(1, 'Role is required').default('CASHIER'),
  roleId: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  restaurantId: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  terminalId: z.string().nullable().optional(),
  permissions: z.array(z.string()).optional(),
  directPermissions: z.union([z.array(z.string()), z.array(directPermissionSchema)]).optional(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  password: z.string().min(6).optional(),
  role: z.string().trim().min(1).optional(),
  roleId: z.string().nullable().optional(),
  roleIds: z.array(z.string()).optional(),
  restaurantId: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  terminalId: z.string().nullable().optional(),
  permissions: z.array(z.string()).optional(),
  directPermissions: z.union([z.array(z.string()), z.array(directPermissionSchema)]).optional(),
  isActive: z.boolean().optional(),
});

export const assignUserRolesSchema = z.object({
  roleIds: z.array(z.string()),
});

export const updateUserPermissionsSchema = z.object({
  permissions: z.array(z.string()).optional(),
  directPermissions: z.union([z.array(z.string()), z.array(directPermissionSchema)]).optional(),
});

export const listUserQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  restaurantId: z.string().optional(),
  branchId: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUserQueryInput = z.infer<typeof listUserQuerySchema>;
export type AssignUserRolesInput = z.infer<typeof assignUserRolesSchema>;
export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>;

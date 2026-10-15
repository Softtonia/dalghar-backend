import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(2, 'Role slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Slug must be lower-case alphanumeric with hyphens/underscores')
    .optional(),
  description: z.string().trim().max(5000).optional().default(''),
  notes: z.string().trim().max(2000).optional().default(''),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(2, 'Role slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Slug must be lower-case alphanumeric with hyphens/underscores')
    .optional(),
  description: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(2000).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const assignRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
});

export const removeRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type RemoveRoleInput = z.infer<typeof removeRoleSchema>;

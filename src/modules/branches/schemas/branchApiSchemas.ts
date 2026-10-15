import { z } from 'zod';
import {
  SLUG_REGEX,
  CODE_REGEX,
  branchOperatingStatusSchema,
  branchTypeSchema,
  branchLogoSchema,
  branchContactSchema,
  branchAddressSchema,
  branchConfigurationSchema,
  branchOperatingHoursSchema,
} from './branchDomainSchema.js';

export const createBranchSchema = z
  .object({
    restaurantId: z.string().min(1, 'Parent restaurant ID is required'),
    name: z.string().trim().min(2, 'Branch name must be at least 2 characters').max(150),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, 'Slug must be at least 2 characters')
      .max(150)
      .regex(SLUG_REGEX, 'Slug can only contain lowercase alphanumeric characters separated by single hyphens'),
    code: z
      .string()
      .trim()
      .min(2, 'Code must be at least 2 characters')
      .max(50)
      .regex(CODE_REGEX, 'Code can only contain uppercase letters, numbers, hyphens, and underscores')
      .transform((val) => val.toUpperCase()),
    type: branchTypeSchema.default('MAIN'),
    logo: branchLogoSchema.optional(),
    contact: branchContactSchema,
    address: branchAddressSchema,
    configuration: branchConfigurationSchema.optional(),
    operatingHours: branchOperatingHoursSchema.optional(),
    seatingCapacity: z.number().min(0, 'Seating capacity cannot be negative').default(0),
    operatingStatus: branchOperatingStatusSchema.default('ACTIVE'),
  })
  .strict();

export const updateBranchSchema = z
  .object({
    restaurantId: z.string().optional(),
    name: z.string().trim().min(2, 'Branch name must be at least 2 characters').max(150).optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, 'Slug must be at least 2 characters')
      .max(150)
      .regex(SLUG_REGEX, 'Slug can only contain lowercase alphanumeric characters separated by single hyphens')
      .optional(),
    code: z
      .string()
      .trim()
      .min(2, 'Code must be at least 2 characters')
      .max(50)
      .regex(CODE_REGEX, 'Code can only contain uppercase letters, numbers, hyphens, and underscores')
      .transform((val) => val.toUpperCase())
      .optional(),
    type: branchTypeSchema.optional(),
    logo: branchLogoSchema.optional(),
    contact: branchContactSchema.partial().optional(),
    address: branchAddressSchema.partial().optional(),
    configuration: branchConfigurationSchema.partial().optional(),
    operatingHours: branchOperatingHoursSchema.partial().optional(),
    seatingCapacity: z.number().min(0).optional(),
    operatingStatus: branchOperatingStatusSchema.optional(),
  })
  .strict();

export const updateBranchStatusSchema = z
  .object({
    operatingStatus: branchOperatingStatusSchema,
  })
  .strict();

export const listBranchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  restaurantId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  status: branchOperatingStatusSchema.optional(),
  type: branchTypeSchema.optional(),
  city: z.string().trim().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'code', 'slug', 'operatingStatus', 'seatingCapacity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type UpdateBranchStatusInput = z.infer<typeof updateBranchStatusSchema>;
export type ListBranchQueryInput = z.infer<typeof listBranchQuerySchema>;

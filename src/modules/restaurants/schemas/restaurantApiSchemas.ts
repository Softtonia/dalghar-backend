import { z } from 'zod';
import {
  SLUG_REGEX,
  CODE_REGEX,
  restaurantOperatingStatusSchema,
  logoSchema,
  contactSchema,
  addressSchema,
  businessSchema,
  configurationSchema,
} from './restaurantDomainSchema.js';

// Base schema for API inputs explicitly omitting audit and system fields to prevent mass-assignment vulnerabilities
export const createRestaurantSchema = z
  .object({
    name: z.string().trim().min(2, 'Restaurant name must be at least 2 characters').max(150),
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
    logo: logoSchema.optional(),
    contact: contactSchema,
    address: addressSchema,
    business: businessSchema.optional(),
    configuration: configurationSchema.optional(),
    operatingStatus: restaurantOperatingStatusSchema.default('ACTIVE'),
  })
  .strict(); // Disallow extraneous system properties

export const updateRestaurantSchema = z
  .object({
    name: z.string().trim().min(2, 'Restaurant name must be at least 2 characters').max(150).optional(),
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
    logo: logoSchema.optional(),
    contact: contactSchema.partial().optional(),
    address: addressSchema.partial().optional(),
    business: businessSchema.optional(),
    configuration: configurationSchema.partial().optional(),
    operatingStatus: restaurantOperatingStatusSchema.optional(),
  })
  .strict();

export const updateRestaurantStatusSchema = z
  .object({
    operatingStatus: restaurantOperatingStatusSchema,
  })
  .strict();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: restaurantOperatingStatusSchema.optional(),
  city: z.string().trim().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'code', 'slug', 'operatingStatus']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type UpdateRestaurantStatusInput = z.infer<typeof updateRestaurantStatusSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;

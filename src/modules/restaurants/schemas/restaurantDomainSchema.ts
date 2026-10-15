import { z } from 'zod';

// Regex constants for strict domain validation
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CODE_REGEX = /^[A-Z0-9_-]+$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const restaurantOperatingStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const logoSchema = z.object({
  url: z
    .string()
    .trim()
    .refine(
      (val) =>
        !val ||
        val === '' ||
        val.startsWith('http://') ||
        val.startsWith('https://') ||
        val.startsWith('data:image/'),
      { message: 'Invalid logo URL format' }
    )
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
  publicId: z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
});

export const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, 'Phone number must be a valid 10-digit mobile number'),
  email: z
    .union([
      z.string().trim().lowercase().email('Invalid email address format'),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .transform((val) => (val && val !== '' ? val.toLowerCase() : null))
    .optional(),
  website: z
    .union([
      z.string().trim().url('Invalid website URL format'),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .transform((val) => (val && val !== '' ? val : null))
    .optional(),
});

export const addressSchema = z.object({
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  addressLine2: z
    .string()
    .trim()
    .max(200)
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').default('India'),
});

export const businessSchema = z.object({
  legalName: z
    .string()
    .trim()
    .max(200)
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
  gstin: z
    .union([
      z
        .string()
        .trim()
        .transform((val) => val.toUpperCase())
        .refine((val) => GSTIN_REGEX.test(val), {
          message: 'Invalid Indian GSTIN format (e.g., 22AAAAA0000A1Z5)',
        }),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .transform((val) => (val && val !== '' ? val.toUpperCase() : null))
    .optional(),
  pan: z
    .union([
      z
        .string()
        .trim()
        .transform((val) => val.toUpperCase())
        .refine((val) => PAN_REGEX.test(val), {
          message: 'Invalid Indian PAN format (e.g., ABCDE1234F)',
        }),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .transform((val) => (val && val !== '' ? val.toUpperCase() : null))
    .optional(),
  businessType: z
    .string()
    .trim()
    .max(100)
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
});

export const configurationSchema = z.object({
  currency: z
    .string()
    .trim()
    .min(1, 'Currency is required')
    .transform((val) => val.toUpperCase())
    .default('INR'),
  timezone: z.string().trim().min(1, 'Timezone is required').default('Asia/Kolkata'),
  taxEnabled: z.boolean().default(true),
  defaultTaxRate: z
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .default(0),
});

export const restaurantDomainSchema = z.object({
  name: z.string().trim().min(2, 'Restaurant name must be at least 2 characters').max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Slug must be at least 2 characters')
    .max(150)
    .regex(SLUG_REGEX, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(CODE_REGEX, 'Code must contain only uppercase letters, numbers, hyphens, and underscores')
    .transform((val) => val.toUpperCase()),
  logo: logoSchema.optional(),
  contact: contactSchema,
  address: addressSchema,
  business: businessSchema.optional(),
  configuration: configurationSchema.optional(),
  operatingStatus: restaurantOperatingStatusSchema.default('ACTIVE'),
  createdBy: z.string().min(1, 'Creator ID is required'),
  updatedBy: z.string().min(1, 'Updater ID is required'),
});

export type RestaurantDomainInput = z.infer<typeof restaurantDomainSchema>;

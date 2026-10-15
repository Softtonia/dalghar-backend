import { z } from 'zod';

export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CODE_REGEX = /^[A-Z0-9_-]+$/;

export const branchOperatingStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const branchTypeSchema = z.enum(['MAIN', 'EXPRESS', 'CLOUDKITCHEN', 'DRIVETHROUGH']);

export const branchContactSchema = z.object({
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
  managerName: z
    .string()
    .trim()
    .max(100)
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
  managerPhone: z
    .string()
    .trim()
    .max(20)
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
});

export const branchAddressSchema = z.object({
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

export const branchLogoSchema = z.object({
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

export const branchConfigurationSchema = z.object({
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

export const dayOfWeekSchema = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

export const timeSlotSchema = z.object({
  openTime: z.string().trim().default('10:00'),
  closeTime: z.string().trim().default('23:00'),
});

export const dayOperatingScheduleSchema = z.object({
  day: dayOfWeekSchema,
  isClosed: z.boolean().default(false),
  is24Hours: z.boolean().default(false),
  slots: z.array(timeSlotSchema).default([{ openTime: '10:00', closeTime: '23:00' }]),
});

export const branchOperatingHoursSchema = z.object({
  openTime: z.string().trim().optional(),
  closeTime: z.string().trim().optional(),
  is24Hours: z.boolean().default(false),
  isClosedOnWeekends: z.boolean().default(false),
  weeklySchedule: z.array(dayOperatingScheduleSchema).optional(),
});

export const branchDomainSchema = z.object({
  restaurantId: z.string().min(1, 'Parent restaurant ID is required'),
  name: z.string().trim().min(2, 'Branch name must be at least 2 characters').max(150),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(CODE_REGEX, 'Code can only contain uppercase letters, numbers, hyphens, and underscores')
    .transform((val) => val.toUpperCase()),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Slug must be at least 2 characters')
    .max(150)
    .regex(SLUG_REGEX, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  type: branchTypeSchema.default('MAIN'),
  logo: branchLogoSchema.optional(),
  contact: branchContactSchema,
  address: branchAddressSchema,
  configuration: branchConfigurationSchema.optional(),
  operatingHours: branchOperatingHoursSchema.optional(),
  seatingCapacity: z.number().min(0, 'Seating capacity cannot be negative').default(0),
  operatingStatus: branchOperatingStatusSchema.default('ACTIVE'),
  createdBy: z.string().min(1, 'Creator ID is required'),
  updatedBy: z.string().min(1, 'Updater ID is required'),
});

export type BranchDomainInput = z.infer<typeof branchDomainSchema>;

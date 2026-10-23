import { z } from 'zod';

export const diningAreaTypeSchema = z.enum([
  'floor',
  'section',
  'patio',
  'private_room',
  'outdoor',
  'other',
]);

export const diningAreaStatusSchema = z.enum(['active', 'inactive']);

export const diningTableShapeSchema = z.enum([
  'square',
  'round',
  'rectangle',
  'oval',
  'custom',
]);

export const diningTableStatusSchema = z.enum([
  'available',
  'occupied',
  'reserved',
  'cleaning',
  'out_of_service',
]);

export const tableStatusSourceSchema = z.enum([
  'pos',
  'reservation',
  'kitchen',
  'staff',
  'admin',
  'system',
]);

// ---------------------- Dining Area Schemas ----------------------

export const createDiningAreaSchema = z.object({
  restaurant_id: z.string().optional(),
  branch_id: z.string().optional(),
  name: z.string().trim().min(1, 'Area name is required').max(100),
  code: z.string().trim().min(1, 'Area code is required').max(50),
  area_type: diningAreaTypeSchema.default('floor'),
  description: z.string().trim().max(1000).optional().nullable(),
  parent_area_id: z.string().optional().nullable(),
  display_order: z.coerce.number().int().default(0),
  layout_config: z.record(z.string(), z.any()).optional().nullable(),
  status: diningAreaStatusSchema.default('active'),
});

export const updateDiningAreaSchema = z.object({
  restaurant_id: z.string().optional(),
  branch_id: z.string().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().min(1).max(50).optional(),
  area_type: diningAreaTypeSchema.optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  parent_area_id: z.string().optional().nullable(),
  display_order: z.coerce.number().int().optional(),
  layout_config: z.record(z.string(), z.any()).optional().nullable(),
  status: diningAreaStatusSchema.optional(),
});

export const listDiningAreaQuerySchema = z.object({
  branch_id: z.string().optional(),
  restaurant_id: z.string().optional(),
  status: diningAreaStatusSchema.optional(),
  area_type: diningAreaTypeSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ---------------------- Dining Table Schemas ----------------------

export const createDiningTableSchema = z
  .object({
    restaurant_id: z.string().optional(),
    branch_id: z.string().optional(),
    dining_area_id: z.string().optional().nullable(),
    table_number: z.string().trim().min(1, 'Table number is required').max(30),
    display_name: z.string().trim().max(100).optional().nullable(),
    capacity: z.coerce.number().int().min(1, 'Capacity must be greater than 0'),
    minimum_capacity: z.coerce.number().int().min(1).optional().nullable(),
    shape: diningTableShapeSchema.default('square'),
    position_x: z.coerce.number().default(0).optional().nullable(),
    position_y: z.coerce.number().default(0).optional().nullable(),
    width: z.coerce.number().default(80).optional().nullable(),
    height: z.coerce.number().default(80).optional().nullable(),
    rotation: z.coerce.number().default(0).optional().nullable(),
    current_status: diningTableStatusSchema.default('available'),
    is_combinable: z.coerce.boolean().default(true),
    is_active: z.coerce.boolean().default(true),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.minimum_capacity !== undefined && data.minimum_capacity !== null) {
        return data.minimum_capacity <= data.capacity;
      }
      return true;
    },
    {
      message: 'Minimum capacity must be no greater than capacity',
      path: ['minimum_capacity'],
    }
  );

export const updateDiningTableSchema = z
  .object({
    restaurant_id: z.string().optional(),
    branch_id: z.string().optional(),
    dining_area_id: z.string().optional(),
    table_number: z.string().trim().min(1).max(30).optional(),
    display_name: z.string().trim().max(100).optional().nullable(),
    capacity: z.coerce.number().int().min(1).optional(),
    minimum_capacity: z.coerce.number().int().min(1).optional().nullable(),
    shape: diningTableShapeSchema.optional(),
    position_x: z.coerce.number().optional().nullable(),
    position_y: z.coerce.number().optional().nullable(),
    width: z.coerce.number().optional().nullable(),
    height: z.coerce.number().optional().nullable(),
    rotation: z.coerce.number().optional().nullable(),
    current_status: diningTableStatusSchema.optional(),
    is_combinable: z.coerce.boolean().optional(),
    is_active: z.coerce.boolean().optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.minimum_capacity !== undefined && data.minimum_capacity !== null && data.capacity !== undefined) {
        return data.minimum_capacity <= data.capacity;
      }
      return true;
    },
    {
      message: 'Minimum capacity must be no greater than capacity',
      path: ['minimum_capacity'],
    }
  );

export const changeTableStatusSchema = z.object({
  status: diningTableStatusSchema,
  source: tableStatusSourceSchema.default('admin'),
  reason: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  reference_type: z.string().max(40).optional().nullable(),
  reference_id: z.string().optional().nullable(),
});

export const listDiningTableQuerySchema = z.object({
  branch_id: z.string().optional(),
  dining_area_id: z.string().optional(),
  restaurant_id: z.string().optional(),
  current_status: diningTableStatusSchema.optional(),
  is_active: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => {
      if (val === undefined || val === 'all') return undefined;
      return val === 'true';
    }),
  min_capacity: z.coerce.number().int().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const checkTableAvailabilityQuerySchema = z.object({
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  party_size: z.coerce.number().int().min(1).optional(),
});

export type CreateDiningAreaInput = z.infer<typeof createDiningAreaSchema>;
export type UpdateDiningAreaInput = z.infer<typeof updateDiningAreaSchema>;
export type ListDiningAreaQueryInput = z.infer<typeof listDiningAreaQuerySchema>;
export type CreateDiningTableInput = z.infer<typeof createDiningTableSchema>;
export type UpdateDiningTableInput = z.infer<typeof updateDiningTableSchema>;
export type ChangeTableStatusInput = z.infer<typeof changeTableStatusSchema>;
export type ListDiningTableQueryInput = z.infer<typeof listDiningTableQuerySchema>;
export type CheckTableAvailabilityQueryInput = z.infer<typeof checkTableAvailabilityQuerySchema>;

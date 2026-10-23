import { z } from 'zod';

export const phoneValidation = z
  .string()
  .trim()
  .max(25, 'Phone number cannot exceed 25 characters')
  .refine(
    (val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, '');
      return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
    },
    { message: 'Phone number must be a valid 10-digit mobile number' }
  )
  .optional()
  .nullable()
  .or(z.literal(''));

export const createReservationSchema = z
  .object({
    restaurant_id: z.string().optional(),
    branch_id: z.string().optional(),
    reservation_number: z.string().trim().max(40).optional(),
    guest_name: z.string().trim().min(1, 'Guest name is required').max(150),
    guest_phone: phoneValidation,
    guest_email: z.string().trim().email('Invalid email address').max(254).optional().nullable().or(z.literal('')),
    guest_count: z.coerce.number().int().min(1, 'Guest count must be at least 1'),
    reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Reservation date must be in YYYY-MM-DD format'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().optional().nullable(),
    duration_minutes: z.coerce.number().int().min(15, 'Duration must be at least 15 minutes').default(90),
    reservation_status: z
      .enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'])
      .default('confirmed'),
    reservation_source: z
      .enum(['walk_in', 'phone', 'website', 'mobile_app', 'admin', 'third_party'])
      .default('phone'),
    special_requests: z.string().trim().optional().nullable(),
    occasion: z.string().trim().max(50).optional().nullable(),
    estimated_amount: z.coerce.number().min(0).default(0),
    deposit_amount: z.coerce.number().min(0).default(0),
    deposit_status: z
      .enum(['not_required', 'pending', 'paid', 'refunded', 'forfeited'])
      .default('not_required'),
    assigned_table_ids: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.end_time) > new Date(data.start_time);
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  );

export const updateReservationSchema = z
  .object({
    guest_name: z.string().trim().min(1).max(150).optional(),
    guest_phone: phoneValidation,
    guest_email: z.string().trim().email().max(254).optional().nullable().or(z.literal('')),
    guest_count: z.coerce.number().int().min(1).optional(),
    reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional().nullable(),
    duration_minutes: z.coerce.number().int().min(15).optional(),
    reservation_status: z
      .enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'])
      .optional(),
    reservation_source: z
      .enum(['walk_in', 'phone', 'website', 'mobile_app', 'admin', 'third_party'])
      .optional(),
    special_requests: z.string().trim().optional().nullable(),
    occasion: z.string().trim().max(50).optional().nullable(),
    estimated_amount: z.coerce.number().min(0).optional(),
    deposit_amount: z.coerce.number().min(0).optional(),
    deposit_status: z
      .enum(['not_required', 'pending', 'paid', 'refunded', 'forfeited'])
      .optional(),
    cancellation_reason: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.end_time) > new Date(data.start_time);
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  );

export const listReservationsQuerySchema = z.object({
  branch_id: z.string().optional(),
  restaurant_id: z.string().optional(),
  date: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const cancelReservationSchema = z.object({
  cancellation_reason: z.string().trim().min(1, 'Cancellation reason is required'),
});

export const seatReservationSchema = z.object({
  table_ids: z.array(z.string()).optional(),
  notes: z.string().trim().optional(),
});

export const assignTablesSchema = z.object({
  dining_table_ids: z.array(z.string()).min(1, 'At least one table must be selected'),
  notes: z.string().trim().optional().nullable(),
});

export const updateTableAssignmentSchema = z.object({
  assignment_status: z.enum(['active', 'released', 'cancelled']),
  notes: z.string().trim().optional().nullable(),
});

export const checkAvailabilityQuerySchema = z.object({
  branch_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  start_time: z.string().min(1, 'Start time is required'),
  duration_minutes: z.coerce.number().int().min(15).default(90),
  guest_count: z.coerce.number().int().min(1, 'Guest count must be at least 1'),
  preferred_area_id: z.string().optional(),
});

// Waiting List Schemas
export const createWaitingListEntrySchema = z.object({
  restaurant_id: z.string().optional(),
  branch_id: z.string().optional(),
  guest_name: z.string().trim().min(1, 'Guest name is required').max(150),
  guest_phone: phoneValidation,
  guest_email: z.string().trim().email().max(254).optional().nullable().or(z.literal('')),
  guest_count: z.coerce.number().int().min(1, 'Party size must be at least 1'),
  preferred_area_id: z.string().optional().nullable(),
  seating_preference: z.enum(['indoor', 'outdoor', 'bar', 'quiet', 'any']).default('any'),
  estimated_wait_minutes: z.coerce.number().int().min(0).default(15),
  notes: z.string().trim().optional().nullable(),
});

export const updateWaitingListEntrySchema = z.object({
  guest_name: z.string().trim().min(1).max(150).optional(),
  guest_phone: phoneValidation,
  guest_email: z.string().trim().email().max(254).optional().nullable().or(z.literal('')),
  guest_count: z.coerce.number().int().min(1).optional(),
  preferred_area_id: z.string().optional().nullable(),
  seating_preference: z.enum(['indoor', 'outdoor', 'bar', 'quiet', 'any']).optional(),
  estimated_wait_minutes: z.coerce.number().int().min(0).optional(),
  status: z.enum(['waiting', 'notified', 'seated', 'cancelled', 'no_show']).optional(),
  notes: z.string().trim().optional().nullable(),
});

export const listWaitingListQuerySchema = z.object({
  branch_id: z.string().optional(),
  restaurant_id: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const seatWaitingListGuestSchema = z.object({
  dining_table_id: z.string().min(1, 'Dining table is required'),
  notes: z.string().trim().optional().nullable(),
});

export const cancelWaitingListSchema = z.object({
  reason: z.string().trim().optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type ListReservationsQueryInput = z.infer<typeof listReservationsQuerySchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type SeatReservationInput = z.infer<typeof seatReservationSchema>;
export type AssignTablesInput = z.infer<typeof assignTablesSchema>;
export type UpdateTableAssignmentInput = z.infer<typeof updateTableAssignmentSchema>;
export type CheckAvailabilityQueryInput = z.infer<typeof checkAvailabilityQuerySchema>;

export type CreateWaitingListEntryInput = z.infer<typeof createWaitingListEntrySchema>;
export type UpdateWaitingListEntryInput = z.infer<typeof updateWaitingListEntrySchema>;
export type ListWaitingListQueryInput = z.infer<typeof listWaitingListQuerySchema>;
export type SeatWaitingListGuestInput = z.infer<typeof seatWaitingListGuestSchema>;
export type CancelWaitingListInput = z.infer<typeof cancelWaitingListSchema>;

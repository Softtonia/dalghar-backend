import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ReservationSource =
  | 'walk_in'
  | 'phone'
  | 'website'
  | 'mobile_app'
  | 'admin'
  | 'third_party';

export type DepositStatus =
  | 'not_required'
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'forfeited';

export interface ITableReservation extends Document {
  id: string;
  restaurant_id: Types.ObjectId | string;
  branch_id: Types.ObjectId | string;
  reservation_number: string;
  guest_name: string;
  guest_phone?: string | null;
  guest_email?: string | null;
  guest_count: number;
  reservation_date: string; // ISO date string (YYYY-MM-DD)
  start_time: Date;
  end_time?: Date | null;
  duration_minutes: number;
  reservation_status: ReservationStatus;
  reservation_source: ReservationSource;
  special_requests?: string | null;
  occasion?: string | null;
  estimated_amount?: number;
  deposit_amount?: number;
  deposit_status: DepositStatus;
  confirmed_at?: Date | null;
  checked_in_at?: Date | null;
  seated_at?: Date | null;
  cancelled_at?: Date | null;
  cancellation_reason?: string | null;
  created_by?: Types.ObjectId | string | null;
  updated_by?: Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const tableReservationSchema = new Schema<ITableReservation>(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
      index: true,
    },
    restaurant_id: {
      type: Schema.Types.Mixed,
      required: [true, 'Restaurant ID is required'],
      ref: 'Restaurant',
      index: true,
    },
    branch_id: {
      type: Schema.Types.Mixed,
      required: [true, 'Branch ID is required'],
      ref: 'Branch',
      index: true,
    },
    reservation_number: {
      type: String,
      required: [true, 'Reservation reference number is required'],
      trim: true,
      maxlength: 40,
    },
    guest_name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
      maxlength: 150,
    },
    guest_phone: {
      type: String,
      trim: true,
      maxlength: 25,
      default: null,
    },
    guest_email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: null,
    },
    guest_count: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'Guest count must be at least 1'],
    },
    reservation_date: {
      type: String,
      required: [true, 'Reservation date is required'],
      index: true,
    },
    start_time: {
      type: Date,
      required: [true, 'Reservation start time is required'],
      index: true,
    },
    end_time: {
      type: Date,
      default: null,
      index: true,
    },
    duration_minutes: {
      type: Number,
      default: 90,
      min: [15, 'Reservation duration must be at least 15 minutes'],
    },
    reservation_status: {
      type: String,
      enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
      default: 'confirmed',
      index: true,
    },
    reservation_source: {
      type: String,
      enum: ['walk_in', 'phone', 'website', 'mobile_app', 'admin', 'third_party'],
      default: 'phone',
    },
    special_requests: {
      type: String,
      default: null,
    },
    occasion: {
      type: String,
      maxlength: 50,
      default: null,
    },
    estimated_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deposit_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deposit_status: {
      type: String,
      enum: ['not_required', 'pending', 'paid', 'refunded', 'forfeited'],
      default: 'not_required',
    },
    confirmed_at: {
      type: Date,
      default: null,
    },
    checked_in_at: {
      type: Date,
      default: null,
    },
    seated_at: {
      type: Date,
      default: null,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    cancellation_reason: {
      type: String,
      default: null,
    },
    created_by: {
      type: Schema.Types.Mixed,
      ref: 'User',
      default: null,
    },
    updated_by: {
      type: Schema.Types.Mixed,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'table_reservations',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Unique booking reference per branch
tableReservationSchema.index({ branch_id: 1, reservation_number: 1 }, { unique: true });
// Search index for reservations
tableReservationSchema.index({ branch_id: 1, reservation_date: 1, reservation_status: 1 });
tableReservationSchema.index({ branch_id: 1, start_time: 1, end_time: 1 });

export const TableReservation = model<ITableReservation>(
  'TableReservation',
  tableReservationSchema
);

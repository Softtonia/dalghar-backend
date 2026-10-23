import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type WaitingListStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no_show';
export type SeatingPreference = 'indoor' | 'outdoor' | 'bar' | 'quiet' | 'any';

export interface IWaitingListEntry extends Document {
  id: string;
  restaurant_id: Types.ObjectId | string;
  branch_id: Types.ObjectId | string;
  queue_number: string;
  guest_name: string;
  guest_phone?: string | null;
  guest_email?: string | null;
  guest_count: number;
  preferred_area_id?: Types.ObjectId | string | null;
  seating_preference: SeatingPreference;
  estimated_wait_minutes: number;
  status: WaitingListStatus;
  notified_at?: Date | null;
  notification_count: number;
  seated_at?: Date | null;
  seated_table_id?: Types.ObjectId | string | null;
  notes?: string | null;
  created_by?: Types.ObjectId | string | null;
  updated_by?: Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const waitingListEntrySchema = new Schema<IWaitingListEntry>(
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
    queue_number: {
      type: String,
      required: [true, 'Queue number is required'],
      trim: true,
      maxlength: 30,
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
    preferred_area_id: {
      type: Schema.Types.Mixed,
      ref: 'DiningArea',
      default: null,
    },
    seating_preference: {
      type: String,
      enum: ['indoor', 'outdoor', 'bar', 'quiet', 'any'],
      default: 'any',
    },
    estimated_wait_minutes: {
      type: Number,
      default: 15,
      min: [0, 'Wait time cannot be negative'],
    },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'seated', 'cancelled', 'no_show'],
      default: 'waiting',
      index: true,
    },
    notified_at: {
      type: Date,
      default: null,
    },
    notification_count: {
      type: Number,
      default: 0,
    },
    seated_at: {
      type: Date,
      default: null,
    },
    seated_table_id: {
      type: Schema.Types.Mixed,
      ref: 'DiningTable',
      default: null,
    },
    notes: {
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
    collection: 'waiting_list_entries',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
waitingListEntrySchema.index({ branch_id: 1, status: 1, createdAt: 1 });
waitingListEntrySchema.index({ branch_id: 1, queue_number: 1 });

export const WaitingListEntry = model<IWaitingListEntry>(
  'WaitingListEntry',
  waitingListEntrySchema
);

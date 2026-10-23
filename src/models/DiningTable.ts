import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type DiningTableShape = 'square' | 'round' | 'rectangle' | 'oval' | 'custom';
export type DiningTableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service';

export interface IDiningTable extends Document {
  id: string;
  restaurant_id: Types.ObjectId | string;
  branch_id: Types.ObjectId | string;
  dining_area_id: Types.ObjectId | string;
  table_number: string;
  display_name?: string | null;
  capacity: number;
  minimum_capacity?: number | null;
  shape: DiningTableShape;
  position_x?: number | null;
  position_y?: number | null;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
  current_status: DiningTableStatus;
  is_combinable: boolean;
  is_active: boolean;
  notes?: string | null;
  qr_code?: {
    token: string;
    token_hash: string;
    generated_at: Date;
    is_active: boolean;
  } | null;
  created_by?: Types.ObjectId | string | null;
  updated_by?: Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const diningTableSchema = new Schema<IDiningTable>(
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
    dining_area_id: {
      type: Schema.Types.Mixed,
      required: false,
      ref: 'DiningArea',
      index: true,
    },
    table_number: {
      type: String,
      required: [true, 'Table number is required'],
      trim: true,
      maxlength: 30,
    },
    display_name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be greater than 0'],
    },
    minimum_capacity: {
      type: Number,
      default: null,
      validate: {
        validator: function (this: any, val: number | null | undefined) {
          if (val === null || val === undefined) return true;
          return val > 0 && val <= (this.capacity || Infinity);
        },
        message: 'Minimum capacity must be positive and no greater than capacity',
      },
    },
    shape: {
      type: String,
      enum: ['square', 'round', 'rectangle', 'oval', 'custom'],
      default: 'square',
    },
    position_x: {
      type: Number,
      default: 0,
    },
    position_y: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 80,
    },
    height: {
      type: Number,
      default: 80,
    },
    rotation: {
      type: Number,
      default: 0,
    },
    current_status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'cleaning', 'out_of_service'],
      default: 'available',
      index: true,
    },
    is_combinable: {
      type: Boolean,
      default: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    qr_code: {
      token: { type: String, default: null },
      token_hash: { type: String, default: null, index: true },
      generated_at: { type: Date, default: null },
      is_active: { type: Boolean, default: true },
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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'dining_tables',
  }
);

// Compound unique constraint on (branch_id, table_number)
diningTableSchema.index({ branch_id: 1, table_number: 1 }, { unique: true });

diningTableSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.__v;
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    return ret;
  },
});

export const DiningTable = model<IDiningTable>('DiningTable', diningTableSchema);

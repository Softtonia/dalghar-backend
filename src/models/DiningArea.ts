import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type DiningAreaType = 'floor' | 'section' | 'patio' | 'private_room' | 'outdoor' | 'other';
export type DiningAreaStatus = 'active' | 'inactive';

export interface IDiningAreaLayoutConfig {
  gridWidth?: number;
  gridHeight?: number;
  backgroundColor?: string;
  gridSize?: number;
  backgroundImageUrl?: string;
  [key: string]: any;
}

export interface IDiningArea extends Document {
  id: string;
  restaurant_id: Types.ObjectId | string;
  branch_id: Types.ObjectId | string;
  name: string;
  code: string;
  area_type: DiningAreaType;
  description?: string | null;
  parent_area_id?: Types.ObjectId | string | null;
  display_order: number;
  layout_config?: IDiningAreaLayoutConfig | null;
  status: DiningAreaStatus;
  created_by?: Types.ObjectId | string | null;
  updated_by?: Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const diningAreaSchema = new Schema<IDiningArea>(
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
    name: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, 'Area code is required'],
      trim: true,
      maxlength: 50,
      uppercase: true,
    },
    area_type: {
      type: String,
      enum: ['floor', 'section', 'patio', 'private_room', 'outdoor', 'other'],
      default: 'floor',
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    parent_area_id: {
      type: Schema.Types.Mixed,
      ref: 'DiningArea',
      default: null,
      index: true,
    },
    display_order: {
      type: Number,
      default: 0,
    },
    layout_config: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
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
    collection: 'dining_areas',
  }
);

// Unique compound index on (branch_id, code)
diningAreaSchema.index({ branch_id: 1, code: 1 }, { unique: true });

diningAreaSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.__v;
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    return ret;
  },
});

export const DiningArea = model<IDiningArea>('DiningArea', diningAreaSchema);

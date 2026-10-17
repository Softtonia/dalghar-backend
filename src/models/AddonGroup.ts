import { Schema, model, Document, Types } from 'mongoose';

export type AddonSelectionType = 'single' | 'multiple';
export type AddonGroupStatus = 'active' | 'inactive';

export interface IAddonGroupOption {
  name: string;
  price: number;
  isDefault?: boolean;
  status?: AddonGroupStatus;
}

export interface IAddonGroup extends Document {
  restaurantId?: Types.ObjectId;
  menuId?: Types.ObjectId;
  name: string;
  description?: string;
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  selection_type: AddonSelectionType;
  status: AddonGroupStatus;
  options: IAddonGroupOption[];
  menuItemIds?: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AddonGroupOptionSchema = new Schema<IAddonGroupOption>(
  {
    name: {
      type: String,
      required: [true, 'Option name is required'],
      trim: true,
      maxlength: 120,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { _id: true }
);

const AddonGroupSchema = new Schema<IAddonGroup>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
      index: true,
    },
    menuId: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Addon group name is required'],
      trim: true,
      maxlength: 120,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    min_selections: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_selections: {
      type: Number,
      default: 1,
      min: 1,
    },
    is_required: {
      type: Boolean,
      default: false,
      index: true,
    },
    selection_type: {
      type: String,
      enum: ['single', 'multiple'],
      default: 'single',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    options: {
      type: [AddonGroupOptionSchema],
      default: [],
    },
    menuItemIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'addon_groups',
  }
);

AddonGroupSchema.index({ restaurantId: 1, status: 1 });
AddonGroupSchema.index({ menuId: 1, status: 1 });

export const AddonGroup = model<IAddonGroup>('AddonGroup', AddonGroupSchema);

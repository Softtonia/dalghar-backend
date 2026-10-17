import { Schema, model, Document, Types } from 'mongoose';

export type FoodItemType = 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN' | 'vegetarian' | 'non_vegetarian' | 'vegan' | 'egg';
export type MenuItemStatus = 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';

export interface IMenuVariant {
  name: string;
  price: number;
}

export interface IMenuAddon {
  name: string;
  price: number;
}

export interface IMenuItem extends Document {
  menuId?: Types.ObjectId;
  categoryId?: Types.ObjectId;
  restaurantId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  category: string;
  itemType: FoodItemType;
  foodType: string;
  price: number;
  currency: string;
  discountPrice?: number;
  preparationTime?: number;
  taxRate?: number;
  isAvailable: boolean;
  displayOrder: number;
  status: string;
  imageUrl?: string;
  cuisine?: string;
  dietaryTags?: string[];
  variants: IMenuVariant[];
  addons: IMenuAddon[];
  addonGroupIds?: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IMenuVariant>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const AddonSchema = new Schema<IMenuAddon>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const MenuItemSchema = new Schema<IMenuItem>(
  {
    menuId: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      default: null,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuCategory',
      default: null,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: 150,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ['VEG', 'NON_VEG', 'EGG', 'VEGAN', 'vegetarian', 'non_vegetarian', 'vegan', 'egg'],
      default: 'VEG',
      index: true,
    },
    foodType: {
      type: String,
      enum: ['vegetarian', 'non_vegetarian', 'vegan', 'egg', 'VEG', 'NON_VEG', 'EGG', 'VEGAN'],
      default: 'vegetarian',
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    discountPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    preparationTime: {
      type: Number,
      min: 0,
      default: 15,
    },
    taxRate: {
      type: Number,
      min: 0,
      default: 5,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'ACTIVE', 'INACTIVE'],
      default: 'active',
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    cuisine: {
      type: String,
      default: '',
      trim: true,
    },
    dietaryTags: {
      type: [String],
      default: [],
    },
    variants: {
      type: [VariantSchema],
      default: [],
    },
    addons: {
      type: [AddonSchema],
      default: [],
    },
    addonGroupIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'AddonGroup' }],
      default: [],
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
  }
);

MenuItemSchema.index({ menuId: 1, categoryId: 1 });
MenuItemSchema.index({ restaurantId: 1, branchId: 1 });

export const MenuItem = model<IMenuItem>('MenuItem', MenuItemSchema);

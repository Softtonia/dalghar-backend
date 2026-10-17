import { Schema, model, Document, Types } from 'mongoose';

export type CategoryStatus = 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';

export interface IMenuCategory extends Document {
  menuId?: Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  status: CategoryStatus;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MenuCategorySchema = new Schema<IMenuCategory>(
  {
    menuId: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: 100,
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
    imageUrl: {
      type: String,
      trim: true,
      default: null,
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
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
  }
);

export const MenuCategory = model<IMenuCategory>('MenuCategory', MenuCategorySchema);

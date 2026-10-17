import { Schema, model, Document, Types } from 'mongoose';

export type MenuStatus = 'active' | 'inactive' | 'draft' | 'published' | 'archived' | 'ACTIVE' | 'INACTIVE';
export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'all_day';
export type MenuType = 'dine_in' | 'takeaway' | 'delivery';

export interface IMenu extends Document {
  name: string;
  code?: string;
  description?: string;
  imageUrl?: string;
  cuisine?: string;
  menuType: MenuType[];
  isPublished: boolean;
  sortOrder: number;
  status: string;
  mealPeriod?: MealPeriod;
  scheduleMode?: 'automatic' | 'custom';
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: string[];
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MenuSchema = new Schema<IMenu>(
  {
    name: {
      type: String,
      required: [true, 'Menu name is required'],
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
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    cuisine: {
      type: String,
      trim: true,
      default: '',
    },
    menuType: {
      type: [String],
      enum: ['dine_in', 'takeaway', 'delivery'],
      default: ['dine_in', 'takeaway', 'delivery'],
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft', 'published', 'archived', 'ACTIVE', 'INACTIVE'],
      default: 'draft',
      index: true,
    },
    mealPeriod: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'all_day'],
      default: 'all_day',
    },
    scheduleMode: {
      type: String,
      enum: ['automatic', 'custom'],
      default: 'automatic',
    },
    startDate: {
      type: String,
      default: null,
    },
    endDate: {
      type: String,
      default: null,
    },
    startTime: {
      type: String,
      default: null,
    },
    endTime: {
      type: String,
      default: null,
    },
    daysOfWeek: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
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

export const Menu = model<IMenu>('Menu', MenuSchema);

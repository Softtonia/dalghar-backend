import { Schema, model, Document, Types } from 'mongoose';

export type MenuAssignmentStatus = 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';

export interface IMenuRestaurantAssignment extends Document {
  menuId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  status: MenuAssignmentStatus;
  assignedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MenuRestaurantAssignmentSchema = new Schema<IMenuRestaurantAssignment>(
  {
    menuId: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'ACTIVE', 'INACTIVE'],
      default: 'active',
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

MenuRestaurantAssignmentSchema.index({ menuId: 1, restaurantId: 1 }, { unique: true });

export const MenuRestaurantAssignment = model<IMenuRestaurantAssignment>(
  'MenuRestaurantAssignment',
  MenuRestaurantAssignmentSchema
);

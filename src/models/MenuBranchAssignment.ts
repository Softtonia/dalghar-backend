import { Schema, model, Document, Types } from 'mongoose';

export type MenuAssignmentStatus = 'ACTIVE' | 'INACTIVE';

export interface IMenuBranchAssignment extends Document {
  menuId: Types.ObjectId;
  branchId: Types.ObjectId;
  restaurantId?: Types.ObjectId;
  status: MenuAssignmentStatus;
  assignedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MenuBranchAssignmentSchema = new Schema<IMenuBranchAssignment>(
  {
    menuId: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
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

MenuBranchAssignmentSchema.index({ menuId: 1, branchId: 1 }, { unique: true });

export const MenuBranchAssignment = model<IMenuBranchAssignment>(
  'MenuBranchAssignment',
  MenuBranchAssignmentSchema
);

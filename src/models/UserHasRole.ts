import { Schema, model, Document, Types } from 'mongoose';

export interface IUserHasRole extends Document {
  userId: Types.ObjectId;
  roleId: Types.ObjectId;
  assignedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const userHasRoleSchema = new Schema<IUserHasRole>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
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

// Compound unique index to prevent duplicate assignment of same role to a user
userHasRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

userHasRoleSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export const UserHasRole = model<IUserHasRole>('UserHasRole', userHasRoleSchema);

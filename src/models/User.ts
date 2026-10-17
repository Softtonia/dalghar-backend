import { Schema, model, Document } from 'mongoose';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'RESTAURANT_ADMIN'
  | 'BRANCH_MANAGER'
  | 'CASHIER'
  | 'KITCHEN_STAFF'
  | (string & {});

export interface IUser extends Document {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  passwordHash?: string;
  role: string;
  restaurantId?: string | null;
  branchId?: string | null;
  permissions: string[];
  isActive: boolean;
  resetPasswordOtp?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      default: 'CASHIER',
    },
    restaurantId: {
      type: String,
      default: null,
    },
    branchId: {
      type: String,
      default: null,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure passwordHash is never returned in JSON output
userSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);

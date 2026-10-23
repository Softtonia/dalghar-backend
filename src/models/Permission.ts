import { Schema, model, Document } from 'mongoose';

export interface IPermission extends Document {
  name: string;
  key: string;
  module: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      trim: true,
      maxlength: 120,
    },
    key: {
      type: String,
      required: [true, 'Permission key is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      maxlength: 100,
    },
    module: {
      type: String,
      required: [true, 'Module identifier is required'],
      trim: true,
      lowercase: true,
      index: true,
      maxlength: 60,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 255,
    },
  },
  {
    timestamps: true,
  }
);

permissionSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export const Permission = model<IPermission>('Permission', permissionSchema);

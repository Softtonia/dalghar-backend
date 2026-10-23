import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type TableStatusSource = 'pos' | 'reservation' | 'kitchen' | 'staff' | 'admin' | 'system';

export interface IDiningTableStatusHistory extends Document {
  id: string;
  restaurant_id?: Types.ObjectId | string | null;
  branch_id?: Types.ObjectId | string | null;
  dining_table_id: Types.ObjectId | string;
  previous_status?: string | null;
  new_status: string;
  reason?: string | null;
  notes?: string | null;
  changed_by?: Types.ObjectId | string | null;
  changed_at: Date;
  source: TableStatusSource;
  reference_type?: string | null;
  reference_id?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const diningTableStatusHistorySchema = new Schema<IDiningTableStatusHistory>(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
      index: true,
    },
    restaurant_id: {
      type: Schema.Types.Mixed,
      ref: 'Restaurant',
      default: null,
      index: true,
    },
    branch_id: {
      type: Schema.Types.Mixed,
      ref: 'Branch',
      default: null,
      index: true,
    },
    dining_table_id: {
      type: Schema.Types.Mixed,
      required: [true, 'Dining table ID is required'],
      ref: 'DiningTable',
      index: true,
    },
    previous_status: {
      type: String,
      default: null,
    },
    new_status: {
      type: String,
      required: [true, 'New status is required'],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    changed_by: {
      type: Schema.Types.Mixed,
      ref: 'User',
      default: null,
    },
    changed_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ['pos', 'reservation', 'kitchen', 'staff', 'admin', 'system'],
      default: 'admin',
    },
    reference_type: {
      type: String,
      maxlength: 40,
      default: null,
    },
    reference_id: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'dining_table_status_history',
  }
);

diningTableStatusHistorySchema.index({ dining_table_id: 1, changed_at: -1 });

diningTableStatusHistorySchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.__v;
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    return ret;
  },
});

export const DiningTableStatusHistory = model<IDiningTableStatusHistory>(
  'DiningTableStatusHistory',
  diningTableStatusHistorySchema
);

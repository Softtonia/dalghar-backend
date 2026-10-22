import { Schema, model, Document, Types } from 'mongoose';

export type TransactionAdjustmentType = 'void' | 'cancel' | 'refund' | 'reversal';
export type TransactionAdjustmentStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface IPosTransactionAdjustment extends Document {
  terminal_transaction_id: Types.ObjectId;
  order_id?: Types.ObjectId | null;
  adjustment_type: TransactionAdjustmentType;
  reason_code: string;
  reason: string;
  amount: number;
  requested_by: Types.ObjectId;
  approved_by?: Types.ObjectId | null;
  requested_at: Date;
  approved_at?: Date | null;
  status: TransactionAdjustmentStatus;
  idempotency_key?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const posTransactionAdjustmentSchema = new Schema<IPosTransactionAdjustment>(
  {
    terminal_transaction_id: {
      type: Schema.Types.ObjectId,
      ref: 'PosTerminalTransaction',
      required: true,
      index: true,
    },
    order_id: { type: Schema.Types.ObjectId, default: null, index: true },
    adjustment_type: {
      type: String,
      enum: ['void', 'cancel', 'refund', 'reversal'],
      required: true,
      index: true,
    },
    reason_code: { type: String, required: true, trim: true, maxlength: 50 },
    reason: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    requested_at: { type: Date, default: Date.now },
    approved_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
      required: true,
      index: true,
    },
    idempotency_key: { type: String, default: null, sparse: true, index: true },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      },
    },
  }
);

// Indexes
posTransactionAdjustmentSchema.index({ terminal_transaction_id: 1, createdAt: -1 });
posTransactionAdjustmentSchema.index({ status: 1, createdAt: -1 });

export const PosTransactionAdjustment = model<IPosTransactionAdjustment>(
  'PosTransactionAdjustment',
  posTransactionAdjustmentSchema
);

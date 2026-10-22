import { Schema, model, Document, Types } from 'mongoose';

export type ReconciliationStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'recount_required';

export interface IPosShiftReconciliation extends Document {
  shift_id: Types.ObjectId;
  reconciliation_attempt: number;
  counted_cash_amount: number;
  expected_cash_amount: number;
  variance_amount: number;
  counted_by: Types.ObjectId;
  reviewed_by?: Types.ObjectId | null;
  reviewed_at?: Date | null;
  status: ReconciliationStatus;
  reconciliation_notes?: string | null;
  reconciled_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const posShiftReconciliationSchema = new Schema<IPosShiftReconciliation>(
  {
    shift_id: { type: Schema.Types.ObjectId, ref: 'CashierShift', required: true, index: true },
    reconciliation_attempt: { type: Number, required: true, default: 1, min: 1 },
    counted_cash_amount: { type: Number, required: true, min: [0, 'Counted cash cannot be negative'] },
    expected_cash_amount: { type: Number, required: true },
    variance_amount: { type: Number, required: true },
    counted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected', 'recount_required'],
      default: 'submitted',
      index: true,
    },
    reconciliation_notes: { type: String, trim: true, default: null },
    reconciled_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

// Indexes
posShiftReconciliationSchema.index({ shift_id: 1, reconciliation_attempt: 1 }, { unique: true });
posShiftReconciliationSchema.index({ shift_id: 1, status: 1 });

export const PosShiftReconciliation = model<IPosShiftReconciliation>(
  'PosShiftReconciliation',
  posShiftReconciliationSchema
);

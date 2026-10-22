import { Schema, model, Document, Types } from 'mongoose';

export type ShiftStatus = 'open' | 'closing' | 'closed' | 'force_closed' | 'reconciled' | 'disputed';

export interface ICashierShift extends Document {
  restaurant_id?: Types.ObjectId | null;
  branch_id: Types.ObjectId;
  terminal_id: Types.ObjectId;
  cashier_id: Types.ObjectId;
  shift_number: string;
  opened_at: Date;
  closed_at?: Date | null;
  opening_cash: number;
  opening_cash_amount?: number;
  expected_cash: number;
  expected_cash_amount?: number;
  counted_cash?: number | null;
  closing_cash_amount?: number | null;
  cash_variance?: number | null;
  cash_variance_amount?: number | null;
  status: ShiftStatus;
  closing_notes?: string | null;
  close_notes?: string | null;
  opened_by: Types.ObjectId;
  closed_by?: Types.ObjectId | null;
  approved_by?: Types.ObjectId | null;
  approved_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const cashierShiftSchema = new Schema<ICashierShift>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', required: true, index: true },
    cashier_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shift_number: { type: String, required: true, index: true },
    opened_at: { type: Date, required: true, default: Date.now },
    closed_at: { type: Date, default: null },
    opening_cash: { type: Number, required: true, default: 0, min: 0 },
    opening_cash_amount: { type: Number, default: 0, min: 0 },
    expected_cash: { type: Number, required: true, default: 0 },
    expected_cash_amount: { type: Number, default: 0 },
    counted_cash: { type: Number, default: null },
    closing_cash_amount: { type: Number, default: null },
    cash_variance: { type: Number, default: null },
    cash_variance_amount: { type: Number, default: null },
    status: {
      type: String,
      enum: ['open', 'closing', 'closed', 'force_closed', 'reconciled', 'disputed'],
      default: 'open',
      index: true,
    },
    closing_notes: { type: String, default: null },
    close_notes: { type: String, default: null },
    opened_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    closed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        ret.opening_cash_amount = ret.opening_cash_amount ?? ret.opening_cash;
        ret.closing_cash_amount = ret.closing_cash_amount ?? ret.counted_cash;
        ret.expected_cash_amount = ret.expected_cash_amount ?? ret.expected_cash;
        ret.cash_variance_amount = ret.cash_variance_amount ?? ret.cash_variance;
        ret.close_notes = ret.close_notes ?? ret.closing_notes;
        return ret;
      },
    },
  }
);

// Partial unique index preventing multiple OPEN or CLOSING shifts for the same terminal
cashierShiftSchema.index(
  { terminal_id: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['open', 'closing'] } },
  }
);

export const CashierShift = model<ICashierShift>('CashierShift', cashierShiftSchema);

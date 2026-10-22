import { Schema, model, Document, Types } from 'mongoose';

export type TerminalTransactionType = 'sale' | 'refund' | 'void' | 'payment' | 'reversal';
export type TerminalTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'reversed';

export interface IPosTerminalTransaction extends Document {
  restaurant_id: Types.ObjectId;
  branch_id: Types.ObjectId;
  terminal_id: Types.ObjectId;
  shift_id?: Types.ObjectId | null;
  cashier_id: Types.ObjectId;
  order_id?: Types.ObjectId | null;
  payment_id?: Types.ObjectId | null;
  bill_allocation_id?: Types.ObjectId | null;
  transaction_reference: string;
  transaction_type: TerminalTransactionType;
  amount: number;
  currency_code: string;
  status: TerminalTransactionStatus;
  started_at: Date;
  completed_at?: Date | null;
  failure_reason?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const posTerminalTransactionSchema = new Schema<IPosTerminalTransaction>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', required: true, index: true },
    shift_id: { type: Schema.Types.ObjectId, ref: 'CashierShift', default: null, index: true },
    cashier_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order_id: { type: Schema.Types.ObjectId, default: null, index: true },
    payment_id: { type: Schema.Types.ObjectId, default: null, index: true },
    bill_allocation_id: { type: Schema.Types.ObjectId, ref: 'PosBillNumberAllocation', default: null, index: true },
    transaction_reference: { type: String, required: true, unique: true, trim: true, index: true },
    transaction_type: {
      type: String,
      enum: ['sale', 'refund', 'void', 'payment', 'reversal'],
      default: 'sale',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency_code: { type: String, required: true, default: 'INR', uppercase: true, trim: true, minlength: 3, maxlength: 3 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'],
      default: 'pending',
      required: true,
      index: true,
    },
    started_at: { type: Date, default: Date.now },
    completed_at: { type: Date, default: null },
    failure_reason: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
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

// Required indexes:
// (terminal_id, created_at DESC), (shift_id, created_at DESC), (restaurant_id, branch_id, status)
posTerminalTransactionSchema.index({ terminal_id: 1, createdAt: -1 });
posTerminalTransactionSchema.index({ shift_id: 1, createdAt: -1 });
posTerminalTransactionSchema.index({ restaurant_id: 1, branch_id: 1, status: 1 });

export const PosTerminalTransaction = model<IPosTerminalTransaction>(
  'PosTerminalTransaction',
  posTerminalTransactionSchema
);

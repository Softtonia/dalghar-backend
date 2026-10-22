import { Schema, model, Document, Types } from 'mongoose';

export type MovementType =
  | 'cash_in'
  | 'cash_out'
  | 'safe_drop'
  | 'paid_out'
  | 'float_addition'
  | 'float_removal'
  | 'payout'
  | 'petty_cash';

export interface ICashMovement extends Document {
  restaurant_id?: Types.ObjectId | null;
  branch_id?: Types.ObjectId | null;
  terminal_id?: Types.ObjectId | null;
  shift_id: Types.ObjectId;
  movement_type: MovementType;
  amount: number;
  reason_code?: string | null;
  reason: string;
  reference_number?: string | null;
  performed_by: Types.ObjectId;
  approved_by?: Types.ObjectId | null;
  approved_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const cashMovementSchema = new Schema<ICashMovement>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', default: null, index: true },
    shift_id: { type: Schema.Types.ObjectId, ref: 'CashierShift', required: true, index: true },
    movement_type: {
      type: String,
      enum: [
        'cash_in',
        'cash_out',
        'safe_drop',
        'paid_out',
        'float_addition',
        'float_removal',
        'payout',
        'petty_cash',
      ],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than 0'] },
    reason_code: { type: String, trim: true, default: null },
    reason: { type: String, required: true, trim: true },
    reference_number: { type: String, trim: true, default: null },
    performed_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
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

// Indexes (shift_id, createdAt) and (terminal_id, createdAt DESC)
cashMovementSchema.index({ shift_id: 1, createdAt: 1 });
cashMovementSchema.index({ terminal_id: 1, createdAt: -1 });

export const CashMovement = model<ICashMovement>('CashMovement', cashMovementSchema);

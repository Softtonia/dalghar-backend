import { Schema, model, Document, Types } from 'mongoose';

export type PosTransactionType = 'sale' | 'return' | 'refund';
export type PosTransactionStatus = 'draft' | 'pending_payment' | 'completed' | 'cancelled' | 'voided';

export interface IPosTransactionModifier {
  modifier_option_id?: Types.ObjectId | null;
  modifier_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface IPosTransactionItem {
  _id?: Types.ObjectId;
  menu_item_id?: Types.ObjectId | null;
  variant_id?: Types.ObjectId | null;
  item_name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  special_instructions?: string | null;
  modifiers?: IPosTransactionModifier[];
}

export interface IPosPaymentAttempt {
  attempt_number: number;
  provider_reference?: string | null;
  request_reference?: string | null;
  status: string;
  response_code?: string | null;
  failure_reason?: string | null;
  attempted_at: Date;
}

export interface IPosPayment {
  _id?: Types.ObjectId;
  payment_method_id?: string;
  payment_method_type: string;
  payment_reference?: string | null;
  provider_transaction_id?: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paid_at?: Date | null;
  failure_reason?: string | null;
  received_by?: Types.ObjectId | null;
  attempts?: IPosPaymentAttempt[];
}

export interface IPosTransaction extends Document {
  branch_id: Types.ObjectId;
  terminal_id: Types.ObjectId;
  shift_id: Types.ObjectId;
  order_id?: Types.ObjectId | null;
  transaction_number: string;
  transaction_type: PosTransactionType;
  status: PosTransactionStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_charge: number;
  rounding_amount: number;
  grand_total: number;
  items: IPosTransactionItem[];
  payments: IPosPayment[];
  notes?: string | null;
  created_by: Types.ObjectId;
  completed_at?: Date | null;
  voided_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const modifierSchema = new Schema<IPosTransactionModifier>(
  {
    modifier_option_id: { type: Schema.Types.ObjectId, default: null },
    modifier_name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unit_price: { type: Number, required: true, default: 0 },
    total_price: { type: Number, required: true, default: 0 },
  },
  { _id: true, timestamps: true }
);

const itemSchema = new Schema<IPosTransactionItem>(
  {
    menu_item_id: { type: Schema.Types.ObjectId, ref: 'MenuItem', default: null },
    variant_id: { type: Schema.Types.ObjectId, default: null },
    item_name: { type: String, required: true },
    sku: { type: String, default: null },
    quantity: { type: Number, required: true, min: 0.001 },
    unit_price: { type: Number, required: true, min: 0 },
    discount_amount: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    line_total: { type: Number, required: true },
    special_instructions: { type: String, default: null },
    modifiers: [modifierSchema],
  },
  { _id: true, timestamps: true }
);

const attemptSchema = new Schema<IPosPaymentAttempt>(
  {
    attempt_number: { type: Number, required: true },
    provider_reference: { type: String, default: null },
    request_reference: { type: String, default: null },
    status: { type: String, required: true },
    response_code: { type: String, default: null },
    failure_reason: { type: String, default: null },
    attempted_at: { type: Date, required: true, default: Date.now },
  },
  { _id: true, timestamps: true }
);

const paymentSchema = new Schema<IPosPayment>(
  {
    payment_method_id: { type: String, default: 'CASH' },
    payment_method_type: { type: String, required: true, default: 'CASH' },
    payment_reference: { type: String, default: null },
    provider_transaction_id: { type: String, default: null },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, default: 'INR', maxlength: 3 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      required: true,
      default: 'completed',
    },
    paid_at: { type: Date, default: null },
    failure_reason: { type: String, default: null },
    received_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    attempts: [attemptSchema],
  },
  { _id: true, timestamps: true }
);

const posTransactionSchema = new Schema<IPosTransaction>(
  {
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', required: true, index: true },
    shift_id: { type: Schema.Types.ObjectId, ref: 'CashierShift', required: true, index: true },
    order_id: { type: Schema.Types.ObjectId, default: null, index: true },
    transaction_number: { type: String, required: true, index: true },
    transaction_type: {
      type: String,
      enum: ['sale', 'return', 'refund'],
      required: true,
      default: 'sale',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_payment', 'completed', 'cancelled', 'voided'],
      required: true,
      default: 'draft',
      index: true,
    },
    subtotal: { type: Number, required: true, default: 0 },
    discount_total: { type: Number, default: 0 },
    tax_total: { type: Number, default: 0 },
    service_charge: { type: Number, default: 0 },
    rounding_amount: { type: Number, default: 0 },
    grand_total: { type: Number, required: true, default: 0 },
    items: [itemSchema],
    payments: [paymentSchema],
    notes: { type: String, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completed_at: { type: Date, default: null },
    voided_at: { type: Date, default: null },
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

// Constraint: unique (branch_id, transaction_number)
posTransactionSchema.index({ branch_id: 1, transaction_number: 1 }, { unique: true });

export const PosTransaction = model<IPosTransaction>('PosTransaction', posTransactionSchema);

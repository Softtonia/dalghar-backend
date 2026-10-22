import { Schema, model, Document, Types } from 'mongoose';

export type BillAllocationStatus = 'reserved' | 'issued' | 'voided' | 'failed';

export interface IPosBillNumberAllocation extends Document {
  series_id: Types.ObjectId;
  restaurant_id?: Types.ObjectId | null;
  branch_id?: Types.ObjectId | null;
  terminal_id: Types.ObjectId;
  shift_id?: Types.ObjectId | null;
  order_id?: Types.ObjectId | null;
  allocated_number: number;
  sequence_number?: number;
  formatted_number: string;
  bill_number?: string;
  document_type: string;
  status: BillAllocationStatus;
  allocated_by?: Types.ObjectId | null;
  allocated_to_user_id?: Types.ObjectId | null;
  allocated_at: Date;
  issued_at?: Date | null;
  failure_reason?: string | null;
  void_reason?: string | null;
  voided_at?: Date | null;
  voided_by?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const posBillNumberAllocationSchema = new Schema<IPosBillNumberAllocation>(
  {
    series_id: { type: Schema.Types.ObjectId, ref: 'PosBillNumberSeries', required: true, index: true },
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', required: true, index: true },
    shift_id: { type: Schema.Types.ObjectId, ref: 'CashierShift', default: null, index: true },
    order_id: { type: Schema.Types.ObjectId, default: null, index: true },
    allocated_number: { type: Number, required: true },
    formatted_number: { type: String, required: true, trim: true },
    document_type: {
      type: String,
      enum: ['sale', 'refund', 'credit_note', 'kitchen_ticket', 'kot'],
      default: 'sale',
      index: true,
    },
    status: {
      type: String,
      enum: ['reserved', 'issued', 'voided', 'failed'],
      default: 'reserved',
      index: true,
    },
    allocated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    allocated_at: { type: Date, default: Date.now },
    issued_at: { type: Date, default: null },
    failure_reason: { type: String, default: null },
    voided_at: { type: Date, default: null },
    voided_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.sequence_number = ret.allocated_number;
        ret.bill_number = ret.formatted_number;
        ret.allocated_to_user_id = ret.allocated_by;
        ret.void_reason = ret.failure_reason;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.sequence_number = ret.allocated_number;
        ret.bill_number = ret.formatted_number;
        ret.allocated_to_user_id = ret.allocated_by;
        ret.void_reason = ret.failure_reason;
        return ret;
      },
    },
  }
);

// Virtual aliases
posBillNumberAllocationSchema.virtual('sequence_number')
  .get(function () { return this.allocated_number; })
  .set(function (val: number) { this.allocated_number = val; });

posBillNumberAllocationSchema.virtual('bill_number')
  .get(function () { return this.formatted_number; })
  .set(function (val: string) { this.formatted_number = val; });

posBillNumberAllocationSchema.virtual('allocated_to_user_id')
  .get(function () { return this.allocated_by; })
  .set(function (val: Types.ObjectId | null) { this.allocated_by = val; });

posBillNumberAllocationSchema.virtual('void_reason')
  .get(function () { return this.failure_reason; })
  .set(function (val: string | null) { this.failure_reason = val; });

// Unique compound indexes required by specification:
// Unique (series_id, allocated_number) and unique (series_id, formatted_number)
posBillNumberAllocationSchema.index({ series_id: 1, allocated_number: 1 }, { unique: true });
posBillNumberAllocationSchema.index({ series_id: 1, formatted_number: 1 }, { unique: true });

posBillNumberAllocationSchema.index({ terminal_id: 1, status: 1 });
posBillNumberAllocationSchema.index({ shift_id: 1 });

export const PosBillNumberAllocation = model<IPosBillNumberAllocation>(
  'PosBillNumberAllocation',
  posBillNumberAllocationSchema
);

import { Schema, model, Document, Types } from 'mongoose';

export type BillSeriesType = 'sale' | 'refund' | 'credit_note' | 'kitchen_ticket' | 'kot';
export type BillSeriesScope = 'restaurant' | 'branch' | 'terminal';
export type BillResetFrequency = 'never' | 'daily' | 'monthly' | 'yearly';

export interface IPosBillNumberSeries extends Document {
  restaurant_id: Types.ObjectId;
  branch_id?: Types.ObjectId | null;
  terminal_id?: Types.ObjectId | null;
  series_name: string;
  document_type: BillSeriesType;
  series_type?: BillSeriesType;
  number_scope: BillSeriesScope;
  scope?: BillSeriesScope;
  prefix?: string | null;
  suffix?: string | null;
  minimum_digits: number;
  min_digits?: number;
  current_number: number;
  reset_frequency: BillResetFrequency;
  last_reset_at?: Date | null;
  last_reset_date?: Date | null;
  is_active: boolean;
  created_by?: Types.ObjectId | null;
  deleted_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const posBillNumberSeriesSchema = new Schema<IPosBillNumberSeries>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', default: null, index: true },
    series_name: { type: String, required: true, trim: true, maxlength: 100 },
    document_type: {
      type: String,
      enum: ['sale', 'refund', 'credit_note', 'kitchen_ticket', 'kot'],
      default: 'sale',
      required: true,
      index: true,
    },
    number_scope: {
      type: String,
      enum: ['restaurant', 'branch', 'terminal'],
      default: 'branch',
      required: true,
      index: true,
    },
    prefix: { type: String, default: '', trim: true, maxlength: 30 },
    suffix: { type: String, default: '', trim: true, maxlength: 30 },
    minimum_digits: { type: Number, default: 6 },
    current_number: { type: Number, default: 0 },
    reset_frequency: {
      type: String,
      enum: ['never', 'daily', 'monthly', 'yearly'],
      default: 'never',
    },
    last_reset_at: { type: Date, default: null },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.series_type = ret.document_type;
        ret.scope = ret.number_scope;
        ret.min_digits = ret.minimum_digits;
        ret.last_reset_date = ret.last_reset_at;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.series_type = ret.document_type;
        ret.scope = ret.number_scope;
        ret.min_digits = ret.minimum_digits;
        ret.last_reset_date = ret.last_reset_at;
        return ret;
      },
    },
  }
);

// Virtual aliases
posBillNumberSeriesSchema.virtual('series_type')
  .get(function () { return this.document_type; })
  .set(function (val: BillSeriesType) { this.document_type = val; });

posBillNumberSeriesSchema.virtual('scope')
  .get(function () { return this.number_scope; })
  .set(function (val: BillSeriesScope) { this.number_scope = val; });

posBillNumberSeriesSchema.virtual('min_digits')
  .get(function () { return this.minimum_digits; })
  .set(function (val: number) { this.minimum_digits = val; });

posBillNumberSeriesSchema.virtual('last_reset_date')
  .get(function () { return this.last_reset_at; })
  .set(function (val: Date | null) { this.last_reset_at = val; });

// Compound indexes
posBillNumberSeriesSchema.index({ restaurant_id: 1, branch_id: 1, terminal_id: 1, document_type: 1 });
posBillNumberSeriesSchema.index({ restaurant_id: 1, is_active: 1 });

export const PosBillNumberSeries = model<IPosBillNumberSeries>('PosBillNumberSeries', posBillNumberSeriesSchema);

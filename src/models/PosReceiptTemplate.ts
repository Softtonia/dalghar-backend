import { Schema, model, Document, Types } from 'mongoose';

export type ReceiptTemplateType =
  | 'customer_receipt'
  | 'kitchen_ticket'
  | 'refund_receipt'
  | 'duplicate_receipt'
  | 'other';

export type ReceiptTemplateStatus = 'draft' | 'active' | 'archived';

export interface IPosReceiptTemplate extends Document {
  restaurant_id: Types.ObjectId;
  branch_id?: Types.ObjectId | null;
  terminal_id?: Types.ObjectId | null;
  template_name: string;
  template_type: ReceiptTemplateType;
  paper_width_mm: number; // e.g. 58 or 80
  header_content?: string | null;
  body_template: string;
  footer_content?: string | null;
  show_logo: boolean;
  show_tax_breakdown: boolean;
  show_cashier_name: boolean;
  show_terminal_code: boolean;
  show_customer_info: boolean;
  is_default: boolean;
  version: number;
  status: ReceiptTemplateStatus;
  template_config?: Record<string, any> | null;
  created_by?: Types.ObjectId | null;
  updated_by?: Types.ObjectId | null;
  deleted_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const posReceiptTemplateSchema = new Schema<IPosReceiptTemplate>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', default: null, index: true },
    template_name: { type: String, required: true, trim: true, maxlength: 150 },
    template_type: {
      type: String,
      enum: ['customer_receipt', 'kitchen_ticket', 'refund_receipt', 'duplicate_receipt', 'other'],
      required: true,
      index: true,
    },
    paper_width_mm: {
      type: Number,
      enum: [58, 80],
      default: 80,
      required: true,
    },
    header_content: { type: String, default: null, trim: true },
    body_template: { type: String, required: true },
    footer_content: { type: String, default: null, trim: true },
    show_logo: { type: Boolean, default: true },
    show_tax_breakdown: { type: Boolean, default: true },
    show_cashier_name: { type: Boolean, default: true },
    show_terminal_code: { type: Boolean, default: true },
    show_customer_info: { type: Boolean, default: false },
    is_default: { type: Boolean, default: false, index: true },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },
    template_config: { type: Schema.Types.Mixed, default: {} },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null, index: true },
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
posReceiptTemplateSchema.index({ restaurant_id: 1, branch_id: 1, template_type: 1, is_default: 1 });
posReceiptTemplateSchema.index({ restaurant_id: 1, status: 1 });

export const PosReceiptTemplate = model<IPosReceiptTemplate>('PosReceiptTemplate', posReceiptTemplateSchema);

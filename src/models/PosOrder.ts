import { Schema, model, Document, Types } from 'mongoose';

export type PosPaymentStatus = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
export type PosPaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'SPLIT' | 'WALLET';
export type PosOrderStatus = 'COMPLETED' | 'IN_PROGRESS' | 'CANCELLED';
export type PosKitchenStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type PosOrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface IPosOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string | null;
  kitchenStatus?: 'pending' | 'preparing' | 'ready';
}

export interface IPosOrder extends Document {
  orderNumber: string;
  restaurantId: Types.ObjectId;
  branchId: Types.ObjectId;
  terminalId: string;
  terminalName: string;
  cashierId: Types.ObjectId;
  cashierName: string;
  shiftId: string;
  table_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customerId?: Types.ObjectId | null;
  order_type: PosOrderType;
  kitchen_status: PosKitchenStatus;
  waiter_id?: Types.ObjectId | null;
  waiter_name?: string | null;
  items: IPosOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  paymentStatus: PosPaymentStatus;
  orderStatus: PosOrderStatus;
  notes?: string;
  prepared_at?: Date | null;
  ready_at?: Date | null;
  served_at?: Date | null;
  waiter_notified_at?: Date | null;
  waiter_notified_count?: number;
  createdAt: Date;
  updatedAt: Date;
}

const posOrderItemSchema = new Schema<IPosOrderItem>(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    notes: { type: String, default: null },
    kitchenStatus: {
      type: String,
      enum: ['pending', 'preparing', 'ready'],
      default: 'pending',
    },
  },
  { _id: false }
);

const posOrderSchema = new Schema<IPosOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    terminalId: { type: String, required: true, default: 'POS-01', index: true },
    terminalName: { type: String, required: true, default: 'Counter Main POS' },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cashierName: { type: String, required: true },
    shiftId: { type: String, required: true, default: 'SHIFT-01', index: true },
    table_number: { type: String, default: null, trim: true, index: true },
    customer_name: { type: String, default: null, trim: true, index: true },
    customer_phone: { type: String, default: null, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    order_type: {
      type: String,
      enum: ['dine_in', 'takeaway', 'delivery'],
      default: 'dine_in',
      index: true,
    },
    kitchen_status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
      default: 'pending',
      index: true,
    },
    waiter_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    waiter_name: { type: String, default: null, trim: true },
    items: [posOrderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, default: 0, min: 0 },
    discount: { type: Number, required: true, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'SPLIT', 'WALLET'],
      default: 'CASH',
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'FAILED', 'REFUNDED'],
      default: 'PAID',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'],
      default: 'COMPLETED',
      index: true,
    },
    notes: { type: String, trim: true },
    prepared_at: { type: Date, default: null },
    ready_at: { type: Date, default: null },
    served_at: { type: Date, default: null },
    waiter_notified_at: { type: Date, default: null },
    waiter_notified_count: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Helpful compound indexes for kitchen & waiter queries
posOrderSchema.index({ branchId: 1, kitchen_status: 1, createdAt: -1 });
posOrderSchema.index({ branchId: 1, orderStatus: 1, paymentStatus: 1 });

export const PosOrder = model<IPosOrder>('PosOrder', posOrderSchema);


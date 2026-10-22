import { Schema, model, Document, Types } from 'mongoose';

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface IPosShift extends Document {
  shiftNumber: string;
  restaurantId: Types.ObjectId;
  branchId: Types.ObjectId;
  terminalId: string;
  terminalName: string;
  cashierId: Types.ObjectId;
  cashierName: string;
  status: ShiftStatus;
  startTime: Date;
  endTime?: Date;
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  totalCardSales: number;
  totalUpiSales: number;
  totalCashSales: number;
  totalSales: number;
  orderCount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const posShiftSchema = new Schema<IPosShift>(
  {
    shiftNumber: { type: String, required: true, unique: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    terminalId: { type: String, required: true, default: 'POS-01', index: true },
    terminalName: { type: String, required: true, default: 'Counter Main POS' },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cashierName: { type: String, required: true },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    openingCash: { type: Number, required: true, default: 0 },
    expectedCash: { type: Number, required: true, default: 0 },
    actualCash: { type: Number, required: true, default: 0 },
    cashVariance: { type: Number, required: true, default: 0 },
    totalCardSales: { type: Number, default: 0 },
    totalUpiSales: { type: Number, default: 0 },
    totalCashSales: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

export const PosShift = model<IPosShift>('PosShift', posShiftSchema);

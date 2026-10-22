import { Schema, model, Document, Types } from 'mongoose';

export type PeripheralDeviceType =
  | 'receipt_printer'
  | 'kitchen_printer'
  | 'cash_drawer'
  | 'scanner'
  | 'customer_display'
  | 'other';

export type PeripheralConnectionType =
  | 'usb'
  | 'network'
  | 'bluetooth'
  | 'serial'
  | 'virtual';

export type PeripheralStatus = 'active' | 'inactive' | 'maintenance' | 'retired';
export type PeripheralConnectivityStatus = 'online' | 'offline' | 'unknown';

export interface IPosPeripheral extends Document {
  restaurant_id: Types.ObjectId;
  branch_id: Types.ObjectId;
  terminal_id?: Types.ObjectId | null;
  device_name: string;
  device_type: PeripheralDeviceType;
  connection_type: PeripheralConnectionType;
  manufacturer?: string | null;
  model_number?: string | null;
  device_identifier?: string | null;
  ip_address?: string | null;
  port_number?: number | null;
  connection_config?: Record<string, any> | null;
  status: PeripheralStatus;
  connectivity_status: PeripheralConnectivityStatus;
  last_seen_at?: Date | null;
  last_error?: string | null;
  created_by?: Types.ObjectId | null;
  deleted_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const posPeripheralSchema = new Schema<IPosPeripheral>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', default: null, index: true },
    device_name: { type: String, required: true, trim: true, maxlength: 150 },
    device_type: {
      type: String,
      enum: ['receipt_printer', 'kitchen_printer', 'cash_drawer', 'scanner', 'customer_display', 'other'],
      required: true,
      index: true,
    },
    connection_type: {
      type: String,
      enum: ['usb', 'network', 'bluetooth', 'serial', 'virtual'],
      required: true,
    },
    manufacturer: { type: String, trim: true, maxlength: 100, default: null },
    model_number: { type: String, trim: true, maxlength: 100, default: null },
    device_identifier: { type: String, trim: true, maxlength: 255, default: null, index: true },
    ip_address: { type: String, trim: true, default: null },
    port_number: { type: Number, min: 1, max: 65535, default: null },
    connection_config: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'retired'],
      default: 'active',
      index: true,
    },
    connectivity_status: {
      type: String,
      enum: ['online', 'offline', 'unknown'],
      default: 'unknown',
      index: true,
    },
    last_seen_at: { type: Date, default: null },
    last_error: { type: String, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
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
posPeripheralSchema.index({ branch_id: 1, deleted_at: 1 });
posPeripheralSchema.index({ terminal_id: 1, deleted_at: 1 });

export const PosPeripheral = model<IPosPeripheral>('PosPeripheral', posPeripheralSchema);

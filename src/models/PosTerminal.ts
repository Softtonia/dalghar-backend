import { Schema, model, Document, Types } from 'mongoose';

export type PosTerminalStatus = 'active' | 'inactive' | 'maintenance' | 'retired' | 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
export type PosDeviceType = 'desktop' | 'tablet' | 'mobile' | 'all_in_one';
export type PosConnectivityStatus = 'online' | 'offline' | 'unknown';

export interface IPosTerminalSettings {
  auto_print_receipt?: boolean;
  auto_print_kitchen_ticket?: boolean;
  require_cashier_login?: boolean;
  allow_cash_sales?: boolean;
  allow_card_sales?: boolean;
  allow_refunds?: boolean;
  allow_voids?: boolean;
  allow_cash_in?: boolean;
  allow_cash_out?: boolean;
  allow_offline_sales?: boolean;
  require_shift_before_sales?: boolean;
  receipt_template_id?: Types.ObjectId | string | null;
  bill_number_series_id?: Types.ObjectId | string | null;
  default_printer_id?: Types.ObjectId | string | null;
  idle_timeout_seconds?: number | null;
  settings_json?: Record<string, any>;
  updated_by?: Types.ObjectId | string | null;

  // Additional legacy & UI options
  printerType?: string;
  printerIp?: string;
  autoPrintReceipt?: boolean;
  autoPrintKot?: boolean;
  [key: string]: any;
}

export interface IPosTerminal extends Document {
  restaurant_id?: Types.ObjectId | null;
  branch_id: Types.ObjectId;
  terminal_code: string;
  terminal_name: string;
  name: string; // Alias for backward compatibility
  device_identifier?: string | null;
  device_type: PosDeviceType;
  operating_system?: string | null;
  app_version?: string | null;
  ip_address?: string | null;
  mac_address?: string | null;
  status: string;
  connectivity_status: PosConnectivityStatus;
  last_heartbeat_at?: Date | null;
  last_seen_at?: Date | null;
  registered_by?: Types.ObjectId | null;
  registered_at?: Date | null;
  settings: IPosTerminalSettings;
  created_by?: Types.ObjectId | null;
  deleted_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const posTerminalSchema = new Schema<IPosTerminal>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    terminal_code: { type: String, required: true, trim: true, maxlength: 50 },
    terminal_name: { type: String, trim: true, maxlength: 150 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    device_identifier: { type: String, trim: true, default: null, maxlength: 255 },
    device_type: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile', 'all_in_one'],
      default: 'desktop',
    },
    operating_system: { type: String, trim: true, default: 'Windows', maxlength: 50 },
    app_version: { type: String, trim: true, default: '1.0.0', maxlength: 50 },
    ip_address: { type: String, trim: true, default: null, maxlength: 45 },
    mac_address: { type: String, trim: true, default: null, maxlength: 50 },
    status: {
      type: String,
      required: true,
      default: 'active',
      trim: true,
      index: true,
    },
    connectivity_status: {
      type: String,
      enum: ['online', 'offline', 'unknown'],
      default: 'unknown',
      index: true,
    },
    last_heartbeat_at: { type: Date, default: null },
    last_seen_at: { type: Date, default: null },
    registered_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    registered_at: { type: Date, default: Date.now },
    settings: {
      auto_print_receipt: { type: Boolean, default: true },
      auto_print_kitchen_ticket: { type: Boolean, default: true },
      require_cashier_login: { type: Boolean, default: true },
      allow_cash_sales: { type: Boolean, default: true },
      allow_card_sales: { type: Boolean, default: true },
      allow_refunds: { type: Boolean, default: false },
      allow_voids: { type: Boolean, default: false },
      allow_cash_in: { type: Boolean, default: true },
      allow_cash_out: { type: Boolean, default: true },
      allow_offline_sales: { type: Boolean, default: false },
      require_shift_before_sales: { type: Boolean, default: true },
      receipt_template_id: { type: Schema.Types.ObjectId, default: null },
      bill_number_series_id: { type: Schema.Types.ObjectId, default: null },
      default_printer_id: { type: Schema.Types.ObjectId, default: null },
      idle_timeout_seconds: { type: Number, default: 300 },
      settings_json: { type: Schema.Types.Mixed, default: {} },
      updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      // Legacy UI aliases
      printerType: { type: String, default: 'thermal-80mm' },
      printerIp: { type: String, default: '' },
      autoPrintReceipt: { type: Boolean, default: true },
      autoPrintKot: { type: Boolean, default: true },
    },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        if (!ret.terminal_name && ret.name) ret.terminal_name = ret.name;
        if (!ret.name && ret.terminal_name) ret.name = ret.terminal_name;
        return ret;
      },
    },
  }
);

// 1. Unique constraint: (branch_id, terminal_code) among active terminals
posTerminalSchema.index(
  { branch_id: 1, terminal_code: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted_at: null },
  }
);

// 2. Index: (restaurant_id, branch_id, status)
posTerminalSchema.index({ restaurant_id: 1, branch_id: 1, status: 1 });

// 3. Index: (connectivity_status, last_heartbeat_at)
posTerminalSchema.index({ connectivity_status: 1, last_heartbeat_at: -1 });

// 4. Unique sparse index on device_identifier
posTerminalSchema.index(
  { device_identifier: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { deleted_at: null, device_identifier: { $type: 'string', $ne: '' } },
  }
);

export const PosTerminal = model<IPosTerminal>('PosTerminal', posTerminalSchema);


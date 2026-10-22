import { Schema, model, Document, Types } from 'mongoose';

export type PosAuditOutcome = 'success' | 'failure' | 'denied';

export interface IPosTerminalAuditLog extends Document {
  restaurant_id: Types.ObjectId;
  branch_id?: Types.ObjectId | null;
  terminal_id?: Types.ObjectId | null;
  shift_id?: Types.ObjectId | null;
  user_id?: Types.ObjectId | null;
  action: string;
  entity_type: string;
  entity_id?: Types.ObjectId | string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  outcome: PosAuditOutcome;
  failure_reason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
  'pin',
  'cardnumber',
  'cvv',
  'pan',
  'authorization',
]);

export function sanitizeAuditData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeAuditData);

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeAuditData(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

const posTerminalAuditLogSchema = new Schema<IPosTerminalAuditLog>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', default: null, index: true },
    shift_id: { type: Schema.Types.ObjectId, ref: 'CashierShift', default: null, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true, trim: true, maxlength: 100, index: true },
    entity_type: { type: String, required: true, trim: true, maxlength: 50, index: true },
    entity_id: { type: Schema.Types.Mixed, default: null, index: true },
    old_values: { type: Schema.Types.Mixed, default: null },
    new_values: { type: Schema.Types.Mixed, default: null },
    ip_address: { type: String, default: null, trim: true },
    user_agent: { type: String, default: null },
    request_id: { type: String, default: null, index: true },
    outcome: {
      type: String,
      enum: ['success', 'failure', 'denied'],
      default: 'success',
      required: true,
      index: true,
    },
    failure_reason: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.created_at = ret.createdAt;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.created_at = ret.createdAt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
posTerminalAuditLogSchema.index({ terminal_id: 1, createdAt: -1 });
posTerminalAuditLogSchema.index({ shift_id: 1, createdAt: -1 });
posTerminalAuditLogSchema.index({ user_id: 1, createdAt: -1 });
posTerminalAuditLogSchema.index({ restaurant_id: 1, branch_id: 1, createdAt: -1 });
posTerminalAuditLogSchema.index({ action: 1, createdAt: -1 });
posTerminalAuditLogSchema.index({ entity_type: 1, entity_id: 1, createdAt: -1 });

// Security: Prevent in-place modifications to maintain an immutable append-only ledger
posTerminalAuditLogSchema.pre('updateOne', function () {
  throw new Error('Audit log records are immutable and cannot be updated');
});
posTerminalAuditLogSchema.pre('updateMany', function () {
  throw new Error('Audit log records are immutable and cannot be updated');
});
posTerminalAuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit log records are immutable and cannot be updated');
});

export const PosTerminalAuditLog = model<IPosTerminalAuditLog>(
  'PosTerminalAuditLog',
  posTerminalAuditLogSchema
);

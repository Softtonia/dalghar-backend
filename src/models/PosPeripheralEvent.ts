import { Schema, model, Document, Types } from 'mongoose';

export type PeripheralEventType =
  | 'connected'
  | 'disconnected'
  | 'print_failed'
  | 'paper_out'
  | 'error'
  | 'recovered';

export type PeripheralEventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface IPosPeripheralEvent extends Document {
  peripheral_id: Types.ObjectId;
  terminal_id?: Types.ObjectId | null;
  event_type: PeripheralEventType;
  severity: PeripheralEventSeverity;
  message: string;
  error_code?: string | null;
  event_metadata?: Record<string, any> | null;
  occurred_at: Date;
}

const posPeripheralEventSchema = new Schema<IPosPeripheralEvent>(
  {
    peripheral_id: {
      type: Schema.Types.ObjectId,
      ref: 'PosPeripheral',
      required: true,
      index: true,
    },
    terminal_id: {
      type: Schema.Types.ObjectId,
      ref: 'PosTerminal',
      default: null,
      index: true,
    },
    event_type: {
      type: String,
      enum: ['connected', 'disconnected', 'print_failed', 'paper_out', 'error', 'recovered'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      required: true,
      default: 'info',
    },
    message: { type: String, required: true, trim: true },
    error_code: { type: String, trim: true, default: null },
    event_metadata: { type: Schema.Types.Mixed, default: {} },
    occurred_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

// Index (peripheral_id, occurred_at DESC)
posPeripheralEventSchema.index({ peripheral_id: 1, occurred_at: -1 });

export const PosPeripheralEvent = model<IPosPeripheralEvent>(
  'PosPeripheralEvent',
  posPeripheralEventSchema
);

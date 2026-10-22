import { Schema, model, Document, Types } from 'mongoose';

export interface IPosTerminalAssignment extends Document {
  terminal_id: Types.ObjectId;
  user_id: Types.ObjectId;
  assigned_by?: Types.ObjectId | null;
  assigned_at: Date;
  valid_from: Date;
  valid_until?: Date | null;
  unassigned_at?: Date | null;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const posTerminalAssignmentSchema = new Schema<IPosTerminalAssignment>(
  {
    terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assigned_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assigned_at: { type: Date, required: true, default: Date.now },
    valid_from: { type: Date, default: Date.now },
    valid_until: { type: Date, default: null },
    unassigned_at: { type: Date, default: null, index: true },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        ret.is_active = ret.unassigned_at === null && ret.is_active !== false;
        return ret;
      },
    },
  }
);

// Standard compound index on (terminal_id, user_id)
posTerminalAssignmentSchema.index({ terminal_id: 1, user_id: 1 });

// Partial unique index enforcing only ONE active assignment per terminal and cashier
posTerminalAssignmentSchema.index(
  { terminal_id: 1, user_id: 1 },
  {
    unique: true,
    partialFilterExpression: { is_active: true, unassigned_at: null },
  }
);

export const PosTerminalAssignment = model<IPosTerminalAssignment>(
  'PosTerminalAssignment',
  posTerminalAssignmentSchema
);

// Optional model alias for Table 3 naming convention
export const PosTerminalUserAssignment = PosTerminalAssignment;


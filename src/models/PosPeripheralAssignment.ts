import { Schema, model, Document, Types } from 'mongoose';

export type PeripheralAssignmentRole =
  | 'default_receipt'
  | 'kitchen'
  | 'backup_receipt'
  | 'cash_drawer'
  | 'other';

export interface IPosPeripheralAssignment extends Document {
  peripheral_id: Types.ObjectId;
  terminal_id: Types.ObjectId;
  assignment_role: PeripheralAssignmentRole;
  is_primary: boolean;
  assigned_by?: Types.ObjectId | null;
  assigned_at: Date;
  unassigned_at?: Date | null;
  createdAt: Date;
}

const posPeripheralAssignmentSchema = new Schema<IPosPeripheralAssignment>(
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
      required: true,
      index: true,
    },
    assignment_role: {
      type: String,
      enum: ['default_receipt', 'kitchen', 'backup_receipt', 'cash_drawer', 'other'],
      required: true,
      default: 'default_receipt',
    },
    is_primary: { type: Boolean, default: false },
    assigned_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assigned_at: { type: Date, default: Date.now },
    unassigned_at: { type: Date, default: null, index: true },
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

// Indexes (terminal_id, assignment_role) and (peripheral_id, assigned_at DESC)
posPeripheralAssignmentSchema.index({ terminal_id: 1, assignment_role: 1 });
posPeripheralAssignmentSchema.index({ peripheral_id: 1, assigned_at: -1 });

// Partial unique index preventing multiple active primary receipt printers for the same terminal and role
posPeripheralAssignmentSchema.index(
  { terminal_id: 1, assignment_role: 1 },
  {
    unique: true,
    partialFilterExpression: { is_primary: true, unassigned_at: null },
  }
);

export const PosPeripheralAssignment = model<IPosPeripheralAssignment>(
  'PosPeripheralAssignment',
  posPeripheralAssignmentSchema
);

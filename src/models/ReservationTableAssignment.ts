import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type TableAssignmentStatus = 'active' | 'released' | 'cancelled';

export interface IReservationTableAssignment extends Document {
  id: string;
  restaurant_id: Types.ObjectId | string;
  branch_id: Types.ObjectId | string;
  reservation_id: Types.ObjectId | string;
  dining_table_id: Types.ObjectId | string;
  assignment_status: TableAssignmentStatus;
  assigned_at: Date;
  released_at?: Date | null;
  assigned_by?: Types.ObjectId | string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const reservationTableAssignmentSchema = new Schema<IReservationTableAssignment>(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
      index: true,
    },
    restaurant_id: {
      type: Schema.Types.Mixed,
      required: [true, 'Restaurant ID is required'],
      ref: 'Restaurant',
      index: true,
    },
    branch_id: {
      type: Schema.Types.Mixed,
      required: [true, 'Branch ID is required'],
      ref: 'Branch',
      index: true,
    },
    reservation_id: {
      type: Schema.Types.Mixed,
      required: [true, 'Reservation ID is required'],
      ref: 'TableReservation',
      index: true,
    },
    dining_table_id: {
      type: Schema.Types.Mixed,
      required: [true, 'Dining Table ID is required'],
      ref: 'DiningTable',
      index: true,
    },
    assignment_status: {
      type: String,
      enum: ['active', 'released', 'cancelled'],
      default: 'active',
      index: true,
    },
    assigned_at: {
      type: Date,
      default: Date.now,
    },
    released_at: {
      type: Date,
      default: null,
    },
    assigned_by: {
      type: Schema.Types.Mixed,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'reservation_table_assignments',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes matching specifications
reservationTableAssignmentSchema.index({ reservation_id: 1, assignment_status: 1 });
reservationTableAssignmentSchema.index({ dining_table_id: 1, assignment_status: 1 });
reservationTableAssignmentSchema.index({ branch_id: 1, assignment_status: 1 });

export const ReservationTableAssignment = model<IReservationTableAssignment>(
  'ReservationTableAssignment',
  reservationTableAssignmentSchema
);

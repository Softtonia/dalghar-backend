import { Schema, model, Document, Types } from 'mongoose';

export interface IPosShiftReconciliationDenomination extends Document {
  reconciliation_id: Types.ObjectId;
  denomination_value: number;
  quantity: number;
  subtotal_amount: number;
  createdAt: Date;
}

const posShiftReconciliationDenominationSchema = new Schema<IPosShiftReconciliationDenomination>(
  {
    reconciliation_id: {
      type: Schema.Types.ObjectId,
      ref: 'PosShiftReconciliation',
      required: true,
      index: true,
    },
    denomination_value: {
      type: Number,
      required: true,
      min: [0.01, 'Denomination value must be positive'],
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer quantity',
      },
    },
    subtotal_amount: {
      type: Number,
      required: true,
      min: 0,
    },
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

// Unique (reconciliation_id, denomination_value)
posShiftReconciliationDenominationSchema.index(
  { reconciliation_id: 1, denomination_value: 1 },
  { unique: true }
);

export const PosShiftReconciliationDenomination = model<IPosShiftReconciliationDenomination>(
  'PosShiftReconciliationDenomination',
  posShiftReconciliationDenominationSchema
);

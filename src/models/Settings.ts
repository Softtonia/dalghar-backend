import { Schema, model, Document, Types } from 'mongoose';

export interface IGeneralSettings {
  brandName: string;
  brandCode: string;
  tagline?: string;
  supportEmail: string;
  supportPhone: string;
  defaultLanguage: string;
}

export interface ITaxSettings {
  currency: string;
  timezone: string;
  taxEnabled: boolean;
  gstRate: number;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
}

export interface IPosSettings {
  paperWidth: '80mm' | '58mm';
  autoPrintReceipt: boolean;
  autoPrintKOT: boolean;
  receiptHeader: string;
  receiptFooter?: string;
  showFssaiNumber: boolean;
  fssaiNumber?: string;
}

export interface INotificationSettings {
  whatsappBillDispatch: boolean;
  smsOrderAlerts: boolean;
  dailySalesEmail: boolean;
  lowStockThreshold: number;
}

export interface ISettings extends Document {
  restaurantId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  general: IGeneralSettings;
  tax: ITaxSettings;
  pos: IPosSettings;
  notifications: INotificationSettings;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const generalSettingsSchema = new Schema<IGeneralSettings>(
  {
    brandName: { type: String, required: true, default: 'Dal Ghar', trim: true },
    brandCode: { type: String, required: true, default: 'DG-HQ', trim: true, uppercase: true },
    tagline: { type: String, default: 'Signature Dal - Dal Ghar Ki Pehchan', trim: true },
    supportEmail: { type: String, required: true, default: 'contact@dalghar.com', trim: true, lowercase: true },
    supportPhone: { type: String, required: true, default: '9876543210', trim: true },
    defaultLanguage: { type: String, default: 'en', trim: true },
  },
  { _id: false }
);

const taxSettingsSchema = new Schema<ITaxSettings>(
  {
    currency: { type: String, required: true, default: 'INR', trim: true, uppercase: true },
    timezone: { type: String, required: true, default: 'Asia/Kolkata', trim: true },
    taxEnabled: { type: Boolean, default: true },
    gstRate: { type: Number, default: 5, min: 0, max: 100 },
    serviceChargeEnabled: { type: Boolean, default: false },
    serviceChargeRate: { type: Number, default: 5, min: 0, max: 25 },
    invoicePrefix: { type: String, default: 'DG-INV-', trim: true },
    nextInvoiceNumber: { type: Number, default: 1001, min: 1 },
  },
  { _id: false }
);

const posSettingsSchema = new Schema<IPosSettings>(
  {
    paperWidth: { type: String, enum: ['80mm', '58mm'], default: '80mm' },
    autoPrintReceipt: { type: Boolean, default: true },
    autoPrintKOT: { type: Boolean, default: true },
    receiptHeader: { type: String, default: 'DAL GHAR RESTAURANT & DHABA', trim: true },
    receiptFooter: { type: String, default: 'Thank you for dining with us! Visit again soon ❤️', trim: true },
    showFssaiNumber: { type: Boolean, default: true },
    fssaiNumber: { type: String, default: '10019011006543', trim: true },
  },
  { _id: false }
);

const notificationSettingsSchema = new Schema<INotificationSettings>(
  {
    whatsappBillDispatch: { type: Boolean, default: true },
    smsOrderAlerts: { type: Boolean, default: true },
    dailySalesEmail: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 15, min: 0 },
  },
  { _id: false }
);

const settingsSchema = new Schema<ISettings>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant reference is required'],
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    general: {
      type: generalSettingsSchema,
      default: () => ({}),
    },
    tax: {
      type: taxSettingsSchema,
      default: () => ({}),
    },
    pos: {
      type: posSettingsSchema,
      default: () => ({}),
    },
    notifications: {
      type: notificationSettingsSchema,
      default: () => ({}),
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so that each restaurant (and optional branch) has exactly one unique settings record
settingsSchema.index({ restaurantId: 1, branchId: 1 }, { unique: true });

settingsSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export const Settings = model<ISettings>('Settings', settingsSchema);

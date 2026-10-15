import { Schema, model, Document, Types } from 'mongoose';

export type BranchOperatingStatus = 'ACTIVE' | 'INACTIVE';
export type BranchType = 'MAIN' | 'EXPRESS' | 'CLOUDKITCHEN' | 'DRIVETHROUGH';

export interface IBranchLogo {
  url: string | null;
  publicId: string | null;
}

export interface IBranchContactInfo {
  phone: string;
  email: string | null;
  managerName: string | null;
  managerPhone: string | null;
}

export interface IBranchAddressInfo {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IBranchConfig {
  currency: string;
  timezone: string;
  taxEnabled: boolean;
  defaultTaxRate: number;
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface ITimeSlot {
  openTime: string;
  closeTime: string;
}

export interface IDayOperatingSchedule {
  day: DayOfWeek;
  isClosed: boolean;
  is24Hours: boolean;
  slots: ITimeSlot[];
}

export interface IBranchOperatingHours {
  openTime?: string;
  closeTime?: string;
  is24Hours: boolean;
  isClosedOnWeekends: boolean;
  weeklySchedule: IDayOperatingSchedule[];
}

export interface IBranch extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  code: string;
  slug: string;
  type: BranchType;
  logo: IBranchLogo;
  contact: IBranchContactInfo;
  address: IBranchAddressInfo;
  configuration: IBranchConfig;
  operatingHours: IBranchOperatingHours;
  seatingCapacity: number;
  operatingStatus: BranchOperatingStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const branchContactSchema = new Schema<IBranchContactInfo>(
  {
    phone: {
      type: String,
      required: [true, 'Branch contact phone is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
    },
    managerName: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, 'Manager name cannot exceed 100 characters'],
    },
    managerPhone: {
      type: String,
      default: null,
      trim: true,
      maxlength: [20, 'Manager phone cannot exceed 20 characters'],
    },
  },
  { _id: false }
);

const branchAddressSchema = new Schema<IBranchAddressInfo>(
  {
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
      maxlength: [200, 'Address line 1 cannot exceed 200 characters'],
    },
    addressLine2: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, 'Address line 2 cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'India',
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
  },
  { _id: false }
);

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    openTime: { type: String, required: true, default: '10:00', trim: true },
    closeTime: { type: String, required: true, default: '23:00', trim: true },
  },
  { _id: false }
);

const dayOperatingScheduleSchema = new Schema<IDayOperatingSchedule>(
  {
    day: {
      type: String,
      enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      required: true,
    },
    isClosed: { type: Boolean, default: false },
    is24Hours: { type: Boolean, default: false },
    slots: { type: [timeSlotSchema], default: () => [{ openTime: '10:00', closeTime: '23:00' }] },
  },
  { _id: false }
);

const DEFAULT_WEEKLY_SCHEDULE: IDayOperatingSchedule[] = [
  { day: 'MONDAY', isClosed: false, is24Hours: false, slots: [{ openTime: '10:00', closeTime: '23:00' }] },
  { day: 'TUESDAY', isClosed: false, is24Hours: false, slots: [{ openTime: '10:00', closeTime: '23:00' }] },
  { day: 'WEDNESDAY', isClosed: false, is24Hours: false, slots: [{ openTime: '10:00', closeTime: '23:00' }] },
  { day: 'THURSDAY', isClosed: false, is24Hours: false, slots: [{ openTime: '10:00', closeTime: '23:00' }] },
  { day: 'FRIDAY', isClosed: false, is24Hours: false, slots: [{ openTime: '10:00', closeTime: '23:00' }] },
  { day: 'SATURDAY', isClosed: false, is24Hours: false, slots: [{ openTime: '10:00', closeTime: '23:00' }] },
  { day: 'SUNDAY', isClosed: false, is24Hours: false, slots: [{ openTime: '10:00', closeTime: '23:00' }] },
];

const branchOperatingHoursSchema = new Schema<IBranchOperatingHours>(
  {
    openTime: {
      type: String,
      default: '10:00',
      trim: true,
    },
    closeTime: {
      type: String,
      default: '23:00',
      trim: true,
    },
    is24Hours: {
      type: Boolean,
      default: false,
    },
    isClosedOnWeekends: {
      type: Boolean,
      default: false,
    },
    weeklySchedule: {
      type: [dayOperatingScheduleSchema],
      default: () => DEFAULT_WEEKLY_SCHEDULE,
    },
  },
  { _id: false }
);

const branchLogoSchema = new Schema<IBranchLogo>(
  {
    url: { type: String, default: null, trim: true },
    publicId: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const branchConfigSchema = new Schema<IBranchConfig>(
  {
    currency: {
      type: String,
      required: [true, 'Currency code is required'],
      default: 'INR',
      trim: true,
      uppercase: true,
      maxlength: [10, 'Currency code cannot exceed 10 characters'],
    },
    timezone: {
      type: String,
      required: [true, 'Timezone is required'],
      default: 'Asia/Kolkata',
      trim: true,
      maxlength: [50, 'Timezone string cannot exceed 50 characters'],
    },
    taxEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    defaultTaxRate: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%'],
    },
  },
  { _id: false }
);

const branchSchema = new Schema<IBranch>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Parent restaurant ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      maxlength: [150, 'Branch name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Branch code is required'],
      uppercase: true,
      trim: true,
      maxlength: [50, 'Branch code cannot exceed 50 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Branch slug is required'],
      lowercase: true,
      trim: true,
      index: true,
      maxlength: [150, 'Slug cannot exceed 150 characters'],
    },
    type: {
      type: String,
      enum: ['MAIN', 'EXPRESS', 'CLOUDKITCHEN', 'DRIVETHROUGH'],
      default: 'MAIN',
      index: true,
    },
    logo: {
      type: branchLogoSchema,
      default: () => ({ url: null, publicId: null }),
    },
    contact: {
      type: branchContactSchema,
      required: [true, 'Branch contact details are required'],
    },
    address: {
      type: branchAddressSchema,
      required: [true, 'Branch address details are required'],
    },
    configuration: {
      type: branchConfigSchema,
      default: () => ({ currency: 'INR', timezone: 'Asia/Kolkata', taxEnabled: true, defaultTaxRate: 0 }),
    },
    operatingHours: {
      type: branchOperatingHoursSchema,
      default: () => ({ openTime: '10:00', closeTime: '23:00', is24Hours: false, isClosedOnWeekends: false }),
    },
    seatingCapacity: {
      type: Number,
      default: 0,
      min: [0, 'Seating capacity cannot be negative'],
    },
    operatingStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user ID is required'],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Updater user ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure code & slug uniqueness within a restaurant brand
branchSchema.index({ restaurantId: 1, code: 1 }, { unique: true });
branchSchema.index({ restaurantId: 1, slug: 1 }, { unique: true });

// Format JSON output
branchSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Branch = model<IBranch>('Branch', branchSchema);

import { Schema, model, Document, Types } from 'mongoose';

export type RestaurantOperatingStatus = 'ACTIVE' | 'INACTIVE';

export interface IRestaurantLogo {
  url: string | null;
  publicId: string | null;
}

export interface IContactInfo {
  phone: string;
  email: string | null;
  website: string | null;
}

export interface IAddressInfo {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IBusinessInfo {
  legalName: string | null;
  gstin: string | null;
  pan: string | null;
  businessType: string | null;
}

export interface IRestaurantConfig {
  currency: string;
  timezone: string;
  taxEnabled: boolean;
  defaultTaxRate: number;
}

export interface IRestaurant extends Document {
  name: string;
  slug: string;
  code: string;
  logo: IRestaurantLogo;
  contact: IContactInfo;
  address: IAddressInfo;
  business: IBusinessInfo;
  configuration: IRestaurantConfig;
  operatingStatus: RestaurantOperatingStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const logoSchema = new Schema<IRestaurantLogo>(
  {
    url: { type: String, default: null, trim: true },
    publicId: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const contactSchema = new Schema<IContactInfo>(
  {
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
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
    website: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, 'Website URL cannot exceed 200 characters'],
    },
  },
  { _id: false }
);

const addressSchema = new Schema<IAddressInfo>(
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

const businessSchema = new Schema<IBusinessInfo>(
  {
    legalName: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, 'Legal name cannot exceed 200 characters'],
    },
    gstin: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      maxlength: [20, 'GSTIN cannot exceed 20 characters'],
    },
    pan: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      maxlength: [20, 'PAN cannot exceed 20 characters'],
    },
    businessType: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, 'Business type cannot exceed 100 characters'],
    },
  },
  { _id: false }
);

const configSchema = new Schema<IRestaurantConfig>(
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

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [150, 'Restaurant name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Restaurant slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: [150, 'Slug cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Restaurant code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      maxlength: [50, 'Code cannot exceed 50 characters'],
    },
    logo: {
      type: logoSchema,
      default: () => ({ url: null, publicId: null }),
    },
    contact: {
      type: contactSchema,
      required: [true, 'Contact details are required'],
    },
    address: {
      type: addressSchema,
      required: [true, 'Address details are required'],
    },
    business: {
      type: businessSchema,
      default: () => ({ legalName: null, gstin: null, pan: null, businessType: null }),
    },
    configuration: {
      type: configSchema,
      default: () => ({ currency: 'INR', timezone: 'Asia/Kolkata', taxEnabled: true, defaultTaxRate: 0 }),
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

// Format JSON response output
restaurantSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Restaurant = model<IRestaurant>('Restaurant', restaurantSchema);

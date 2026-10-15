import mongoose, { Document, Schema } from 'mongoose';

export type CampaignSendType = 'send_now' | 'scheduled' | 'triggered';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'failed';
export type TargetAudience = 'all_users' | 'customers' | 'restaurant_admins' | 'branch_managers' | 'kitchen_staff' | 'custom';

export interface ICampaignStats {
  totalSent: number;
  totalFailed: number;
  lastTriggeredAt?: Date | null;
}

export interface ICampaign extends Document {
  name: string;
  subject: string;
  bodyHtml: string;
  templateId?: mongoose.Types.ObjectId | string | null;
  sendType: CampaignSendType;
  scheduledAt?: Date | null;
  triggerEvent?: string;
  targetAudience: TargetAudience;
  customRecipients: string[];
  status: CampaignStatus;
  isActive: boolean;
  stats: ICampaignStats;
  createdBy?: mongoose.Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    bodyHtml: {
      type: String,
      required: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate',
      default: null,
    },
    sendType: {
      type: String,
      enum: ['send_now', 'scheduled', 'triggered'],
      default: 'send_now',
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    triggerEvent: {
      type: String,
      default: '',
      trim: true,
    },
    targetAudience: {
      type: String,
      enum: ['all_users', 'customers', 'restaurant_admins', 'branch_managers', 'kitchen_staff', 'custom'],
      default: 'all_users',
    },
    customRecipients: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'completed', 'cancelled', 'failed'],
      default: 'draft',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stats: {
      totalSent: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
      lastTriggeredAt: { type: Date, default: null },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : '';
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

CampaignSchema.index({ status: 1 });
CampaignSchema.index({ sendType: 1 });
CampaignSchema.index({ triggerEvent: 1 });
CampaignSchema.index({ isActive: 1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);

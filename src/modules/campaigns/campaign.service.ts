import { Campaign, ICampaign, CampaignSendType, TargetAudience, CampaignStatus } from '../../models/Campaign.js';
import { EmailTemplate } from '../../models/EmailTemplate.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { MailService } from '../../services/mail.service.js';

export interface CreateCampaignInput {
  name: string;
  subject: string;
  bodyHtml: string;
  templateId?: string;
  sendType: CampaignSendType;
  scheduledAt?: string | Date;
  triggerEvent?: string;
  targetAudience: TargetAudience;
  customRecipients?: string[];
  status?: CampaignStatus;
  isActive?: boolean;
}

export interface UpdateCampaignInput {
  name?: string;
  subject?: string;
  bodyHtml?: string;
  templateId?: string;
  sendType?: CampaignSendType;
  scheduledAt?: string | Date;
  triggerEvent?: string;
  targetAudience?: TargetAudience;
  customRecipients?: string[];
  status?: CampaignStatus;
  isActive?: boolean;
}

export class CampaignService {
  /**
   * List all campaigns
   */
  static async listCampaigns(params?: { search?: string; status?: string; sendType?: string }) {
    const query: any = {};
    if (params?.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { subject: searchRegex }, { triggerEvent: searchRegex }];
    }
    if (params?.status) {
      query.status = params.status;
    }
    if (params?.sendType) {
      query.sendType = params.sendType;
    }

    const campaigns = await Campaign.find(query)
      .populate('templateId', 'name key')
      .sort({ createdAt: -1 });

    return campaigns;
  }

  /**
   * Get single campaign by ID
   */
  static async getCampaignById(id: string) {
    const campaign = await Campaign.findById(id).populate('templateId', 'name key subject bodyHtml');
    if (!campaign) {
      throw ApiError.notFound('Campaign not found');
    }
    return campaign;
  }

  /**
   * Create new campaign
   */
  static async createCampaign(input: CreateCampaignInput, userId?: string) {
    let initialStatus: CampaignStatus = input.status || 'draft';
    if (input.sendType === 'scheduled') {
      initialStatus = 'scheduled';
    } else if (input.sendType === 'triggered') {
      initialStatus = 'active';
    }

    const campaign = await Campaign.create({
      name: input.name.trim(),
      subject: input.subject.trim(),
      bodyHtml: input.bodyHtml,
      templateId: input.templateId || null,
      sendType: input.sendType || 'send_now',
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      triggerEvent: input.triggerEvent?.trim() || '',
      targetAudience: input.targetAudience || 'all_users',
      customRecipients: input.customRecipients || [],
      status: initialStatus,
      isActive: input.isActive ?? true,
      createdBy: userId || null,
      stats: {
        totalSent: 0,
        totalFailed: 0,
        lastTriggeredAt: null,
      },
    });

    return campaign;
  }

  /**
   * Update campaign
   */
  static async updateCampaign(id: string, input: UpdateCampaignInput) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      throw ApiError.notFound('Campaign not found');
    }

    if (input.name !== undefined) campaign.name = input.name.trim();
    if (input.subject !== undefined) campaign.subject = input.subject.trim();
    if (input.bodyHtml !== undefined) campaign.bodyHtml = input.bodyHtml;
    if (input.templateId !== undefined) campaign.templateId = input.templateId ? (input.templateId as any) : null;
    if (input.sendType !== undefined) campaign.sendType = input.sendType;
    if (input.scheduledAt !== undefined) campaign.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (input.triggerEvent !== undefined) campaign.triggerEvent = input.triggerEvent.trim();
    if (input.targetAudience !== undefined) campaign.targetAudience = input.targetAudience;
    if (input.customRecipients !== undefined) campaign.customRecipients = input.customRecipients;
    if (input.status !== undefined) campaign.status = input.status;
    if (input.isActive !== undefined) campaign.isActive = input.isActive;

    await campaign.save();
    return campaign;
  }

  /**
   * Delete campaign
   */
  static async deleteCampaign(id: string) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      throw ApiError.notFound('Campaign not found');
    }
    await Campaign.findByIdAndDelete(id);
    return { success: true, message: `Campaign '${campaign.name}' deleted successfully.` };
  }

  /**
   * Resolve recipient emails based on target audience
   */
  static async resolveAudienceRecipients(campaign: ICampaign): Promise<string[]> {
    if (campaign.targetAudience === 'custom') {
      return (campaign.customRecipients || []).filter(Boolean);
    }

    let roleQuery: any = {};
    if (campaign.targetAudience === 'restaurant_admins') {
      roleQuery = { role: 'RESTAURANT_ADMIN' };
    } else if (campaign.targetAudience === 'branch_managers') {
      roleQuery = { role: 'BRANCH_MANAGER' };
    } else if (campaign.targetAudience === 'kitchen_staff') {
      roleQuery = { role: { $in: ['KITCHEN_STAFF', 'CASHIER'] } };
    }

    const users = await User.find({ ...roleQuery, isActive: true }).select('email');
    const emails = users.map((u) => u.email).filter(Boolean);
    return Array.from(new Set(emails));
  }

  /**
   * Launch / Execute campaign immediately
   */
  static async launchCampaign(id: string) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      throw ApiError.notFound('Campaign not found');
    }

    const recipients = await this.resolveAudienceRecipients(campaign);
    if (recipients.length === 0) {
      throw ApiError.badRequest('No valid recipients found for this campaign audience.');
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const fullHtml = MailService.wrapTemplate(campaign.subject, campaign.bodyHtml);
        await MailService.sendMail({
          to: recipient,
          subject: campaign.subject,
          html: fullHtml,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send campaign email to ${recipient}:`, err);
        failed++;
      }
    }

    campaign.stats.totalSent += sent;
    campaign.stats.totalFailed += failed;
    campaign.stats.lastTriggeredAt = new Date();
    if (campaign.sendType === 'send_now') {
      campaign.status = 'completed';
    }

    await campaign.save();

    return {
      success: true,
      message: `Campaign executed. Sent: ${sent}, Failed: ${failed}`,
      stats: campaign.stats,
    };
  }
}

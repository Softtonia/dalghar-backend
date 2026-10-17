import { EmailTemplate, IEmailTemplate } from '../../models/EmailTemplate.js';
import { ApiError } from '../../utils/ApiError.js';
import { MailService } from '../../services/mail.service.js';

export interface CreateTemplateInput {
  name: string;
  key: string;
  subject: string;
  bodyHtml: string;
  description?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  subject?: string;
  bodyHtml?: string;
  description?: string;
  variables?: string[];
  isActive?: boolean;
}

// Built-in starter templates for Dal Ghar
const DEFAULT_SYSTEM_TEMPLATES = [
  {
    name: 'Customer Registration Welcome',
    key: 'register',
    subject: 'Welcome to Dal Ghar, {{userName}}! 🌿',
    description: 'Triggered when a new user signs up or is registered in Dal Ghar.',
    variables: ['userName', 'email', 'loginUrl', 'registeredAt'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>Hello <strong>{{userName}}</strong>,</p>
<p>Welcome to <strong>Dal Ghar</strong>! We are thrilled to have you in our family of authentic desi flavours and warm hospitality.</p>
<div class="card-box">
  <div class="row"><span class="label">Registered Email:</span><span class="val">{{email}}</span></div>
  <div class="row"><span class="label">Date:</span><span class="val">{{registeredAt}}</span></div>
</div>
<div class="btn-container">
  <a href="{{loginUrl}}" class="btn" target="_blank">Access Your Dal Ghar Portal &rarr;</a>
</div>
<p style="font-size: 13px; color: #64748B;">If you have any questions or need support, reach out to our team at <strong>dalgharsupport@yopmail.com</strong>.</p>`,
  },
  {
    name: 'User Account Created (Welcome Credentials)',
    key: 'add_user',
    subject: '[Welcome to Dal Ghar] Your User Account Credentials ({{roleName}})',
    description: 'Automated notification dispatched when an administrator provisions a new user with their assigned restaurant, branch, role, and temporary password.',
    variables: ['userName', 'email', 'roleName', 'restaurantName', 'branchName', 'tempPassword', 'loginUrl'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>Hello <strong>{{userName}}</strong>,</p>
<p>An administrator has created a user account for you on the <strong>Dal Ghar Management Portal</strong> with the role and branch assignments below:</p>

<div class="card-box">
  <div style="font-weight: 700; color: #1B4D2E; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
    Account & Assignment Details
  </div>
  <div class="row"><span class="label">Full Name:</span><span class="val">{{userName}}</span></div>
  <div class="row"><span class="label">Login Email:</span><span class="val">{{email}}</span></div>
  <div class="row"><span class="label">Assigned Role:</span><span class="val" style="color: #1B4D2E; font-weight: 700;">{{roleName}}</span></div>
  <div class="row"><span class="label">Restaurant:</span><span class="val">{{restaurantName}}</span></div>
  <div class="row"><span class="label">Branch Outlet:</span><span class="val">{{branchName}}</span></div>
  <div class="row"><span class="label">Account Status:</span><span class="val" style="color: #16A34A; font-weight: 700;">● Active</span></div>
  <div class="row" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
    <span class="label">Temporary Password:</span>
    <span class="val" style="font-family: monospace; font-size: 14px; background: #E2E8F0; padding: 2px 8px; border-radius: 4px;">{{tempPassword}}</span>
  </div>
</div>

<div class="btn-container">
  <a href="{{loginUrl}}" class="btn" target="_blank">Sign In to Dal Ghar Dashboard &rarr;</a>
</div>

<p style="font-size: 12px; color: #64748B; margin-top: 18px;">
  For security, please log in and change your password immediately upon your first sign in.
</p>`,
  },
  {
    name: 'Password Reset Request',
    key: 'forget_password',
    subject: 'Reset Your Password - Dal Ghar',
    description: 'Sent when an administrator or staff requests a password reset link.',
    variables: ['userName', 'email', 'resetUrl', 'expirationTime'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>Hello <strong>{{userName}}</strong>,</p>
<p>We received a request to reset your password for your <strong>Dal Ghar Admin</strong> account.</p>
<div class="btn-container">
  <a href="{{resetUrl}}" class="btn" target="_blank">Reset Password Now &rarr;</a>
</div>
<div class="card-box" style="margin-top: 16px;">
  <div class="row"><span class="label">Account Email:</span><span class="val">{{email}}</span></div>
  <div class="row"><span class="label">Valid For:</span><span class="val" style="color: #D97706;">15 Minutes</span></div>
</div>
<p style="font-size: 12px; color: #64748B;">If you did not request this password reset, please ignore this email. Your account remains completely secure.</p>`,
  },
  {
    name: 'Password Reset Confirmation',
    key: 'reset_password',
    subject: 'Security Alert: Password Reset Successful - Dal Ghar',
    description: 'Confirmation email sent after password has been successfully reset.',
    variables: ['userName', 'email', 'timestamp', 'loginUrl'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>Hello <strong>{{userName}}</strong>,</p>
<p>Your <strong>Dal Ghar</strong> account password was successfully updated.</p>
<div class="card-box">
  <div class="row"><span class="label">Account Email:</span><span class="val">{{email}}</span></div>
  <div class="row"><span class="label">Updated At:</span><span class="val">{{timestamp}}</span></div>
  <div class="row"><span class="label">Status:</span><span class="val" style="color: #16A34A;">● Password Updated</span></div>
</div>
<div class="btn-container">
  <a href="{{loginUrl}}" class="btn" target="_blank">Sign In with New Password &rarr;</a>
</div>
<p style="font-size: 13px; color: #DC2626;">If you did not make this change, please contact management immediately.</p>`,
  },
  {
    name: 'New Restaurant Added',
    key: 'add_restaurant',
    subject: 'New Restaurant Brand Onboarded: {{restaurantName}} - Dal Ghar',
    description: 'Notification dispatched when a new restaurant brand entity is registered.',
    variables: ['restaurantName', 'restaurantCode', 'city', 'phone', 'portalUrl', 'createdAt'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>A new restaurant brand has been successfully registered on the Dal Ghar management platform:</p>
<div class="card-box">
  <div class="row"><span class="label">Restaurant Name:</span><span class="val"><strong>{{restaurantName}}</strong></span></div>
  <div class="row"><span class="label">Brand Code:</span><span class="val">{{restaurantCode}}</span></div>
  <div class="row"><span class="label">City / State:</span><span class="val">{{city}}</span></div>
  <div class="row"><span class="label">Contact Phone:</span><span class="val">{{phone}}</span></div>
  <div class="row"><span class="label">Registration Date:</span><span class="val">{{createdAt}}</span></div>
</div>
<div class="btn-container">
  <a href="{{portalUrl}}" class="btn" target="_blank">View Restaurant In Portal &rarr;</a>
</div>
<p style="font-size: 13px; color: #64748B;">You can now configure branches, menus, and staff roles for this restaurant.</p>`,
  },
  {
    name: 'Restaurant Details Updated',
    key: 'update_restaurant',
    subject: 'Restaurant Profile Updated: {{restaurantName}} - Dal Ghar',
    description: 'Notification dispatched when restaurant operational, contact, or business configurations are updated.',
    variables: ['restaurantName', 'restaurantCode', 'updatedBy', 'updatedAt', 'portalUrl'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>The profile and configuration details for <strong>{{restaurantName}}</strong> have been updated:</p>
<div class="card-box">
  <div class="row"><span class="label">Restaurant:</span><span class="val"><strong>{{restaurantName}}</strong> ({{restaurantCode}})</span></div>
  <div class="row"><span class="label">Updated By:</span><span class="val">{{updatedBy}}</span></div>
  <div class="row"><span class="label">Timestamp:</span><span class="val">{{updatedAt}}</span></div>
  <div class="row"><span class="label">Status:</span><span class="val" style="color: #0284C7;">● Profile Modified</span></div>
</div>
<div class="btn-container">
  <a href="{{portalUrl}}" class="btn" target="_blank">Review Updated Details &rarr;</a>
</div>
<p style="font-size: 13px; color: #64748B;">If you did not authorize these changes, please check your administrative audit log immediately.</p>`,
  },
  {
    name: 'Restaurant Deactivated / Suspended',
    key: 'deactivate_restaurant',
    subject: 'Important: Restaurant {{restaurantName}} Has Been Deactivated',
    description: 'Alert sent when a restaurant brand is paused, suspended, or marked inactive.',
    variables: ['restaurantName', 'restaurantCode', 'actionBy', 'reason', 'timestamp', 'supportEmail'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>This notice confirms that the operating status of restaurant <strong>{{restaurantName}}</strong> has been changed to <strong style="color: #DC2626;">INACTIVE</strong>.</p>
<div class="card-box" style="border-left: 4px solid #DC2626;">
  <div class="row"><span class="label">Restaurant:</span><span class="val">{{restaurantName}} ({{restaurantCode}})</span></div>
  <div class="row"><span class="label">Current Status:</span><span class="val" style="color: #DC2626; font-weight: 700;">INACTIVE / SUSPENDED</span></div>
  <div class="row"><span class="label">Action Taken By:</span><span class="val">{{actionBy}}</span></div>
  <div class="row"><span class="label">Effective Date:</span><span class="val">{{timestamp}}</span></div>
  <div class="row"><span class="label">Reason / Notes:</span><span class="val">{{reason}}</span></div>
</div>
<p style="font-size: 13px; color: #475569; margin-top: 16px;">While inactive, public ordering, POS billing, and branch operational sync for this brand are temporarily halted.</p>
<p style="font-size: 13px; color: #64748B;">To reactivate or appeal, contact senior administration at <strong>{{supportEmail}}</strong>.</p>`,
  },
  {
    name: 'Restaurant Deleted Permanently',
    key: 'delete_restaurant',
    subject: 'Notice: Restaurant {{restaurantName}} Removed from Dal Ghar',
    description: 'Notification triggered when a restaurant entity has been permanently removed.',
    variables: ['restaurantName', 'restaurantCode', 'deletedBy', 'timestamp'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>The restaurant record for <strong>{{restaurantName}}</strong> has been removed from the platform:</p>
<div class="card-box" style="border-left: 4px solid #B91C1C;">
  <div class="row"><span class="label">Restaurant Name:</span><span class="val">{{restaurantName}}</span></div>
  <div class="row"><span class="label">Brand Code:</span><span class="val">{{restaurantCode}}</span></div>
  <div class="row"><span class="label">Deleted By:</span><span class="val">{{deletedBy}}</span></div>
  <div class="row"><span class="label">Deleted At:</span><span class="val">{{timestamp}}</span></div>
</div>
<p style="font-size: 13px; color: #64748B;">All associated historical audit events have been archived in accordance with standard compliance retention policies.</p>`,
  },
  {
    name: 'New Branch Outlet Added',
    key: 'add_branch',
    subject: 'New Branch Outlet Registered: {{branchName}} ({{branchCode}})',
    description: 'Dispatched when an outlet, dine-in branch, or cloud kitchen is opened under a brand.',
    variables: ['restaurantName', 'branchName', 'branchCode', 'type', 'city', 'managerName', 'seatingCapacity', 'portalUrl'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>A new physical outlet branch has been registered and activated for <strong>{{restaurantName}}</strong>:</p>
<div class="card-box">
  <div class="row"><span class="label">Brand:</span><span class="val">{{restaurantName}}</span></div>
  <div class="row"><span class="label">Branch Name:</span><span class="val"><strong>{{branchName}}</strong></span></div>
  <div class="row"><span class="label">Branch Code:</span><span class="val">{{branchCode}}</span></div>
  <div class="row"><span class="label">Outlet Type:</span><span class="val">{{type}}</span></div>
  <div class="row"><span class="label">City:</span><span class="val">{{city}}</span></div>
  <div class="row"><span class="label">Manager In-Charge:</span><span class="val">{{managerName}}</span></div>
  <div class="row"><span class="label">Seating Capacity:</span><span class="val">{{seatingCapacity}} Seats</span></div>
</div>
<div class="btn-container">
  <a href="{{portalUrl}}" class="btn" target="_blank">Manage Branch & Floor Tables &rarr;</a>
</div>`,
  },
  {
    name: 'Branch Details Updated',
    key: 'update_branch',
    subject: 'Branch Outlet Updated: {{branchName}} - Dal Ghar',
    description: 'Notification triggered when branch operating hours, seating, contact, or location are updated.',
    variables: ['restaurantName', 'branchName', 'branchCode', 'updatedBy', 'updatedAt', 'portalUrl'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>Branch information for <strong>{{branchName}}</strong> under <strong>{{restaurantName}}</strong> has been updated:</p>
<div class="card-box">
  <div class="row"><span class="label">Branch:</span><span class="val"><strong>{{branchName}}</strong> ({{branchCode}})</span></div>
  <div class="row"><span class="label">Parent Brand:</span><span class="val">{{restaurantName}}</span></div>
  <div class="row"><span class="label">Updated By:</span><span class="val">{{updatedBy}}</span></div>
  <div class="row"><span class="label">Timestamp:</span><span class="val">{{updatedAt}}</span></div>
</div>
<div class="btn-container">
  <a href="{{portalUrl}}" class="btn" target="_blank">View Branch Details &rarr;</a>
</div>`,
  },
  {
    name: 'Branch Outlet Deactivated / Closed',
    key: 'deactivate_branch',
    subject: 'Branch Operational Alert: {{branchName}} Marked Inactive / Closed',
    description: 'Dispatched when a branch outlet is temporarily closed, put into renovation, or marked inactive.',
    variables: ['restaurantName', 'branchName', 'branchCode', 'status', 'actionBy', 'timestamp', 'reason'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>Attention: Branch outlet <strong>{{branchName}}</strong> has been marked as <strong style="color: #D97706;">{{status}}</strong>.</p>
<div class="card-box" style="border-left: 4px solid #D97706;">
  <div class="row"><span class="label">Branch Name:</span><span class="val">{{branchName}} ({{branchCode}})</span></div>
  <div class="row"><span class="label">Restaurant:</span><span class="val">{{restaurantName}}</span></div>
  <div class="row"><span class="label">Operating Status:</span><span class="val" style="color: #D97706; font-weight: 700;">{{status}}</span></div>
  <div class="row"><span class="label">Action By:</span><span class="val">{{actionBy}}</span></div>
  <div class="row"><span class="label">Effective Time:</span><span class="val">{{timestamp}}</span></div>
  <div class="row"><span class="label">Notes / Reason:</span><span class="val">{{reason}}</span></div>
</div>
<p style="font-size: 13px; color: #475569; margin-top: 14px;">Orders and table reservations are currently paused for this outlet location.</p>`,
  },
  {
    name: 'Branch Outlet Deleted Permanently',
    key: 'delete_branch',
    subject: 'Branch Removed: {{branchName}} ({{branchCode}})',
    description: 'Notification dispatched when a branch outlet is deleted from the restaurant group.',
    variables: ['restaurantName', 'branchName', 'branchCode', 'deletedBy', 'timestamp'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>The outlet record for <strong>{{branchName}}</strong> has been deleted from <strong>{{restaurantName}}</strong>:</p>
<div class="card-box" style="border-left: 4px solid #B91C1C;">
  <div class="row"><span class="label">Branch Name:</span><span class="val">{{branchName}}</span></div>
  <div class="row"><span class="label">Branch Code:</span><span class="val">{{branchCode}}</span></div>
  <div class="row"><span class="label">Parent Brand:</span><span class="val">{{restaurantName}}</span></div>
  <div class="row"><span class="label">Deleted By:</span><span class="val">{{deletedBy}}</span></div>
  <div class="row"><span class="label">Timestamp:</span><span class="val">{{timestamp}}</span></div>
</div>
<p style="font-size: 13px; color: #64748B;">Assigned floor tables, KOT printers, and branch POS instances have been detached.</p>`,
  },
];

export class EmailTemplateService {
  /**
   * Seed default system templates if not present
   */
  static async seedDefaultTemplates() {
    for (const tpl of DEFAULT_SYSTEM_TEMPLATES) {
      const existing = await EmailTemplate.findOne({ key: tpl.key });
      if (!existing) {
        await EmailTemplate.create(tpl);
      }
    }
  }

  /**
   * List templates with optional search
   */
  static async listTemplates(params?: { search?: string; isActive?: boolean }) {
    await this.seedDefaultTemplates();

    const query: any = {};
    if (params?.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { key: searchRegex }, { subject: searchRegex }, { description: searchRegex }];
    }
    if (typeof params?.isActive === 'boolean') {
      query.isActive = params.isActive;
    }

    const templates = await EmailTemplate.find(query).sort({ isSystem: -1, createdAt: 1 });
    return templates;
  }

  /**
   * Get single template by ID
   */
  static async getTemplateById(id: string) {
    const template = await EmailTemplate.findById(id);
    if (!template) {
      throw ApiError.notFound('Email template not found');
    }
    return template;
  }

  /**
   * Get single template by Key
   */
  static async getTemplateByKey(key: string) {
    const template = await EmailTemplate.findOne({ key: key.toLowerCase().trim() });
    return template;
  }

  /**
   * Create custom email template
   */
  static async createTemplate(input: CreateTemplateInput) {
    const key = input.key.toLowerCase().trim().replace(/[^\w-]/g, '_');
    const existing = await EmailTemplate.findOne({ key });
    if (existing) {
      throw ApiError.badRequest(`Email template with key '${key}' already exists.`);
    }

    // Auto-detect variables from subject & body: {{varName}}
    const detectedVars = new Set<string>(input.variables || []);
    const fullText = `${input.subject} ${input.bodyHtml}`;
    const matches = fullText.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (matches) {
      matches.forEach((m) => detectedVars.add(m.replace(/[{}]/g, '')));
    }

    const template = await EmailTemplate.create({
      name: input.name.trim(),
      key,
      subject: input.subject.trim(),
      bodyHtml: input.bodyHtml,
      description: input.description || '',
      variables: Array.from(detectedVars),
      isActive: input.isActive ?? true,
      isSystem: false,
    });

    return template;
  }

  /**
   * Update template
   */
  static async updateTemplate(id: string, input: UpdateTemplateInput) {
    const template = await EmailTemplate.findById(id);
    if (!template) {
      throw ApiError.notFound('Email template not found');
    }

    if (input.name !== undefined) template.name = input.name.trim();
    if (input.subject !== undefined) template.subject = input.subject.trim();
    if (input.bodyHtml !== undefined) template.bodyHtml = input.bodyHtml;
    if (input.description !== undefined) template.description = input.description;
    if (input.isActive !== undefined) template.isActive = input.isActive;

    // Refresh detected variables
    const detectedVars = new Set<string>(input.variables || template.variables || []);
    const fullText = `${template.subject} ${template.bodyHtml}`;
    const matches = fullText.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (matches) {
      matches.forEach((m) => detectedVars.add(m.replace(/[{}]/g, '')));
    }
    template.variables = Array.from(detectedVars);

    await template.save();
    return template;
  }

  /**
   * Delete template
   */
  static async deleteTemplate(id: string) {
    const template = await EmailTemplate.findById(id);
    if (!template) {
      throw ApiError.notFound('Email template not found');
    }
    await EmailTemplate.findByIdAndDelete(id);
    return { success: true, message: `Email template '${template.name}' deleted successfully.` };
  }

  /**
   * Send test email using a template with sample variable values
   */
  static async sendTestEmail(templateId: string, testRecipient: string, sampleData: Record<string, string>) {
    const template = await EmailTemplate.findById(templateId);
    if (!template) {
      throw ApiError.notFound('Email template not found');
    }

    let renderedSubject = template.subject;
    let renderedBody = template.bodyHtml;

    // Replace {{var}} with sampleData or fallback
    template.variables.forEach((variable) => {
      const val = sampleData[variable] || `[${variable}]`;
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      renderedSubject = renderedSubject.replace(regex, val);
      renderedBody = renderedBody.replace(regex, val);
    });

    const fullHtml = MailService.wrapTemplate(renderedSubject, renderedBody);

    const result = await MailService.sendMail({
      to: testRecipient,
      subject: `[TEST] ${renderedSubject}`,
      html: fullHtml,
    });

    return {
      success: true,
      renderedSubject,
      renderedBody,
      mailResult: result,
    };
  }
}

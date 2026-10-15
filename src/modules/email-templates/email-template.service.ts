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
    subject: 'New Restaurant Added: {{restaurantName}} - Dal Ghar',
    description: 'Notification dispatched when a new restaurant branch brand is registered.',
    variables: ['restaurantName', 'restaurantCode', 'city', 'portalUrl'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>A new restaurant has been successfully added to the Dal Ghar management platform:</p>
<div class="card-box">
  <div class="row"><span class="label">Brand Name:</span><span class="val">{{restaurantName}}</span></div>
  <div class="row"><span class="label">Brand Code:</span><span class="val">{{restaurantCode}}</span></div>
  <div class="row"><span class="label">City:</span><span class="val">{{city}}</span></div>
</div>
<div class="btn-container">
  <a href="{{portalUrl}}" class="btn" target="_blank">View Restaurant Details &rarr;</a>
</div>`,
  },
  {
    name: 'New Branch Outlet Added',
    key: 'add_branch',
    subject: 'New Branch Outlet Registered: {{branchName}} ({{branchCode}})',
    description: 'Dispatched when an outlet or cloud kitchen is opened under a brand.',
    variables: ['branchName', 'branchCode', 'type', 'city', 'managerName'],
    isSystem: true,
    isActive: true,
    bodyHtml: `<p>A new physical branch outlet has been registered in the system:</p>
<div class="card-box">
  <div class="row"><span class="label">Branch Name:</span><span class="val">{{branchName}}</span></div>
  <div class="row"><span class="label">Branch Code:</span><span class="val">{{branchCode}}</span></div>
  <div class="row"><span class="label">Type:</span><span class="val">{{type}}</span></div>
  <div class="row"><span class="label">City:</span><span class="val">{{city}}</span></div>
  <div class="row"><span class="label">Manager:</span><span class="val">{{managerName}}</span></div>
</div>`,
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

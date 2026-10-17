import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailEventType =
  | 'REGISTER'
  | 'FORGET_PASSWORD'
  | 'RESET_PASSWORD'
  | 'ADD_RESTAURANT'
  | 'ADD_BRANCH'
  | 'WELCOME_USER'
  | 'ADD_USER'
  | 'UPDATE_USER'
  | 'CHANGE_PASSWORD'
  | 'TICKET_RAISED'
  | 'TICKET_RESOLVED'
  | 'UPDATE_PROFILE'
  | 'NEWS_PUBLISH';

export class MailService {
  private static transporter: Transporter | null = null;

  /**
   * Initializes or returns the cached nodemailer transporter
   */
  private static getTransporter(): Transporter {
    if (!this.transporter) {
      if (config.smtp.user && config.smtp.pass) {
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
        });
      } else {
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    }
    return this.transporter;
  }

  /**
   * Base email layout template with Dal Ghar signature branding
   */
  public static wrapTemplate(title: string, contentHtml: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F6F0E6; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E6DEC9; overflow: hidden; box-shadow: 0 4px 14px rgba(27,77,46,0.06); }
          .header { background-color: #1B4D2E; padding: 24px 32px; text-align: center; }
          .brand-title { color: #FAF5ED; font-size: 24px; font-weight: 800; letter-spacing: 1px; margin: 0; }
          .brand-tagline { color: #D97706; font-size: 12px; margin-top: 4px; font-weight: 600; }
          .content { padding: 32px; line-height: 1.6; }
          .card-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .label { color: #64748B; font-weight: 600; }
          .val { color: #0F172A; font-weight: 700; }
          .btn-container { text-align: center; margin: 26px 0 10px 0; }
          .btn { background-color: #1B4D2E; color: #FFFFFF !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; }
          .footer { background-color: #FAF6F0; border-top: 1px solid #E6DEC9; padding: 18px 32px; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand-title">DAL GHAR</h1>
            <div class="brand-tagline">Signature Dal &bull; Restaurant Management Portal</div>
          </div>
          <div class="content">
            <h2 style="color: #1B4D2E; margin-top: 0; font-size: 20px;">${title}</h2>
            ${contentHtml}
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Dal Ghar Restaurant Management.<br>
            Sent securely via Dal Ghar Mail Service. Please do not reply directly.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generic sender with console fallback
   */
  static async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      const transporter = this.getTransporter();
      const mailOptions = {
        from: config.smtp.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error instanceof Error ? error.message : error);
      return { success: false };
    }
  }

  // 1. EVENT: Register
  static async sendRegisterEmail(params: {
    to: string;
    userName: string;
    role?: string;
    temporaryPassword?: string;
    loginUrl?: string;
  }) {
    const loginUrl = params.loginUrl || `${config.clientUrl}/auth/login`;
    const html = this.wrapTemplate(
      'Account Registration Confirmed',
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>Welcome to <strong>Dal Ghar Management Portal</strong>! Your account registration has been successfully verified and activated.</p>
      
      <div class="card-box">
        <div style="font-weight: 700; color: #1B4D2E; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
          Account Details
        </div>
        <div class="row"><span class="label">Full Name:</span><span class="val">${params.userName}</span></div>
        <div class="row"><span class="label">Registered Email:</span><span class="val">${params.to}</span></div>
        <div class="row"><span class="label">Assigned Role:</span><span class="val" style="color: #1B4D2E;">${params.role || 'Member'}</span></div>
        <div class="row"><span class="label">Account Status:</span><span class="val" style="color: #16A34A;">● Active</span></div>
        <div class="row"><span class="label">Registration Date:</span><span class="val">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
        ${
          params.temporaryPassword
            ? `<div class="row" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;"><span class="label">Password:</span><span class="val" style="font-family: monospace; font-size: 14px; background: #E2E8F0; padding: 2px 8px; border-radius: 4px;">${params.temporaryPassword}</span></div>`
            : ''
        }
      </div>

      <div class="btn-container">
        <a href="${loginUrl}" class="btn" target="_blank">Sign In to Dal Ghar Dashboard &rarr;</a>
      </div>

      <p style="font-size: 13px; color: #64748B; margin-top: 20px;">
        For security, please keep your login credentials confidential and do not share them with anyone.
      </p>
      `
    );
    return await this.sendMail({ to: params.to, subject: 'Welcome to Dal Ghar! Account Registration Successful', html });
  }

  // 2. EVENT: Forget Password (OTP)
  // 2. EVENT: Forget Password (Reset Password Link)
  static async sendForgetPasswordEmail(params: {
    to: string;
    userName: string;
    resetTokenOrOtp: string;
    resetUrl?: string;
  }) {
    const resetUrl =
      params.resetUrl ||
      `${config.clientUrl}/auth/forgot-password?email=${encodeURIComponent(params.to)}&otp=${encodeURIComponent(params.resetTokenOrOtp)}`;
    const html = this.wrapTemplate(
      'Reset Your Password',
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>We received a request to reset your password for your <strong>Dal Ghar Admin</strong> account associated with <strong>${params.to}</strong>.</p>
      
      <p style="margin-top: 14px;">
        To choose a new password, please click the secure link below:
      </p>

      <div class="btn-container" style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${resetUrl}" class="btn" target="_blank" style="background-color: #1B4D2E; color: #FFFFFF !important; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(27,77,46,0.25);">Reset Password &rarr;</a>
      </div>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #475569; word-break: break-all;">
        <div style="font-weight: 700; margin-bottom: 4px; color: #1E293B;">Or copy and paste this link in your browser:</div>
        <a href="${resetUrl}" target="_blank" style="color: #1B4D2E; text-decoration: underline;">${resetUrl}</a>
      </div>

      <div class="card-box" style="margin-top: 16px;">
        <div class="row"><span class="label">Requested For:</span><span class="val">${params.to}</span></div>
        <div class="row"><span class="label">Link Expiration:</span><span class="val" style="color: #D97706;">⏱ Valid for 15 minutes</span></div>
        <div class="row"><span class="label">Request Time:</span><span class="val">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
      </div>

      <p style="font-size: 12px; color: #64748B; margin-top: 18px;">
        If you did not request this password reset, please ignore this email. Your password will remain unchanged and your account stays completely secure.
      </p>
      `
    );
    return await this.sendMail({ to: params.to, subject: `Reset Your Password - Dal Ghar`, html });
  }

  // 3. EVENT: Reset Password Confirmation
  static async sendResetPasswordSuccessEmail(params: {
    to: string;
    userName: string;
    timestamp?: string;
    loginUrl?: string;
  }) {
    const loginUrl = params.loginUrl || `${config.clientUrl}/auth/login`;
    const timeStr = params.timestamp || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const html = this.wrapTemplate(
      'Password Reset Successfully',
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>Your <strong>Dal Ghar Admin</strong> account password was successfully updated via OTP verification.</p>
      
      <div class="card-box">
        <div style="font-weight: 700; color: #1B4D2E; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
          Security Confirmation
        </div>
        <div class="row"><span class="label">Account Email:</span><span class="val">${params.to}</span></div>
        <div class="row"><span class="label">Updated At:</span><span class="val">${timeStr}</span></div>
        <div class="row"><span class="label">Status:</span><span class="val" style="color: #16A34A;">● Password Updated</span></div>
        <div class="row"><span class="label">Active Sessions:</span><span class="val">Previous tokens invalidated</span></div>
      </div>

      <div class="btn-container">
        <a href="${loginUrl}" class="btn" target="_blank">Sign In with New Password &rarr;</a>
      </div>

      <p style="font-size: 13px; color: #DC2626; margin-top: 20px; font-weight: 500;">
        ⚠️ If you did not perform this password reset, please notify your administrator immediately or reach out to support.
      </p>
      `
    );
    return await this.sendMail({ to: params.to, subject: 'Security Alert: Password Reset Successful - Dal Ghar', html });
  }

  // 4. EVENT: Add Restaurant Notification
  static async sendAddRestaurantEmail(params: {
    to: string;
    recipientName?: string;
    restaurant: {
      name: string;
      code: string;
      slug: string;
      phone: string;
      email?: string | null;
      website?: string | null;
      city: string;
      state: string;
      country?: string;
      postalCode?: string;
      legalName?: string | null;
      gstin?: string | null;
      operatingStatus: string;
    };
    createdByName?: string;
  }) {
    const r = params.restaurant;
    const viewUrl = `${config.clientUrl}/admin/restaurants`;
    const html = this.wrapTemplate(
      'New Restaurant Brand Created',
      `
      <p>Hello <strong>${params.recipientName || 'Administrator'}</strong>,</p>
      <p>A new restaurant brand entity has been successfully registered on the <strong>Dal Ghar Operations Platform</strong>.</p>
      
      <div class="card-box">
        <div style="font-weight: 700; color: #1B4D2E; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
          Restaurant Brand Details
        </div>
        <div class="row"><span class="label">Restaurant Name:</span><span class="val" style="color: #1B4D2E; font-size: 15px;">${r.name}</span></div>
        <div class="row"><span class="label">Brand Code:</span><span class="val">${r.code}</span></div>
        <div class="row"><span class="label">URL Slug:</span><span class="val">${r.slug}</span></div>
        <div class="row"><span class="label">Operating Status:</span><span class="val" style="color: ${r.operatingStatus === 'ACTIVE' ? '#16A34A' : '#D97706'}; font-weight: 700;">● ${r.operatingStatus}</span></div>
        ${r.legalName ? `<div class="row"><span class="label">Legal Business Name:</span><span class="val">${r.legalName}</span></div>` : ''}
        ${r.gstin ? `<div class="row"><span class="label">GSTIN / Tax ID:</span><span class="val">${r.gstin}</span></div>` : ''}
      </div>

      <div class="card-box">
        <div style="font-weight: 700; color: #1B4D2E; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
          Contact & Location Details
        </div>
        <div class="row"><span class="label">Official Phone:</span><span class="val">${r.phone}</span></div>
        ${r.email ? `<div class="row"><span class="label">Official Email:</span><span class="val">${r.email}</span></div>` : ''}
        ${r.website ? `<div class="row"><span class="label">Website:</span><span class="val">${r.website}</span></div>` : ''}
        <div class="row"><span class="label">Location:</span><span class="val">${r.city}, ${r.state}${r.postalCode ? ` - ${r.postalCode}` : ''}</span></div>
        ${params.createdByName ? `<div class="row"><span class="label">Created By:</span><span class="val">${params.createdByName}</span></div>` : ''}
        <div class="row"><span class="label">Creation Date:</span><span class="val">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
      </div>

      <div class="btn-container">
        <a href="${viewUrl}" class="btn" target="_blank">View Restaurants in Portal &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748B; margin-top: 18px;">
        You can now configure branches, menus, taxes, and assign operational staff to this restaurant.
      </p>
      `
    );
    return await this.sendMail({
      to: params.to,
      subject: `[New Restaurant] ${r.name} (${r.code}) Created - Dal Ghar`,
      html,
    });
  }

  // 5. EVENT: Add Branch Outlet Notification
  static async sendAddBranchEmail(params: {
    to: string;
    recipientName?: string;
    branch: {
      name: string;
      code: string;
      slug: string;
      type: string;
      restaurantName: string;
      phone: string;
      email?: string | null;
      managerName?: string | null;
      managerPhone?: string | null;
      addressLine1: string;
      city: string;
      state: string;
      postalCode?: string;
      seatingCapacity?: number;
      operatingStatus: string;
    };
    createdByName?: string;
  }) {
    const b = params.branch;
    const viewUrl = `${config.clientUrl}/admin/branches`;
    const html = this.wrapTemplate(
      'New Branch Outlet Registered',
      `
      <p>Hello <strong>${params.recipientName || 'Manager'}</strong>,</p>
      <p>A new branch outlet has been registered under <strong>${b.restaurantName}</strong> on the <strong>Dal Ghar Management Portal</strong>.</p>
      
      <div class="card-box">
        <div style="font-weight: 700; color: #1B4D2E; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
          Branch Outlet Details
        </div>
        <div class="row"><span class="label">Branch Name:</span><span class="val" style="color: #1B4D2E; font-size: 15px;">${b.name}</span></div>
        <div class="row"><span class="label">Parent Brand:</span><span class="val">${b.restaurantName}</span></div>
        <div class="row"><span class="label">Branch Code:</span><span class="val">${b.code}</span></div>
        <div class="row"><span class="label">Outlet Type:</span><span class="val" style="color: #D97706; font-weight: 700;">${b.type}</span></div>
        <div class="row"><span class="label">Status:</span><span class="val" style="color: ${b.operatingStatus === 'ACTIVE' ? '#16A34A' : '#D97706'}; font-weight: 700;">● ${b.operatingStatus}</span></div>
        ${b.seatingCapacity !== undefined ? `<div class="row"><span class="label">Seating Capacity:</span><span class="val">${b.seatingCapacity} Seats</span></div>` : ''}
      </div>

      <div class="card-box">
        <div style="font-weight: 700; color: #1B4D2E; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
          Manager & Contact Information
        </div>
        ${b.managerName ? `<div class="row"><span class="label">Branch Manager:</span><span class="val" style="color: #1B4D2E;">${b.managerName}</span></div>` : ''}
        ${b.managerPhone ? `<div class="row"><span class="label">Manager Phone:</span><span class="val">${b.managerPhone}</span></div>` : ''}
        <div class="row"><span class="label">Branch Phone:</span><span class="val">${b.phone}</span></div>
        ${b.email ? `<div class="row"><span class="label">Branch Email:</span><span class="val">${b.email}</span></div>` : ''}
        <div class="row"><span class="label">Address:</span><span class="val">${b.addressLine1}, ${b.city}, ${b.state}${b.postalCode ? ` - ${b.postalCode}` : ''}</span></div>
        ${params.createdByName ? `<div class="row"><span class="label">Created By:</span><span class="val">${params.createdByName}</span></div>` : ''}
        <div class="row"><span class="label">Creation Date:</span><span class="val">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
      </div>

      <div class="btn-container">
        <a href="${viewUrl}" class="btn" target="_blank">Manage Branch in Portal &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748B; margin-top: 18px;">
        Tables, POS terminals, printer devices, and inventory tracking are ready to be configured for this outlet.
      </p>
      `
    );
    return await this.sendMail({
      to: params.to,
      subject: `[New Branch Added] ${b.name} (${b.restaurantName}) - Dal Ghar`,
      html,
    });
  }

  // EVENT: Deactivate Restaurant Notification
  static async sendDeactivateRestaurantEmail(params: {
    to: string;
    recipientName?: string;
    restaurant: {
      name: string;
      code: string;
      email?: string | null;
      phone?: string | null;
    };
    actionBy?: string;
    reason?: string;
  }) {
    const r = params.restaurant;
    const viewUrl = `${config.clientUrl}/admin/restaurants`;
    const html = this.wrapTemplate(
      'Restaurant Deactivated / Suspended',
      `
      <p>Hello <strong>${params.recipientName || 'Administrator'}</strong>,</p>
      <p>This notice confirms that the operating status of restaurant <strong>${r.name}</strong> (${r.code}) has been marked as <strong style="color: #DC2626;">INACTIVE</strong>.</p>
      
      <div class="card-box" style="border-left: 4px solid #DC2626;">
        <div style="font-weight: 700; color: #DC2626; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
          Status Update Notice
        </div>
        <div class="row"><span class="label">Restaurant Brand:</span><span class="val" style="font-weight: 700;">${r.name}</span></div>
        <div class="row"><span class="label">Brand Code:</span><span class="val">${r.code}</span></div>
        <div class="row"><span class="label">Status:</span><span class="val" style="color: #DC2626; font-weight: 700;">● INACTIVE / SUSPENDED</span></div>
        <div class="row"><span class="label">Action Taken By:</span><span class="val">${params.actionBy || 'Administrator'}</span></div>
        <div class="row"><span class="label">Effective Date:</span><span class="val">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
        ${params.reason ? `<div class="row"><span class="label">Reason / Notes:</span><span class="val">${params.reason}</span></div>` : ''}
      </div>

      <p style="font-size: 13px; color: #475569; margin-top: 16px;">
        While inactive, public ordering, POS billing, and branch operational synchronization for this brand are temporarily suspended.
      </p>

      <div class="btn-container">
        <a href="${viewUrl}" class="btn" target="_blank" style="background-color: #DC2626;">Review Status in Portal &rarr;</a>
      </div>
      `
    );
    return await this.sendMail({
      to: params.to,
      subject: `[Status Alert] Restaurant ${r.name} (${r.code}) Has Been Deactivated - Dal Ghar`,
      html,
    });
  }

  // EVENT: Update Restaurant Notification
  static async sendUpdateRestaurantEmail(params: {
    to: string;
    recipientName?: string;
    restaurant: {
      name: string;
      code: string;
      operatingStatus: string;
      phone?: string | null;
      email?: string | null;
    };
    updatedBy?: string;
  }) {
    const r = params.restaurant;
    const viewUrl = `${config.clientUrl}/admin/restaurants`;
    const html = this.wrapTemplate(
      'Restaurant Details Updated',
      `
      <p>Hello <strong>${params.recipientName || 'Administrator'}</strong>,</p>
      <p>The profile configuration or operating details for restaurant <strong>${r.name}</strong> (${r.code}) have been updated.</p>
      
      <div class="card-box">
        <div class="row"><span class="label">Restaurant:</span><span class="val"><strong>${r.name}</strong> (${r.code})</span></div>
        <div class="row"><span class="label">Status:</span><span class="val" style="color: #0284C7;">● Profile Modified</span></div>
        <div class="row"><span class="label">Updated By:</span><span class="val">${params.updatedBy || 'Administrator'}</span></div>
        <div class="row"><span class="label">Timestamp:</span><span class="val">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
      </div>

      <div class="btn-container">
        <a href="${viewUrl}" class="btn" target="_blank">Review Updated Details &rarr;</a>
      </div>
      `
    );
    return await this.sendMail({
      to: params.to,
      subject: `[Update] Restaurant ${r.name} Profile Modified - Dal Ghar`,
      html,
    });
  }

  // EVENT: Delete Restaurant Notification
  static async sendDeleteRestaurantEmail(params: {
    to: string;
    recipientName?: string;
    restaurantName: string;
    restaurantCode: string;
    deletedBy?: string;
  }) {
    const html = this.wrapTemplate(
      'Restaurant Brand Removed',
      `
      <p>Hello <strong>${params.recipientName || 'Administrator'}</strong>,</p>
      <p>The restaurant record for <strong>${params.restaurantName}</strong> (${params.restaurantCode}) has been removed from the Dal Ghar platform.</p>
      
      <div class="card-box" style="border-left: 4px solid #B91C1C;">
        <div class="row"><span class="label">Restaurant:</span><span class="val"><strong>${params.restaurantName}</strong></span></div>
        <div class="row"><span class="label">Brand Code:</span><span class="val">${params.restaurantCode}</span></div>
        <div class="row"><span class="label">Removed By:</span><span class="val">${params.deletedBy || 'Super Admin'}</span></div>
        <div class="row"><span class="label">Removed At:</span><span class="val">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
      </div>
      `
    );
    return await this.sendMail({
      to: params.to,
      subject: `[Removed] Restaurant ${params.restaurantName} (${params.restaurantCode}) Deleted - Dal Ghar`,
      html,
    });
  }

  // 3. EVENT: Welcome User
  static async sendWelcomeUserEmail(params: { to: string; userName: string; roleName?: string; loginUrl?: string }) {
    const loginUrl = params.loginUrl || `${config.clientUrl}/auth/login`;
    const html = this.wrapTemplate(
      `Welcome to Dal Ghar!`,
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>We're thrilled to welcome you to the Dal Ghar team. You are now part of our unified restaurant operations platform.</p>
      <div class="card-box">
        <div class="row"><span class="label">User Name:</span><span class="val">${params.userName}</span></div>
        <div class="row"><span class="label">Account Email:</span><span class="val">${params.to}</span></div>
        ${params.roleName ? `<div class="row"><span class="label">Role:</span><span class="val" style="color: #1B4D2E;">${params.roleName}</span></div>` : ''}
      </div>
      <div class="btn-container">
        <a href="${loginUrl}" class="btn" target="_blank">Get Started &rarr;</a>
      </div>
      `
    );
    return await this.sendMail({ to: params.to, subject: 'Welcome to Dal Ghar Family!', html });
  }

  // 4. EVENT: Add User (Admin creates a staff/agent account with credentials)
  static async sendAddUserEmail(params: {
    to: string;
    userName: string;
    roleName: string;
    temporaryPassword?: string;
    loginUrl?: string;
  }) {
    const loginUrl = params.loginUrl || `${config.clientUrl}/auth/login`;
    const html = this.wrapTemplate(
      'Your User Account Has Been Created',
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>An administrator has created a user account for you on the Dal Ghar Management Portal with the credentials below:</p>
      <div class="card-box">
        <div class="row"><span class="label">Role Assigned:</span><span class="val" style="color: #1B4D2E;">${params.roleName}</span></div>
        <div class="row"><span class="label">Login Email:</span><span class="val">${params.to}</span></div>
        ${
          params.temporaryPassword
            ? `<div class="row"><span class="label">Temporary Password:</span><span class="val" style="font-family: monospace;">${params.temporaryPassword}</span></div>`
            : ''
        }
      </div>
      <p style="font-size: 13px; color: #64748B;">Please log in and update your password in Settings &gt; Security & Auth.</p>
      <div class="btn-container">
        <a href="${loginUrl}" class="btn" target="_blank">Login to Account &rarr;</a>
      </div>
      `
    );
    return await this.sendMail({ to: params.to, subject: `Account Created: Dal Ghar Portal (${params.roleName})`, html });
  }

  // 5. EVENT: Update User
  static async sendUpdateUserEmail(params: { to: string; userName: string; changesSummary: string }) {
    const html = this.wrapTemplate(
      'Account Information Updated',
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>An update was made to your user profile / role settings:</p>
      <div class="card-box">
        <div style="font-size: 13px; color: #0F172A; white-space: pre-line;">${params.changesSummary}</div>
      </div>
      <p style="font-size: 13px; color: #64748B;">If you did not authorize this change, please contact system administration immediately.</p>
      `
    );
    return await this.sendMail({ to: params.to, subject: 'Your Account Details Were Updated - Dal Ghar', html });
  }

  // 6. EVENT: Change Password
  static async sendChangePasswordEmail(params: { to: string; userName: string; timestamp?: string }) {
    const timeStr = params.timestamp || new Date().toLocaleString();
    const html = this.wrapTemplate(
      'Password Changed Successfully',
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>The password for your Dal Ghar Admin account has been successfully changed.</p>
      <div class="card-box">
        <div class="row"><span class="label">Account Email:</span><span class="val">${params.to}</span></div>
        <div class="row"><span class="label">Date & Time:</span><span class="val">${timeStr}</span></div>
        <div class="row"><span class="label">Status:</span><span class="val" style="color: #16A34A;">Secured</span></div>
      </div>
      <p style="font-size: 13px; color: #64748B;">If you did not make this change, please contact your administrator right away to secure your account.</p>
      `
    );
    return await this.sendMail({ to: params.to, subject: 'Security Notice: Password Changed - Dal Ghar', html });
  }

  // 7. EVENT: Ticket Raised
  static async sendTicketRaisedEmail(params: {
    to: string;
    userName: string;
    ticketId: string;
    ticketSubject: string;
    priority?: string;
  }) {
    const html = this.wrapTemplate(
      `Support Ticket Received: #${params.ticketId}`,
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>Your support ticket has been created and dispatched to our helpdesk team.</p>
      <div class="card-box">
        <div class="row"><span class="label">Ticket ID:</span><span class="val">#${params.ticketId}</span></div>
        <div class="row"><span class="label">Subject:</span><span class="val">${params.ticketSubject}</span></div>
        <div class="row"><span class="label">Priority:</span><span class="val" style="color: #D97706;">${params.priority || 'Normal'}</span></div>
      </div>
      <p style="font-size: 13px; color: #64748B;">A support specialist will review your request and reply shortly.</p>
      `
    );
    return await this.sendMail({ to: params.to, subject: `Ticket Raised #${params.ticketId} - ${params.ticketSubject}`, html });
  }

  // 8. EVENT: Ticket Resolved
  static async sendTicketResolvedEmail(params: {
    to: string;
    userName: string;
    ticketId: string;
    resolutionNotes: string;
  }) {
    const html = this.wrapTemplate(
      `Support Ticket Resolved: #${params.ticketId}`,
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>Your support ticket <strong>#${params.ticketId}</strong> has been marked as <strong>Resolved</strong>.</p>
      <div class="card-box">
        <div style="font-size: 13px; color: #64748B; margin-bottom: 6px; font-weight: 600;">Resolution Notes:</div>
        <div style="font-size: 14px; color: #0F172A; white-space: pre-line;">${params.resolutionNotes}</div>
      </div>
      <p style="font-size: 13px; color: #64748B;">Thank you for your patience. If you still have questions, you may reopen this ticket at any time.</p>
      `
    );
    return await this.sendMail({ to: params.to, subject: `Resolved: Support Ticket #${params.ticketId}`, html });
  }

  // 9. EVENT: Update Profile
  static async sendUpdateProfileEmail(params: { to: string; userName: string; updatedFields: string[] }) {
    const html = this.wrapTemplate(
      'Profile Information Updated',
      `
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>Your user profile information was recently updated.</p>
      <div class="card-box">
        <div class="row"><span class="label">Updated Fields:</span><span class="val">${params.updatedFields.join(', ')}</span></div>
        <div class="row"><span class="label">Date:</span><span class="val">${new Date().toLocaleDateString()}</span></div>
      </div>
      <p style="font-size: 13px; color: #64748B;">If this change was not made by you, please review your account settings.</p>
      `
    );
    return await this.sendMail({ to: params.to, subject: 'Profile Updated - Dal Ghar', html });
  }

  // 10. EVENT: News Publish
  static async sendNewsPublishEmail(params: {
    to: string;
    headline: string;
    summary: string;
    articleUrl?: string;
  }) {
    const readUrl = params.articleUrl || `${config.clientUrl}/admin/dashboard`;
    const html = this.wrapTemplate(
      'Announcement & News Update',
      `
      <h3 style="color: #0F172A; margin-top: 0;">${params.headline}</h3>
      <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
        ${params.summary}
      </div>
      <div class="btn-container">
        <a href="${readUrl}" class="btn" target="_blank">Read Full Announcement &rarr;</a>
      </div>
      `
    );
    return await this.sendMail({ to: params.to, subject: `Announcement: ${params.headline}`, html });
  }

  // Legacy alias for WelcomeCredentials
  static async sendWelcomeCredentialsEmail(params: {
    to: string;
    userName: string;
    roleName: string;
    temporaryPassword?: string;
    loginUrl?: string;
  }) {
    return this.sendAddUserEmail(params);
  }

  // Legacy alias for RoleAssignment
  static async sendRoleAssignmentEmail(params: { to: string; userName: string; roleName: string }) {
    return this.sendUpdateUserEmail({
      to: params.to,
      userName: params.userName,
      changesSummary: `Your role has been updated to: ${params.roleName}. Real-time permissions are now active.`,
    });
  }
}

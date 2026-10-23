import bcrypt from 'bcryptjs';
import { User, IUser, UserRole } from '../../models/User.js';
import { TokenService } from './token.service.js';
import { LoginInput, RegisterInput } from './auth.validation.js';
import { LoginResponseData, UserAuthDto } from './auth.types.js';
import { ROLE_PERMISSIONS } from '../../config/permissions.js';
import { ApiError } from '../../utils/ApiError.js';
import { config } from '../../config/env.js';

export class AuthService {
  private static async formatUserDto(user: IUser): Promise<UserAuthDto> {
    const { calculateUserEffectivePermissions } = await import('../../utils/permissionUtils.js');
    const permResult = await calculateUserEffectivePermissions(user);

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      roles: permResult.roles.map((r) => ({ id: r.id, name: r.name, slug: r.slug })),
      restaurantId: user.restaurantId || null,
      branchId: user.branchId || null,
      terminalId: user.terminalId || null,
      permissions: permResult.effectivePermissions,
      directPermissions: [],
    };
  }

  static async login(input: LoginInput): Promise<LoginResponseData> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Account is inactive or suspended');
    }

    // Workspace-specific validation when logging in from a dedicated workspace terminal
    if (input.workspace) {
      const { calculateUserEffectivePermissions } = await import('../../utils/permissionUtils.js');
      const permResult = await calculateUserEffectivePermissions(user);
      const perms = permResult.effectivePermissions;
      const roleSlugs = permResult.roles.map((r) => r.slug);

      if (input.workspace === 'kitchen') {
        const isKitchen =
          user.role === 'SUPER_ADMIN' ||
          user.role === 'KITCHEN_STAFF' ||
          roleSlugs.includes('kitchen-staff') ||
          roleSlugs.includes('kitchen_staff') ||
          perms.includes('kitchen.orders.view');

        if (!isKitchen) {
          throw new ApiError(403, 'Access Denied: Your account role is not authorized for the Kitchen Display workspace.');
        }
      } else if (input.workspace === 'waiter') {
        const isWaiter =
          user.role === 'SUPER_ADMIN' ||
          user.role === 'WAITER' ||
          roleSlugs.includes('waiter') ||
          perms.includes('waiter.orders.view');

        if (!isWaiter) {
          throw new ApiError(403, 'Access Denied: Your account role is not authorized for the Waiter Service workspace.');
        }
      } else if (input.workspace === 'pos') {
        const isPos =
          user.role === 'SUPER_ADMIN' ||
          user.role === 'RESTAURANT_ADMIN' ||
          user.role === 'BRANCH_MANAGER' ||
          user.role === 'CASHIER' ||
          roleSlugs.includes('cashier') ||
          roleSlugs.includes('billing') ||
          perms.includes('pos.view');

        if (!isPos) {
          throw new ApiError(403, 'Access Denied: Your account role is not authorized for the Cashier POS Terminal.');
        }
      } else if (input.workspace === 'admin') {
        const isAdmin =
          user.role === 'SUPER_ADMIN' ||
          user.role === 'RESTAURANT_ADMIN' ||
          user.role === 'BRANCH_MANAGER' ||
          roleSlugs.includes('super-admin') ||
          roleSlugs.includes('administrator') ||
          roleSlugs.includes('branch-manager') ||
          perms.includes('dashboard.view');

        if (!isAdmin) {
          throw new ApiError(403, 'Access Denied: Your account role does not have authorization for the Administration Portal.');
        }
      }
    }

    const tokens = TokenService.generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId || null,
      branchId: user.branchId || null,
    });

    const userDto = await this.formatUserDto(user);

    return {
      accessToken: tokens.accessToken,
      user: userDto,
    };
  }

  static async register(input: RegisterInput): Promise<LoginResponseData> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const role: UserRole = input.role || 'CASHIER';

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      name: input.name,
      role,
      restaurantId: input.restaurantId || null,
      branchId: input.branchId || null,
      permissions: ROLE_PERMISSIONS[role] || [],
      isActive: true,
    });

    // Send Registration Confirmation Email to newly created user
    try {
      const { MailService } = await import('../../services/mail.service.js');
      MailService.sendRegisterEmail({
        to: user.email,
        userName: user.name,
        role: role.replace('_', ' '),
        temporaryPassword: input.password,
      }).catch((err) => console.error('Failed to send register email:', err));
    } catch {
      // Non-blocking mail failure
    }

    const tokens = TokenService.generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId || null,
      branchId: user.branchId || null,
    });

    const userDto = await this.formatUserDto(user);

    return {
      accessToken: tokens.accessToken,
      user: userDto,
    };
  }

  static async getCurrentUser(userId: string): Promise<UserAuthDto> {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return await this.formatUserDto(user);
  }

  static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // For privacy, even if user doesn't exist, return success response so emails cannot be enumerated
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.',
      };
    }

    // Generate random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = expiry;
    await user.save();

    // Generate reset password link that directs user straight to step 2 with email and otp pre-filled
    const resetUrl = `${config.clientUrl}/auth/forgot-password?email=${encodeURIComponent(user.email)}&otp=${encodeURIComponent(otp)}`;

    // Send Forgot Password Email Event via Zoho SMTP
    try {
      const { MailService } = await import('../../services/mail.service.js');
      await MailService.sendForgetPasswordEmail({
        to: user.email,
        userName: user.name,
        resetTokenOrOtp: otp,
        resetUrl,
      });
    } catch (err) {
      console.error('Failed to dispatch forgot password email:', err);
    }

    return {
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent.',
    };
  }

  static async resetPassword(input: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      throw new ApiError(400, 'Invalid reset request or expired code.');
    }

    if (
      !user.resetPasswordOtp ||
      user.resetPasswordOtp !== input.otp.trim() ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires.getTime() < Date.now()
    ) {
      throw new ApiError(400, 'Invalid or expired OTP verification code.');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    user.passwordHash = passwordHash;
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Trigger Reset Password Success security confirmation email
    try {
      const { MailService } = await import('../../services/mail.service.js');
      MailService.sendResetPasswordSuccessEmail({
        to: user.email,
        userName: user.name,
      }).catch((err) => console.error('Failed to dispatch reset password success email:', err));
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    };
  }
}

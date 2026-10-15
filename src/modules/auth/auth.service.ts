import bcrypt from 'bcryptjs';
import { User, IUser, UserRole } from '../../models/User.js';
import { TokenService } from './token.service.js';
import { LoginInput, RegisterInput } from './auth.validation.js';
import { LoginResponseData, UserAuthDto } from './auth.types.js';
import { ROLE_PERMISSIONS } from '../../config/permissions.js';
import { ApiError } from '../../utils/ApiError.js';

export class AuthService {
  private static formatUserDto(user: IUser): UserAuthDto {
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const customPermissions = user.permissions || [];
    const combinedPermissions = Array.from(new Set([...rolePermissions, ...customPermissions]));

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId || null,
      branchId: user.branchId || null,
      permissions: combinedPermissions,
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

    const tokens = TokenService.generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId || null,
      branchId: user.branchId || null,
    });

    const userDto = this.formatUserDto(user);

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

    const tokens = TokenService.generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId || null,
      branchId: user.branchId || null,
    });

    const userDto = this.formatUserDto(user);

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
    return this.formatUserDto(user);
  }
}

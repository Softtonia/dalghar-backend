import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser, UserRole } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { UserHasRole } from '../../models/UserHasRole.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Branch } from '../../models/Branch.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  CreateUserInput,
  UpdateUserInput,
  ListUserQueryInput,
} from './user.schemas.js';
import { MailService } from '../../services/mail.service.js';
import { config } from '../../config/env.js';
import { calculateUserEffectivePermissions } from '../../utils/permissionUtils.js';

export class UserService {
  /**
   * Helper: Enrich users with restaurant, branch, dynamic roles, and effective permissions
   */
  private static async enrichUser(user: IUser) {
    const json = user.toJSON ? user.toJSON() : (user as any);

    // Compute authoritative effective permissions, inherited permissions, and assigned roles
    const permResult = await calculateUserEffectivePermissions(user);

    // Fetch Restaurant Details
    let restaurantObj: any = null;
    if (user.restaurantId) {
      try {
        restaurantObj = await Restaurant.findById(user.restaurantId).select('name code slug');
      } catch {
        // Ignored
      }
    }

    // Fetch Branch Details
    let branchObj: any = null;
    if (user.branchId) {
      try {
        branchObj = await Branch.findById(user.branchId).select('name code type');
      } catch {
        // Ignored
      }
    }

    const primaryRole = permResult.roles[0] || null;

    return {
      ...json,
      roles: permResult.roles,
      assignedRole: primaryRole
        ? {
            id: primaryRole.id,
            name: primaryRole.name,
            slug: primaryRole.slug,
          }
        : null,
      permissions: permResult.effectivePermissions,
      inheritedPermissions: permResult.inheritedPermissions,
      directAllows: [],
      directDenials: [],
      directPermissions: [],
      terminalId: user.terminalId || null,
      restaurant: restaurantObj
        ? {
            id: restaurantObj._id?.toString() || restaurantObj.id,
            name: restaurantObj.name,
            code: restaurantObj.code,
          }
        : null,
      branch: branchObj
        ? {
            id: branchObj._id?.toString() || branchObj.id,
            name: branchObj.name,
            code: branchObj.code,
            type: branchObj.type,
          }
        : null,
    };
  }

  /**
   * List users with optional search, role filter, restaurant filter, branch filter, and pagination
   */
  static async listUsers(params: ListUserQueryInput) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (params.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (params.role) {
      query.$or = [
        { role: params.role },
        { roles: params.role },
      ];
    }

    if (params.restaurantId) {
      query.restaurantId = params.restaurantId;
    }

    if (params.branchId) {
      query.branchId = params.branchId;
    }

    if (typeof params.isActive === 'boolean') {
      query.isActive = params.isActive;
    }

    const [items, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    const enrichedItems = await Promise.all(items.map((u) => this.enrichUser(u)));

    return {
      items: enrichedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single user by ID
   */
  static async getUserById(id: string) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return await this.enrichUser(user);
  }

  /**
   * Create new user with restaurant, branch, and role assignment, and send welcome email
   */
  static async createUser(input: CreateUserInput, creatorUserId?: string) {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw ApiError.conflict(`A user with email "${normalizedEmail}" already exists`);
    }

    // Validate restaurant if provided
    let restaurantName = 'All Restaurants';
    if (input.restaurantId) {
      const restaurant = await Restaurant.findById(input.restaurantId);
      if (!restaurant) {
        throw ApiError.badRequest('Selected restaurant not found');
      }
      restaurantName = restaurant.name;
    }

    // Validate branch if provided
    let branchName = 'All Branches / Central';
    if (input.branchId) {
      const branch = await Branch.findById(input.branchId);
      if (!branch) {
        throw ApiError.badRequest('Selected branch not found');
      }
      branchName = branch.name;
    }

    // Determine target roles (multi-select roleIds support)
    const targetRoleIds: string[] = [];
    if (Array.isArray(input.roleIds) && input.roleIds.length > 0) {
      targetRoleIds.push(...input.roleIds);
    } else if (input.roleId) {
      targetRoleIds.push(input.roleId);
    }

    // If still empty, attempt slug/name match
    if (targetRoleIds.length === 0 && input.role) {
      const slugCandidate = input.role.toLowerCase().replace(/_/g, '-');
      const matchedRole = await Role.findOne({
        $or: [
          { slug: slugCandidate },
          { slug: input.role.toLowerCase() },
          { name: new RegExp(`^${input.role.replace(/_/g, ' ')}$`, 'i') },
        ],
      });
      if (matchedRole) {
        targetRoleIds.push(String(matchedRole._id));
      }
    }

    const assignedRoles = targetRoleIds.length > 0 ? await Role.find({ _id: { $in: targetRoleIds } }) : [];
    const primaryRole = assignedRoles[0];
    const roleSlug = primaryRole ? primaryRole.slug.toUpperCase().replace(/-/g, '_') : input.role;
    const roleName = primaryRole ? primaryRole.name : input.role.replace(/_/g, ' ');

    // Compute full name and individual names
    const firstName = (input.firstName || '').trim();
    const lastName = (input.lastName || '').trim();
    const fullName = input.name?.trim() || `${firstName} ${lastName}`.trim();

    // Auto-generate temporary password if not provided
    const tempPassword = input.password || crypto.randomBytes(4).toString('hex') + 'Aa1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await User.create({
      name: fullName,
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash,
      role: roleSlug,
      roles: targetRoleIds,
      restaurantId: input.restaurantId || null,
      branchId: input.branchId || null,
      terminalId: input.terminalId || null,
      permissions: input.permissions || primaryRole?.permissions || [],
      directPermissions: [],
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    // Create UserHasRole link records for all selected roles
    for (const roleId of targetRoleIds) {
      await UserHasRole.findOneAndUpdate(
        { userId: user._id, roleId },
        {
          userId: user._id,
          roleId,
          assignedBy: creatorUserId || null,
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }

    // Send Welcome Email with credentials & assigned Restaurant / Branch / Role
    try {
      const loginUrl = `${config.clientUrl}/auth/login`;
      const html = MailService.wrapTemplate(
        'Welcome to Dal Ghar! Your Account Has Been Created',
        `
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>An administrator has created a user account for you on the <strong>Dal Ghar Management Portal</strong> with the role and branch assignments below:</p>
        
        <div class="card-box">
          <div style="font-weight: 700; color: #1B4D2E; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
            Account & Assignment Details
          </div>
          <div class="row"><span class="label">Full Name:</span><span class="val">${user.name}</span></div>
          <div class="row"><span class="label">Login Email:</span><span class="val">${user.email}</span></div>
          <div class="row"><span class="label">Assigned Role:</span><span class="val" style="color: #1B4D2E; font-weight: 700;">${roleName}</span></div>
          <div class="row"><span class="label">Restaurant:</span><span class="val">${restaurantName}</span></div>
          <div class="row"><span class="label">Branch Outlet:</span><span class="val">${branchName}</span></div>
          <div class="row"><span class="label">Account Status:</span><span class="val" style="color: #16A34A; font-weight: 700;">● Active</span></div>
          <div class="row" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
            <span class="label">Temporary Password:</span>
            <span class="val" style="font-family: monospace; font-size: 14px; background: #E2E8F0; padding: 2px 8px; border-radius: 4px;">${tempPassword}</span>
          </div>
        </div>

        <div class="btn-container">
          <a href="${loginUrl}" class="btn" target="_blank">Sign In to Dal Ghar Dashboard &rarr;</a>
        </div>

        <p style="font-size: 12px; color: #64748B; margin-top: 18px;">
          For security, please log in and change your password immediately upon your first sign in.
        </p>
        `
      );

      MailService.sendMail({
        to: user.email,
        subject: `[Welcome to Dal Ghar] Your User Account Credentials (${roleName})`,
        html,
      }).catch((err) => console.error('Failed to send user creation email:', err));
    } catch (err) {
      console.error('Non-blocking user creation email error:', err);
    }

    return await this.enrichUser(user);
  }

  /**
   * Update existing user
   */
  static async updateUser(id: string, input: UpdateUserInput, modifierUserId?: string) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Protect against self-deactivation or deactivation of the last super admin
    if (input.isActive === false) {
      if (user.role === 'SUPER_ADMIN') {
        const otherActiveSuperAdmins = await User.countDocuments({
          role: 'SUPER_ADMIN',
          isActive: true,
          _id: { $ne: id },
        });
        if (otherActiveSuperAdmins === 0) {
          throw ApiError.badRequest('Cannot deactivate the last active Super Admin account.');
        }
      }
    }

    if (input.email && input.email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({
        email: input.email.toLowerCase().trim(),
        _id: { $ne: id },
      });
      if (existing) {
        throw ApiError.conflict('Email address is already in use by another user');
      }
      user.email = input.email.toLowerCase().trim();
    }

    if (input.firstName !== undefined) user.firstName = input.firstName.trim();
    if (input.lastName !== undefined) user.lastName = input.lastName.trim();

    if (input.name) {
      user.name = input.name.trim();
    } else if (input.firstName !== undefined || input.lastName !== undefined) {
      user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }

    if (input.restaurantId !== undefined) user.restaurantId = input.restaurantId;
    if (input.branchId !== undefined) user.branchId = input.branchId;
    if (input.terminalId !== undefined) user.terminalId = input.terminalId;
    if (input.permissions !== undefined) {
      user.permissions = Array.from(new Set(input.permissions.filter(Boolean)));
      user.directPermissions = [];
    } else if (input.directPermissions !== undefined) {
      const cleanPerms: string[] = [];
      input.directPermissions.forEach((item: any) => {
        if (typeof item === 'string') cleanPerms.push(item);
        else if (item && (!item.effect || item.effect === 'allow')) cleanPerms.push(item.permission);
      });
      user.permissions = Array.from(new Set(cleanPerms.filter(Boolean)));
      user.directPermissions = [];
    }

    if (input.password) {
      user.passwordHash = await bcrypt.hash(input.password, 10);
    }

    // Role assignment logic (supporting roleIds array, roleId single, or role string)
    let newRoleIds: string[] | null = null;
    if (Array.isArray(input.roleIds)) {
      newRoleIds = input.roleIds;
    } else if (input.roleId !== undefined) {
      newRoleIds = input.roleId ? [input.roleId] : [];
    } else if (input.role) {
      const slugCandidate = input.role.toLowerCase().replace(/_/g, '-');
      const matchedRole = await Role.findOne({
        $or: [
          { slug: slugCandidate },
          { slug: input.role.toLowerCase() },
          { name: new RegExp(`^${input.role.replace(/_/g, ' ')}$`, 'i') },
        ],
      });
      if (matchedRole) {
        newRoleIds = [String(matchedRole._id)];
      }
    }

    if (newRoleIds !== null) {
      user.roles = newRoleIds;
      // Sync UserHasRole table
      await UserHasRole.deleteMany({ userId: user._id });
      for (const rId of newRoleIds) {
        await UserHasRole.create({
          userId: user._id,
          roleId: rId,
          assignedBy: modifierUserId || null,
        });
      }

      // Update user primary role for backwards compatibility
      const assignedRoleDocs = await Role.find({ _id: { $in: newRoleIds } });
      if (assignedRoleDocs.length > 0) {
        user.role = assignedRoleDocs[0].slug.toUpperCase().replace(/-/g, '_');
        user.permissions = assignedRoleDocs[0].permissions || [];
      } else if (input.role) {
        user.role = input.role;
      }
    } else if (input.role) {
      user.role = input.role;
    }

    await user.save();
    return await this.enrichUser(user);
  }

  /**
   * Delete user
   */
  static async deleteUser(id: string) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.role === 'SUPER_ADMIN') {
      const otherActiveSuperAdmins = await User.countDocuments({
        role: 'SUPER_ADMIN',
        isActive: true,
        _id: { $ne: id },
      });
      if (otherActiveSuperAdmins === 0) {
        throw ApiError.badRequest('Cannot delete the last remaining Super Admin account.');
      }
    }

    await Promise.all([
      User.findByIdAndDelete(id),
      UserHasRole.deleteMany({ userId: id }),
    ]);

    return { success: true, message: 'User deleted successfully' };
  }

  /**
   * Get roles assigned to a user
   */
  static async getUserRoles(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const assignments = await UserHasRole.find({ userId: user._id }).populate('roleId');
    return assignments.map((a: any) => a.roleId).filter(Boolean);
  }

  /**
   * Replace all roles assigned to a user
   */
  static async updateUserRoles(userId: string, roleIds: string[], modifierUserId?: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const validRoles = await Role.find({ _id: { $in: roleIds } });
    if (validRoles.length !== roleIds.length) {
      throw ApiError.badRequest('One or more selected role IDs are invalid.');
    }

    // Sync junction
    await UserHasRole.deleteMany({ userId: user._id });
    for (const rId of roleIds) {
      await UserHasRole.create({
        userId: user._id,
        roleId: rId,
        assignedBy: modifierUserId || null,
      });
    }

    user.roles = roleIds;
    if (validRoles.length > 0) {
      user.role = validRoles[0].slug.toUpperCase().replace(/-/g, '_');
      user.permissions = validRoles[0].permissions || [];
    }
    await user.save();

    return await this.enrichUser(user);
  }

  /**
   * Get direct & effective permissions for a user
   */
  static async getUserPermissions(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const permResult = await calculateUserEffectivePermissions(user);
    return {
      userId: String(user._id),
      userName: user.name,
      permissions: permResult.effectivePermissions,
      effectivePermissions: permResult.effectivePermissions,
      inheritedPermissions: permResult.inheritedPermissions,
      directAllows: [],
      directDenials: [],
      directPermissions: [],
      roles: permResult.roles,
    };
  }

  /**
   * Update permissions for a user
   */
  static async updateUserPermissions(
    userId: string,
    permissionsInput?: any
  ) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const cleanPerms: string[] = [];
    if (Array.isArray(permissionsInput)) {
      permissionsInput.forEach((item) => {
        if (typeof item === 'string') {
          cleanPerms.push(item.trim());
        } else if (item && typeof item === 'object') {
          if (!item.effect || item.effect === 'allow') {
            cleanPerms.push(item.permission?.trim());
          }
        }
      });
    }

    user.permissions = Array.from(new Set(cleanPerms.filter(Boolean)));
    user.directPermissions = [];
    await user.save();

    return await this.enrichUser(user);
  }
}

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser, UserRole } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { UserHasRole } from '../../models/UserHasRole.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Branch } from '../../models/Branch.js';
import { ApiError } from '../../utils/ApiError.js';
import { CreateUserInput, UpdateUserInput, ListUserQueryInput } from './user.schemas.js';
import { MailService } from '../../services/mail.service.js';
import { config } from '../../config/env.js';
import { ROLE_PERMISSIONS } from '../../config/permissions.js';

export class UserService {
  /**
   * Helper: Enrich users with restaurant, branch, dynamic roles, and effective permissions
   */
  private static async enrichUser(user: IUser) {
    const json = user.toJSON ? user.toJSON() : (user as any);

    // Fetch dynamic role assignment
    let userRoleAssignment = await UserHasRole.findOne({ userId: user._id }).populate('roleId');
    let dynamicRole = userRoleAssignment?.roleId as any;

    // If no junction record exists yet, try looking up a matching Role in DB by slug
    if (!dynamicRole && user.role) {
      const slugCandidate = user.role.toLowerCase().replace(/_/g, '-');
      const matched = await Role.findOne({
        $or: [
          { slug: slugCandidate },
          { slug: user.role.toLowerCase() },
          { name: new RegExp(`^${user.role.replace(/_/g, ' ')}$`, 'i') },
        ],
      });
      if (matched) {
        dynamicRole = matched;
        // Self-heal junction table asynchronously
        UserHasRole.findOneAndUpdate(
          { userId: user._id, roleId: matched._id },
          { userId: user._id, roleId: matched._id },
          { upsert: true, returnDocument: 'after' }
        ).catch(() => {});
      }
    }

    // Compute effective permissions (stored permissions + dynamic role permissions + role permissions)
    const storedPerms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
    const dynamicPerms: string[] = dynamicRole && Array.isArray(dynamicRole.permissions) ? dynamicRole.permissions : [];
    const roleKey = (user.role?.toUpperCase().replace(/-/g, '_')) as keyof typeof ROLE_PERMISSIONS;
    const staticPerms: string[] = ROLE_PERMISSIONS[roleKey] || [];

    const effectivePermissions = Array.from(new Set([...storedPerms, ...dynamicPerms, ...staticPerms]));

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

    return {
      ...json,
      permissions: effectivePermissions,
      assignedRole: dynamicRole
        ? {
            id: dynamicRole._id?.toString() || dynamicRole.id,
            name: dynamicRole.name,
            slug: dynamicRole.slug,
          }
        : null,
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
      query.role = params.role;
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

    // Determine role name, dynamic role, and permissions
    let roleName = input.role.replace(/_/g, ' ');
    let assignedRoleId: string | null = null;
    let initialPermissions: string[] = [];

    // 1. If explicit roleId is provided, look it up
    if (input.roleId) {
      const dynamicRole = await Role.findById(input.roleId);
      if (dynamicRole) {
        roleName = dynamicRole.name;
        assignedRoleId = dynamicRole._id.toString();
        if (Array.isArray(dynamicRole.permissions)) {
          initialPermissions = [...dynamicRole.permissions];
        }
      }
    }

    // 2. If no roleId or permissions not yet found, try finding matching Role in database by slug or name
    if (!assignedRoleId || initialPermissions.length === 0) {
      const slugCandidate = input.role.toLowerCase().replace(/_/g, '-');
      const matchedRole = await Role.findOne({
        $or: [
          { slug: slugCandidate },
          { slug: input.role.toLowerCase() },
          { name: new RegExp(`^${input.role.replace(/_/g, ' ')}$`, 'i') },
        ],
      });

      if (matchedRole) {
        if (!assignedRoleId) assignedRoleId = matchedRole._id.toString();
        roleName = matchedRole.name;
        if (Array.isArray(matchedRole.permissions) && matchedRole.permissions.length > 0) {
          initialPermissions = Array.from(new Set([...initialPermissions, ...matchedRole.permissions]));
        }
      }
    }

    // 3. Fallback to static ROLE_PERMISSIONS
    const roleKey = (input.role.toUpperCase().replace(/-/g, '_')) as keyof typeof ROLE_PERMISSIONS;
    if (ROLE_PERMISSIONS[roleKey]) {
      initialPermissions = Array.from(new Set([...initialPermissions, ...ROLE_PERMISSIONS[roleKey]]));
    }

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
      role: input.role,
      restaurantId: input.restaurantId || null,
      branchId: input.branchId || null,
      permissions: initialPermissions,
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    // Create UserHasRole link if role was identified
    if (assignedRoleId) {
      await UserHasRole.findOneAndUpdate(
        { userId: user._id, roleId: assignedRoleId },
        {
          userId: user._id,
          roleId: assignedRoleId,
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

    if (input.role) user.role = input.role;
    if (input.restaurantId !== undefined) user.restaurantId = input.restaurantId;
    if (input.branchId !== undefined) user.branchId = input.branchId;
    if (typeof input.isActive === 'boolean') user.isActive = input.isActive;

    if (input.password) {
      user.passwordHash = await bcrypt.hash(input.password, 10);
    }

    await user.save();

    // Update dynamic role assignment if roleId or role was passed
    if (input.roleId !== undefined) {
      if (input.roleId) {
        const dynamicRole = await Role.findById(input.roleId);
        if (dynamicRole && Array.isArray(dynamicRole.permissions)) {
          user.permissions = Array.from(new Set(dynamicRole.permissions));
          await user.save();
        }
        await UserHasRole.findOneAndUpdate(
          { userId: user._id },
          {
            userId: user._id,
            roleId: input.roleId,
            assignedBy: modifierUserId || null,
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
      } else {
        await UserHasRole.deleteMany({ userId: user._id });
      }
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
        if (Array.isArray(matchedRole.permissions)) {
          user.permissions = Array.from(new Set(matchedRole.permissions));
          await user.save();
        }
        await UserHasRole.findOneAndUpdate(
          { userId: user._id },
          {
            userId: user._id,
            roleId: matchedRole._id,
            assignedBy: modifierUserId || null,
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
      }
    }

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

    await Promise.all([User.findByIdAndDelete(id), UserHasRole.deleteMany({ userId: id })]);

    return { success: true, message: 'User deleted successfully' };
  }
}

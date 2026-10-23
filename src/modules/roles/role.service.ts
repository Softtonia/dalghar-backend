import { Role, IRole } from '../../models/Role.js';
import { UserHasRole } from '../../models/UserHasRole.js';
import { User } from '../../models/User.js';
import { ALL_PERMISSIONS } from '../../config/permissions.js';
import { ApiError } from '../../utils/ApiError.js';
import { CreateRoleInput, UpdateRoleInput, AssignRoleInput } from './role.schemas.js';

export class RoleService {
  /**
   * Helper: generate slug from name if not provided
   */
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * List all roles with optional search and pagination
   */
  static async listRoles(params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params?.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (params?.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { slug: searchRegex }, { notes: searchRegex }];
    }

    if (typeof params?.isActive === 'boolean') {
      query.isActive = params.isActive;
    }

    const [items, total] = await Promise.all([
      Role.find(query).sort({ isDefault: -1, createdAt: 1 }).skip(skip).limit(limit),
      Role.countDocuments(query),
    ]);

    // Attach user count for each role from user_has_role junction
    const roleIds = items.map((r) => r._id);
    const userCountAgg = await UserHasRole.aggregate([
      { $match: { roleId: { $in: roleIds } } },
      { $group: { _id: '$roleId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    userCountAgg.forEach((entry) => {
      countMap.set(String(entry._id), entry.count);
    });

    const enrichedItems = items.map((role) => {
      const json = role.toJSON();
      return {
        ...json,
        userCount: countMap.get(String(role._id)) || 0,
      };
    });

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
   * Get role by ID
   */
  static async getRoleById(id: string) {
    const role = await Role.findById(id);
    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    const userCount = await UserHasRole.countDocuments({ roleId: role._id });
    const json = role.toJSON();
    return {
      ...json,
      userCount,
    };
  }

  /**
   * Create new role
   */
  static async createRole(input: CreateRoleInput) {
    const slug = input.slug ? input.slug.toLowerCase().trim() : this.slugify(input.name);

    // Check slug uniqueness
    const existing = await Role.findOne({ slug });
    if (existing) {
      throw ApiError.badRequest(`A role with slug '${slug}' already exists.`);
    }

    const role = await Role.create({
      name: input.name,
      slug,
      description: input.description || '',
      notes: input.notes || '',
      permissions: input.permissions || [],
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
    });

    return role;
  }

  /**
   * Update existing role
   */
  static async updateRole(id: string, input: UpdateRoleInput) {
    const role = await Role.findById(id);
    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    // Slug check if changing
    if (input.slug && input.slug.toLowerCase().trim() !== role.slug) {
      const newSlug = input.slug.toLowerCase().trim();
      const existing = await Role.findOne({ slug: newSlug });
      if (existing && String(existing._id) !== id) {
        throw ApiError.badRequest(`Role slug '${newSlug}' is already taken.`);
      }
      role.slug = newSlug;
    }

    if (input.name !== undefined) role.name = input.name;
    if (input.description !== undefined) role.description = input.description;
    if (input.notes !== undefined) role.notes = input.notes;
    if (input.permissions !== undefined) role.permissions = input.permissions;
    if (input.isActive !== undefined) role.isActive = input.isActive;
    if (input.isDefault !== undefined) role.isDefault = input.isDefault;

    await role.save();
    return role;
  }

  /**
   * Delete role (prevents deleting critical system default roles)
   */
  static async deleteRole(id: string) {
    const role = await Role.findById(id);
    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    if (role.isDefault && role.slug === 'super-admin') {
      throw ApiError.badRequest('The Super Admin system role cannot be deleted.');
    }

    // Check if users currently have this role
    const assignedCount = await UserHasRole.countDocuments({ roleId: role._id });
    if (assignedCount > 0) {
      throw ApiError.badRequest(`Cannot delete role '${role.name}' because ${assignedCount} user(s) are assigned to it. Please reassign them first.`);
    }

    await Role.findByIdAndDelete(id);
    await UserHasRole.deleteMany({ roleId: role._id });

    return { success: true, message: `Role '${role.name}' deleted successfully` };
  }

  /**
   * Get list of all system permissions available for selection
   */
  static async getAvailablePermissions() {
    const { Permission } = await import('../../models/Permission.js');
    const { PERMISSION_CATALOG } = await import('../../config/permissions.js');
    const dbPermissions = await Permission.find().sort({ module: 1, key: 1 });
    if (dbPermissions && dbPermissions.length > 0) {
      return dbPermissions.map((p) => ({
        id: String(p._id),
        name: p.name,
        key: p.key,
        module: p.module,
        description: p.description,
      }));
    }
    return PERMISSION_CATALOG;
  }

  /**
   * Update role permissions directly
   */
  static async updateRolePermissions(id: string, permissions: string[]) {
    const role = await Role.findById(id);
    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    role.permissions = Array.from(new Set(permissions));
    await role.save();

    // Synchronize user.permissions in MongoDB for all users assigned to this role
    try {
      const userRoleLinks = await UserHasRole.find({ roleId: role._id });
      const userIds = userRoleLinks.map((ur) => ur.userId);
      const roleSlugUpper = role.slug.toUpperCase().replace(/-/g, '_');
      await User.updateMany(
        {
          $or: [
            { _id: { $in: userIds } },
            { roles: String(role._id) },
            { role: roleSlugUpper },
            { role: role.slug.toLowerCase() },
          ],
        },
        { $set: { permissions: role.permissions } }
      );
    } catch (err) {
      console.error('Failed to sync user permissions on role update:', err);
    }

    return role;
  }

  /**
   * Assign a role to a user (User_has_role)
   */
  static async assignRoleToUser(input: AssignRoleInput, assignedByUserId?: string) {
    const [user, role] = await Promise.all([
      User.findById(input.userId),
      Role.findById(input.roleId),
    ]);

    if (!user) throw ApiError.notFound('User not found');
    if (!role) throw ApiError.notFound('Role not found');

    const assignment = await UserHasRole.findOneAndUpdate(
      { userId: user._id, roleId: role._id },
      {
        userId: user._id,
        roleId: role._id,
        assignedBy: assignedByUserId || null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Trigger asynchronous email notification to the user
    try {
      const { MailService } = await import('../../services/mail.service.js');
      MailService.sendRoleAssignmentEmail({
        to: user.email,
        userName: user.name,
        roleName: role.name,
      }).catch((err) => console.error('Failed to send role assignment email:', err));
    } catch {
      // Non-blocking mail failure
    }

    return assignment;
  }

  /**
   * Remove a role from a user (User_has_role)
   */
  static async removeRoleFromUser(userId: string, roleId: string) {
    const result = await UserHasRole.findOneAndDelete({
      userId,
      roleId,
    });

    if (!result) {
      throw ApiError.notFound('Role assignment record not found');
    }

    return { success: true, message: 'Role removed from user successfully' };
  }

  /**
   * List all roles assigned to a user
   */
  static async getUserRoles(userId: string) {
    const records = await UserHasRole.find({ userId }).populate('roleId');
    return records.map((rec: any) => rec.roleId).filter(Boolean);
  }

  /**
   * List users assigned to a specific role
   */
  static async getUsersByRole(roleId: string) {
    const records = await UserHasRole.find({ roleId }).populate('userId', 'name email role isActive');
    return records.map((rec: any) => rec.userId).filter(Boolean);
  }
}

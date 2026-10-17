import { Types } from 'mongoose';
import { Branch, IBranch, BranchOperatingStatus } from '../../models/Branch.js';
import { Restaurant } from '../../models/Restaurant.js';
import { ApiError } from '../../utils/ApiError.js';
import type {
  CreateBranchInput,
  UpdateBranchInput,
  ListBranchQueryInput,
} from './schemas/branchApiSchemas.js';
import type { AuthJwtPayload } from '../../middleware/auth.middleware.js';

export interface PaginatedBranchResult<T> {
  branches: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class BranchService {
  /**
   * Retrieves paginated list of branches with filtering, search, and tenant boundary controls.
   */
  static async listBranches(
    query: ListBranchQueryInput,
    user: AuthJwtPayload
  ): Promise<PaginatedBranchResult<IBranch>> {
    const { page, limit, restaurantId, search, status, type, city, sortBy, sortOrder } = query;
    const filter: Record<string, any> = {};

    // Tenant Scope Boundary
    if (user.role !== 'SUPER_ADMIN') {
      if (user.restaurantId) {
        filter.restaurantId = new Types.ObjectId(user.restaurantId);
      }
      if (user.branchId) {
        filter._id = new Types.ObjectId(user.branchId);
      }
    }

    // Filter by specific restaurant if provided
    if (restaurantId && Types.ObjectId.isValid(restaurantId)) {
      filter.restaurantId = new Types.ObjectId(restaurantId);
    }

    // Status filter
    if (status) {
      filter.operatingStatus = status;
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // City filter
    if (city) {
      filter['address.city'] = { $regex: new RegExp(city, 'i') };
    }

    // Search filter across branch name, code, slug, address line 1
    if (search && search.trim() !== '') {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitizedSearch, 'i');
      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { slug: searchRegex },
        { 'address.addressLine1': searchRegex },
        { 'address.city': searchRegex },
        { 'contact.managerName': searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [branches, total] = await Promise.all([
      Branch.find(filter)
        .populate('restaurantId', 'name code slug logo')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Branch.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      branches,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a single branch by ID.
   */
  static async getBranchById(id: string, user: AuthJwtPayload): Promise<IBranch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid branch ID format.');
    }

    const branch = await Branch.findById(id).populate('restaurantId', 'name code slug logo');
    if (!branch) {
      throw new ApiError(404, 'Branch outlet not found.');
    }

    // Non-Super Admin access check
    if (user.role !== 'SUPER_ADMIN') {
      if (user.restaurantId && String(branch.restaurantId._id || branch.restaurantId) !== user.restaurantId) {
        throw new ApiError(403, 'Forbidden. You are not authorized to view this branch entity.');
      }
      if (user.branchId && String(branch._id) !== user.branchId) {
        throw new ApiError(403, 'Forbidden. You are not authorized to view this branch entity.');
      }
    }

    return branch;
  }

  /**
   * Creates a new branch entity.
   */
  static async createBranch(input: CreateBranchInput, userId: string): Promise<IBranch> {
    if (!Types.ObjectId.isValid(input.restaurantId)) {
      throw new ApiError(400, 'Invalid parent restaurant ID format.');
    }

    const restaurant = await Restaurant.findById(input.restaurantId);
    if (!restaurant) {
      throw new ApiError(404, 'Parent restaurant brand not found.');
    }

    const slug = input.slug.toLowerCase().trim();
    const code = input.code.toUpperCase().trim();

    // Check duplicate code or slug within restaurant brand
    const existing = await Branch.findOne({
      restaurantId: input.restaurantId,
      $or: [{ slug }, { code }],
    });

    if (existing) {
      if (existing.slug === slug) {
        throw new ApiError(409, `A branch with slug "${slug}" already exists for this restaurant.`);
      }
      if (existing.code === code) {
        throw new ApiError(409, `A branch with code "${code}" already exists for this restaurant.`);
      }
    }

    const branch = new Branch({
      ...input,
      restaurantId: new Types.ObjectId(input.restaurantId),
      slug,
      code,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    const saved = await branch.save();
    const populated = await saved.populate('restaurantId', 'name code slug logo');

    // Trigger Add Branch email event
    try {
      const { MailService } = await import('../../services/mail.service.js');
      const { User } = await import('../../models/User.js');
      const creator = await User.findById(userId);

      const targetEmails = new Set<string>();
      if (saved.contact?.email) targetEmails.add(saved.contact.email);
      if (creator?.email) targetEmails.add(creator.email);

      const parentRestaurantName =
        typeof populated.restaurantId === 'object' && populated.restaurantId !== null
          ? (populated.restaurantId as any).name
          : restaurant.name;

      const branchPayload = {
        name: saved.name,
        code: saved.code,
        slug: saved.slug,
        type: saved.type,
        restaurantName: parentRestaurantName,
        phone: saved.contact.phone,
        email: saved.contact.email,
        managerName: saved.contact.managerName,
        managerPhone: saved.contact.managerPhone,
        addressLine1: saved.address.addressLine1,
        city: saved.address.city,
        state: saved.address.state,
        postalCode: saved.address.postalCode,
        seatingCapacity: saved.seatingCapacity,
        operatingStatus: saved.operatingStatus,
      };

      for (const email of targetEmails) {
        MailService.sendAddBranchEmail({
          to: email,
          recipientName: creator?.name || saved.contact.managerName || saved.name,
          branch: branchPayload,
          createdByName: creator?.name,
        }).catch((err) => console.error(`Failed to send add branch email to ${email}:`, err));
      }

      // Trigger active automated campaigns for BRANCH_OPENED
      const { CampaignService } = await import('../campaigns/campaign.service.js');
      CampaignService.triggerEventCampaigns(['BRANCH_OPENED', 'add_branch'], {
        targetEmails: Array.from(targetEmails),
        variables: {
          branchName: saved.name,
          branchCode: saved.code,
          restaurantName: parentRestaurantName,
          creatorName: creator?.name || 'Administrator',
        },
      }).catch((err) => console.error('Failed to trigger add_branch campaign:', err));
    } catch {
      // Non-blocking mail failure
    }

    return populated;
  }

  /**
   * Updates an existing branch entity.
   */
  static async updateBranch(
    id: string,
    input: UpdateBranchInput,
    user: AuthJwtPayload
  ): Promise<IBranch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid branch ID format.');
    }

    const branch = await Branch.findById(id);
    if (!branch) {
      throw new ApiError(404, 'Branch outlet not found.');
    }

    // Permission check
    if (user.role !== 'SUPER_ADMIN') {
      if (user.restaurantId && String(branch.restaurantId) !== user.restaurantId) {
        throw new ApiError(403, 'Forbidden. You are not authorized to update this branch.');
      }
    }

    // Check slug/code conflict if modified
    if (input.slug || input.code) {
      const newSlug = input.slug ? input.slug.toLowerCase().trim() : branch.slug;
      const newCode = input.code ? input.code.toUpperCase().trim() : branch.code;

      const duplicate = await Branch.findOne({
        _id: { $ne: id },
        restaurantId: branch.restaurantId,
        $or: [{ slug: newSlug }, { code: newCode }],
      });

      if (duplicate) {
        if (duplicate.slug === newSlug) {
          throw new ApiError(409, `A branch with slug "${newSlug}" already exists for this restaurant.`);
        }
        if (duplicate.code === newCode) {
          throw new ApiError(409, `A branch with code "${newCode}" already exists for this restaurant.`);
        }
      }
    }

    // Merge properties
    if (input.name) branch.name = input.name;
    if (input.slug) branch.slug = input.slug.toLowerCase().trim();
    if (input.code) branch.code = input.code.toUpperCase().trim();
    if (input.type) branch.type = input.type;
    if (typeof input.seatingCapacity === 'number') branch.seatingCapacity = input.seatingCapacity;
    if (input.operatingStatus) branch.operatingStatus = input.operatingStatus;

    if (input.logo) {
      branch.logo = { ...branch.logo, ...input.logo };
    }
    if (input.contact) {
      branch.contact = { ...branch.contact, ...input.contact };
    }
    if (input.address) {
      branch.address = { ...branch.address, ...input.address };
    }
    if (input.configuration) {
      branch.configuration = { ...branch.configuration, ...input.configuration };
    }
    if (input.operatingHours) {
      branch.operatingHours = { ...branch.operatingHours, ...input.operatingHours };
    }

    branch.updatedBy = new Types.ObjectId(user.userId);

    const saved = await branch.save();
    return await saved.populate('restaurantId', 'name code slug logo');
  }

  /**
   * Updates operating status of a branch entity.
   */
  static async updateBranchStatus(
    id: string,
    operatingStatus: BranchOperatingStatus,
    user: AuthJwtPayload
  ): Promise<IBranch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid branch ID format.');
    }

    const branch = await Branch.findById(id);
    if (!branch) {
      throw new ApiError(404, 'Branch outlet not found.');
    }

    if (user.role !== 'SUPER_ADMIN') {
      if (user.restaurantId && String(branch.restaurantId) !== user.restaurantId) {
        throw new ApiError(403, 'Forbidden. You are not authorized to modify status for this branch.');
      }
    }

    branch.operatingStatus = operatingStatus;
    branch.updatedBy = new Types.ObjectId(user.userId);

    const saved = await branch.save();
    const populated = await saved.populate('restaurantId', 'name code slug logo');

    if (operatingStatus === 'INACTIVE') {
      try {
        const { CampaignService } = await import('../campaigns/campaign.service.js');
        const targetEmails: string[] = [];
        if (saved.contact?.email) targetEmails.push(saved.contact.email.trim());

        CampaignService.triggerEventCampaigns(['BRANCH_DEACTIVATED', 'deactivate_branch'], {
          targetEmails,
          variables: {
            branchName: saved.name,
            branchCode: saved.code,
            restaurantName: (populated.restaurantId as any)?.name || 'Dal Ghar',
          },
        }).catch((err) => console.error('Failed to trigger deactivate_branch campaign:', err));
      } catch (err) {
        console.error('Non-blocking branch status trigger error:', err);
      }
    }

    return populated;
  }

  /**
   * Deletes a branch entity by ID (Enforces tenant scope and branch.delete permission).
   */
  static async deleteBranch(id: string, user: AuthJwtPayload): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid branch ID format.');
    }

    const branch = await Branch.findById(id);
    if (!branch) {
      throw new ApiError(404, 'Branch outlet not found.');
    }

    if (user.role !== 'SUPER_ADMIN') {
      if (user.restaurantId && String(branch.restaurantId) !== user.restaurantId) {
        throw new ApiError(403, 'Forbidden. You are not authorized to delete this branch.');
      }
    }

    await Branch.findByIdAndDelete(id);
  }
}

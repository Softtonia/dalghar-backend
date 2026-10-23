import mongoose, { Types } from 'mongoose';
import { DiningArea, IDiningArea } from '../../models/DiningArea.js';
import { DiningTable, IDiningTable } from '../../models/DiningTable.js';
import { DiningTableStatusHistory, IDiningTableStatusHistory } from '../../models/DiningTableStatusHistory.js';
import { PosOrder } from '../../models/PosOrder.js';
import { TableReservation } from '../../models/TableReservation.js';
import { ReservationTableAssignment } from '../../models/ReservationTableAssignment.js';
import { WaitingListEntry } from '../../models/WaitingListEntry.js';
import { Branch } from '../../models/Branch.js';
import { ApiError } from '../../utils/ApiError.js';
import type { AuthJwtPayload } from '../../middleware/auth.middleware.js';
import type {
  CreateDiningAreaInput,
  UpdateDiningAreaInput,
  ListDiningAreaQueryInput,
  CreateDiningTableInput,
  UpdateDiningTableInput,
  ChangeTableStatusInput,
  ListDiningTableQueryInput,
  CheckTableAvailabilityQueryInput,
} from './dining.validation.js';

export class DiningService {
  // =========================================================================
  // DINING AREAS
  // =========================================================================

  /**
   * Helper to resolve document by id or _id
   */
  private static getAreaIdFilter(id: string) {
    if (Types.ObjectId.isValid(id)) {
      return { $or: [{ _id: new Types.ObjectId(id) }, { id }] };
    }
    return { id };
  }

  private static getTableIdFilter(id: string) {
    if (Types.ObjectId.isValid(id)) {
      return { $or: [{ _id: new Types.ObjectId(id) }, { id }] };
    }
    return { id };
  }

  private static getBranchFilter(branchId?: string) {
    if (!branchId) return {};
    if (Types.ObjectId.isValid(branchId)) {
      return {
        $or: [
          { branch_id: branchId },
          { branch_id: new Types.ObjectId(branchId) },
        ],
      };
    }
    return { branch_id: branchId };
  }

  /**
   * POST /dining-areas
   * Create an area within a branch
   */
  static async createArea(input: CreateDiningAreaInput, user: AuthJwtPayload): Promise<IDiningArea> {
    let branchId = input.branch_id || user.branchId;
    if (!branchId) {
      const firstBranch = await Branch.findOne();
      if (firstBranch) {
        branchId = firstBranch._id.toString();
      } else {
        throw new ApiError(400, 'Branch ID is required');
      }
    }

    // Tenant check
    if (user.role !== 'SUPER_ADMIN') {
      if (user.branchId && user.branchId !== branchId) {
        throw new ApiError(403, 'Unauthorized access to target branch');
      }
    }

    // Resolve branch & restaurant
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new ApiError(404, 'Branch not found');
    }
    const restaurantId = input.restaurant_id || branch.restaurantId?.toString() || user.restaurantId;
    if (!restaurantId) {
      throw new ApiError(400, 'Restaurant ID is required');
    }

    // Validate unique code within branch
    const normalizedCode = input.code.trim().toUpperCase();
    const existingCode = await DiningArea.findOne({
      branch_id: branchId,
      code: normalizedCode,
    });
    if (existingCode) {
      throw new ApiError(409, `Area code '${normalizedCode}' already exists in this branch`);
    }

    // If parent_area_id is provided, verify it belongs to same branch
    if (input.parent_area_id) {
      const parentArea = await DiningArea.findOne(this.getAreaIdFilter(input.parent_area_id));
      if (!parentArea) {
        throw new ApiError(404, 'Parent dining area not found');
      }
      if (parentArea.branch_id.toString() !== branchId.toString()) {
        throw new ApiError(400, 'Parent dining area must belong to the same branch');
      }
    }

    const area = await DiningArea.create({
      ...input,
      code: normalizedCode,
      branch_id: branchId,
      restaurant_id: restaurantId,
      created_by: user.userId,
      updated_by: user.userId,
    });

    return area;
  }

  /**
   * GET /dining-areas
   * List areas with pagination and filters
   */
  static async listAreas(query: ListDiningAreaQueryInput, user: AuthJwtPayload) {
    const filter: Record<string, any> = {};

    // Branch scoping
    const targetBranchId = user.role !== 'SUPER_ADMIN' && user.branchId ? user.branchId : query.branch_id;
    if (targetBranchId && targetBranchId !== 'all' && targetBranchId !== 'ALL') {
      Object.assign(filter, this.getBranchFilter(targetBranchId));
    }

    if (query.restaurant_id) {
      filter.restaurant_id = query.restaurant_id;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.area_type) {
      filter.area_type = query.area_type;
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [areas, total] = await Promise.all([
      DiningArea.find(filter)
        .sort({ display_order: 1, created_at: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      DiningArea.countDocuments(filter),
    ]);

    // Attach table counts and occupancy stats per area
    const areasWithStats = await Promise.all(
      areas.map(async (area: any) => {
        const areaIdStr = area._id?.toString() || area.id;
        const tables = await DiningTable.find({
          $or: [{ dining_area_id: areaIdStr }, { dining_area_id: area.id }, { dining_area_id: area._id }],
          is_active: true,
        }).lean();

        const totalTables = tables.length;
        const occupied = tables.filter((t) => t.current_status === 'occupied').length;
        const available = tables.filter((t) => t.current_status === 'available').length;
        const reserved = tables.filter((t) => t.current_status === 'reserved').length;
        const cleaning = tables.filter((t) => t.current_status === 'cleaning').length;
        const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
        const occupiedCapacity = tables
          .filter((t) => t.current_status === 'occupied')
          .reduce((sum, t) => sum + (t.capacity || 0), 0);

        return {
          ...area,
          id: area.id || area._id?.toString(),
          stats: {
            totalTables,
            available,
            occupied,
            reserved,
            cleaning,
            totalCapacity,
            occupiedCapacity,
            occupancyRate: totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0,
          },
        };
      })
    );

    return {
      areas: areasWithStats,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * GET /dining-areas/:id
   * Get single area details
   */
  static async getAreaById(id: string, user: AuthJwtPayload) {
    const area = await DiningArea.findOne(this.getAreaIdFilter(id)).lean();
    if (!area) {
      throw new ApiError(404, 'Dining area not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && area.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this dining area');
    }

    // Resolve parent area if any
    let parentArea: any = null;
    if (area.parent_area_id) {
      parentArea = await DiningArea.findOne(this.getAreaIdFilter(area.parent_area_id.toString())).lean();
    }

    // Resolve child nested sections if any
    const childSections = await DiningArea.find({
      $or: [{ parent_area_id: area._id }, { parent_area_id: area.id }],
    }).lean();

    // Tables in area
    const tables = await DiningTable.find({
      $or: [{ dining_area_id: area._id }, { dining_area_id: area.id }],
      is_active: true,
    }).lean();

    return {
      ...area,
      id: area.id || area._id?.toString(),
      parent_area: parentArea ? { id: parentArea.id || parentArea._id?.toString(), name: parentArea.name, code: parentArea.code } : null,
      child_sections: childSections.map((cs: any) => ({ id: cs.id || cs._id?.toString(), name: cs.name, code: cs.code })),
      table_count: tables.length,
      tables,
    };
  }

  /**
   * PATCH /dining-areas/:id
   * Update area details
   */
  static async updateArea(id: string, input: UpdateDiningAreaInput, user: AuthJwtPayload): Promise<IDiningArea> {
    const area = await DiningArea.findOne(this.getAreaIdFilter(id));
    if (!area) {
      throw new ApiError(404, 'Dining area not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && area.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this dining area');
    }

    const branchId = input.branch_id || area.branch_id.toString();

    // If code is changing, check uniqueness
    if (input.code) {
      const normalizedCode = input.code.trim().toUpperCase();
      const existing = await DiningArea.findOne({
        branch_id: branchId,
        code: normalizedCode,
        _id: { $ne: area._id },
      });
      if (existing) {
        throw new ApiError(409, `Area code '${normalizedCode}' already in use in this branch`);
      }
      area.code = normalizedCode;
    }

    // Prevent circular parent references
    if (input.parent_area_id !== undefined) {
      if (input.parent_area_id === null || input.parent_area_id === '') {
        area.parent_area_id = null;
      } else {
        const areaIdStr = area._id.toString();
        const areaUuid = area.id;
        if (input.parent_area_id === areaIdStr || input.parent_area_id === areaUuid) {
          throw new ApiError(400, 'A dining area cannot be its own parent');
        }

        // Traverse ancestor chain to prevent loops
        let currentParentId: string | null = input.parent_area_id;
        const visited = new Set<string>([areaIdStr, areaUuid]);

        while (currentParentId) {
          if (visited.has(currentParentId)) {
            throw new ApiError(400, 'Circular reference detected in parent dining area hierarchy');
          }
          visited.add(currentParentId);

          const ancestor: IDiningArea | null = await DiningArea.findOne(this.getAreaIdFilter(currentParentId));
          if (!ancestor) {
            throw new ApiError(404, 'Specified parent dining area does not exist');
          }
          if (ancestor.branch_id.toString() !== branchId) {
            throw new ApiError(400, 'Parent dining area must belong to the same branch');
          }
          currentParentId = ancestor.parent_area_id ? ancestor.parent_area_id.toString() : null;
        }

        area.parent_area_id = input.parent_area_id;
      }
    }

    if (input.name !== undefined) area.name = input.name;
    if (input.area_type !== undefined) area.area_type = input.area_type;
    if (input.description !== undefined) area.description = input.description;
    if (input.display_order !== undefined) area.display_order = input.display_order;
    if (input.layout_config !== undefined) area.layout_config = input.layout_config;
    if (input.status !== undefined) area.status = input.status;
    area.updated_by = user.userId;

    await area.save();
    return area;
  }

  /**
   * DELETE /dining-areas/:id
   * Deactivate or delete an unused area
   */
  static async deleteArea(id: string, user: AuthJwtPayload): Promise<{ success: boolean; message: string }> {
    const area = await DiningArea.findOne(this.getAreaIdFilter(id));
    if (!area) {
      throw new ApiError(404, 'Dining area not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && area.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this dining area');
    }

    // Check if tables are assigned to this area
    const tablesCount = await DiningTable.countDocuments({
      $or: [{ dining_area_id: area._id }, { dining_area_id: area.id }],
    });

    if (tablesCount > 0) {
      // Soft deactivate area instead of hard delete to preserve historical integrity
      area.status = 'inactive';
      area.updated_by = user.userId;
      await area.save();
      return {
        success: true,
        message: `Area has ${tablesCount} assigned tables; marked as inactive instead of deleting.`,
      };
    }

    // Check if child sections exist
    const childCount = await DiningArea.countDocuments({
      $or: [{ parent_area_id: area._id }, { parent_area_id: area.id }],
    });
    if (childCount > 0) {
      area.status = 'inactive';
      area.updated_by = user.userId;
      await area.save();
      return {
        success: true,
        message: `Area has child sub-sections; marked as inactive.`,
      };
    }

    await DiningArea.deleteOne({ _id: area._id });
    return { success: true, message: 'Dining area deleted successfully' };
  }

  /**
   * GET /dining-areas/:id/tables
   * List tables in an area
   */
  static async getAreaTables(areaId: string, user: AuthJwtPayload) {
    const area = await DiningArea.findOne(this.getAreaIdFilter(areaId)).lean();
    if (!area) {
      throw new ApiError(404, 'Dining area not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && area.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this dining area');
    }

    const tables = await DiningTable.find({
      $or: [{ dining_area_id: area._id }, { dining_area_id: area.id }],
    })
      .sort({ table_number: 1 })
      .lean();

    return tables.map((t: any) => ({
      ...t,
      id: t.id || t._id?.toString(),
      area_name: area.name,
      area_code: area.code,
    }));
  }

  /**
   * GET /dining-areas/:id/occupancy
   * Get occupancy summary for an area
   */
  static async getAreaOccupancy(areaId: string, user: AuthJwtPayload) {
    const area = await DiningArea.findOne(this.getAreaIdFilter(areaId)).lean();
    if (!area) {
      throw new ApiError(404, 'Dining area not found');
    }

    const tables = await DiningTable.find({
      $or: [{ dining_area_id: area._id }, { dining_area_id: area.id }],
      is_active: true,
    }).lean();

    const totalTables = tables.length;
    const availableTables = tables.filter((t) => t.current_status === 'available').length;
    const occupiedTables = tables.filter((t) => t.current_status === 'occupied').length;
    const reservedTables = tables.filter((t) => t.current_status === 'reserved').length;
    const cleaningTables = tables.filter((t) => t.current_status === 'cleaning').length;
    const outOfServiceTables = tables.filter((t) => t.current_status === 'out_of_service').length;

    const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
    const occupiedCapacity = tables
      .filter((t) => t.current_status === 'occupied')
      .reduce((sum, t) => sum + (t.capacity || 0), 0);

    return {
      area: {
        id: area.id || area._id?.toString(),
        name: area.name,
        code: area.code,
        area_type: area.area_type,
      },
      summary: {
        total_tables: totalTables,
        available_tables: availableTables,
        occupied_tables: occupiedTables,
        reserved_tables: reservedTables,
        cleaning_tables: cleaningTables,
        out_of_service_tables: outOfServiceTables,
        total_capacity: totalCapacity,
        occupied_capacity: occupiedCapacity,
        occupancy_rate: totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0,
      },
    };
  }

  // =========================================================================
  // DINING TABLES
  // =========================================================================

  /**
   * POST /dining-tables
   * Create a table
   */
  static async createTable(input: CreateDiningTableInput, user: AuthJwtPayload): Promise<IDiningTable> {
    const branchId = input.branch_id || user.branchId;
    if (!branchId) {
      throw new ApiError(400, 'Branch ID is required');
    }

    let area: any = null;
    if (input.dining_area_id) {
      area = await DiningArea.findOne(this.getAreaIdFilter(input.dining_area_id));
      if (!area) {
        throw new ApiError(404, 'Dining area not found');
      }
      if (input.branch_id && area.branch_id.toString() !== input.branch_id.toString()) {
        throw new ApiError(400, 'Dining area does not belong to the specified branch');
      }
    } else {
      // Find default or first area in branch if available
      area = await DiningArea.findOne(this.getBranchFilter(branchId));
    }

    const restaurantId = input.restaurant_id || area?.restaurant_id?.toString() || user.restaurantId;
    if (!restaurantId) {
      throw new ApiError(400, 'Restaurant ID is required');
    }

    // Unique table_number constraint within branch
    const tableNumber = input.table_number.trim();
    const existingTable = await DiningTable.findOne({
      branch_id: branchId,
      table_number: tableNumber,
    });
    if (existingTable) {
      throw new ApiError(409, `Table '${tableNumber}' already exists in this branch`);
    }

    const table = await DiningTable.create({
      ...input,
      table_number: tableNumber,
      branch_id: branchId,
      restaurant_id: restaurantId,
      dining_area_id: area?._id || null,
      is_combinable: input.is_combinable ?? false,
      created_by: user.userId,
      updated_by: user.userId,
    });

    // Record initial status history
    try {
      await DiningTableStatusHistory.create({
        restaurant_id: restaurantId,
        branch_id: branchId,
        dining_table_id: table._id,
        previous_status: null,
        new_status: table.current_status,
        reason: 'Initial table creation',
        changed_by: user.userId,
        source: 'admin',
      });
    } catch (e) {
      // Non-fatal
    }

    return table;
  }

  /**
   * GET /dining-tables
   * List/filter tables
   */
  static async listTables(query: ListDiningTableQueryInput, user: AuthJwtPayload) {
    const filter: Record<string, any> = {};

    const targetBranchId = user.role !== 'SUPER_ADMIN' && user.branchId ? user.branchId : query.branch_id;
    if (targetBranchId && targetBranchId !== 'all' && targetBranchId !== 'ALL') {
      Object.assign(filter, this.getBranchFilter(targetBranchId));
    }

    if (query.restaurant_id) {
      filter.restaurant_id = query.restaurant_id;
    }

    if (query.dining_area_id) {
      const area = await DiningArea.findOne(this.getAreaIdFilter(query.dining_area_id));
      if (area) {
        filter.$or = [{ dining_area_id: area._id }, { dining_area_id: area.id }];
      } else {
        filter.dining_area_id = query.dining_area_id;
      }
    }

    if (query.current_status) {
      filter.current_status = query.current_status;
    }

    if (query.is_active !== undefined) {
      filter.is_active = query.is_active;
    }

    if (query.min_capacity) {
      filter.capacity = { $gte: query.min_capacity };
    }

    if (query.search) {
      filter.$or = [
        { table_number: { $regex: query.search, $options: 'i' } },
        { display_name: { $regex: query.search, $options: 'i' } },
        { notes: { $regex: query.search, $options: 'i' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [tables, total] = await Promise.all([
      DiningTable.find(filter)
        .sort({ table_number: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      DiningTable.countDocuments(filter),
    ]);

    // Populate dining areas and active order snippet for each table
    const populated = await Promise.all(
      tables.map(async (table: any) => {
        const area = await DiningArea.findOne(this.getAreaIdFilter(table.dining_area_id?.toString())).lean();

        // Check if there is an active order (unpaid, or in progress/pending)
        let activeOrder: any = await PosOrder.findOne({
          table_number: { $regex: new RegExp(`^${table.table_number.trim()}$`, 'i') },
          branchId: table.branch_id,
          orderStatus: { $nin: ['COMPLETED', 'CANCELLED'] },
          paymentStatus: 'PENDING',
        })
          .select('orderNumber total items cashierName waiter_name createdAt orderStatus paymentStatus kitchen_status')
          .lean();

        const tableLookupIds = [table.id, table._id?.toString(), table._id].filter(Boolean);

        // Check if there is an active seated reservation assigned to this table
        const activeAssignment = await ReservationTableAssignment.findOne({
          dining_table_id: { $in: tableLookupIds },
          assignment_status: 'active',
        }).lean();

        let activeReservation: any = null;
        if (activeAssignment) {
          activeReservation = await TableReservation.findOne({
            $or: [
              { id: activeAssignment.reservation_id },
              ...(mongoose.isValidObjectId(activeAssignment.reservation_id)
                ? [{ _id: new mongoose.Types.ObjectId(activeAssignment.reservation_id) }]
                : []),
            ],
            reservation_status: 'seated',
          } as any)
            .select('reservation_number guest_name guest_count seated_at duration_minutes')
            .lean();
        }

        // Check if there is an active seated waiting-list guest at this table
        let activeWaitingParty: any = null;
        if (!activeReservation) {
          activeWaitingParty = await WaitingListEntry.findOne({
            seated_table_id: { $in: tableLookupIds },
            status: 'seated',
          })
            .select('queue_number guest_name guest_count seated_at')
            .lean();
        }

        const hasSeatedGuests = !!(activeReservation || activeWaitingParty);

        // If guests are actively seated at the table, ensure status is 'occupied'
        if (hasSeatedGuests && table.current_status !== 'occupied') {
          await DiningTable.updateOne(
            { _id: table._id },
            { $set: { current_status: 'occupied' } }
          );
          table.current_status = 'occupied';
        }

        // Self-Healing Auto-Reconciliation:
        // Only run if table is marked occupied, BUT there are NO active orders AND NO seated guests:
        if (table.current_status === 'occupied' && !activeOrder && !hasSeatedGuests) {
          const latestOrder = await PosOrder.findOne({
            table_number: { $regex: new RegExp(`^${table.table_number.trim()}$`, 'i') },
            branchId: table.branch_id,
          })
            .sort({ createdAt: -1 })
            .select('paymentStatus orderStatus')
            .lean();

          const targetStatus = latestOrder && latestOrder.paymentStatus === 'PAID' ? 'cleaning' : 'available';

          await DiningTable.updateOne(
            { _id: table._id },
            { $set: { current_status: targetStatus } }
          );

          await DiningTableStatusHistory.create({
            dining_table_id: table._id,
            restaurant_id: table.restaurant_id,
            branch_id: table.branch_id,
            previous_status: 'occupied',
            new_status: targetStatus,
            source: 'system',
            notes: `Auto-reconciliation: No active unpaid orders or seated reservations on table ${table.table_number}. Automatically transitioned from occupied to ${targetStatus}.`,
          });

          table.current_status = targetStatus;
        }

        return {
          ...table,
          id: table.id || table._id?.toString(),
          area: area ? { id: area.id || area._id?.toString(), name: area.name, code: area.code, area_type: area.area_type } : null,
          active_order: activeOrder,
          active_reservation: activeReservation
            ? {
                reservation_number: activeReservation.reservation_number,
                guest_name: activeReservation.guest_name,
                guest_count: activeReservation.guest_count,
                seated_at: activeReservation.seated_at,
              }
            : null,
          active_waiting_party: activeWaitingParty
            ? {
                queue_number: activeWaitingParty.queue_number,
                guest_name: activeWaitingParty.guest_name,
                guest_count: activeWaitingParty.guest_count,
                seated_at: activeWaitingParty.seated_at,
              }
            : null,
        };
      })
    );

    return {
      tables: populated,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * GET /dining-tables/:id
   * Get table details
   */
  static async getTableById(id: string, user: AuthJwtPayload) {
    const table = await DiningTable.findOne(this.getTableIdFilter(id)).lean();
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && table.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this dining table');
    }

    const area = await DiningArea.findOne(this.getAreaIdFilter(table.dining_area_id?.toString())).lean();

    // Check active order
    const activeOrder = await PosOrder.findOne({
      table_number: { $regex: new RegExp(`^${table.table_number.trim()}$`, 'i') },
      branchId: table.branch_id,
      orderStatus: { $nin: ['COMPLETED', 'CANCELLED'] },
      paymentStatus: 'PENDING',
    }).lean();

    const tableLookupIds = [table.id, table._id?.toString(), table._id].filter(Boolean);

    // Check if there is an active seated reservation assigned to this table
    const activeAssignment = await ReservationTableAssignment.findOne({
      dining_table_id: { $in: tableLookupIds },
      assignment_status: 'active',
    }).lean();

    let activeReservation: any = null;
    if (activeAssignment) {
      activeReservation = await TableReservation.findOne({
        $or: [
          { id: activeAssignment.reservation_id },
          ...(mongoose.isValidObjectId(activeAssignment.reservation_id)
            ? [{ _id: new mongoose.Types.ObjectId(activeAssignment.reservation_id) }]
            : []),
        ],
        reservation_status: 'seated',
      } as any)
        .select('reservation_number guest_name guest_count seated_at duration_minutes')
        .lean();
    }

    // Check if there is an active seated waiting-list guest at this table
    let activeWaitingParty: any = null;
    if (!activeReservation) {
      activeWaitingParty = await WaitingListEntry.findOne({
        seated_table_id: { $in: tableLookupIds },
        status: 'seated',
      })
        .select('queue_number guest_name guest_count seated_at')
        .lean();
    }

    const hasSeatedGuests = !!(activeReservation || activeWaitingParty);

    // If guests are actively seated at the table, ensure status is 'occupied'
    if (hasSeatedGuests && table.current_status !== 'occupied') {
      await DiningTable.updateOne(
        { _id: table._id },
        { $set: { current_status: 'occupied' } }
      );
      table.current_status = 'occupied';
    }

    // Self-Healing Auto-Reconciliation:
    // Only run if table is marked occupied, BUT there are NO active orders AND NO seated guests:
    if (table.current_status === 'occupied' && !activeOrder && !hasSeatedGuests) {
      const latestOrder = await PosOrder.findOne({
        table_number: { $regex: new RegExp(`^${table.table_number.trim()}$`, 'i') },
        branchId: table.branch_id,
      })
        .sort({ createdAt: -1 })
        .select('paymentStatus orderStatus')
        .lean();

      const targetStatus = latestOrder && latestOrder.paymentStatus === 'PAID' ? 'cleaning' : 'available';

      await DiningTable.updateOne(
        { _id: table._id },
        { $set: { current_status: targetStatus } }
      );

      await DiningTableStatusHistory.create({
        dining_table_id: table._id,
        restaurant_id: table.restaurant_id,
        branch_id: table.branch_id,
        previous_status: 'occupied',
        new_status: targetStatus,
        source: 'system',
        notes: `Auto-reconciliation: No active unpaid orders or seated reservations on table ${table.table_number}. Automatically transitioned from occupied to ${targetStatus}.`,
      });

      table.current_status = targetStatus;
    }

    return {
      ...table,
      id: table.id || table._id?.toString(),
      area: area ? { id: area.id || area._id?.toString(), name: area.name, code: area.code, area_type: area.area_type } : null,
      active_order: activeOrder,
      active_reservation: activeReservation
        ? {
            reservation_number: activeReservation.reservation_number,
            guest_name: activeReservation.guest_name,
            guest_count: activeReservation.guest_count,
            seated_at: activeReservation.seated_at,
          }
        : null,
      active_waiting_party: activeWaitingParty
        ? {
            queue_number: activeWaitingParty.queue_number,
            guest_name: activeWaitingParty.guest_name,
            guest_count: activeWaitingParty.guest_count,
            seated_at: activeWaitingParty.seated_at,
          }
        : null,
    };
  }

  /**
   * PATCH /dining-tables/:id
   * Update table configuration
   */
  static async updateTable(id: string, input: UpdateDiningTableInput, user: AuthJwtPayload): Promise<IDiningTable> {
    const table = await DiningTable.findOne(this.getTableIdFilter(id));
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && table.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this dining table');
    }

    const branchId = table.branch_id.toString();

    // Check table number uniqueness if modified
    if (input.table_number && input.table_number.trim() !== table.table_number) {
      const tableNumber = input.table_number.trim();
      const existing = await DiningTable.findOne({
        branch_id: branchId,
        table_number: tableNumber,
        _id: { $ne: table._id },
      });
      if (existing) {
        throw new ApiError(409, `Table number '${tableNumber}' already exists in this branch`);
      }
      table.table_number = tableNumber;
    }

    // Check area consistency if changed
    if (input.dining_area_id) {
      const area = await DiningArea.findOne(this.getAreaIdFilter(input.dining_area_id));
      if (!area) {
        throw new ApiError(404, 'Specified dining area not found');
      }
      if (area.branch_id.toString() !== branchId) {
        throw new ApiError(400, 'Dining area must belong to the same branch');
      }
      table.dining_area_id = area._id;
    }

    if (input.display_name !== undefined) table.display_name = input.display_name;
    if (input.capacity !== undefined) table.capacity = input.capacity;
    if (input.minimum_capacity !== undefined) table.minimum_capacity = input.minimum_capacity;
    if (input.shape !== undefined) table.shape = input.shape;
    if (input.position_x !== undefined) table.position_x = input.position_x;
    if (input.position_y !== undefined) table.position_y = input.position_y;
    if (input.width !== undefined) table.width = input.width;
    if (input.height !== undefined) table.height = input.height;
    if (input.rotation !== undefined) table.rotation = input.rotation;
    if (input.is_combinable !== undefined) table.is_combinable = input.is_combinable;
    if (input.is_active !== undefined) table.is_active = input.is_active;
    if (input.notes !== undefined) table.notes = input.notes;
    table.updated_by = user.userId;

    await table.save();
    return table;
  }

  /**
   * DELETE /dining-tables/:id
   * Deactivate an unused table
   */
  static async deleteTable(id: string, user: AuthJwtPayload): Promise<{ success: boolean; message: string }> {
    const table = await DiningTable.findOne(this.getTableIdFilter(id));
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && table.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this dining table');
    }

    // Check for active orders
    const activeOrder = await PosOrder.findOne({
      table_number: table.table_number,
      orderStatus: 'IN_PROGRESS',
    });
    if (activeOrder) {
      throw new ApiError(400, `Cannot deactivate table ${table.table_number} with active order #${activeOrder.orderNumber}`);
    }

    // Soft deactivate to preserve historical audit records
    table.is_active = false;
    table.current_status = 'out_of_service';
    table.updated_by = user.userId;
    await table.save();

    await DiningTableStatusHistory.create({
      restaurant_id: table.restaurant_id,
      branch_id: table.branch_id,
      dining_table_id: table._id,
      previous_status: table.current_status,
      new_status: 'out_of_service',
      reason: 'Table deactivated/removed',
      changed_by: user.userId,
      source: 'admin',
    });

    return { success: true, message: `Table ${table.table_number} deactivated successfully` };
  }

  /**
   * PATCH /dining-tables/:id/status
   * Change operational status with atomic history record creation
   */
  static async changeTableStatus(
    id: string,
    input: ChangeTableStatusInput,
    user: AuthJwtPayload
  ): Promise<{ table: IDiningTable; history: IDiningTableStatusHistory }> {
    const table = await DiningTable.findOne(this.getTableIdFilter(id));
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && table.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this dining table');
    }

    const previousStatus = table.current_status;
    const newStatus = input.status;

    // If changing away from occupied, release any active reservations and waiting list entries bound to this table
    if (newStatus !== 'occupied') {
      const tableLookupIds = [table.id, table._id?.toString(), table._id].filter(Boolean);

      const activeAssignments = await ReservationTableAssignment.find({
        dining_table_id: { $in: tableLookupIds },
        assignment_status: 'active',
      });

      for (const assign of activeAssignments) {
        assign.assignment_status = 'released';
        assign.released_at = new Date();
        await assign.save();

        await TableReservation.updateMany(
          {
            $or: [
              { id: assign.reservation_id },
              ...(mongoose.isValidObjectId(assign.reservation_id)
                ? [{ _id: new mongoose.Types.ObjectId(assign.reservation_id) }]
                : []),
            ],
            reservation_status: 'seated',
          } as any,
          { $set: { reservation_status: 'completed' } }
        );
      }

      await WaitingListEntry.updateMany(
        {
          seated_table_id: { $in: tableLookupIds },
          status: 'seated',
        },
        { $set: { status: 'completed' } }
      );
    }

    // Use transaction if supported by Mongo server, else sequential
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      table.current_status = newStatus;
      table.updated_by = user.userId;
      await table.save({ session });

      const [history] = await DiningTableStatusHistory.create(
        [
          {
            restaurant_id: table.restaurant_id,
            branch_id: table.branch_id,
            dining_table_id: table._id,
            previous_status: previousStatus,
            new_status: newStatus,
            reason: input.reason || null,
            notes: input.notes || null,
            changed_by: user.userId,
            changed_at: new Date(),
            source: input.source || 'admin',
            reference_type: input.reference_type || null,
            reference_id: input.reference_id || null,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return { table, history };
    } catch (txError: any) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }

      // If transactions are not supported (e.g. standalone Mongo dev instance), fallback cleanly
      if (
        txError?.message?.includes('Transaction numbers are only allowed') ||
        txError?.message?.includes('replica set')
      ) {
        table.current_status = newStatus;
        table.updated_by = user.userId;
        await table.save();

        const history = await DiningTableStatusHistory.create({
          restaurant_id: table.restaurant_id,
          branch_id: table.branch_id,
          dining_table_id: table._id,
          previous_status: previousStatus,
          new_status: newStatus,
          reason: input.reason || null,
          notes: input.notes || null,
          changed_by: user.userId,
          changed_at: new Date(),
          source: input.source || 'admin',
          reference_type: input.reference_type || null,
          reference_id: input.reference_id || null,
        });

        return { table, history };
      }

      throw txError;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * GET /dining-tables/:id/status-history
   * View status history
   */
  static async getStatusHistory(id: string, user: AuthJwtPayload, page = 1, limit = 50) {
    const table = await DiningTable.findOne(this.getTableIdFilter(id));
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    const filter = {
      $or: [{ dining_table_id: table._id }, { dining_table_id: table.id }],
    };

    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      DiningTableStatusHistory.find(filter)
        .sort({ changed_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('changed_by', 'firstName lastName email')
        .lean(),
      DiningTableStatusHistory.countDocuments(filter),
    ]);

    return {
      table_number: table.table_number,
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /dining-tables/:id/sessions
   * List occupancy sessions
   */
  static async getTableSessions(id: string, user: AuthJwtPayload) {
    const table = await DiningTable.findOne(this.getTableIdFilter(id));
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    // Occupancy sessions derived from POS orders associated with this table
    const orders = await PosOrder.find({
      table_number: table.table_number,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const sessions = orders.map((ord: any) => ({
      id: ord._id?.toString(),
      order_number: ord.orderNumber,
      order_status: ord.orderStatus,
      payment_status: ord.paymentStatus,
      customer_name: ord.customer_name || 'Guest',
      waiter_name: ord.waiter_name,
      party_size: table.capacity,
      started_at: ord.createdAt,
      closed_at: ord.paymentStatus === 'PAID' ? ord.updatedAt : null,
      total_amount: ord.total,
      duration_minutes:
        ord.paymentStatus === 'PAID'
          ? Math.max(1, Math.round((new Date(ord.updatedAt).getTime() - new Date(ord.createdAt).getTime()) / 60000))
          : Math.max(1, Math.round((Date.now() - new Date(ord.createdAt).getTime()) / 60000)),
    }));

    return {
      table: {
        id: table.id || table._id?.toString(),
        table_number: table.table_number,
        current_status: table.current_status,
      },
      sessions,
    };
  }

  /**
   * GET /dining-tables/:id/orders
   * List current and historical assigned orders
   */
  static async getTableOrders(id: string, user: AuthJwtPayload) {
    const table = await DiningTable.findOne(this.getTableIdFilter(id));
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    const orders = await PosOrder.find({
      table_number: table.table_number,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const currentOrders = orders.filter((o) => o.orderStatus === 'IN_PROGRESS');
    const pastOrders = orders.filter((o) => o.orderStatus !== 'IN_PROGRESS');

    return {
      table_number: table.table_number,
      current_orders: currentOrders,
      past_orders: pastOrders,
      total_historical_orders: orders.length,
    };
  }

  /**
   * GET /dining-tables/:id/availability
   * Check availability for a time window
   */
  static async checkAvailability(id: string, query: CheckTableAvailabilityQueryInput, user: AuthJwtPayload) {
    const table = await DiningTable.findOne(this.getTableIdFilter(id));
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    const isAvailableNow = table.is_active && table.current_status === 'available';
    const capacitySuitable = query.party_size ? table.capacity >= query.party_size : true;

    // Check if table has active order right now
    const activeOrder = await PosOrder.findOne({
      table_number: table.table_number,
      orderStatus: 'IN_PROGRESS',
    });

    const isAvailable = isAvailableNow && !activeOrder && capacitySuitable;

    return {
      table: {
        id: table.id || table._id?.toString(),
        table_number: table.table_number,
        capacity: table.capacity,
        minimum_capacity: table.minimum_capacity,
        current_status: table.current_status,
        is_combinable: table.is_combinable,
      },
      requested: {
        start_time: query.start_time || new Date().toISOString(),
        end_time: query.end_time || null,
        party_size: query.party_size || null,
      },
      is_available: isAvailable,
      reason: !isAvailable
        ? !table.is_active
          ? 'Table is not active'
          : table.current_status !== 'available'
          ? `Table status is ${table.current_status}`
          : activeOrder
          ? 'Table currently has an ongoing dine-in order'
          : !capacitySuitable
          ? `Table capacity (${table.capacity}) is smaller than requested party size (${query.party_size})`
          : 'Table is unavailable'
        : 'Table is ready for seating',
    };
  }
}

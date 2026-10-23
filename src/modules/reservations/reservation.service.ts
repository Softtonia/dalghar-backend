import mongoose from 'mongoose';
import crypto from 'crypto';
import { TableReservation, ITableReservation } from '../../models/TableReservation.js';
import { ReservationTableAssignment, IReservationTableAssignment } from '../../models/ReservationTableAssignment.js';
import { WaitingListEntry, IWaitingListEntry } from '../../models/WaitingListEntry.js';
import { DiningTable, IDiningTable } from '../../models/DiningTable.js';
import { DiningArea } from '../../models/DiningArea.js';
import { DiningTableStatusHistory } from '../../models/DiningTableStatusHistory.js';
import { Branch } from '../../models/Branch.js';
import { ApiError } from '../../utils/ApiError.js';
import { AuthJwtPayload } from '../../middleware/auth.middleware.js';
import type {
  CreateReservationInput,
  UpdateReservationInput,
  ListReservationsQueryInput,
  SeatReservationInput,
  CheckAvailabilityQueryInput,
  CreateWaitingListEntryInput,
  UpdateWaitingListEntryInput,
  ListWaitingListQueryInput,
  SeatWaitingListGuestInput,
} from './reservation.validation.js';

export class ReservationService {
  /**
   * Helper to build filter matching UUID or ObjectId
   */
  private static getFilterById(id: string) {
    if (mongoose.isValidObjectId(id)) {
      return { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { id }] };
    }
    return { id };
  }

  /**
   * Helper to build filter matching UUIDs or ObjectIds in arrays
   */
  private static getFilterByIds(ids: string[]) {
    const validObjectIds = ids
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (validObjectIds.length > 0) {
      return {
        $or: [
          { id: { $in: ids } },
          { _id: { $in: validObjectIds } },
        ],
      };
    }
    return { id: { $in: ids } };
  }

  /**
   * Helper to build filter matching branch UUID or ObjectId
   */
  private static getBranchFilter(branchId?: string) {
    if (!branchId) return {};
    if (mongoose.isValidObjectId(branchId)) {
      return {
        $or: [
          { branch_id: branchId },
          { branch_id: new mongoose.Types.ObjectId(branchId) },
        ],
      };
    }
    return { branch_id: branchId };
  }

  /**
   * Resolve branch and restaurant from payload or user context
   */
  private static async resolveTenantContext(
    branchIdInput?: string,
    restaurantIdInput?: string,
    user?: AuthJwtPayload
  ) {
    let branchId = branchIdInput || user?.branchId;
    let restaurantId = restaurantIdInput || user?.restaurantId;

    let branch = null;
    if (branchId) {
      branch = await Branch.findOne(this.getFilterById(branchId));
    }

    // If branch doesn't exist by ID (or was a frontend mock ID), find the default branch or one with dining tables
    if (!branch) {
      const tableWithBranch = await DiningTable.findOne({ is_active: true });
      if (tableWithBranch && tableWithBranch.branch_id) {
        branch = await Branch.findOne(this.getFilterById(tableWithBranch.branch_id.toString()));
      }
      if (!branch) {
        branch = await Branch.findOne();
      }
    }

    if (branch) {
      branchId = branch._id.toString();
      restaurantId = branch.restaurantId?.toString() || restaurantId;
    }

    if (!branchId || !restaurantId) {
      const anyBranch = await Branch.findOne();
      if (anyBranch) {
        branchId = anyBranch._id.toString();
        restaurantId = anyBranch.restaurantId?.toString() || 'default_restaurant';
      } else {
        throw new ApiError(400, 'Unable to determine restaurant or branch tenant context');
      }
    }

    return { branchId, restaurantId };
  }

  /**
   * Generate human-readable unique reservation number
   */
  private static async generateReservationNumber(branchId: string, dateStr: string): Promise<string> {
    const cleanDate = dateStr.replace(/-/g, '');
    const count = await TableReservation.countDocuments({
      branch_id: branchId,
      reservation_date: dateStr,
    });
    const seq = String(count + 1).padStart(3, '0');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `RES-${cleanDate}-${seq}${randomSuffix}`;
  }

  /**
   * Check if any given dining table has an overlapping active reservation
   */
  private static async checkTableConflicts(
    tableIds: string[],
    startTime: Date,
    endTime: Date,
    excludeReservationId?: string
  ): Promise<void> {
    if (!tableIds.length) return;

    // Find all active assignments for these tables
    const assignments = await ReservationTableAssignment.find({
      dining_table_id: { $in: tableIds },
      assignment_status: 'active',
      ...(excludeReservationId ? { reservation_id: { $ne: excludeReservationId } } : {}),
    }).lean();

    if (!assignments.length) return;

    const reservationIds = assignments.map((a) => a.reservation_id);
    const existingReservations = await TableReservation.find({
      id: { $in: reservationIds },
      reservation_status: { $in: ['pending', 'confirmed', 'seated'] },
    } as any).lean();

    for (const res of existingReservations) {
      const resStart = new Date(res.start_time);
      const resEnd = res.end_time
        ? new Date(res.end_time)
        : new Date(resStart.getTime() + (res.duration_minutes || 90) * 60000);

      // Check overlap: StartA < EndB and EndA > StartB
      if (startTime < resEnd && endTime > resStart) {
        const conflictingAssignment = assignments.find(
          (a) => a.reservation_id.toString() === res.id.toString()
        );
        const table = await DiningTable.findOne(
          this.getFilterById(conflictingAssignment?.dining_table_id?.toString() || '')
        );

        throw new ApiError(
          409,
          `Table "${table?.table_number || 'selected'}" is already reserved for Booking #${res.reservation_number} from ${resStart.toLocaleTimeString()} to ${resEnd.toLocaleTimeString()}`
        );
      }
    }
  }

  // ==========================================
  // D. RESERVATIONS (Table 5 & Table 6)
  // ==========================================

  /**
   * POST /table-reservations
   * Create a new table reservation with optional table assignments
   */
  static async createReservation(input: CreateReservationInput, user: AuthJwtPayload) {
    const { branchId, restaurantId } = await this.resolveTenantContext(
      input.branch_id,
      input.restaurant_id,
      user
    );

    const startTime = new Date(input.start_time);
    const duration = input.duration_minutes || 90;
    const endTime = input.end_time
      ? new Date(input.end_time)
      : new Date(startTime.getTime() + duration * 60000);

    // Validate table conflicts if tables pre-assigned
    const tableIds = input.assigned_table_ids || [];
    if (tableIds.length > 0) {
      await this.checkTableConflicts(tableIds, startTime, endTime);
    }

    const reservationNumber =
      input.reservation_number ||
      (await this.generateReservationNumber(branchId, input.reservation_date));

    const reservation = await TableReservation.create({
      restaurant_id: restaurantId,
      branch_id: branchId,
      reservation_number: reservationNumber,
      guest_name: input.guest_name,
      guest_phone: input.guest_phone || null,
      guest_email: input.guest_email || null,
      guest_count: input.guest_count,
      reservation_date: input.reservation_date,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration,
      reservation_status: input.reservation_status || 'confirmed',
      reservation_source: input.reservation_source || 'phone',
      special_requests: input.special_requests || null,
      occasion: input.occasion || null,
      estimated_amount: input.estimated_amount || 0,
      deposit_amount: input.deposit_amount || 0,
      deposit_status: input.deposit_status || 'not_required',
      confirmed_at: input.reservation_status === 'confirmed' ? new Date() : null,
      created_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
      updated_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
    });

    // Create table assignments if specified
    const createdAssignments: any[] = [];
    for (const tId of tableIds) {
      const assignment = await ReservationTableAssignment.create({
        restaurant_id: restaurantId,
        branch_id: branchId,
        reservation_id: reservation.id,
        dining_table_id: tId,
        assignment_status: 'active',
        assigned_at: new Date(),
        assigned_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
        notes: `Assigned on booking creation`,
      });
      createdAssignments.push(assignment);
    }

    return this.getReservationById(reservation.id, user);
  }

  /**
   * GET /table-reservations
   * Search reservations with pagination & status filters
   */
  static async listReservations(query: ListReservationsQueryInput, user: AuthJwtPayload) {
    const filter: any = {};

    if (user.role !== 'SUPER_ADMIN' && user.branchId) {
      Object.assign(filter, this.getBranchFilter(user.branchId));
    } else if (query.branch_id && query.branch_id !== 'ALL' && query.branch_id !== 'all' && query.branch_id !== 'branch_cp_main') {
      const branchExists = await Branch.findOne(this.getFilterById(query.branch_id));
      if (branchExists) {
        Object.assign(filter, this.getBranchFilter(query.branch_id));
      }
    }

    if (query.restaurant_id) {
      filter.restaurant_id = query.restaurant_id;
    }

    if (query.date && query.date !== 'all' && query.date !== 'ALL') {
      if (query.date === 'upcoming') {
        const todayStr = new Date().toISOString().split('T')[0];
        filter.reservation_date = { $gte: todayStr };
      } else {
        filter.reservation_date = query.date;
      }
    } else if (query.start_date || query.end_date) {
      filter.reservation_date = {};
      if (query.start_date) filter.reservation_date.$gte = query.start_date;
      if (query.end_date) filter.reservation_date.$lte = query.end_date;
    }

    if (query.status && query.status !== 'all') {
      filter.reservation_status = query.status;
    }

    if (query.source && query.source !== 'all') {
      filter.reservation_source = query.source;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { reservation_number: { $regex: s, $options: 'i' } },
        { guest_name: { $regex: s, $options: 'i' } },
        { guest_phone: { $regex: s, $options: 'i' } },
        { guest_email: { $regex: s, $options: 'i' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [reservations, total] = await Promise.all([
      TableReservation.find(filter)
        .sort({ start_time: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      TableReservation.countDocuments(filter),
    ]);

    // Populate assigned tables for each reservation
    const populated = await Promise.all(
      reservations.map(async (res) => {
        const assignments = await ReservationTableAssignment.find({
          reservation_id: res.id,
          assignment_status: 'active',
        }).lean();

        const tableIds = assignments.map((a) => a.dining_table_id.toString());
        const tables = tableIds.length > 0
          ? await DiningTable.find(this.getFilterByIds(tableIds) as any).lean()
          : [];

        const tablesWithArea = await Promise.all(
          tables.map(async (t) => {
            const area = t.dining_area_id
              ? await DiningArea.findOne(this.getFilterById(t.dining_area_id.toString()) as any).lean()
              : null;
            return {
              ...t,
              id: t.id || t._id?.toString(),
              area: area ? { name: area.name, code: area.code } : null,
            };
          })
        );

        return {
          ...res,
          assigned_tables: tablesWithArea,
          assignments,
        };
      })
    );

    return {
      reservations: populated,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * GET /table-reservations/:id
   * Get single reservation details with full table details
   */
  static async getReservationById(id: string, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(id)).lean();
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && reservation.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this reservation');
    }

    const assignments = await ReservationTableAssignment.find({
      reservation_id: reservation.id,
      assignment_status: 'active',
    }).lean();

    const tableIds = assignments.map((a) => a.dining_table_id.toString());
    const tables = tableIds.length > 0
      ? await DiningTable.find(this.getFilterByIds(tableIds) as any).lean()
      : [];

    const tablesWithArea = await Promise.all(
      tables.map(async (t) => {
        const area = t.dining_area_id
          ? await DiningArea.findOne(this.getFilterById(t.dining_area_id.toString()) as any).lean()
          : null;
        return {
          ...t,
          id: t.id || t._id?.toString(),
          area: area ? { id: area.id, name: area.name, code: area.code } : null,
        };
      })
    );

    return {
      ...reservation,
      assigned_tables: tablesWithArea,
      assignments,
    };
  }

  /**
   * PATCH /table-reservations/:id
   * Update reservation details
   */
  static async updateReservation(id: string, input: UpdateReservationInput, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(id));
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && reservation.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this reservation');
    }

    const newStartTime = input.start_time ? new Date(input.start_time) : new Date(reservation.start_time);
    const newDuration = input.duration_minutes ?? reservation.duration_minutes ?? 90;
    const newEndTime = input.end_time
      ? new Date(input.end_time)
      : input.start_time || input.duration_minutes
      ? new Date(newStartTime.getTime() + newDuration * 60000)
      : reservation.end_time;

    // Check table conflicts if time changed
    if (input.start_time || input.end_time || input.duration_minutes) {
      const activeAssignments = await ReservationTableAssignment.find({
        reservation_id: reservation.id,
        assignment_status: 'active',
      }).lean();
      const tableIds = activeAssignments.map((a) => a.dining_table_id.toString());
      if (tableIds.length > 0 && newEndTime) {
        await this.checkTableConflicts(tableIds, newStartTime, newEndTime, reservation.id);
      }
    }

    Object.assign(reservation, {
      ...input,
      start_time: newStartTime,
      end_time: newEndTime,
      duration_minutes: newDuration,
      updated_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
    });

    await reservation.save();
    return this.getReservationById(reservation.id, user);
  }

  /**
   * DELETE /table-reservations/:id
   * Safely cancel reservation and release all table assignments
   */
  static async deleteReservation(id: string, user: AuthJwtPayload) {
    return this.cancelReservation(id, 'Cancelled via reservation management', user);
  }

  /**
   * POST /table-reservations/:id/confirm
   * Confirm booking
   */
  static async confirmReservation(id: string, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(id));
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    reservation.reservation_status = 'confirmed';
    reservation.confirmed_at = new Date();
    reservation.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await reservation.save();

    return this.getReservationById(reservation.id, user);
  }

  /**
   * POST /table-reservations/:id/cancel
   * Cancel with reason and release tables
   */
  static async cancelReservation(id: string, reason: string, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(id));
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    reservation.reservation_status = 'cancelled';
    reservation.cancelled_at = new Date();
    reservation.cancellation_reason = reason;
    reservation.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await reservation.save();

    // Release all active table assignments
    await ReservationTableAssignment.updateMany(
      { reservation_id: reservation.id, assignment_status: 'active' },
      {
        $set: {
          assignment_status: 'cancelled',
          released_at: new Date(),
          notes: `Released due to cancellation: ${reason}`,
        },
      }
    );

    return {
      message: `Reservation #${reservation.reservation_number} successfully cancelled`,
      reservation,
    };
  }

  /**
   * POST /table-reservations/:id/check-in
   * Record guest arrival
   */
  static async checkInReservation(id: string, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(id));
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    reservation.checked_in_at = new Date();
    if (reservation.reservation_status === 'pending') {
      reservation.reservation_status = 'confirmed';
    }
    reservation.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await reservation.save();

    return this.getReservationById(reservation.id, user);
  }

  /**
   * POST /table-reservations/:id/seat
   * Seat guests, update table status to 'occupied', and create audit record
   */
  static async seatReservation(id: string, input: SeatReservationInput, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(id));
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    // If new table IDs passed, replace assignments
    if (input.table_ids && input.table_ids.length > 0) {
      await ReservationTableAssignment.updateMany(
        { reservation_id: reservation.id, assignment_status: 'active' },
        { $set: { assignment_status: 'released', released_at: new Date() } }
      );

      for (const tId of input.table_ids) {
        await ReservationTableAssignment.create({
          restaurant_id: reservation.restaurant_id,
          branch_id: reservation.branch_id,
          reservation_id: reservation.id,
          dining_table_id: tId,
          assignment_status: 'active',
          assigned_at: new Date(),
          assigned_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
          notes: input.notes || 'Assigned on seating',
        });
      }
    }

    reservation.reservation_status = 'seated';
    reservation.seated_at = new Date();
    reservation.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await reservation.save();

    // Find assigned tables and mark them 'occupied'
    const activeAssignments = await ReservationTableAssignment.find({
      reservation_id: reservation.id,
      assignment_status: 'active',
    }).lean();

    const tableIds = activeAssignments.map((a) => a.dining_table_id);
    for (const tId of tableIds) {
      const table = await DiningTable.findOne(this.getFilterById(tId.toString()));
      if (table) {
        const prev = table.current_status;
        table.current_status = 'occupied';
        await table.save();

        await DiningTableStatusHistory.create({
          dining_table_id: table._id,
          restaurant_id: table.restaurant_id,
          branch_id: table.branch_id,
          previous_status: prev,
          new_status: 'occupied',
          source: 'reservation',
          notes: `Reservation #${reservation.reservation_number} (${reservation.guest_name}) seated.`,
          changed_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
        });
      }
    }

    return this.getReservationById(reservation.id, user);
  }

  /**
   * POST /table-reservations/:id/no-show
   * Mark booking as no-show and release tables
   */
  static async markNoShow(id: string, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(id));
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    reservation.reservation_status = 'no_show';
    reservation.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await reservation.save();

    await ReservationTableAssignment.updateMany(
      { reservation_id: reservation.id, assignment_status: 'active' },
      {
        $set: {
          assignment_status: 'released',
          released_at: new Date(),
          notes: 'Released due to no-show',
        },
      }
    );

    return this.getReservationById(reservation.id, user);
  }

  /**
   * POST /table-reservations/:id/complete
   * Close/complete reservation, release assigned tables, and transition tables to 'cleaning'
   */
  static async completeReservation(id: string, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(id));
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    reservation.reservation_status = 'completed';
    reservation.end_time = new Date();
    reservation.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await reservation.save();

    // Release active table assignments
    const activeAssignments = await ReservationTableAssignment.find({
      $or: [
        { reservation_id: reservation.id },
        ...(mongoose.isValidObjectId(reservation._id) ? [{ reservation_id: reservation._id }] : []),
      ],
      assignment_status: 'active',
    }).lean();

    await ReservationTableAssignment.updateMany(
      {
        $or: [
          { reservation_id: reservation.id },
          ...(mongoose.isValidObjectId(reservation._id) ? [{ reservation_id: reservation._id }] : []),
        ],
        assignment_status: 'active',
      },
      {
        $set: {
          assignment_status: 'released',
          released_at: new Date(),
          notes: 'Released upon completing dining',
        },
      }
    );

    // Transition tables from 'occupied' to 'cleaning'
    const tableIds = activeAssignments.map((a) => a.dining_table_id);
    for (const tId of tableIds) {
      const table = await DiningTable.findOne(this.getFilterById(tId.toString()));
      if (table && table.current_status === 'occupied') {
        const prev = table.current_status;
        table.current_status = 'cleaning';
        await table.save();

        await DiningTableStatusHistory.create({
          dining_table_id: table._id,
          restaurant_id: table.restaurant_id,
          branch_id: table.branch_id,
          previous_status: prev,
          new_status: 'cleaning',
          source: 'reservation',
          notes: `Reservation #${reservation.reservation_number} (${reservation.guest_name}) completed. Table marked for cleaning.`,
          changed_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
        });
      }
    }

    return this.getReservationById(reservation.id, user);
  }

  /**
   * GET /table-reservations/:id/table-assignments
   * View assigned tables
   */
  static async getTableAssignments(reservationId: string, user: AuthJwtPayload) {
    const reservation = await TableReservation.findOne(this.getFilterById(reservationId)).lean();
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    const assignments = await ReservationTableAssignment.find({
      reservation_id: reservation.id,
    })
      .sort({ assigned_at: -1 })
      .lean();

    const populated = await Promise.all(
      assignments.map(async (a) => {
        const table = await DiningTable.findOne(this.getFilterById(a.dining_table_id.toString())).lean();
        const area = table
          ? await DiningArea.findOne({
              $or: [{ id: table.dining_area_id }, { _id: table.dining_area_id }],
            } as any).lean()
          : null;
        return {
          ...a,
          table: table ? { ...table, area: area ? { name: area.name, code: area.code } : null } : null,
        };
      })
    );

    return populated;
  }

  /**
   * POST /table-reservations/:id/table-assignments
   * Assign one or more tables to a reservation
   */
  static async assignTables(
    reservationId: string,
    diningTableIds: string[],
    notes: string | null | undefined,
    user: AuthJwtPayload
  ) {
    const reservation = await TableReservation.findOne(this.getFilterById(reservationId));
    if (!reservation) {
      throw new ApiError(404, 'Table reservation not found');
    }

    const startTime = new Date(reservation.start_time);
    const duration = reservation.duration_minutes || 90;
    const endTime = reservation.end_time
      ? new Date(reservation.end_time)
      : new Date(startTime.getTime() + duration * 60000);

    // Conflict check
    await this.checkTableConflicts(diningTableIds, startTime, endTime, reservation.id);

    const created: any[] = [];
    for (const tId of diningTableIds) {
      // Check if already active
      const existing = await ReservationTableAssignment.findOne({
        reservation_id: reservation.id,
        dining_table_id: tId,
        assignment_status: 'active',
      });

      if (!existing) {
        const a = await ReservationTableAssignment.create({
          restaurant_id: reservation.restaurant_id,
          branch_id: reservation.branch_id,
          reservation_id: reservation.id,
          dining_table_id: tId,
          assignment_status: 'active',
          assigned_at: new Date(),
          assigned_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
          notes: notes || 'Assigned to reservation',
        });
        created.push(a);
      }
    }

    return this.getTableAssignments(reservation.id, user);
  }

  /**
   * PATCH /table-reservations/:id/table-assignments/:assignmentId
   * Change or release an assignment
   */
  static async updateTableAssignment(
    reservationId: string,
    assignmentId: string,
    status: 'active' | 'released' | 'cancelled',
    notes: string | null | undefined,
    user: AuthJwtPayload
  ) {
    const assignment = await ReservationTableAssignment.findOne({
      ...this.getFilterById(assignmentId),
      reservation_id: reservationId,
    });

    if (!assignment) {
      throw new ApiError(404, 'Reservation table assignment not found');
    }

    assignment.assignment_status = status;
    if (status !== 'active') {
      assignment.released_at = new Date();
    }
    if (notes) assignment.notes = notes;
    await assignment.save();

    return assignment;
  }

  /**
   * GET /table-reservations/availability
   * Find available tables and combination options for a booking
   */
  static async checkAvailability(query: CheckAvailabilityQueryInput, user: AuthJwtPayload) {
    const { branchId } = await this.resolveTenantContext(query.branch_id, undefined, user);

    const startTime = new Date(query.start_time);
    const duration = query.duration_minutes || 90;
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // 1. Fetch tables in branch (supporting both ObjectId & String branch_id)
    const branchFilter = this.getBranchFilter(branchId);
    const tableFilter: any = { ...branchFilter, is_active: true };
    if (query.preferred_area_id) {
      tableFilter.dining_area_id = query.preferred_area_id;
    }
    let allTables = await DiningTable.find(tableFilter).lean();

    // If no tables found in filtered branch, fallback to all active tables so staff is never stranded
    if (allTables.length === 0) {
      allTables = await DiningTable.find({ is_active: true }).lean();
    }

    // 2. Fetch areas
    const areas = await DiningArea.find(branchFilter).lean();
    const areaMap = new Map(areas.map((a) => [a.id || (a as any)._id?.toString(), a]));

    // 3. Find active overlapping reservations on this branch & date
    const dayReservations = await TableReservation.find({
      ...branchFilter,
      reservation_date: query.date,
      reservation_status: { $in: ['pending', 'confirmed', 'seated'] },
    }).lean();

    const conflictingReservationIds = dayReservations
      .filter((res) => {
        const resStart = new Date(res.start_time);
        const resEnd = res.end_time
          ? new Date(res.end_time)
          : new Date(resStart.getTime() + (res.duration_minutes || 90) * 60000);
        return startTime < resEnd && endTime > resStart;
      })
      .map((r) => r.id);

    // 4. Find which tables are assigned to conflicting reservations
    const busyAssignments = await ReservationTableAssignment.find({
      reservation_id: { $in: conflictingReservationIds },
      assignment_status: 'active',
    }).lean();

    const busyTableIdSet = new Set(busyAssignments.map((a) => a.dining_table_id.toString()));

    // 5. Partition tables into available vs busy
    const availableTables = allTables
      .filter((t) => !busyTableIdSet.has(t.id) && !busyTableIdSet.has((t as any)._id?.toString()))
      .map((t) => {
        const area = areaMap.get(t.dining_area_id?.toString());
        return {
          ...t,
          id: t.id || (t as any)._id?.toString(),
          area: area ? { name: area.name, code: area.code } : null,
          is_suitable_for_party: t.capacity >= query.guest_count && (!t.minimum_capacity || t.minimum_capacity <= query.guest_count),
        };
      });

    const busyTables = allTables
      .filter((t) => busyTableIdSet.has(t.id) || busyTableIdSet.has((t as any)._id?.toString()))
      .map((t) => {
        const area = areaMap.get(t.dining_area_id?.toString());
        return {
          ...t,
          id: t.id || (t as any)._id?.toString(),
          area: area ? { name: area.name, code: area.code } : null,
        };
      });

    // 6. Perfect match recommendations
    const suitableTables = availableTables.filter((t) => t.is_suitable_for_party);

    return {
      query: {
        date: query.date,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: duration,
        guest_count: query.guest_count,
      },
      summary: {
        total_tables: allTables.length,
        available_count: availableTables.length,
        suitable_count: suitableTables.length,
        busy_count: busyTables.length,
      },
      suitable_tables: suitableTables,
      all_available_tables: availableTables,
      busy_tables: busyTables,
    };
  }

  // ==========================================
  // E. WAITING LIST
  // ==========================================

  /**
   * POST /waiting-list
   * Add a walk-in guest to the waiting queue
   */
  static async createWaitingListEntry(input: CreateWaitingListEntryInput, user: AuthJwtPayload) {
    const { branchId, restaurantId } = await this.resolveTenantContext(
      input.branch_id,
      input.restaurant_id,
      user
    );

    // Generate queue number for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayCount = await WaitingListEntry.countDocuments({
      branch_id: branchId,
      createdAt: { $gte: startOfToday },
    });
    const queueNumber = `Q-${String(todayCount + 1).padStart(2, '0')}`;

    const entry = await WaitingListEntry.create({
      restaurant_id: restaurantId,
      branch_id: branchId,
      queue_number: queueNumber,
      guest_name: input.guest_name,
      guest_phone: input.guest_phone || null,
      guest_email: input.guest_email || null,
      guest_count: input.guest_count,
      preferred_area_id: input.preferred_area_id || null,
      seating_preference: input.seating_preference || 'any',
      estimated_wait_minutes: input.estimated_wait_minutes ?? 15,
      status: 'waiting',
      notes: input.notes || null,
      created_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
      updated_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
    });

    return this.getWaitingListEntryById(entry.id, user);
  }

  /**
   * GET /waiting-list
   * List waiting queue
   */
  static async listWaitingList(query: ListWaitingListQueryInput, user: AuthJwtPayload) {
    const filter: any = {};

    if (user.role !== 'SUPER_ADMIN' && user.branchId) {
      filter.branch_id = user.branchId;
    } else if (query.branch_id) {
      filter.branch_id = query.branch_id;
    }

    if (query.restaurant_id) {
      filter.restaurant_id = query.restaurant_id;
    }

    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { queue_number: { $regex: s, $options: 'i' } },
        { guest_name: { $regex: s, $options: 'i' } },
        { guest_phone: { $regex: s, $options: 'i' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [entries, total] = await Promise.all([
      WaitingListEntry.find(filter)
        .sort({ status: 1, createdAt: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      WaitingListEntry.countDocuments(filter),
    ]);

    // Populate area and seated table details
    const populated = await Promise.all(
      entries.map(async (e) => {
        const area = e.preferred_area_id
          ? await DiningArea.findOne(this.getFilterById(e.preferred_area_id.toString())).lean()
          : null;
        const table = e.seated_table_id
          ? await DiningTable.findOne(this.getFilterById(e.seated_table_id.toString())).lean()
          : null;
        return {
          ...e,
          preferred_area: area ? { name: area.name, code: area.code } : null,
          seated_table: table ? { table_number: table.table_number, capacity: table.capacity } : null,
        };
      })
    );

    return {
      waiting_list: populated,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * GET /waiting-list/:id
   * Get queue entry
   */
  static async getWaitingListEntryById(id: string, user: AuthJwtPayload) {
    const entry = await WaitingListEntry.findOne(this.getFilterById(id)).lean();
    if (!entry) {
      throw new ApiError(404, 'Waiting list entry not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && entry.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this waiting list entry');
    }

    const area = entry.preferred_area_id
      ? await DiningArea.findOne(this.getFilterById(entry.preferred_area_id.toString())).lean()
      : null;
    const table = entry.seated_table_id
      ? await DiningTable.findOne(this.getFilterById(entry.seated_table_id.toString())).lean()
      : null;

    return {
      ...entry,
      preferred_area: area ? { id: area.id, name: area.name, code: area.code } : null,
      seated_table: table ? { id: table.id, table_number: table.table_number, capacity: table.capacity } : null,
    };
  }

  /**
   * PATCH /waiting-list/:id
   * Update guest details or preferences
   */
  static async updateWaitingListEntry(id: string, input: UpdateWaitingListEntryInput, user: AuthJwtPayload) {
    const entry = await WaitingListEntry.findOne(this.getFilterById(id));
    if (!entry) {
      throw new ApiError(404, 'Waiting list entry not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.branchId && entry.branch_id.toString() !== user.branchId) {
      throw new ApiError(403, 'Unauthorized access to this waiting list entry');
    }

    Object.assign(entry, {
      ...input,
      updated_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
    });

    await entry.save();
    return this.getWaitingListEntryById(entry.id, user);
  }

  /**
   * DELETE /waiting-list/:id
   * Remove queue entry
   */
  static async deleteWaitingListEntry(id: string, user: AuthJwtPayload) {
    const entry = await WaitingListEntry.findOne(this.getFilterById(id));
    if (!entry) {
      throw new ApiError(404, 'Waiting list entry not found');
    }

    entry.status = 'cancelled';
    await entry.save();
    return { message: `Queue entry #${entry.queue_number} cancelled`, entry };
  }

  /**
   * POST /waiting-list/:id/notify
   * Mark guest as notified (via SMS/buzzer/call)
   */
  static async notifyGuest(id: string, user: AuthJwtPayload) {
    const entry = await WaitingListEntry.findOne(this.getFilterById(id));
    if (!entry) {
      throw new ApiError(404, 'Waiting list entry not found');
    }

    entry.status = 'notified';
    entry.notified_at = new Date();
    entry.notification_count = (entry.notification_count || 0) + 1;
    entry.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await entry.save();

    return this.getWaitingListEntryById(entry.id, user);
  }

  /**
   * POST /waiting-list/:id/seat
   * Seat guest at table, mark table occupied, and complete queue
   */
  static async seatWaitingListGuest(id: string, input: SeatWaitingListGuestInput, user: AuthJwtPayload) {
    const entry = await WaitingListEntry.findOne(this.getFilterById(id));
    if (!entry) {
      throw new ApiError(404, 'Waiting list entry not found');
    }

    const table = await DiningTable.findOne(this.getFilterById(input.dining_table_id));
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    entry.status = 'seated';
    entry.seated_at = new Date();
    entry.seated_table_id = table.id || (table as any)._id?.toString();
    if (input.notes) entry.notes = input.notes;
    entry.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await entry.save();

    // Mark dining table occupied
    const prev = table.current_status;
    table.current_status = 'occupied';
    await table.save();

    await DiningTableStatusHistory.create({
      dining_table_id: table._id,
      restaurant_id: table.restaurant_id,
      branch_id: table.branch_id,
      previous_status: prev,
      new_status: 'occupied',
      source: 'staff',
      notes: `Walk-in queue #${entry.queue_number} (${entry.guest_name}, party of ${entry.guest_count}) seated.`,
      changed_by: user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null,
    });

    return this.getWaitingListEntryById(entry.id, user);
  }

  /**
   * POST /waiting-list/:id/no-show
   * Mark walk-in as no-show
   */
  static async markWaitingListNoShow(id: string, user: AuthJwtPayload) {
    const entry = await WaitingListEntry.findOne(this.getFilterById(id));
    if (!entry) {
      throw new ApiError(404, 'Waiting list entry not found');
    }

    entry.status = 'no_show';
    entry.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await entry.save();

    return this.getWaitingListEntryById(entry.id, user);
  }

  /**
   * POST /waiting-list/:id/cancel
   * Cancel queue entry with reason
   */
  static async cancelWaitingListEntry(id: string, reason: string | null | undefined, user: AuthJwtPayload) {
    const entry = await WaitingListEntry.findOne(this.getFilterById(id));
    if (!entry) {
      throw new ApiError(404, 'Waiting list entry not found');
    }

    entry.status = 'cancelled';
    if (reason) {
      entry.notes = entry.notes ? `${entry.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`;
    }
    entry.updated_by = user.userId && mongoose.isValidObjectId(user.userId) ? new mongoose.Types.ObjectId(user.userId) : null;
    await entry.save();

    return { message: `Queue entry #${entry.queue_number} cancelled`, entry };
  }
}

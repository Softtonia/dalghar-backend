import { PosOrder } from '../../models/PosOrder.js';
import { PosShift } from '../../models/PosShift.js';
import { PosTerminal } from '../../models/PosTerminal.js';
import { PosTerminalAssignment } from '../../models/PosTerminalAssignment.js';
import { CashierShift } from '../../models/CashierShift.js';
import { CashMovement } from '../../models/CashMovement.js';
import { PosShiftReconciliation } from '../../models/PosShiftReconciliation.js';
import { PosShiftReconciliationDenomination } from '../../models/PosShiftReconciliationDenomination.js';
import { PosPeripheral } from '../../models/PosPeripheral.js';
import { PosPeripheralAssignment } from '../../models/PosPeripheralAssignment.js';
import { PosPeripheralEvent } from '../../models/PosPeripheralEvent.js';
import { PosReceiptTemplate } from '../../models/PosReceiptTemplate.js';
import { PosBillNumberSeries } from '../../models/PosBillNumberSeries.js';
import { PosBillNumberAllocation } from '../../models/PosBillNumberAllocation.js';
import { PosTransaction } from '../../models/PosTransaction.js';
import { PosTerminalTransaction } from '../../models/PosTerminalTransaction.js';
import { PosTransactionAdjustment } from '../../models/PosTransactionAdjustment.js';
import { PosTerminalAuditLog, sanitizeAuditData, PosAuditOutcome } from '../../models/PosTerminalAuditLog.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Branch } from '../../models/Branch.js';
import { User } from '../../models/User.js';
import { DiningTable } from '../../models/DiningTable.js';
import { DiningTableStatusHistory } from '../../models/DiningTableStatusHistory.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  sanitizeTemplateContent,
  validateTemplatePlaceholders,
  renderReceiptPreview,
} from '../../utils/receiptTemplateValidator.js';
import type {
  CreatePosTerminalInput,
  UpdatePosTerminalInput,
  UpdateTerminalStatusInput,
  ListTerminalQueryInput,
  CreateReceiptTemplateInput,
  UpdateReceiptTemplateInput,
  CreateBillNumberSeriesInput,
  UpdateBillNumberSeriesInput,
  RegisterTerminalTransactionInput,
  UpdateTerminalTransactionStatusInput,
  CreateTransactionAdjustmentInput,
  RejectAdjustmentInput,
  CompleteAdjustmentInput,
  ListAuditLogsQueryInput,
  CreatePosOrderInput,
  UpdateOrderStatusInput,
  UpdateKitchenStatusInput,
  AssignWaiterInput,
  UpdateOrderItemStatusInput,
  CollectOrderPaymentInput,
  ListPosOrdersQueryInput,
  AppendOrderItemsInput,
  ApproveOrderInput,
  RejectOrderInput,
} from './pos.validation.js';
import mongoose from 'mongoose';

export interface PosSummaryFilter {
  restaurantId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  terminalId?: string;
  cashierId?: string;
}

export interface PosTransactionFilter extends PosSummaryFilter {
  search?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function getStartOfDay(d: Date = new Date()): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfDay(d: Date = new Date()): Date {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatDateToIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function getBusinessTimezone(restaurantId?: any, branchId?: any): Promise<string> {
  try {
    if (branchId && mongoose.isValidObjectId(branchId)) {
      const branch: any = await Branch.findById(branchId).lean();
      if (branch?.configuration?.timezone) return branch.configuration.timezone;
    }
    if (restaurantId && mongoose.isValidObjectId(restaurantId)) {
      const rest: any = await Restaurant.findById(restaurantId).lean();
      if (rest?.configuration?.timezone) return rest.configuration.timezone;
      if (rest?.timezone) return rest.timezone;
    }
  } catch (err) {
    // fallback default
  }
  return 'Asia/Kolkata';
}

function shouldResetSeries(lastReset: Date | null | undefined, frequency: string, timezone: string): boolean {
  if (!lastReset || !frequency || frequency === 'never') return false;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

    const nowParts = formatter.formatToParts(now);
    const lastParts = formatter.formatToParts(new Date(lastReset));

    const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    const nowYear = getPart(nowParts, 'year');
    const nowMonth = getPart(nowParts, 'month');
    const nowDay = getPart(nowParts, 'day');

    const lastYear = getPart(lastParts, 'year');
    const lastMonth = getPart(lastParts, 'month');
    const lastDay = getPart(lastParts, 'day');

    if (frequency === 'daily') {
      return nowYear !== lastYear || nowMonth !== lastMonth || nowDay !== lastDay;
    }
    if (frequency === 'monthly') {
      return nowYear !== lastYear || nowMonth !== lastMonth;
    }
    if (frequency === 'yearly') {
      return nowYear !== lastYear;
    }
  } catch (err) {
    // ignore
  }
  return false;
}

export class PosService {
  /**
   * Seed demo data if collections are empty so users see real data right away
   */
  static async seedDemoDataIfEmpty(): Promise<void> {
    return;
  }

  // ==========================================
  // 1. TERMINAL MANAGEMENT
  // ==========================================
  static async registerTerminal(data: CreatePosTerminalInput, userId?: string) {
    if (!mongoose.isValidObjectId(data.branch_id)) {
      throw new ApiError(400, 'Invalid branch_id format');
    }

    const branch = await Branch.findById(data.branch_id);
    if (!branch) throw new ApiError(404, 'Branch not found');

    const existing = await PosTerminal.findOne({
      branch_id: data.branch_id,
      terminal_code: data.terminal_code,
      deleted_at: null,
    });

    if (existing) {
      throw new ApiError(409, `Terminal code "${data.terminal_code}" is already registered for this branch.`);
    }

    const restaurantId = data.restaurant_id || branch.restaurantId;

    return PosTerminal.create({
      restaurant_id: restaurantId && mongoose.isValidObjectId(restaurantId) ? restaurantId : null,
      branch_id: data.branch_id,
      terminal_code: data.terminal_code,
      terminal_name: data.terminal_name || data.name,
      name: data.name || data.terminal_name,
      device_identifier: data.device_identifier || null,
      device_type: data.device_type || 'desktop',
      operating_system: data.operating_system || 'Windows',
      app_version: data.app_version || '1.0.0',
      ip_address: data.ip_address || null,
      mac_address: data.mac_address || null,
      status: data.status || 'active',
      connectivity_status: data.connectivity_status || 'unknown',
      last_heartbeat_at: new Date(),
      last_seen_at: new Date(),
      registered_by: userId && mongoose.isValidObjectId(userId) ? userId : null,
      registered_at: new Date(),
      settings: data.settings || {},
      created_by: userId && mongoose.isValidObjectId(userId) ? userId : null,
    });
  }

  static async listTerminals(query: ListTerminalQueryInput) {
    await this.seedDemoDataIfEmpty();

    const filter: any = { deleted_at: null };

    if (query.branch_id && mongoose.isValidObjectId(query.branch_id)) {
      filter.branch_id = new mongoose.Types.ObjectId(query.branch_id);
    }
    if (query.status && query.status.trim()) {
      filter.status = query.status.trim().toLowerCase();
    }
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { terminal_code: { $regex: s, $options: 'i' } },
        { name: { $regex: s, $options: 'i' } },
        { device_identifier: { $regex: s, $options: 'i' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [terminals, total] = await Promise.all([
      PosTerminal.find(filter)
        .populate('branch_id', 'name code')
        .populate('created_by', 'firstName lastName email')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      PosTerminal.countDocuments(filter),
    ]);

    return {
      terminals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTerminalById(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid terminal ID format');

    const terminal = await PosTerminal.findOne({ _id: id, deleted_at: null })
      .populate('branch_id', 'name code restaurantId')
      .populate('created_by', 'firstName lastName email');

    if (!terminal) throw new ApiError(404, 'POS terminal not found');
    return terminal;
  }

  static async updateTerminal(id: string, data: UpdatePosTerminalInput) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid terminal ID format');

    const terminal = await PosTerminal.findOne({ _id: id, deleted_at: null });
    if (!terminal) throw new ApiError(404, 'POS terminal not found');

    const targetBranchId = data.branch_id || terminal.branch_id.toString();
    const targetCode = data.terminal_code || terminal.terminal_code;

    if (data.terminal_code || data.branch_id) {
      const duplicate = await PosTerminal.findOne({
        _id: { $ne: terminal._id },
        branch_id: targetBranchId,
        terminal_code: targetCode,
        deleted_at: null,
      });

      if (duplicate) {
        throw new ApiError(409, `Terminal code "${targetCode}" is already in use at this branch.`);
      }
    }

    if (data.name !== undefined) {
      terminal.name = data.name;
      terminal.terminal_name = data.name;
    }
    if (data.terminal_name !== undefined) {
      terminal.terminal_name = data.terminal_name;
      terminal.name = data.terminal_name;
    }
    if (data.device_identifier !== undefined) terminal.device_identifier = data.device_identifier;
    if (data.terminal_code !== undefined) terminal.terminal_code = data.terminal_code;
    if (data.device_type !== undefined) terminal.device_type = data.device_type;
    if (data.operating_system !== undefined) terminal.operating_system = data.operating_system;
    if (data.app_version !== undefined) terminal.app_version = data.app_version;
    if (data.ip_address !== undefined) terminal.ip_address = data.ip_address;
    if (data.mac_address !== undefined) terminal.mac_address = data.mac_address;
    if (data.connectivity_status !== undefined) terminal.connectivity_status = data.connectivity_status;
    if (data.branch_id !== undefined && mongoose.isValidObjectId(data.branch_id)) {
      terminal.branch_id = new mongoose.Types.ObjectId(data.branch_id);
    }
    if (data.restaurant_id !== undefined) {
      terminal.restaurant_id = data.restaurant_id && mongoose.isValidObjectId(data.restaurant_id)
        ? new mongoose.Types.ObjectId(data.restaurant_id)
        : null;
    }
    if (data.settings !== undefined) {
      terminal.settings = { ...terminal.settings, ...data.settings };
    }

    await terminal.save();
    return terminal;
  }

  static async updateTerminalStatus(id: string, statusInput: UpdateTerminalStatusInput) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid terminal ID format');

    const terminal = await PosTerminal.findOne({ _id: id, deleted_at: null });
    if (!terminal) throw new ApiError(404, 'POS terminal not found');

    terminal.status = statusInput.status;
    await terminal.save();
    return terminal;
  }

  static async deleteTerminal(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid terminal ID format');

    const terminal = await PosTerminal.findOne({ _id: id, deleted_at: null });
    if (!terminal) throw new ApiError(404, 'POS terminal not found');

    const openShift = await CashierShift.findOne({
      terminal_id: terminal._id,
      status: 'open',
    });

    if (openShift) {
      throw new ApiError(
        400,
        `Cannot delete terminal "${terminal.terminal_code}" while cashier shift (${openShift.shift_number}) is OPEN. Close the shift first.`
      );
    }

    terminal.deleted_at = new Date();
    terminal.status = 'inactive';
    await terminal.save();

    return { success: true, message: `POS Terminal "${terminal.name}" soft-deleted successfully` };
  }

  // ==========================================
  // 2. TERMINAL ASSIGNMENTS (pos_terminal_assignments)
  // ==========================================
  static async assignUserToTerminal(terminal_id: string, user_id: string, assigned_by?: string) {
    if (!mongoose.isValidObjectId(terminal_id) || !mongoose.isValidObjectId(user_id)) {
      throw new ApiError(400, 'Invalid terminal_id or user_id format');
    }

    const terminal = await PosTerminal.findOne({ _id: terminal_id, deleted_at: null });
    if (!terminal) throw new ApiError(404, 'Terminal not found');

    const user = await User.findById(user_id);
    if (!user) throw new ApiError(404, 'User/Cashier not found');

    // Strict validation: Only users with role CASHIER can be assigned to POS terminals
    const userRole = (user.role || '').toUpperCase();
    if (userRole !== 'CASHIER' && userRole !== 'SUPER_ADMIN') {
      throw new ApiError(400, `Cannot assign user "${user.name || user.email}" with role "${user.role}". Only staff with role "CASHIER" can be assigned to POS terminals.`);
    }

    // Partial unique index check: only 1 active assignment per terminal and cashier
    const existing = await PosTerminalAssignment.findOne({
      terminal_id,
      user_id,
      unassigned_at: null,
    });

    if (existing) {
      throw new ApiError(409, 'This cashier is already currently assigned to this terminal.');
    }

    return PosTerminalAssignment.create({
      terminal_id,
      user_id,
      assigned_by: assigned_by && mongoose.isValidObjectId(assigned_by) ? assigned_by : null,
      assigned_at: new Date(),
    });
  }

  static async listTerminalAssignments(query: { terminal_id?: string; user_id?: string; active_only?: boolean }) {
    await this.seedDemoDataIfEmpty();
    const filter: any = {};
    if (query.terminal_id && mongoose.isValidObjectId(query.terminal_id)) filter.terminal_id = query.terminal_id;
    if (query.user_id && mongoose.isValidObjectId(query.user_id)) filter.user_id = query.user_id;
    if (query.active_only) filter.unassigned_at = null;

    return PosTerminalAssignment.find(filter)
      .populate('terminal_id', 'terminal_code name status')
      .populate('user_id', 'firstName lastName email role')
      .populate('assigned_by', 'firstName lastName')
      .sort({ assigned_at: -1 })
      .lean();
  }

  static async unassignTerminal(assignmentId: string) {
    if (!mongoose.isValidObjectId(assignmentId)) throw new ApiError(400, 'Invalid assignment ID');
    const assignment = await PosTerminalAssignment.findById(assignmentId);
    if (!assignment) throw new ApiError(404, 'Assignment not found');

    if (assignment.unassigned_at) {
      throw new ApiError(400, 'Assignment has already ended');
    }

    assignment.unassigned_at = new Date();
    await assignment.save();
    return assignment;
  }

  // ==========================================
  // 3. CASHIER SHIFTS & MOVEMENTS
  // ==========================================
  static async openCashierShift(branch_id: string, terminal_id: string, opening_cash: number, userId: string) {
    if (!mongoose.isValidObjectId(branch_id) || !mongoose.isValidObjectId(terminal_id)) {
      throw new ApiError(400, 'Invalid branch_id or terminal_id format');
    }

    const terminal = await PosTerminal.findOne({ _id: terminal_id, deleted_at: null });
    if (!terminal) throw new ApiError(404, 'POS Terminal not found');

    // Partial unique index check: Prevent multiple open shifts for the same terminal
    const existingOpen = await CashierShift.findOne({
      terminal_id,
      status: 'open',
    });

    if (existingOpen) {
      throw new ApiError(
        409,
        `Terminal ${terminal.terminal_code} already has an OPEN shift (${existingOpen.shift_number}). Close it before opening a new one.`
      );
    }

    const shiftNumber = `SHIFT-${Date.now().toString().slice(-6)}`;

    const shift = await CashierShift.create({
      branch_id,
      terminal_id,
      cashier_id: userId,
      shift_number: shiftNumber,
      opened_at: new Date(),
      opening_cash,
      expected_cash: opening_cash,
      status: 'open',
      opened_by: userId,
    });

    return shift;
  }

  static async getCurrentOpenShift(userId: string, terminalId?: string) {
    await this.seedDemoDataIfEmpty();
    const query: any = { status: 'open' };
    if (terminalId && mongoose.isValidObjectId(terminalId)) {
      query.terminal_id = terminalId;
    } else if (userId && mongoose.isValidObjectId(userId)) {
      query.cashier_id = userId;
    }
    return CashierShift.findOne(query)
      .populate('terminal_id', 'terminal_code name')
      .populate('cashier_id', 'firstName lastName email')
      .populate('branch_id', 'name code')
      .lean();
  }

  static async listCashierShifts(query: any) {
    await this.seedDemoDataIfEmpty();
    const filter: any = {};
    if (query.branch_id && mongoose.isValidObjectId(query.branch_id)) filter.branch_id = query.branch_id;
    if (query.cashier_id && mongoose.isValidObjectId(query.cashier_id)) filter.cashier_id = query.cashier_id;
    if (query.status) filter.status = query.status;

    if (query.terminal_id) {
      if (mongoose.isValidObjectId(query.terminal_id)) {
        filter.terminal_id = query.terminal_id;
      } else {
        // Find terminal by code first
        const term = await PosTerminal.findOne({ terminal_code: query.terminal_id, deleted_at: null }).select('_id');
        if (term) {
          filter.terminal_id = term._id;
        }
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [shifts, total] = await Promise.all([
      CashierShift.find(filter)
        .populate('terminal_id', 'terminal_code name')
        .populate('cashier_id', 'firstName lastName email')
        .populate('branch_id', 'name code')
        .sort({ opened_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CashierShift.countDocuments(filter),
    ]);

    return { shifts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getShiftSummary(shiftId: string) {
    if (!mongoose.isValidObjectId(shiftId)) throw new ApiError(400, 'Invalid shift ID');
    const shift = await CashierShift.findById(shiftId)
      .populate('terminal_id', 'terminal_code name')
      .populate('cashier_id', 'firstName lastName');

    if (!shift) throw new ApiError(404, 'Shift not found');

    // Aggregate completed cash payments during this shift
    const cashSalesAgg = await PosTransaction.aggregate([
      { $match: { shift_id: shift._id, status: 'completed' } },
      { $unwind: '$payments' },
      { $match: { 'payments.payment_method_type': 'CASH', 'payments.status': 'completed' } },
      { $group: { _id: null, totalCash: { $sum: '$payments.amount' } } },
    ]);
    const cashSales = cashSalesAgg[0]?.totalCash || 0;

    // Aggregate cash movements
    const movementsAgg = await CashMovement.aggregate([
      { $match: { shift_id: shift._id } },
      {
        $group: {
          _id: '$movement_type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let cashIn = 0;
    let cashOut = 0;
    let safeDrops = 0;
    let payouts = 0;
    movementsAgg.forEach((m) => {
      if (m._id === 'cash_in' || m._id === 'float_addition') {
        cashIn += m.total;
      } else if (m._id === 'safe_drop') {
        safeDrops += m.total;
      } else if (m._id === 'cash_out' || m._id === 'float_removal') {
        cashOut += m.total;
      } else if (m._id === 'payout' || m._id === 'petty_cash' || m._id === 'paid_out') {
        payouts += m.total;
      }
    });

    const calculatedExpectedCash = Math.max(
      0,
      shift.opening_cash + cashSales + cashIn - cashOut - safeDrops - payouts
    );

    return {
      shift,
      metrics: {
        opening_cash: shift.opening_cash,
        cash_sales: cashSales,
        cash_in: cashIn,
        cash_out: cashOut,
        safe_drops: safeDrops,
        payouts: payouts,
        expected_cash: calculatedExpectedCash,
        counted_cash: shift.counted_cash,
        cash_variance: shift.counted_cash !== null && shift.counted_cash !== undefined
          ? shift.counted_cash - calculatedExpectedCash
          : null,
      },
    };
  }

  static async closeCashierShift(shiftId: string, counted_cash: number, closing_notes?: string | null, userId?: string) {
    if (!mongoose.isValidObjectId(shiftId)) throw new ApiError(400, 'Invalid shift ID');
    const shift = await CashierShift.findById(shiftId);
    if (!shift) throw new ApiError(404, 'Shift not found');

    if (shift.status !== 'open') {
      throw new ApiError(400, `Shift is already ${shift.status}`);
    }

    const { metrics } = await this.getShiftSummary(shiftId);

    shift.closed_at = new Date();
    shift.counted_cash = counted_cash;
    shift.expected_cash = metrics.expected_cash;
    shift.cash_variance = counted_cash - metrics.expected_cash;
    shift.status = 'closed';
    shift.closing_notes = closing_notes || null;
    shift.closed_by = userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null;

    await shift.save();
    return shift;
  }

  static async recordCashMovement(
    data: {
      shift_id: string;
      movement_type: string;
      amount: number;
      reason: string;
      reason_code?: string | null;
      reference_number?: string | null;
    },
    userId: string
  ) {
    if (!mongoose.isValidObjectId(data.shift_id)) throw new ApiError(400, 'Invalid shift ID');
    const shift = await CashierShift.findById(data.shift_id);
    if (!shift) throw new ApiError(404, 'Shift not found');
    if (shift.status !== 'open') throw new ApiError(400, 'Cannot record cash movement on a closed shift');

    return CashMovement.create({
      restaurant_id: shift.restaurant_id || null,
      branch_id: shift.branch_id,
      terminal_id: shift.terminal_id,
      shift_id: data.shift_id,
      movement_type: data.movement_type as any,
      amount: data.amount,
      reason_code: data.reason_code || null,
      reason: data.reason,
      reference_number: data.reference_number || null,
      performed_by: userId,
    });
  }

  static async listCashMovements(shift_id?: string, branch_id?: string) {
    const filter: any = {};
    if (shift_id && mongoose.isValidObjectId(shift_id)) filter.shift_id = shift_id;
    if (branch_id && mongoose.isValidObjectId(branch_id)) filter.branch_id = branch_id;
    return CashMovement.find(filter)
      .populate('performed_by', 'firstName lastName email')
      .populate('approved_by', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async getMovementById(movementId: string) {
    if (!mongoose.isValidObjectId(movementId)) throw new ApiError(400, 'Invalid movement ID');
    const movement = await CashMovement.findById(movementId)
      .populate('performed_by', 'firstName lastName email')
      .populate('approved_by', 'firstName lastName')
      .populate('shift_id', 'shift_number terminal_id status');
    if (!movement) throw new ApiError(404, 'Cash movement record not found');
    return movement;
  }

  static async approveCashMovement(movementId: string, userId: string) {
    if (!mongoose.isValidObjectId(movementId)) throw new ApiError(400, 'Invalid movement ID');
    const movement = await CashMovement.findById(movementId);
    if (!movement) throw new ApiError(404, 'Cash movement record not found');

    movement.approved_by = new mongoose.Types.ObjectId(userId);
    movement.approved_at = new Date();
    await movement.save();
    return movement;
  }

  // ==========================================
  // 3B. CASH RECONCILIATIONS & DENOMINATIONS (G. Tables 7 & 8)
  // ==========================================
  static async submitReconciliation(
    shiftId: string,
    data: {
      counted_cash_amount: number;
      reconciliation_notes?: string;
      denominations?: Array<{ denomination_value: number; quantity: number }>;
    },
    userId: string
  ) {
    if (!mongoose.isValidObjectId(shiftId)) throw new ApiError(400, 'Invalid shift ID');
    const shift = await CashierShift.findById(shiftId);
    if (!shift) throw new ApiError(404, 'Cashier shift not found');

    const countedCash = Number(data.counted_cash_amount);
    if (isNaN(countedCash) || countedCash < 0) {
      throw new ApiError(400, 'Counted cash amount must be a non-negative number');
    }

    // Denomination verification if supplied
    if (data.denominations && data.denominations.length > 0) {
      let denominationSum = 0;
      for (const d of data.denominations) {
        const val = Number(d.denomination_value);
        const qty = Number(d.quantity);
        if (isNaN(val) || val <= 0) {
          throw new ApiError(400, `Invalid denomination value: ${d.denomination_value}. Must be positive.`);
        }
        if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
          throw new ApiError(400, `Invalid quantity for denomination ₹${val}: must be a non-negative integer`);
        }
        denominationSum += val * qty;
      }

      // Check rounding difference (must equal counted cash)
      if (Math.abs(denominationSum - countedCash) > 0.01) {
        throw new ApiError(
          400,
          `Denomination total (₹${denominationSum.toFixed(2)}) does not match reported counted cash amount (₹${countedCash.toFixed(2)})`
        );
      }
    }

    // Calculate expected cash dynamically from shift
    const { metrics } = await this.getShiftSummary(shiftId);
    const expectedCash = metrics.expected_cash;
    const variance = countedCash - expectedCash;

    // Get current attempt number
    const lastAttempt = await PosShiftReconciliation.findOne({ shift_id: shiftId })
      .sort({ reconciliation_attempt: -1 })
      .lean();
    const nextAttempt = (lastAttempt?.reconciliation_attempt || 0) + 1;

    const reconciliation = await PosShiftReconciliation.create({
      shift_id: shift._id,
      reconciliation_attempt: nextAttempt,
      counted_cash_amount: countedCash,
      expected_cash_amount: expectedCash,
      variance_amount: variance,
      counted_by: userId,
      status: 'submitted',
      reconciliation_notes: data.reconciliation_notes || null,
      reconciled_at: new Date(),
    });

    // Save denominations if present
    if (data.denominations && data.denominations.length > 0) {
      const denomDocs = data.denominations.map((d) => ({
        reconciliation_id: reconciliation._id,
        denomination_value: Number(d.denomination_value),
        quantity: Number(d.quantity),
        subtotal_amount: Number(d.denomination_value) * Number(d.quantity),
      }));
      await PosShiftReconciliationDenomination.insertMany(denomDocs);
    }

    return reconciliation;
  }

  static async listShiftReconciliations(shiftId: string) {
    if (!mongoose.isValidObjectId(shiftId)) throw new ApiError(400, 'Invalid shift ID');
    return PosShiftReconciliation.find({ shift_id: shiftId })
      .populate('counted_by', 'firstName lastName email')
      .populate('reviewed_by', 'firstName lastName email')
      .sort({ reconciliation_attempt: -1 })
      .lean();
  }

  static async getReconciliationById(reconciliationId: string) {
    if (!mongoose.isValidObjectId(reconciliationId)) throw new ApiError(400, 'Invalid reconciliation ID');
    const rec = await PosShiftReconciliation.findById(reconciliationId)
      .populate('shift_id', 'shift_number terminal_id opened_at closed_at status')
      .populate('counted_by', 'firstName lastName email')
      .populate('reviewed_by', 'firstName lastName email');
    if (!rec) throw new ApiError(404, 'Reconciliation record not found');

    const denominations = await PosShiftReconciliationDenomination.find({
      reconciliation_id: rec._id,
    }).sort({ denomination_value: -1 });

    return {
      ...rec.toObject(),
      denominations,
    };
  }

  static async reviewReconciliation(
    reconciliationId: string,
    action: 'approved' | 'rejected',
    notes: string | undefined,
    userId: string
  ) {
    if (!mongoose.isValidObjectId(reconciliationId)) throw new ApiError(400, 'Invalid reconciliation ID');
    const rec = await PosShiftReconciliation.findById(reconciliationId);
    if (!rec) throw new ApiError(404, 'Reconciliation record not found');

    if (rec.status === 'approved') {
      throw new ApiError(400, 'Approved reconciliations cannot be modified. Request a recount if needed.');
    }

    rec.status = action;
    rec.reviewed_by = new mongoose.Types.ObjectId(userId);
    rec.reviewed_at = new Date();
    if (notes) {
      rec.reconciliation_notes = rec.reconciliation_notes ? `${rec.reconciliation_notes} | Review: ${notes}` : notes;
    }
    await rec.save();
    return rec;
  }

  static async requestRecount(reconciliationId: string, reason: string, userId: string) {
    if (!mongoose.isValidObjectId(reconciliationId)) throw new ApiError(400, 'Invalid reconciliation ID');
    const rec = await PosShiftReconciliation.findById(reconciliationId);
    if (!rec) throw new ApiError(404, 'Reconciliation record not found');

    rec.status = 'recount_required';
    rec.reviewed_by = new mongoose.Types.ObjectId(userId);
    rec.reviewed_at = new Date();
    if (reason) {
      rec.reconciliation_notes = rec.reconciliation_notes ? `${rec.reconciliation_notes} | Recount reason: ${reason}` : reason;
    }
    await rec.save();
    return rec;
  }

  static async saveDenominationBreakdown(
    reconciliationId: string,
    denominations: Array<{ denomination_value: number; quantity: number }>
  ) {
    if (!mongoose.isValidObjectId(reconciliationId)) throw new ApiError(400, 'Invalid reconciliation ID');
    const rec = await PosShiftReconciliation.findById(reconciliationId);
    if (!rec) throw new ApiError(404, 'Reconciliation record not found');
    if (rec.status === 'approved') {
      throw new ApiError(400, 'Cannot alter denominations of an approved reconciliation');
    }

    let total = 0;
    for (const d of denominations) {
      const val = Number(d.denomination_value);
      const qty = Number(d.quantity);
      if (isNaN(val) || val <= 0) throw new ApiError(400, `Invalid denomination: ${d.denomination_value}`);
      if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) throw new ApiError(400, `Invalid quantity for ₹${val}`);
      total += val * qty;
    }

    if (Math.abs(total - rec.counted_cash_amount) > 0.01) {
      throw new ApiError(
        400,
        `Denomination total (₹${total.toFixed(2)}) does not match reconciliation counted cash amount (₹${rec.counted_cash_amount.toFixed(2)})`
      );
    }

    await PosShiftReconciliationDenomination.deleteMany({ reconciliation_id: rec._id });
    const docs = denominations.map((d) => ({
      reconciliation_id: rec._id,
      denomination_value: Number(d.denomination_value),
      quantity: Number(d.quantity),
      subtotal_amount: Number(d.denomination_value) * Number(d.quantity),
    }));
    return PosShiftReconciliationDenomination.insertMany(docs);
  }

  static async listDenominationCounts(reconciliationId: string) {
    if (!mongoose.isValidObjectId(reconciliationId)) throw new ApiError(400, 'Invalid reconciliation ID');
    return PosShiftReconciliationDenomination.find({ reconciliation_id: reconciliationId }).sort({
      denomination_value: -1,
    });
  }

  // ==========================================
  // 3C. PERIPHERAL DEVICES & ASSIGNMENTS (H. Tables 9, 10, 11)
  // ==========================================
  static async registerPeripheral(data: any, userId?: string) {
    if (!mongoose.isValidObjectId(data.restaurant_id) || !mongoose.isValidObjectId(data.branch_id)) {
      throw new ApiError(400, 'Invalid restaurant_id or branch_id format');
    }

    const branch = await Branch.findById(data.branch_id);
    if (!branch) throw new ApiError(404, 'Branch not found');

    // Terminal branch validation if assigned
    if (data.terminal_id) {
      if (!mongoose.isValidObjectId(data.terminal_id)) throw new ApiError(400, 'Invalid terminal_id format');
      const terminal = await PosTerminal.findOne({ _id: data.terminal_id, deleted_at: null });
      if (!terminal) throw new ApiError(404, 'POS Terminal not found');
      if (terminal.branch_id.toString() !== data.branch_id.toString()) {
        throw new ApiError(400, 'Terminal and peripheral must belong to the same branch');
      }
    }

    // IP validation for network devices
    if (data.connection_type === 'network') {
      if (!data.ip_address) {
        throw new ApiError(400, 'ip_address is required for network connection type');
      }
    }

    // Sanitize connection_config: ensure no plaintext passwords/secrets
    const sanitizedConfig = { ...(data.connection_config || {}) };
    delete sanitizedConfig.password;
    delete sanitizedConfig.secret;
    delete sanitizedConfig.apiKey;

    const peripheral = await PosPeripheral.create({
      restaurant_id: data.restaurant_id,
      branch_id: data.branch_id,
      terminal_id: data.terminal_id || null,
      device_name: data.device_name,
      device_type: data.device_type,
      connection_type: data.connection_type,
      manufacturer: data.manufacturer || null,
      model_number: data.model_number || null,
      device_identifier: data.device_identifier || null,
      ip_address: data.ip_address || null,
      port_number: data.port_number || null,
      connection_config: sanitizedConfig,
      status: data.status || 'active',
      connectivity_status: data.connectivity_status || 'unknown',
      created_by: userId || null,
    });

    // Create system diagnostic event
    await PosPeripheralEvent.create({
      peripheral_id: peripheral._id,
      terminal_id: peripheral.terminal_id || null,
      event_type: 'connected',
      severity: 'info',
      message: `Peripheral "${peripheral.device_name}" registered successfully`,
      occurred_at: new Date(),
    });

    return peripheral;
  }

  static async listPeripherals(query: any) {
    const filter: any = { deleted_at: null };
    if (query.branch_id && mongoose.isValidObjectId(query.branch_id)) filter.branch_id = query.branch_id;
    if (query.restaurant_id && mongoose.isValidObjectId(query.restaurant_id)) filter.restaurant_id = query.restaurant_id;
    if (query.terminal_id && mongoose.isValidObjectId(query.terminal_id)) filter.terminal_id = query.terminal_id;
    if (query.device_type) filter.device_type = query.device_type;
    if (query.status) filter.status = query.status;

    return PosPeripheral.find(filter)
      .populate('branch_id', 'name code')
      .populate('terminal_id', 'terminal_code name')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async getPeripheralById(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid peripheral ID');
    const peripheral = await PosPeripheral.findOne({ _id: id, deleted_at: null })
      .populate('branch_id', 'name code')
      .populate('terminal_id', 'terminal_code name')
      .populate('created_by', 'firstName lastName email');
    if (!peripheral) throw new ApiError(404, 'Peripheral device not found');
    return peripheral;
  }

  static async updatePeripheral(id: string, data: any) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid peripheral ID');
    const peripheral = await PosPeripheral.findOne({ _id: id, deleted_at: null });
    if (!peripheral) throw new ApiError(404, 'Peripheral device not found');

    if (data.terminal_id !== undefined) {
      if (data.terminal_id && mongoose.isValidObjectId(data.terminal_id)) {
        const terminal = await PosTerminal.findOne({ _id: data.terminal_id, deleted_at: null });
        if (!terminal) throw new ApiError(404, 'Assigned terminal not found');
        if (terminal.branch_id.toString() !== peripheral.branch_id.toString()) {
          throw new ApiError(400, 'Terminal and peripheral must belong to the same branch');
        }
        peripheral.terminal_id = new mongoose.Types.ObjectId(data.terminal_id);
      } else {
        peripheral.terminal_id = null;
      }
    }

    if (data.device_name !== undefined) peripheral.device_name = data.device_name;
    if (data.device_type !== undefined) peripheral.device_type = data.device_type;
    if (data.connection_type !== undefined) peripheral.connection_type = data.connection_type;
    if (data.manufacturer !== undefined) peripheral.manufacturer = data.manufacturer;
    if (data.model_number !== undefined) peripheral.model_number = data.model_number;
    if (data.device_identifier !== undefined) peripheral.device_identifier = data.device_identifier;
    if (data.ip_address !== undefined) peripheral.ip_address = data.ip_address;
    if (data.port_number !== undefined) peripheral.port_number = data.port_number;
    if (data.connection_config !== undefined) {
      const sanitized = { ...(data.connection_config || {}) };
      delete sanitized.password;
      delete sanitized.secret;
      delete sanitized.apiKey;
      peripheral.connection_config = sanitized;
    }

    await peripheral.save();
    return peripheral;
  }

  static async updatePeripheralStatus(id: string, status: string) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid peripheral ID');
    const peripheral = await PosPeripheral.findOne({ _id: id, deleted_at: null });
    if (!peripheral) throw new ApiError(404, 'Peripheral device not found');

    peripheral.status = status as any;
    await peripheral.save();

    await PosPeripheralEvent.create({
      peripheral_id: peripheral._id,
      terminal_id: peripheral.terminal_id || null,
      event_type: status === 'active' ? 'recovered' : 'disconnected',
      severity: status === 'active' ? 'info' : 'warning',
      message: `Peripheral status updated to "${status}"`,
      occurred_at: new Date(),
    });

    return peripheral;
  }

  static async deletePeripheral(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid peripheral ID');
    const peripheral = await PosPeripheral.findOne({ _id: id, deleted_at: null });
    if (!peripheral) throw new ApiError(404, 'Peripheral device not found');

    peripheral.deleted_at = new Date();
    peripheral.status = 'retired';
    await peripheral.save();

    // End any active assignments
    await PosPeripheralAssignment.updateMany(
      { peripheral_id: peripheral._id, unassigned_at: null },
      { $set: { unassigned_at: new Date() } }
    );

    return { success: true, message: `Peripheral "${peripheral.device_name}" soft-deleted successfully` };
  }

  // --- Assignments ---
  static async assignPeripheralToTerminal(
    peripheralId: string,
    data: { terminal_id: string; assignment_role?: string; is_primary?: boolean },
    userId?: string
  ) {
    if (!mongoose.isValidObjectId(peripheralId) || !mongoose.isValidObjectId(data.terminal_id)) {
      throw new ApiError(400, 'Invalid peripheral or terminal ID');
    }

    const [peripheral, terminal] = await Promise.all([
      PosPeripheral.findOne({ _id: peripheralId, deleted_at: null }),
      PosTerminal.findOne({ _id: data.terminal_id, deleted_at: null }),
    ]);

    if (!peripheral) throw new ApiError(404, 'Peripheral device not found');
    if (!terminal) throw new ApiError(404, 'POS Terminal not found');

    if (peripheral.branch_id.toString() !== terminal.branch_id.toString()) {
      throw new ApiError(400, 'Terminal and peripheral must belong to the same branch');
    }

    const role = (data.assignment_role || 'default_receipt') as any;
    const isPrimary = Boolean(data.is_primary);

    // If making primary, un-primary existing active primary assignment for this terminal & role
    if (isPrimary) {
      await PosPeripheralAssignment.updateMany(
        { terminal_id: terminal._id, assignment_role: role, is_primary: true, unassigned_at: null } as any,
        { $set: { is_primary: false } }
      );
    }

    const assignment = await PosPeripheralAssignment.create({
      peripheral_id: peripheral._id,
      terminal_id: terminal._id,
      assignment_role: role,
      is_primary: isPrimary,
      assigned_by: userId || null,
      assigned_at: new Date(),
    });

    // Also update terminal_id on peripheral if primary
    if (isPrimary) {
      peripheral.terminal_id = terminal._id;
      await peripheral.save();
    }

    await PosPeripheralEvent.create({
      peripheral_id: peripheral._id,
      terminal_id: terminal._id,
      event_type: 'connected',
      severity: 'info',
      message: `Assigned to terminal ${terminal.terminal_code} as ${role}${isPrimary ? ' (Primary)' : ''}`,
      occurred_at: new Date(),
    });

    return assignment;
  }

  static async listPeripheralAssignments(peripheralId: string) {
    if (!mongoose.isValidObjectId(peripheralId)) throw new ApiError(400, 'Invalid peripheral ID');
    return PosPeripheralAssignment.find({ peripheral_id: peripheralId })
      .populate('terminal_id', 'terminal_code name')
      .populate('assigned_by', 'firstName lastName email')
      .sort({ assigned_at: -1 })
      .lean();
  }

  static async endPeripheralAssignment(assignmentId: string) {
    if (!mongoose.isValidObjectId(assignmentId)) throw new ApiError(400, 'Invalid assignment ID');
    const assignment = await PosPeripheralAssignment.findById(assignmentId);
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    if (assignment.unassigned_at) throw new ApiError(400, 'Assignment has already ended');

    assignment.unassigned_at = new Date();
    await assignment.save();

    await PosPeripheralEvent.create({
      peripheral_id: assignment.peripheral_id,
      terminal_id: assignment.terminal_id,
      event_type: 'disconnected',
      severity: 'info',
      message: `Assignment ended for role ${assignment.assignment_role}`,
      occurred_at: new Date(),
    });

    return assignment;
  }

  // --- Diagnostics, Events & Heartbeat ---
  static async listPeripheralEvents(peripheralId: string) {
    if (!mongoose.isValidObjectId(peripheralId)) throw new ApiError(400, 'Invalid peripheral ID');
    return PosPeripheralEvent.find({ peripheral_id: peripheralId })
      .populate('terminal_id', 'terminal_code name')
      .sort({ occurred_at: -1 })
      .limit(50)
      .lean();
  }

  static async reportPeripheralHeartbeat(
    peripheralId: string,
    data: { connectivity_status?: string; last_error?: string; metadata?: any }
  ) {
    if (!mongoose.isValidObjectId(peripheralId)) throw new ApiError(400, 'Invalid peripheral ID');
    const peripheral = await PosPeripheral.findById(peripheralId);
    if (!peripheral) throw new ApiError(404, 'Peripheral device not found');

    const status = (data.connectivity_status || 'online') as any;
    peripheral.connectivity_status = status;
    peripheral.last_seen_at = new Date();
    if (data.last_error !== undefined) peripheral.last_error = data.last_error;
    await peripheral.save();

    if (data.last_error) {
      await PosPeripheralEvent.create({
        peripheral_id: peripheral._id,
        terminal_id: peripheral.terminal_id || null,
        event_type: 'error',
        severity: 'warning',
        message: data.last_error,
        event_metadata: data.metadata || {},
        occurred_at: new Date(),
      });
    }

    return peripheral;
  }

  static async getPeripheralHealth(peripheralId: string) {
    if (!mongoose.isValidObjectId(peripheralId)) throw new ApiError(400, 'Invalid peripheral ID');
    const peripheral = await PosPeripheral.findById(peripheralId)
      .populate('terminal_id', 'terminal_code name')
      .populate('branch_id', 'name code')
      .lean();
    if (!peripheral) throw new ApiError(404, 'Peripheral device not found');

    const recentEvents = await PosPeripheralEvent.find({ peripheral_id: peripheralId })
      .sort({ occurred_at: -1 })
      .limit(5)
      .lean();

    return {
      peripheral_id: peripheral._id,
      device_name: peripheral.device_name,
      device_type: peripheral.device_type,
      status: peripheral.status,
      connectivity_status: peripheral.connectivity_status,
      last_seen_at: peripheral.last_seen_at,
      last_error: peripheral.last_error,
      recent_events: recentEvents,
    };
  }

  // ==========================================
  // 4. POS TRANSACTIONS & PAYMENTS
  // ==========================================
  static async createPosSaleDraft(data: { branch_id: string; terminal_id: string; shift_id: string; transaction_type?: string; items?: any[]; notes?: string | null }, userId: string) {
    const txnNumber = `TXN-${Date.now().toString().slice(-8)}`;

    let subtotal = 0;
    const items = (data.items || []).map((i) => {
      const line_total = i.quantity * i.unit_price;
      subtotal += line_total;
      return {
        ...i,
        line_total,
      };
    });

    const tax_total = Math.round(subtotal * 0.05);
    const grand_total = subtotal + tax_total;

    return PosTransaction.create({
      branch_id: data.branch_id,
      terminal_id: data.terminal_id,
      shift_id: data.shift_id,
      transaction_number: txnNumber,
      transaction_type: (data.transaction_type || 'sale') as any,
      status: 'draft',
      subtotal,
      discount_total: 0,
      tax_total,
      service_charge: 0,
      rounding_amount: 0,
      grand_total,
      items,
      payments: [],
      notes: data.notes || null,
      created_by: userId,
    });
  }

  static async addPaymentToTransaction(transactionId: string, paymentData: { payment_method_type: string; amount: number; payment_reference?: string | null; provider_transaction_id?: string | null; currency?: string }, userId: string) {
    if (!mongoose.isValidObjectId(transactionId)) throw new ApiError(400, 'Invalid transaction ID');
    const txn = await PosTransaction.findById(transactionId);
    if (!txn) throw new ApiError(404, 'Transaction not found');

    if (txn.status === 'completed' || txn.status === 'cancelled' || txn.status === 'voided') {
      throw new ApiError(400, `Cannot add payment to a ${txn.status} transaction`);
    }

    const newPayment = {
      _id: new mongoose.Types.ObjectId(),
      payment_method_id: paymentData.payment_method_type,
      payment_method_type: paymentData.payment_method_type,
      payment_reference: paymentData.payment_reference || null,
      provider_transaction_id: paymentData.provider_transaction_id || null,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      status: 'completed' as const,
      paid_at: new Date(),
      received_by: new mongoose.Types.ObjectId(userId),
    };

    txn.payments.push(newPayment as any);

    // Sum paid amounts
    const totalPaid = txn.payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= txn.grand_total) {
      txn.status = 'completed';
      txn.completed_at = new Date();
    } else {
      txn.status = 'pending_payment';
    }

    await txn.save();
    return { transaction: txn, payment: newPayment };
  }

  static async completeTransaction(transactionId: string) {
    if (!mongoose.isValidObjectId(transactionId)) throw new ApiError(400, 'Invalid transaction ID');
    const txn = await PosTransaction.findById(transactionId);
    if (!txn) throw new ApiError(404, 'Transaction not found');

    // Idempotent completion check
    if (txn.status === 'completed') return txn;

    const totalPaid = txn.payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid < txn.grand_total) {
      throw new ApiError(
        400,
        `Cannot complete transaction. Paid: ₹${totalPaid}, Required: ₹${txn.grand_total}. Remaining balance: ₹${txn.grand_total - totalPaid}`
      );
    }

    txn.status = 'completed';
    txn.completed_at = new Date();
    await txn.save();
    return txn;
  }

  static async voidTransaction(transactionId: string, reason?: string) {
    if (!mongoose.isValidObjectId(transactionId)) throw new ApiError(400, 'Invalid transaction ID');
    const txn = await PosTransaction.findById(transactionId);
    if (!txn) throw new ApiError(404, 'Transaction not found');

    txn.status = 'voided';
    txn.voided_at = new Date();
    if (reason) txn.notes = `${txn.notes ? txn.notes + ' | ' : ''}Void Reason: ${reason}`;
    await txn.save();
    return txn;
  }

  // ==========================================
  // 5. SUMMARY METRICS & LEGACY APIS
  // ==========================================
  static async getSummaryCards(filters: PosSummaryFilter) {
    await this.seedDemoDataIfEmpty();
    const query: any = {};
    if (filters.restaurantId && mongoose.isValidObjectId(filters.restaurantId)) query.restaurantId = new mongoose.Types.ObjectId(filters.restaurantId);
    if (filters.branchId && mongoose.isValidObjectId(filters.branchId)) query.branchId = new mongoose.Types.ObjectId(filters.branchId);
    if (filters.terminalId) query.terminalId = filters.terminalId;
    if (filters.cashierId && mongoose.isValidObjectId(filters.cashierId)) query.cashierId = new mongoose.Types.ObjectId(filters.cashierId);

    const todayStart = getStartOfDay();
    const todayEnd = getEndOfDay();
    let dateQuery: any = { $gte: todayStart, $lte: todayEnd };
    if (filters.startDate || filters.endDate) {
      dateQuery = {};
      if (filters.startDate) dateQuery.$gte = getStartOfDay(new Date(filters.startDate));
      if (filters.endDate) dateQuery.$lte = getEndOfDay(new Date(filters.endDate));
    }

    const salesAgg = await PosOrder.aggregate([
      { $match: { ...query, createdAt: dateQuery, paymentStatus: 'PAID' } },
      { $group: { _id: null, totalSales: { $sum: '$total' }, orderCount: { $sum: 1 } } },
    ]);
    const todaysPosSales = salesAgg[0]?.totalSales || 0;
    const totalPosOrders = salesAgg[0]?.orderCount || 0;

    const pendingAgg = await PosOrder.aggregate([
      { $match: { ...query, createdAt: dateQuery, paymentStatus: 'PENDING' } },
      { $group: { _id: null, pendingAmount: { $sum: '$total' }, pendingCount: { $sum: 1 } } },
    ]);
    const pendingPayments = { amount: pendingAgg[0]?.pendingAmount || 0, count: pendingAgg[0]?.pendingCount || 0 };

    const terminalQuery: any = { status: { $in: ['active', 'ACTIVE', 'online', 'ONLINE'] }, deleted_at: null };
    if (filters.branchId && mongoose.isValidObjectId(filters.branchId)) terminalQuery.branch_id = new mongoose.Types.ObjectId(filters.branchId);
    const activeTerminals = await PosTerminal.countDocuments(terminalQuery);
    const totalTerminals = await PosTerminal.countDocuments({ deleted_at: null, ...(terminalQuery.branch_id ? { branch_id: terminalQuery.branch_id } : {}) });

    const openCashierShifts = await CashierShift.countDocuments({ status: 'open' });
    const shiftVarianceAgg = await CashierShift.aggregate([
      { $match: { status: 'closed', cash_variance: { $ne: null } } },
      { $group: { _id: null, totalVariance: { $sum: '$cash_variance' } } },
    ]);
    const cashVariance = shiftVarianceAgg[0]?.totalVariance || 0;

    return {
      todaysPosSales,
      totalPosOrders,
      activeTerminals: { active: activeTerminals, total: totalTerminals },
      openCashierShifts,
      pendingPayments,
      cashVariance,
      dateRange: { start: filters.startDate || formatDateToIso(todayStart), end: filters.endDate || formatDateToIso(todayEnd) },
    };
  }

  static async listTransactions(filters: PosTransactionFilter) {
    await this.seedDemoDataIfEmpty();
    const query: any = {};
    if (filters.restaurantId && mongoose.isValidObjectId(filters.restaurantId)) query.restaurantId = new mongoose.Types.ObjectId(filters.restaurantId);
    if (filters.branchId && mongoose.isValidObjectId(filters.branchId)) query.branchId = new mongoose.Types.ObjectId(filters.branchId);
    if (filters.terminalId) query.terminalId = filters.terminalId;
    if (filters.cashierId && mongoose.isValidObjectId(filters.cashierId)) query.cashierId = new mongoose.Types.ObjectId(filters.cashierId);
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod.toUpperCase();
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus.toUpperCase();

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = getStartOfDay(new Date(filters.startDate));
      if (filters.endDate) query.createdAt.$lte = getEndOfDay(new Date(filters.endDate));
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      query.$or = [
        { orderNumber: { $regex: s, $options: 'i' } },
        { cashierName: { $regex: s, $options: 'i' } },
        { terminalName: { $regex: s, $options: 'i' } },
        { 'items.name': { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const [transactions, total] = await Promise.all([
      PosOrder.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PosOrder.countDocuments(query),
    ]);

    return { transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ==========================================
  // 6. RECEIPT TEMPLATES (Table 12 - Section I)
  // ==========================================

  /**
   * POST /pos/receipt-templates
   * Create template
   */
  static async createReceiptTemplate(data: CreateReceiptTemplateInput, userId?: string) {
    if (!mongoose.isValidObjectId(data.restaurant_id)) {
      throw new ApiError(400, 'Invalid restaurant ID');
    }

    // Placeholders allowlist check
    validateTemplatePlaceholders(data.header_content);
    validateTemplatePlaceholders(data.body_template);
    validateTemplatePlaceholders(data.footer_content);

    // Sanitize HTML / template content
    const sanitizedHeader = sanitizeTemplateContent(data.header_content);
    const sanitizedBody = sanitizeTemplateContent(data.body_template);
    const sanitizedFooter = sanitizeTemplateContent(data.footer_content);

    const restaurantId = new mongoose.Types.ObjectId(data.restaurant_id);
    const branchId =
      data.branch_id && mongoose.isValidObjectId(data.branch_id)
        ? new mongoose.Types.ObjectId(data.branch_id)
        : null;
    const terminalId =
      data.terminal_id && mongoose.isValidObjectId(data.terminal_id)
        ? new mongoose.Types.ObjectId(data.terminal_id)
        : null;

    const isDefault = data.is_default || false;
    const status = data.status || 'draft';

    // Only one active default template should exist per applicable scope and template type
    if (isDefault && status === 'active') {
      await PosReceiptTemplate.updateMany(
        {
          restaurant_id: restaurantId,
          branch_id: branchId,
          template_type: data.template_type,
          is_default: true,
        },
        { $set: { is_default: false } }
      );
    }

    const template = await PosReceiptTemplate.create({
      restaurant_id: restaurantId,
      branch_id: branchId,
      terminal_id: terminalId,
      template_name: data.template_name,
      template_type: data.template_type,
      paper_width_mm: data.paper_width_mm || 80,
      header_content: sanitizedHeader,
      body_template: sanitizedBody,
      footer_content: sanitizedFooter,
      show_logo: data.show_logo !== undefined ? data.show_logo : true,
      show_tax_breakdown: data.show_tax_breakdown !== undefined ? data.show_tax_breakdown : true,
      show_cashier_name: data.show_cashier_name !== undefined ? data.show_cashier_name : true,
      show_terminal_code: data.show_terminal_code !== undefined ? data.show_terminal_code : true,
      show_customer_info: data.show_customer_info !== undefined ? data.show_customer_info : false,
      is_default: isDefault,
      version: 1,
      status: status,
      template_config: data.template_config || {},
      created_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null,
      updated_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null,
    });

    return template;
  }

  /**
   * GET /pos/receipt-templates
   * List templates
   */
  static async listReceiptTemplates(query: any) {
    const filter: any = { deleted_at: null };
    if (query.restaurant_id && mongoose.isValidObjectId(query.restaurant_id)) {
      filter.restaurant_id = new mongoose.Types.ObjectId(query.restaurant_id);
    }
    if (query.branch_id && mongoose.isValidObjectId(query.branch_id)) {
      filter.branch_id = new mongoose.Types.ObjectId(query.branch_id);
    }
    if (query.template_type) filter.template_type = query.template_type;
    if (query.status) filter.status = query.status;
    if (query.search && query.search.trim()) {
      filter.template_name = { $regex: query.search.trim(), $options: 'i' };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const [items, total] = await Promise.all([
      PosReceiptTemplate.find(filter)
        .populate('branch_id', 'name code')
        .sort({ is_default: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PosReceiptTemplate.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /pos/receipt-templates/:templateId
   * Get template
   */
  static async getReceiptTemplateById(templateId: string) {
    if (!mongoose.isValidObjectId(templateId)) {
      throw new ApiError(400, 'Invalid receipt template ID');
    }
    const template = await PosReceiptTemplate.findById(templateId)
      .populate('branch_id', 'name code')
      .populate('restaurant_id', 'name logo');
    if (!template || template.deleted_at) {
      throw new ApiError(404, 'Receipt template not found');
    }
    return template;
  }

  /**
   * PATCH /pos/receipt-templates/:templateId
   * Update draft/template settings
   * Rule: Updating an active template should create a new version or draft;
   * historical receipts should preserve the version used at issuance.
   */
  static async updateReceiptTemplate(templateId: string, data: UpdateReceiptTemplateInput, userId?: string) {
    if (!mongoose.isValidObjectId(templateId)) {
      throw new ApiError(400, 'Invalid receipt template ID');
    }

    const template = await PosReceiptTemplate.findById(templateId);
    if (!template || template.deleted_at) {
      throw new ApiError(404, 'Receipt template not found');
    }

    if (template.status === 'archived') {
      throw new ApiError(400, 'Cannot modify an archived receipt template. Duplicate it to create a new draft.');
    }

    // Placeholders & sanitization checks
    if (data.header_content !== undefined) {
      validateTemplatePlaceholders(data.header_content);
      data.header_content = sanitizeTemplateContent(data.header_content);
    }
    if (data.body_template !== undefined) {
      validateTemplatePlaceholders(data.body_template);
      data.body_template = sanitizeTemplateContent(data.body_template);
    }
    if (data.footer_content !== undefined) {
      validateTemplatePlaceholders(data.footer_content);
      data.footer_content = sanitizeTemplateContent(data.footer_content);
    }

    // If currently active, preserve this version and create a new draft with incremented version
    if (template.status === 'active') {
      const nextVersion = (template.version || 1) + 1;
      const newDraftData: any = {
        restaurant_id: template.restaurant_id,
        branch_id:
          data.branch_id !== undefined
            ? data.branch_id
              ? new mongoose.Types.ObjectId(data.branch_id)
              : null
            : template.branch_id,
        terminal_id: template.terminal_id,
        template_name: data.template_name || template.template_name,
        template_type: data.template_type || template.template_type,
        paper_width_mm: data.paper_width_mm || template.paper_width_mm,
        header_content: data.header_content !== undefined ? data.header_content : template.header_content,
        body_template: data.body_template !== undefined ? data.body_template : template.body_template,
        footer_content: data.footer_content !== undefined ? data.footer_content : template.footer_content,
        show_logo: data.show_logo !== undefined ? data.show_logo : template.show_logo,
        show_tax_breakdown:
          data.show_tax_breakdown !== undefined ? data.show_tax_breakdown : template.show_tax_breakdown,
        show_cashier_name:
          data.show_cashier_name !== undefined ? data.show_cashier_name : template.show_cashier_name,
        show_terminal_code:
          data.show_terminal_code !== undefined ? data.show_terminal_code : template.show_terminal_code,
        show_customer_info:
          data.show_customer_info !== undefined ? data.show_customer_info : template.show_customer_info,
        is_default: false,
        version: nextVersion,
        status: data.status === 'active' ? 'draft' : data.status || 'draft',
        template_config: data.template_config !== undefined ? data.template_config : template.template_config,
        created_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : template.created_by,
        updated_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null,
      };

      const newDraft = await PosReceiptTemplate.create(newDraftData);
      return newDraft;
    }

    // If currently draft, update in-place
    if (data.template_name !== undefined) template.template_name = data.template_name;
    if (data.template_type !== undefined) template.template_type = data.template_type;
    if (data.paper_width_mm !== undefined) template.paper_width_mm = data.paper_width_mm;
    if (data.header_content !== undefined) template.header_content = data.header_content;
    if (data.body_template !== undefined) template.body_template = data.body_template;
    if (data.footer_content !== undefined) template.footer_content = data.footer_content;
    if (data.show_logo !== undefined) template.show_logo = data.show_logo;
    if (data.show_tax_breakdown !== undefined) template.show_tax_breakdown = data.show_tax_breakdown;
    if (data.show_cashier_name !== undefined) template.show_cashier_name = data.show_cashier_name;
    if (data.show_terminal_code !== undefined) template.show_terminal_code = data.show_terminal_code;
    if (data.show_customer_info !== undefined) template.show_customer_info = data.show_customer_info;
    if (data.template_config !== undefined) template.template_config = data.template_config;
    if (data.is_default !== undefined) template.is_default = data.is_default;
    if (data.branch_id !== undefined) {
      template.branch_id = data.branch_id ? new mongoose.Types.ObjectId(data.branch_id) : null;
    }
    if (data.status !== undefined) template.status = data.status;

    if (userId && mongoose.isValidObjectId(userId)) {
      template.updated_by = new mongoose.Types.ObjectId(userId);
    }

    await template.save();
    return template;
  }

  /**
   * POST /pos/receipt-templates/:templateId/activate
   * Activate template version
   */
  static async activateReceiptTemplate(templateId: string, userId?: string) {
    if (!mongoose.isValidObjectId(templateId)) {
      throw new ApiError(400, 'Invalid receipt template ID');
    }
    const template = await PosReceiptTemplate.findById(templateId);
    if (!template || template.deleted_at) {
      throw new ApiError(404, 'Receipt template not found');
    }

    const scopeQuery: any = {
      _id: { $ne: template._id },
      restaurant_id: template.restaurant_id,
      branch_id: template.branch_id || null,
      template_type: template.template_type,
    };

    const existingActive = await PosReceiptTemplate.countDocuments({
      ...scopeQuery,
      status: 'active',
      deleted_at: null,
    });

    if (existingActive === 0) {
      template.is_default = true;
    }

    if (template.is_default) {
      await PosReceiptTemplate.updateMany(
        { ...scopeQuery, is_default: true },
        { $set: { is_default: false } }
      );
    }

    template.status = 'active';
    if (userId && mongoose.isValidObjectId(userId)) {
      template.updated_by = new mongoose.Types.ObjectId(userId);
    }
    await template.save();
    return template;
  }

  /**
   * POST /pos/receipt-templates/:templateId/duplicate
   * Duplicate template
   */
  static async duplicateReceiptTemplate(templateId: string, userId?: string) {
    if (!mongoose.isValidObjectId(templateId)) {
      throw new ApiError(400, 'Invalid receipt template ID');
    }
    const template = await PosReceiptTemplate.findById(templateId);
    if (!template || template.deleted_at) {
      throw new ApiError(404, 'Receipt template not found');
    }

    const duplicate = await PosReceiptTemplate.create({
      restaurant_id: template.restaurant_id,
      branch_id: template.branch_id,
      terminal_id: template.terminal_id,
      template_name: `${template.template_name} (Copy)`,
      template_type: template.template_type,
      paper_width_mm: template.paper_width_mm,
      header_content: template.header_content,
      body_template: template.body_template,
      footer_content: template.footer_content,
      show_logo: template.show_logo,
      show_tax_breakdown: template.show_tax_breakdown,
      show_cashier_name: template.show_cashier_name,
      show_terminal_code: template.show_terminal_code,
      show_customer_info: template.show_customer_info,
      is_default: false,
      version: 1,
      status: 'draft',
      template_config: template.template_config,
      created_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null,
    });

    return duplicate;
  }

  /**
   * POST /pos/receipt-templates/:templateId/preview
   * Render preview
   */
  static async previewReceiptTemplate(templateId: string, sampleData?: Record<string, any>) {
    if (!mongoose.isValidObjectId(templateId)) {
      throw new ApiError(400, 'Invalid receipt template ID');
    }
    const template = await PosReceiptTemplate.findById(templateId);
    if (!template || template.deleted_at) {
      throw new ApiError(404, 'Receipt template not found');
    }

    return renderReceiptPreview(template, sampleData);
  }

  /**
   * POST /pos/receipt-templates/:templateId/archive
   * Archive template
   */
  static async archiveReceiptTemplate(templateId: string, userId?: string) {
    if (!mongoose.isValidObjectId(templateId)) {
      throw new ApiError(400, 'Invalid receipt template ID');
    }
    const template = await PosReceiptTemplate.findById(templateId);
    if (!template || template.deleted_at) {
      throw new ApiError(404, 'Receipt template not found');
    }

    template.status = 'archived';
    template.is_default = false;
    if (userId && mongoose.isValidObjectId(userId)) {
      template.updated_by = new mongoose.Types.ObjectId(userId);
    }
    await template.save();
    return template;
  }

  /**
   * DELETE /pos/receipt-templates/:templateId
   * Delete eligible unused draft
   */
  static async deleteReceiptTemplate(templateId: string) {
    if (!mongoose.isValidObjectId(templateId)) {
      throw new ApiError(400, 'Invalid receipt template ID');
    }
    const template = await PosReceiptTemplate.findById(templateId);
    if (!template || template.deleted_at) {
      throw new ApiError(404, 'Receipt template not found');
    }

    if (template.status !== 'draft') {
      throw new ApiError(
        400,
        `Cannot delete a "${template.status}" template. Only unused draft receipt templates can be deleted.`
      );
    }

    const inUse = await PosTerminal.countDocuments({
      'settings.receipt_template_id': template._id,
      deleted_at: null,
    });
    if (inUse > 0) {
      throw new ApiError(
        400,
        'Cannot delete template because it is currently assigned to one or more POS terminals.'
      );
    }

    template.deleted_at = new Date();
    await template.save();
    return { success: true, message: 'Draft receipt template deleted successfully' };
  }

  // ==========================================
  // 7. BILL NUMBERING SERIES & ALLOCATIONS (Tables 13 & 14 - Section J)
  // ==========================================

  /**
   * POST /pos/bill-number-series
   * Create numbering series
   */
  static async createBillNumberSeries(data: CreateBillNumberSeriesInput, userId?: string) {
    if (!mongoose.isValidObjectId(data.restaurant_id)) {
      throw new ApiError(400, 'Invalid restaurant ID');
    }

    if (data.number_scope === 'terminal') {
      if (!data.terminal_id || !mongoose.isValidObjectId(data.terminal_id)) {
        throw new ApiError(400, 'Terminal-scoped bill numbering series must reference a valid terminal_id');
      }
    } else if (data.number_scope === 'branch') {
      if (!data.branch_id || !mongoose.isValidObjectId(data.branch_id)) {
        throw new ApiError(400, 'Branch-scoped bill numbering series must reference a valid branch_id');
      }
    }

    const docType = data.document_type || 'sale';

    // Prevent duplicate active series for the same effective scope and document type
    const duplicateQuery: any = {
      restaurant_id: new mongoose.Types.ObjectId(data.restaurant_id),
      document_type: docType,
      number_scope: data.number_scope,
      is_active: true,
      deleted_at: null,
    };
    if (data.number_scope === 'branch' && data.branch_id) {
      duplicateQuery.branch_id = new mongoose.Types.ObjectId(data.branch_id);
    } else if (data.number_scope === 'terminal' && data.terminal_id) {
      duplicateQuery.terminal_id = new mongoose.Types.ObjectId(data.terminal_id);
    }

    const existing = await PosBillNumberSeries.findOne(duplicateQuery);
    if (existing) {
      throw new ApiError(
        409,
        `An active series already exists for scope "${data.number_scope}" and document type "${docType}" (Series: "${existing.series_name}")`
      );
    }

    const series = await PosBillNumberSeries.create({
      restaurant_id: new mongoose.Types.ObjectId(data.restaurant_id),
      branch_id:
        data.branch_id && mongoose.isValidObjectId(data.branch_id)
          ? new mongoose.Types.ObjectId(data.branch_id)
          : null,
      terminal_id:
        data.terminal_id && mongoose.isValidObjectId(data.terminal_id)
          ? new mongoose.Types.ObjectId(data.terminal_id)
          : null,
      series_name: data.series_name,
      document_type: docType,
      prefix: data.prefix ?? '',
      suffix: data.suffix ?? '',
      number_scope: data.number_scope,
      reset_frequency: data.reset_frequency || 'never',
      minimum_digits: data.minimum_digits || 6,
      current_number: 0,
      last_reset_at: new Date(),
      is_active: true,
      created_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null,
    });

    return series;
  }

  /**
   * GET /pos/bill-number-series
   * List series
   */
  static async listBillNumberSeries(query: any) {
    const filter: any = { deleted_at: null };
    if (query.restaurant_id && mongoose.isValidObjectId(query.restaurant_id)) {
      filter.restaurant_id = new mongoose.Types.ObjectId(query.restaurant_id);
    }
    if (query.branch_id && mongoose.isValidObjectId(query.branch_id)) {
      filter.branch_id = new mongoose.Types.ObjectId(query.branch_id);
    }
    if (query.terminal_id && mongoose.isValidObjectId(query.terminal_id)) {
      filter.terminal_id = new mongoose.Types.ObjectId(query.terminal_id);
    }
    if (query.document_type) filter.document_type = query.document_type;
    if (query.number_scope) filter.number_scope = query.number_scope;
    if (query.is_active !== undefined) {
      filter.is_active = query.is_active === 'true' || query.is_active === true;
    }
    if (query.search && query.search.trim()) {
      filter.series_name = { $regex: query.search.trim(), $options: 'i' };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const [items, total] = await Promise.all([
      PosBillNumberSeries.find(filter)
        .populate('branch_id', 'name code')
        .populate('terminal_id', 'terminal_code terminal_name name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PosBillNumberSeries.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /pos/bill-number-series/:seriesId
   * Get series
   */
  static async getBillNumberSeriesById(seriesId: string) {
    if (!mongoose.isValidObjectId(seriesId)) {
      throw new ApiError(400, 'Invalid bill number series ID');
    }
    const series = await PosBillNumberSeries.findById(seriesId)
      .populate('branch_id', 'name code')
      .populate('terminal_id', 'terminal_code terminal_name name');
    if (!series || series.deleted_at) {
      throw new ApiError(404, 'Bill numbering series not found');
    }
    return series;
  }

  /**
   * PATCH /pos/bill-number-series/:seriesId
   * Update permitted settings (does NOT allow setting current_number)
   */
  static async updateBillNumberSeries(seriesId: string, data: UpdateBillNumberSeriesInput, userId?: string) {
    if (!mongoose.isValidObjectId(seriesId)) {
      throw new ApiError(400, 'Invalid bill number series ID');
    }
    const series = await PosBillNumberSeries.findById(seriesId);
    if (!series || series.deleted_at) {
      throw new ApiError(404, 'Bill numbering series not found');
    }

    if (data.series_name !== undefined) series.series_name = data.series_name;
    if (data.prefix !== undefined) series.prefix = data.prefix;
    if (data.suffix !== undefined) series.suffix = data.suffix;
    if (data.reset_frequency !== undefined) series.reset_frequency = data.reset_frequency;
    if (data.minimum_digits !== undefined) series.minimum_digits = data.minimum_digits;
    if (data.is_active !== undefined) series.is_active = data.is_active;

    await series.save();
    return series;
  }

  /**
   * POST /pos/bill-number-series/:seriesId/activate
   * Activate series
   */
  static async activateBillNumberSeries(seriesId: string, userId?: string) {
    if (!mongoose.isValidObjectId(seriesId)) {
      throw new ApiError(400, 'Invalid bill number series ID');
    }
    const series = await PosBillNumberSeries.findById(seriesId);
    if (!series || series.deleted_at) {
      throw new ApiError(404, 'Bill numbering series not found');
    }

    // Check duplicate active series
    const duplicateQuery: any = {
      _id: { $ne: series._id },
      restaurant_id: series.restaurant_id,
      document_type: series.document_type,
      number_scope: series.number_scope,
      is_active: true,
      deleted_at: null,
    };
    if (series.number_scope === 'branch' && series.branch_id) {
      duplicateQuery.branch_id = series.branch_id;
    } else if (series.number_scope === 'terminal' && series.terminal_id) {
      duplicateQuery.terminal_id = series.terminal_id;
    }

    const conflict = await PosBillNumberSeries.findOne(duplicateQuery);
    if (conflict) {
      throw new ApiError(
        409,
        `Cannot activate series. Another active series ("${conflict.series_name}") already exists for this effective scope and document type.`
      );
    }

    series.is_active = true;
    await series.save();
    return series;
  }

  /**
   * POST /pos/bill-number-series/:seriesId/deactivate
   * Deactivate series
   */
  static async deactivateBillNumberSeries(seriesId: string, userId?: string) {
    if (!mongoose.isValidObjectId(seriesId)) {
      throw new ApiError(400, 'Invalid bill number series ID');
    }
    const series = await PosBillNumberSeries.findById(seriesId);
    if (!series || series.deleted_at) {
      throw new ApiError(404, 'Bill numbering series not found');
    }

    series.is_active = false;
    await series.save();
    return series;
  }

  /**
   * POST /pos/bill-number-series/:seriesId/allocate
   * Allocate next bill number atomically using transactional locking
   */
  static async allocateBillNumber(
    seriesId: string,
    data: { terminal_id?: string | null; shift_id?: string | null; document_type?: string },
    userId?: string
  ) {
    if (!mongoose.isValidObjectId(seriesId)) {
      throw new ApiError(400, 'Invalid series ID');
    }

    const series = await PosBillNumberSeries.findById(seriesId);
    if (!series || series.deleted_at) {
      throw new ApiError(404, 'Bill numbering series not found');
    }

    if (!series.is_active) {
      throw new ApiError(400, 'Cannot allocate bill number from an inactive numbering series');
    }

    // Resolve terminal_id (Table 14 requires terminal_id NOT NULL)
    const rawTerminalId = data.terminal_id || (series.terminal_id ? series.terminal_id.toString() : null);
    if (!rawTerminalId || !mongoose.isValidObjectId(rawTerminalId)) {
      throw new ApiError(400, 'Terminal ID (terminal_id) is required for bill number allocation');
    }
    const terminalId = new mongoose.Types.ObjectId(rawTerminalId);

    const shiftId =
      data.shift_id && mongoose.isValidObjectId(data.shift_id)
        ? new mongoose.Types.ObjectId(data.shift_id)
        : null;

    // Reset sequence according to configured business timezone
    const timezone = await getBusinessTimezone(series.restaurant_id, series.branch_id);
    const needsReset = shouldResetSeries(series.last_reset_at, series.reset_frequency, timezone);

    let nextNumber: number;
    const now = new Date();

    if (needsReset) {
      // Atomically reset sequence to 1
      const updated = await PosBillNumberSeries.findOneAndUpdate(
        { _id: series._id, is_active: true },
        { $set: { current_number: 1, last_reset_at: now } },
        { new: true }
      );
      nextNumber = updated ? updated.current_number : 1;
    } else {
      // Atomically increment sequence counter
      const updated = await PosBillNumberSeries.findOneAndUpdate(
        { _id: series._id, is_active: true },
        { $inc: { current_number: 1 } },
        { new: true }
      );
      if (!updated) {
        throw new ApiError(500, 'Failed to atomically allocate bill sequence number');
      }
      nextNumber = updated.current_number;
    }

    const minDigits = series.minimum_digits || 6;
    const prefix = series.prefix || '';
    const suffix = series.suffix || '';
    const formatted_number = `${prefix}${String(nextNumber).padStart(minDigits, '0')}${suffix}`;

    // Create persistent allocation record
    const allocation = await PosBillNumberAllocation.create({
      series_id: series._id,
      restaurant_id: series.restaurant_id,
      branch_id: series.branch_id,
      terminal_id: terminalId,
      shift_id: shiftId,
      allocated_number: nextNumber,
      formatted_number,
      document_type: series.document_type || 'sale',
      status: 'reserved',
      allocated_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null,
      allocated_at: now,
    });

    return {
      allocation_id: allocation.id || allocation._id.toString(),
      series_id: series.id || series._id.toString(),
      allocated_number: nextNumber,
      formatted_number,
      document_type: series.document_type || 'sale',
      status: 'reserved',
      allocated_at: allocation.allocated_at,
    };
  }

  /**
   * GET /pos/bill-number-series/:seriesId/allocations
   * View number allocations
   */
  static async listSeriesAllocations(seriesId: string, query: any) {
    if (!mongoose.isValidObjectId(seriesId)) {
      throw new ApiError(400, 'Invalid series ID');
    }
    const filter: any = { series_id: new mongoose.Types.ObjectId(seriesId) };

    if (query.status) filter.status = query.status;
    if (query.terminal_id && mongoose.isValidObjectId(query.terminal_id)) {
      filter.terminal_id = new mongoose.Types.ObjectId(query.terminal_id);
    }
    if (query.shift_id && mongoose.isValidObjectId(query.shift_id)) {
      filter.shift_id = new mongoose.Types.ObjectId(query.shift_id);
    }
    if (query.search && query.search.trim()) {
      filter.formatted_number = { $regex: query.search.trim(), $options: 'i' };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const [items, total] = await Promise.all([
      PosBillNumberAllocation.find(filter)
        .populate('terminal_id', 'terminal_code terminal_name name')
        .populate('allocated_by', 'firstName lastName email')
        .sort({ allocated_at: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PosBillNumberAllocation.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /pos/bill-number-allocations/:allocationId
   * Get allocation details
   */
  static async getAllocationById(allocationId: string) {
    if (!mongoose.isValidObjectId(allocationId)) {
      throw new ApiError(400, 'Invalid allocation ID');
    }
    const allocation = await PosBillNumberAllocation.findById(allocationId)
      .populate('series_id')
      .populate('terminal_id', 'terminal_code terminal_name name')
      .populate('allocated_by', 'firstName lastName email')
      .populate('shift_id');
    if (!allocation) {
      throw new ApiError(404, 'Bill number allocation not found');
    }
    return allocation;
  }

  /**
   * PATCH /pos/bill-number-allocations/:allocationId/status
   * Update allocation status (issued, voided, failed)
   */
  static async updateAllocationStatus(
    allocationId: string,
    status: 'reserved' | 'issued' | 'voided' | 'failed',
    failureReason?: string,
    userId?: string
  ) {
    if (!mongoose.isValidObjectId(allocationId)) {
      throw new ApiError(400, 'Invalid allocation ID');
    }
    const allocation = await PosBillNumberAllocation.findById(allocationId);
    if (!allocation) {
      throw new ApiError(404, 'Allocation not found');
    }

    if (allocation.status === 'issued' && status === 'reserved') {
      throw new ApiError(400, 'An issued bill number cannot be reverted to reserved status.');
    }

    allocation.status = status;
    if (status === 'issued') {
      allocation.issued_at = new Date();
    } else if (status === 'voided' || status === 'failed') {
      allocation.failure_reason = failureReason || allocation.failure_reason;
      allocation.voided_at = new Date();
      if (userId && mongoose.isValidObjectId(userId)) {
        allocation.voided_by = new mongoose.Types.ObjectId(userId);
      }
    }

    await allocation.save();
    return allocation;
  }

  /**
   * DELETE /pos/bill-number-allocations/:allocationId
   * Rule: Do not delete issued or voided number allocations.
   */
  static async deleteAllocation(allocationId: string) {
    if (!mongoose.isValidObjectId(allocationId)) {
      throw new ApiError(400, 'Invalid allocation ID');
    }
    const allocation = await PosBillNumberAllocation.findById(allocationId);
    if (!allocation) {
      throw new ApiError(404, 'Allocation not found');
    }

    if (allocation.status === 'issued' || allocation.status === 'voided') {
      throw new ApiError(
        400,
        'Cannot delete issued or voided bill number allocations. Legal tax and invoice regulations require an immutable audit trail.'
      );
    }

    await PosBillNumberAllocation.findByIdAndDelete(allocationId);
    return { success: true, message: 'Unissued bill number allocation removed successfully' };
  }

  // ==========================================
  // 7. TERMINAL TRANSACTIONS (Table 15 - Section K)
  // ==========================================

  /**
   * POST /pos/transactions
   * Register a terminal transaction reference
   */
  static async registerTerminalTransaction(data: RegisterTerminalTransactionInput, userId?: string) {
    if (!mongoose.isValidObjectId(data.terminal_id)) {
      throw new ApiError(400, 'Invalid terminal_id format');
    }

    const terminal = await PosTerminal.findOne({ _id: data.terminal_id, deleted_at: null });
    if (!terminal) {
      throw new ApiError(404, 'POS Terminal not found');
    }

    // Uniqueness check for transaction_reference
    const existing = await PosTerminalTransaction.findOne({
      transaction_reference: data.transaction_reference.trim(),
    });
    if (existing) {
      throw new ApiError(409, `Transaction reference "${data.transaction_reference}" already exists`);
    }

    // Shift validation if provided
    let shiftId = null;
    if (data.shift_id) {
      if (!mongoose.isValidObjectId(data.shift_id)) {
        throw new ApiError(400, 'Invalid shift_id format');
      }
      const shift = await CashierShift.findById(data.shift_id);
      if (!shift) {
        throw new ApiError(404, 'Cashier shift not found');
      }
      shiftId = shift._id;
    } else {
      // Auto-associate with open cashier shift if active
      const openShift = await CashierShift.findOne({
        terminal_id: terminal._id,
        status: 'open',
      });
      if (openShift) {
        shiftId = openShift._id;
      }
    }

    // Bill allocation validation if provided
    let billAllocationId = null;
    if (data.bill_allocation_id) {
      if (!mongoose.isValidObjectId(data.bill_allocation_id)) {
        throw new ApiError(400, 'Invalid bill_allocation_id format');
      }
      const allocation = await PosBillNumberAllocation.findById(data.bill_allocation_id);
      if (!allocation) {
        throw new ApiError(404, 'Bill number allocation not found');
      }
      billAllocationId = allocation._id;
    }

    // Cashier user validation
    const cashierId = userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : terminal.created_by;
    if (!cashierId) {
      throw new ApiError(400, 'Cashier identity could not be verified');
    }

    const status = data.status || 'pending';
    const now = new Date();
    const startedAt = data.started_at ? new Date(data.started_at) : now;
    const completedAt = status === 'completed' ? (data.completed_at ? new Date(data.completed_at) : now) : null;

    const transaction = await PosTerminalTransaction.create({
      restaurant_id: terminal.restaurant_id || terminal.branch_id,
      branch_id: terminal.branch_id,
      terminal_id: terminal._id,
      shift_id: shiftId,
      cashier_id: cashierId,
      order_id: data.order_id && mongoose.isValidObjectId(data.order_id) ? new mongoose.Types.ObjectId(data.order_id) : null,
      payment_id: data.payment_id && mongoose.isValidObjectId(data.payment_id) ? new mongoose.Types.ObjectId(data.payment_id) : null,
      bill_allocation_id: billAllocationId,
      transaction_reference: data.transaction_reference.trim(),
      transaction_type: data.transaction_type,
      amount: data.amount,
      currency_code: data.currency_code.toUpperCase(),
      status,
      started_at: startedAt,
      completed_at: completedAt,
      failure_reason: data.failure_reason || null,
      metadata: data.metadata || {},
    });

    return transaction;
  }

  /**
   * GET /pos/transactions
   * Search transactions across authorized branches with filters and pagination
   */
  static async listTerminalTransactions(query: any) {
    await this.seedDemoDataIfEmpty();

    const filter: any = {};

    if (query.restaurant_id && mongoose.isValidObjectId(query.restaurant_id)) {
      filter.restaurant_id = new mongoose.Types.ObjectId(query.restaurant_id);
    }
    if (query.branch_id && mongoose.isValidObjectId(query.branch_id)) {
      filter.branch_id = new mongoose.Types.ObjectId(query.branch_id);
    } else if (query.branchId && mongoose.isValidObjectId(query.branchId)) {
      filter.branch_id = new mongoose.Types.ObjectId(query.branchId);
    }

    if (query.terminal_id && mongoose.isValidObjectId(query.terminal_id)) {
      filter.terminal_id = new mongoose.Types.ObjectId(query.terminal_id);
    } else if (query.terminalId && mongoose.isValidObjectId(query.terminalId)) {
      filter.terminal_id = new mongoose.Types.ObjectId(query.terminalId);
    }

    if (query.shift_id && mongoose.isValidObjectId(query.shift_id)) {
      filter.shift_id = new mongoose.Types.ObjectId(query.shift_id);
    } else if (query.shiftId && mongoose.isValidObjectId(query.shiftId)) {
      filter.shift_id = new mongoose.Types.ObjectId(query.shiftId);
    }

    if (query.cashier_id && mongoose.isValidObjectId(query.cashier_id)) {
      filter.cashier_id = new mongoose.Types.ObjectId(query.cashier_id);
    } else if (query.cashierId && mongoose.isValidObjectId(query.cashierId)) {
      filter.cashier_id = new mongoose.Types.ObjectId(query.cashierId);
    }

    if (query.transaction_type && query.transaction_type.trim()) {
      filter.transaction_type = query.transaction_type.trim().toLowerCase();
    }

    if (query.status && query.status.trim()) {
      filter.status = query.status.trim().toLowerCase();
    }

    const fromDate = query.from || query.startDate;
    const toDate = query.to || query.endDate;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { transaction_reference: { $regex: s, $options: 'i' } },
        { failure_reason: { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [rawTransactions, total] = await Promise.all([
      PosTerminalTransaction.find(filter)
        .populate('terminal_id', 'terminal_code name status branch_id')
        .populate('branch_id', 'name code')
        .populate('shift_id', 'shift_number opened_at status')
        .populate('cashier_id', 'firstName lastName email role')
        .populate('bill_allocation_id', 'allocated_number document_type series_id')
        .populate('order_id', 'items subtotal tax discount total paymentMethod paymentStatus orderStatus notes orderNumber table_number order_type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PosTerminalTransaction.countDocuments(filter),
    ]);

    // Enhance records with backward-compatible aliases for dashboard overview consumption
    const transactions = rawTransactions.map((tx: any) => {
      const orderObj = typeof tx.order_id === 'object' && tx.order_id !== null ? tx.order_id : null;
      const actualPaymentMethod =
        orderObj?.paymentMethod ||
        tx.metadata?.paymentMethod ||
        (tx.transaction_type || 'sale').toUpperCase();

      const cashierFullName = tx.cashier_id
        ? (`${tx.cashier_id.firstName || ''} ${tx.cashier_id.lastName || ''}`.trim() || tx.cashier_id.email || 'Cashier')
        : 'Cashier';

      return {
        ...tx,
        id: tx._id ? tx._id.toString() : tx.id,
        orderNumber: orderObj?.orderNumber || tx.metadata?.orderNumber || tx.transaction_reference,
        total: tx.amount,
        paymentMethod: actualPaymentMethod,
        paymentStatus:
          tx.status === 'completed'
            ? 'PAID'
            : tx.status === 'pending'
            ? 'PENDING'
            : tx.status === 'cancelled' || tx.status === 'reversed'
            ? 'REFUNDED'
            : tx.status.toUpperCase(),
        orderStatus:
          orderObj?.orderStatus ||
          (tx.status === 'completed' ? 'COMPLETED' : tx.status === 'pending' ? 'IN_PROGRESS' : 'CANCELLED'),
        items: orderObj?.items || [],
        order_type: orderObj?.order_type || tx.metadata?.order_type || 'dine_in',
        table_number: orderObj?.table_number || tx.metadata?.table_number || null,
        terminalId: tx.terminal_id?.terminal_code || tx.terminal_id?.name || 'TERMINAL',
        terminalName: tx.terminal_id?.name || 'Counter POS',
        cashierName: cashierFullName,
        shiftId: tx.shift_id?.shift_number || 'SHIFT-101',
      };
    });

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /pos/transactions/:transactionId
   * Get transaction details with related adjustments
   */
  static async getTerminalTransactionById(transactionId: string) {
    if (!mongoose.isValidObjectId(transactionId)) {
      throw new ApiError(400, 'Invalid transaction ID format');
    }

    const transaction = await PosTerminalTransaction.findById(transactionId)
      .populate('terminal_id', 'terminal_code name status branch_id')
      .populate('branch_id', 'name code restaurantId')
      .populate('shift_id', 'shift_number opened_at status')
      .populate('cashier_id', 'firstName lastName email role')
      .populate('bill_allocation_id', 'allocated_number document_type series_id');

    if (!transaction) {
      throw new ApiError(404, 'Terminal transaction not found');
    }

    // Fetch related adjustments
    const adjustments = await PosTransactionAdjustment.find({
      terminal_transaction_id: transaction._id,
    })
      .populate('requested_by', 'firstName lastName email role')
      .populate('approved_by', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    const txObj = transaction.toObject();
    return {
      ...txObj,
      adjustments,
    };
  }

  /**
   * PATCH /pos/transactions/:transactionId/status
   * Update permitted transaction state
   * Rule: completed transactions cannot simply be changed back to pending
   */
  static async updateTerminalTransactionStatus(
    transactionId: string,
    newStatus: string,
    failureReason?: string | null
  ) {
    if (!mongoose.isValidObjectId(transactionId)) {
      throw new ApiError(400, 'Invalid transaction ID format');
    }

    const transaction = await PosTerminalTransaction.findById(transactionId);
    if (!transaction) {
      throw new ApiError(404, 'Terminal transaction not found');
    }

    const currentStatus = transaction.status;

    // Enforce permitted status transitions
    if (currentStatus === 'completed') {
      if (newStatus === 'pending') {
        throw new ApiError(400, 'Invalid state transition: Completed transactions cannot be changed back to pending.');
      }
      if (newStatus === 'failed') {
        throw new ApiError(400, 'Invalid state transition: Completed transactions cannot be marked as failed.');
      }
    } else if (currentStatus === 'cancelled') {
      throw new ApiError(400, 'Invalid state transition: Cancelled transactions cannot have their status updated.');
    } else if (currentStatus === 'reversed') {
      throw new ApiError(400, 'Invalid state transition: Reversed transactions cannot have their status updated.');
    }

    transaction.status = newStatus as any;

    if (newStatus === 'completed') {
      transaction.completed_at = new Date();
    } else if (newStatus === 'failed') {
      transaction.failure_reason = failureReason || 'Transaction marked as failed by terminal';
    }

    await transaction.save();
    return transaction;
  }

  /**
   * GET /pos/transactions/:transactionId/adjustments
   * View related voids, refunds, and reversals
   */
  static async getTransactionAdjustments(transactionId: string) {
    if (!mongoose.isValidObjectId(transactionId)) {
      throw new ApiError(400, 'Invalid transaction ID format');
    }

    const transaction = await PosTerminalTransaction.findById(transactionId);
    if (!transaction) {
      throw new ApiError(404, 'Terminal transaction not found');
    }

    const adjustments = await PosTransactionAdjustment.find({
      terminal_transaction_id: transaction._id,
    })
      .populate('requested_by', 'firstName lastName email role')
      .populate('approved_by', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    return adjustments;
  }

  // ==========================================
  // 8. VOIDS, CANCELLATIONS, AND REVERSALS (Table 16 - Section L)
  // ==========================================

  /**
   * POST /pos/transactions/:transactionId/adjustments
   * Request void/cancel/refund/reversal
   * Server derives terminal_transaction_id, requested_by, requested_at, initial status (pending).
   * Approval fields are NEVER accepted from the requester.
   */
  static async requestTransactionAdjustment(
    transactionId: string,
    data: CreateTransactionAdjustmentInput,
    userId: string
  ) {
    if (!mongoose.isValidObjectId(transactionId)) {
      throw new ApiError(400, 'Invalid transaction ID format');
    }
    if (!mongoose.isValidObjectId(userId)) {
      throw new ApiError(400, 'Invalid requester user ID');
    }

    const transaction = await PosTerminalTransaction.findById(transactionId);
    if (!transaction) {
      throw new ApiError(404, 'Original terminal transaction not found');
    }

    // Retain cancelled/reversed transactions integrity
    if (transaction.status === 'cancelled' || transaction.status === 'reversed') {
      throw new ApiError(400, `Cannot adjust transaction "${transaction.transaction_reference}" because it is already ${transaction.status}.`);
    }

    // Idempotency check if idempotency_key is provided
    if (data.idempotency_key && data.idempotency_key.trim()) {
      const existingIdemp = await PosTransactionAdjustment.findOne({
        idempotency_key: data.idempotency_key.trim(),
      }).populate('requested_by approved_by', 'firstName lastName email role');
      if (existingIdemp) {
        return existingIdemp;
      }
    }

    // Rule: The requested amount must not exceed the eligible unadjusted amount.
    const activeAdjustments = await PosTransactionAdjustment.find({
      terminal_transaction_id: transaction._id,
      status: { $in: ['pending', 'approved', 'completed'] },
    });

    const alreadyAdjustedAmount = activeAdjustments.reduce((sum, adj) => sum + adj.amount, 0);
    const eligibleAmount = Math.max(0, transaction.amount - alreadyAdjustedAmount);

    if (data.amount > eligibleAmount) {
      throw new ApiError(
        400,
        `Requested adjustment amount (${data.amount.toFixed(2)}) exceeds eligible unadjusted amount (${eligibleAmount.toFixed(2)}). Total transaction amount: ${transaction.amount.toFixed(2)}, already adjusted/pending: ${alreadyAdjustedAmount.toFixed(2)}.`
      );
    }

    // Distinction check: Voids usually apply before final settlement, refunds after completed sale
    let initialNotes: string | null = null;
    if (data.adjustment_type === 'void' && transaction.status === 'completed') {
      initialNotes = 'Notice: Void requested on completed transaction before daily batch settlement';
    }

    // Append-only adjustment record
    const adjustment = await PosTransactionAdjustment.create({
      terminal_transaction_id: transaction._id,
      order_id: transaction.order_id || null,
      adjustment_type: data.adjustment_type,
      reason_code: data.reason_code.trim(),
      reason: data.reason.trim(),
      amount: data.amount,
      requested_by: new mongoose.Types.ObjectId(userId),
      approved_by: null,
      requested_at: new Date(),
      approved_at: null,
      status: 'pending',
      idempotency_key: data.idempotency_key ? data.idempotency_key.trim() : null,
      notes: initialNotes,
    });

    return PosTransactionAdjustment.findById(adjustment._id).populate(
      'requested_by',
      'firstName lastName email role'
    );
  }

  /**
   * GET /pos/adjustments/:adjustmentId
   * Get adjustment details
   */
  static async getAdjustmentById(adjustmentId: string) {
    if (!mongoose.isValidObjectId(adjustmentId)) {
      throw new ApiError(400, 'Invalid adjustment ID format');
    }

    const adjustment = await PosTransactionAdjustment.findById(adjustmentId)
      .populate('terminal_transaction_id')
      .populate('requested_by', 'firstName lastName email role')
      .populate('approved_by', 'firstName lastName email role');

    if (!adjustment) {
      throw new ApiError(404, 'Transaction adjustment not found');
    }

    return adjustment;
  }

  /**
   * POST /pos/adjustments/:adjustmentId/approve
   * Approve restricted adjustment
   * Rule: Users cannot approve their own adjustment when separation of duties is required.
   */
  static async approveAdjustment(adjustmentId: string, approverUserId: string) {
    if (!mongoose.isValidObjectId(adjustmentId)) {
      throw new ApiError(400, 'Invalid adjustment ID format');
    }
    if (!mongoose.isValidObjectId(approverUserId)) {
      throw new ApiError(400, 'Invalid approver user ID');
    }

    const adjustment = await PosTransactionAdjustment.findById(adjustmentId);
    if (!adjustment) {
      throw new ApiError(404, 'Transaction adjustment not found');
    }

    if (adjustment.status !== 'pending') {
      throw new ApiError(400, `Cannot approve adjustment with status "${adjustment.status}". Only "pending" adjustments can be approved.`);
    }

    // Enforce separation of duties: cannot approve own request
    if (adjustment.requested_by.toString() === approverUserId.toString()) {
      throw new ApiError(
        403,
        'Separation of duties violation: Cashiers and requesters cannot approve their own adjustment requests. A supervisor or manager must approve.'
      );
    }

    adjustment.status = 'approved';
    adjustment.approved_by = new mongoose.Types.ObjectId(approverUserId);
    adjustment.approved_at = new Date();
    await adjustment.save();

    return PosTransactionAdjustment.findById(adjustment._id)
      .populate('terminal_transaction_id')
      .populate('requested_by', 'firstName lastName email role')
      .populate('approved_by', 'firstName lastName email role');
  }

  /**
   * POST /pos/adjustments/:adjustmentId/reject
   * Reject adjustment
   * Rule: Rejected records must be retained.
   */
  static async rejectAdjustment(adjustmentId: string, reason?: string, userId?: string) {
    if (!mongoose.isValidObjectId(adjustmentId)) {
      throw new ApiError(400, 'Invalid adjustment ID format');
    }

    const adjustment = await PosTransactionAdjustment.findById(adjustmentId);
    if (!adjustment) {
      throw new ApiError(404, 'Transaction adjustment not found');
    }

    if (adjustment.status !== 'pending') {
      throw new ApiError(400, `Cannot reject adjustment with status "${adjustment.status}". Only "pending" adjustments can be rejected.`);
    }

    adjustment.status = 'rejected';
    if (reason && reason.trim()) {
      adjustment.notes = adjustment.notes
        ? `${adjustment.notes} | Rejected: ${reason.trim()}`
        : `Rejected: ${reason.trim()}`;
    }

    await adjustment.save();

    return PosTransactionAdjustment.findById(adjustment._id)
      .populate('terminal_transaction_id')
      .populate('requested_by', 'firstName lastName email role')
      .populate('approved_by', 'firstName lastName email role');
  }

  /**
   * POST /pos/adjustments/:adjustmentId/complete
   * Complete approved adjustment
   * Rule: An adjustment cannot be completed twice; use idempotency keys to protect retries.
   */
  static async completeAdjustment(
    adjustmentId: string,
    data: CompleteAdjustmentInput,
    _userId?: string
  ) {
    if (!mongoose.isValidObjectId(adjustmentId)) {
      throw new ApiError(400, 'Invalid adjustment ID format');
    }

    const adjustment = await PosTransactionAdjustment.findById(adjustmentId);
    if (!adjustment) {
      throw new ApiError(404, 'Transaction adjustment not found');
    }

    // Idempotency protection against duplicate completions
    if (adjustment.status === 'completed') {
      if (data.idempotency_key && adjustment.idempotency_key === data.idempotency_key.trim()) {
        return adjustment;
      }
      throw new ApiError(409, 'This adjustment has already been completed.');
    }

    if (adjustment.status !== 'approved') {
      throw new ApiError(
        400,
        `Cannot complete adjustment with status "${adjustment.status}". It must be approved before completion.`
      );
    }

    if (data.idempotency_key && data.idempotency_key.trim()) {
      adjustment.idempotency_key = data.idempotency_key.trim();
    }
    if (data.notes && data.notes.trim()) {
      adjustment.notes = adjustment.notes
        ? `${adjustment.notes} | ${data.notes.trim()}`
        : data.notes.trim();
    }

    adjustment.status = 'completed';
    await adjustment.save();

    // Side effect: Update parent transaction status if fully reversed/voided
    const parentTxn = await PosTerminalTransaction.findById(adjustment.terminal_transaction_id);
    if (parentTxn) {
      const allCompleted = await PosTransactionAdjustment.find({
        terminal_transaction_id: parentTxn._id,
        status: 'completed',
      });
      const totalCompletedAmount = allCompleted.reduce((s, a) => s + a.amount, 0);

      if (totalCompletedAmount >= parentTxn.amount) {
        if (adjustment.adjustment_type === 'void' || adjustment.adjustment_type === 'cancel') {
          parentTxn.status = 'cancelled';
        } else {
          parentTxn.status = 'reversed';
        }
        await parentTxn.save();
      }
    }

    return PosTransactionAdjustment.findById(adjustment._id)
      .populate('terminal_transaction_id')
      .populate('requested_by', 'firstName lastName email role')
      .populate('approved_by', 'firstName lastName email role');
  }

  /**
   * GET /pos/adjustments
   * Search adjustments by filters
   */
  static async listAdjustments(query: any) {
    await this.seedDemoDataIfEmpty();

    const filter: any = {};

    if (query.terminal_transaction_id && mongoose.isValidObjectId(query.terminal_transaction_id)) {
      filter.terminal_transaction_id = new mongoose.Types.ObjectId(query.terminal_transaction_id);
    }

    if (query.adjustment_type && query.adjustment_type.trim()) {
      filter.adjustment_type = query.adjustment_type.trim().toLowerCase();
    }

    if (query.status && query.status.trim()) {
      filter.status = query.status.trim().toLowerCase();
    }

    if (query.reason_code && query.reason_code.trim()) {
      filter.reason_code = query.reason_code.trim();
    }

    if (query.requested_by && mongoose.isValidObjectId(query.requested_by)) {
      filter.requested_by = new mongoose.Types.ObjectId(query.requested_by);
    }

    if (query.approved_by && mongoose.isValidObjectId(query.approved_by)) {
      filter.approved_by = new mongoose.Types.ObjectId(query.approved_by);
    }

    const fromDate = query.from || query.startDate;
    const toDate = query.to || query.endDate;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [adjustments, total] = await Promise.all([
      PosTransactionAdjustment.find(filter)
        .populate('terminal_transaction_id', 'transaction_reference transaction_type amount status currency_code')
        .populate('requested_by', 'firstName lastName email role')
        .populate('approved_by', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PosTransactionAdjustment.countDocuments(filter),
    ]);

    return {
      adjustments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // 9. AUDIT LOGS & TERMINAL ACTIVITY TRACKING (Table 18 - Section N)
  // ==========================================

  /**
   * Safe internal helper to append an audit log entry.
   * Append-only by design, redacting sensitive fields.
   */
  static async logAuditEvent(data: {
    restaurant_id?: any;
    branch_id?: any;
    terminal_id?: any;
    shift_id?: any;
    user_id?: any;
    action: string;
    entity_type: string;
    entity_id?: any;
    old_values?: any;
    new_values?: any;
    ip_address?: string | null;
    user_agent?: string | null;
    request_id?: string | null;
    outcome?: PosAuditOutcome;
    failure_reason?: string | null;
  }) {
    try {
      let restaurantId = data.restaurant_id;
      if (!restaurantId && data.branch_id && mongoose.isValidObjectId(data.branch_id)) {
        const branch = await Branch.findById(data.branch_id).select('restaurantId');
        if (branch) restaurantId = branch.restaurantId;
      }
      if (!restaurantId) {
        const defaultRest = await Restaurant.findOne().select('_id');
        if (defaultRest) restaurantId = defaultRest._id;
      }

      const cleanOld = data.old_values ? sanitizeAuditData(data.old_values) : null;
      const cleanNew = data.new_values ? sanitizeAuditData(data.new_values) : null;

      const log = await PosTerminalAuditLog.create({
        restaurant_id: restaurantId,
        branch_id: data.branch_id && mongoose.isValidObjectId(data.branch_id) ? data.branch_id : null,
        terminal_id: data.terminal_id && mongoose.isValidObjectId(data.terminal_id) ? data.terminal_id : null,
        shift_id: data.shift_id && mongoose.isValidObjectId(data.shift_id) ? data.shift_id : null,
        user_id: data.user_id && mongoose.isValidObjectId(data.user_id) ? data.user_id : null,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id || null,
        old_values: cleanOld,
        new_values: cleanNew,
        ip_address: data.ip_address || null,
        user_agent: data.user_agent || null,
        request_id: data.request_id || null,
        outcome: data.outcome || 'success',
        failure_reason: data.failure_reason || null,
      });

      return log;
    } catch (err: any) {
      console.error('Failed to append POS audit log:', err.message);
      return null;
    }
  }

  /**
   * Seed sample audit events if pos_terminal_audit_logs is empty
   */
  static async seedAuditLogsIfEmpty(): Promise<void> {
    const logCount = await PosTerminalAuditLog.countDocuments();
    if (logCount > 0) return;

    const restaurant = await Restaurant.findOne();
    const branch = await Branch.findOne();
    const terminal = await PosTerminal.findOne({ deleted_at: null });
    const shift = await CashierShift.findOne();
    const cashier = await User.findOne();

    if (!restaurant) return;

    const restId = restaurant._id;
    const branchId = branch?._id || null;
    const terminalId = terminal?._id || null;
    const shiftId = shift?._id || null;
    const userId = cashier?._id || null;

    const now = Date.now();

    await PosTerminalAuditLog.create([
      {
        restaurant_id: restId,
        branch_id: branchId,
        terminal_id: terminalId,
        shift_id: shiftId,
        user_id: userId,
        action: 'TERMINAL_REGISTERED',
        entity_type: 'pos_terminals',
        entity_id: terminalId,
        old_values: null,
        new_values: {
          terminal_code: terminal?.terminal_code || 'POS-01',
          name: terminal?.name || 'Counter Main POS 1',
          status: 'active',
        },
        ip_address: '192.168.1.50',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DalGharPOS/1.0.0',
        request_id: 'REQ-AUDIT-001-REG',
        outcome: 'success',
        createdAt: new Date(now - 8 * 3600 * 1000),
      },
      {
        restaurant_id: restId,
        branch_id: branchId,
        terminal_id: terminalId,
        shift_id: shiftId,
        user_id: userId,
        action: 'CASHIER_LOGIN',
        entity_type: 'pos_terminals',
        entity_id: terminalId,
        old_values: null,
        new_values: {
          cashier_id: userId?.toString(),
          session_started: new Date(now - 7 * 3600 * 1000).toISOString(),
        },
        ip_address: '192.168.1.50',
        user_agent: 'DalGharPOS-TerminalApp/1.0',
        request_id: 'REQ-AUDIT-002-LOGIN',
        outcome: 'success',
        createdAt: new Date(now - 7 * 3600 * 1000),
      },
      {
        restaurant_id: restId,
        branch_id: branchId,
        terminal_id: terminalId,
        shift_id: shiftId,
        user_id: userId,
        action: 'SHIFT_OPENED',
        entity_type: 'pos_cashier_shifts',
        entity_id: shiftId,
        old_values: null,
        new_values: {
          shift_number: shift?.shift_number || 'SHIFT-101',
          opening_float: 5000,
          status: 'open',
        },
        ip_address: '192.168.1.50',
        user_agent: 'DalGharPOS-TerminalApp/1.0',
        request_id: 'REQ-AUDIT-003-SHIFT-OPEN',
        outcome: 'success',
        createdAt: new Date(now - 6 * 3600 * 1000),
      },
      {
        restaurant_id: restId,
        branch_id: branchId,
        terminal_id: terminalId,
        shift_id: shiftId,
        user_id: userId,
        action: 'CASH_IN',
        entity_type: 'pos_cash_movements',
        entity_id: new mongoose.Types.ObjectId(),
        old_values: null,
        new_values: {
          movement_type: 'pay_in',
          amount: 1500,
          reason: 'Midday cash drawer float topup',
        },
        ip_address: '192.168.1.50',
        user_agent: 'DalGharPOS-TerminalApp/1.0',
        request_id: 'REQ-AUDIT-004-CASH-IN',
        outcome: 'success',
        createdAt: new Date(now - 4 * 3600 * 1000),
      },
      {
        restaurant_id: restId,
        branch_id: branchId,
        terminal_id: terminalId,
        shift_id: shiftId,
        user_id: userId,
        action: 'RECEIPT_TEMPLATE_UPDATED',
        entity_type: 'pos_receipt_templates',
        entity_id: new mongoose.Types.ObjectId(),
        old_values: {
          paper_width_mm: 58,
          show_tax_breakdown: false,
        },
        new_values: {
          paper_width_mm: 80,
          show_tax_breakdown: true,
        },
        ip_address: '192.168.1.10',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        request_id: 'REQ-AUDIT-005-TMPL-UPD',
        outcome: 'success',
        createdAt: new Date(now - 3 * 3600 * 1000),
      },
      {
        restaurant_id: restId,
        branch_id: branchId,
        terminal_id: terminalId,
        shift_id: shiftId,
        user_id: userId,
        action: 'TRANSACTION_VOIDED',
        entity_type: 'pos_terminal_transactions',
        entity_id: new mongoose.Types.ObjectId(),
        old_values: {
          status: 'pending',
          amount: 320,
        },
        new_values: {
          status: 'void',
          void_reason: 'Entered duplicate order items by mistake',
        },
        ip_address: '192.168.1.50',
        user_agent: 'DalGharPOS-TerminalApp/1.0',
        request_id: 'REQ-AUDIT-006-VOID',
        outcome: 'success',
        createdAt: new Date(now - 2 * 3600 * 1000),
      },
      {
        restaurant_id: restId,
        branch_id: branchId,
        terminal_id: terminalId,
        shift_id: shiftId,
        user_id: userId,
        action: 'DRAWER_RECONCILED',
        entity_type: 'pos_shift_reconciliations',
        entity_id: new mongoose.Types.ObjectId(),
        old_values: null,
        new_values: {
          system_expected_cash: 6500,
          counted_cash: 6500,
          discrepancy: 0,
          status: 'approved',
        },
        ip_address: '192.168.1.50',
        user_agent: 'DalGharPOS-TerminalApp/1.0',
        request_id: 'REQ-AUDIT-007-RECON',
        outcome: 'success',
        createdAt: new Date(now - 1 * 3600 * 1000),
      },
      {
        restaurant_id: restId,
        branch_id: branchId,
        terminal_id: terminalId,
        shift_id: shiftId,
        user_id: userId,
        action: 'SHIFT_CLOSED',
        entity_type: 'pos_cashier_shifts',
        entity_id: shiftId,
        old_values: {
          status: 'open',
        },
        new_values: {
          status: 'closed',
        },
        ip_address: '192.168.1.50',
        user_agent: 'DalGharPOS-TerminalApp/1.0',
        request_id: 'REQ-AUDIT-008-SHIFT-CLOSE',
        outcome: 'success',
        createdAt: new Date(now - 30 * 60 * 1000),
      },
    ]);
  }

  /**
   * Search audit logs with tenant scoping, flexible filters, and pagination
   */
  static async listAuditLogs(
    query: ListAuditLogsQueryInput & { [key: string]: any },
    tenantScope?: { restaurantId?: string; branchId?: string }
  ) {
    await this.seedAuditLogsIfEmpty();

    const filter: any = {};

    // Tenant scoping
    if (tenantScope?.restaurantId && mongoose.isValidObjectId(tenantScope.restaurantId)) {
      filter.restaurant_id = new mongoose.Types.ObjectId(tenantScope.restaurantId);
    } else if (query.restaurant_id && mongoose.isValidObjectId(query.restaurant_id)) {
      filter.restaurant_id = new mongoose.Types.ObjectId(query.restaurant_id);
    }

    if (tenantScope?.branchId && mongoose.isValidObjectId(tenantScope.branchId)) {
      filter.branch_id = new mongoose.Types.ObjectId(tenantScope.branchId);
    } else if (query.branch_id && mongoose.isValidObjectId(query.branch_id)) {
      filter.branch_id = new mongoose.Types.ObjectId(query.branch_id);
    }

    if (query.terminal_id && mongoose.isValidObjectId(query.terminal_id)) {
      filter.terminal_id = new mongoose.Types.ObjectId(query.terminal_id);
    }

    if (query.shift_id && mongoose.isValidObjectId(query.shift_id)) {
      filter.shift_id = new mongoose.Types.ObjectId(query.shift_id);
    }

    if (query.user_id && mongoose.isValidObjectId(query.user_id)) {
      filter.user_id = new mongoose.Types.ObjectId(query.user_id);
    }

    if (query.action && query.action.trim()) {
      filter.action = query.action.trim();
    }

    if (query.entity_type && query.entity_type.trim()) {
      filter.entity_type = query.entity_type.trim();
    }

    if (query.entity_id && query.entity_id.trim()) {
      if (mongoose.isValidObjectId(query.entity_id)) {
        filter.entity_id = new mongoose.Types.ObjectId(query.entity_id);
      } else {
        filter.entity_id = query.entity_id.trim();
      }
    }

    if (query.outcome && query.outcome.trim()) {
      filter.outcome = query.outcome.trim().toLowerCase();
    }

    const fromDate = query.from || (query as any).startDate;
    const toDate = query.to || (query as any).endDate;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      PosTerminalAuditLog.find(filter)
        .populate('terminal_id', 'terminal_code terminal_name name status branch_id')
        .populate('shift_id', 'shift_number status opened_at closed_at')
        .populate('user_id', 'firstName lastName email role name')
        .populate('branch_id', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PosTerminalAuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const formattedLogs = logs.map((log: any) => ({
      id: log._id ? log._id.toString() : log.id,
      restaurant_id: log.restaurant_id?._id || log.restaurant_id,
      branch_id: log.branch_id?._id || log.branch_id,
      terminal_id: log.terminal_id?._id || log.terminal_id,
      shift_id: log.shift_id?._id || log.shift_id,
      user_id: log.user_id?._id || log.user_id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      old_values: log.old_values || null,
      new_values: log.new_values || null,
      ip_address: log.ip_address || null,
      user_agent: log.user_agent || null,
      request_id: log.request_id || null,
      outcome: log.outcome,
      failure_reason: log.failure_reason || null,
      created_at: log.createdAt || log.created_at,
      terminal: log.terminal_id && typeof log.terminal_id === 'object' ? log.terminal_id : null,
      shift: log.shift_id && typeof log.shift_id === 'object' ? log.shift_id : null,
      user: log.user_id && typeof log.user_id === 'object' ? log.user_id : null,
      branch: log.branch_id && typeof log.branch_id === 'object' ? log.branch_id : null,
    }));

    return {
      data: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        totalPages,
      },
    };
  }

  /**
   * Get single audit log event by ID with tenant scope validation
   */
  static async getAuditLogById(
    id: string,
    tenantScope?: { restaurantId?: string; branchId?: string }
  ) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid audit log ID format');

    const log = await PosTerminalAuditLog.findById(id)
      .populate('terminal_id', 'terminal_code terminal_name name status branch_id')
      .populate('shift_id', 'shift_number status opened_at closed_at')
      .populate('user_id', 'firstName lastName email role name')
      .populate('branch_id', 'name code')
      .populate('restaurant_id', 'name code')
      .lean();

    if (!log) throw new ApiError(404, 'POS audit log event not found');

    if (tenantScope?.restaurantId && log.restaurant_id) {
      const rId = ((log.restaurant_id as any)._id || log.restaurant_id).toString();
      if (rId !== tenantScope.restaurantId.toString()) {
        throw new ApiError(403, 'Access denied to this audit log');
      }
    }

    if (tenantScope?.branchId && log.branch_id) {
      const bId = ((log.branch_id as any)._id || log.branch_id).toString();
      if (bId !== tenantScope.branchId.toString()) {
        throw new ApiError(403, 'Access denied to this audit log');
      }
    }

    return {
      id: (log as any)._id ? (log as any)._id.toString() : (log as any).id,
      restaurant_id: (log as any).restaurant_id?._id || (log as any).restaurant_id,
      branch_id: (log as any).branch_id?._id || (log as any).branch_id,
      terminal_id: (log as any).terminal_id?._id || (log as any).terminal_id,
      shift_id: (log as any).shift_id?._id || (log as any).shift_id,
      user_id: (log as any).user_id?._id || (log as any).user_id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      old_values: log.old_values || null,
      new_values: log.new_values || null,
      ip_address: log.ip_address || null,
      user_agent: log.user_agent || null,
      request_id: log.request_id || null,
      outcome: log.outcome,
      failure_reason: log.failure_reason || null,
      created_at: (log as any).createdAt || (log as any).created_at,
      terminal: log.terminal_id && typeof log.terminal_id === 'object' ? log.terminal_id : null,
      shift: log.shift_id && typeof log.shift_id === 'object' ? log.shift_id : null,
      user: log.user_id && typeof log.user_id === 'object' ? log.user_id : null,
      branch: log.branch_id && typeof log.branch_id === 'object' ? log.branch_id : null,
      restaurant: log.restaurant_id && typeof log.restaurant_id === 'object' ? log.restaurant_id : null,
    };
  }

  // ==========================================
  // 10. POS ORDER CREATION & LIFECYCLE
  // ==========================================
  static async createPosOrder(data: CreatePosOrderInput, userId?: string) {
    if (!mongoose.isValidObjectId(data.terminal_id)) {
      throw new ApiError(400, 'Invalid terminal_id format');
    }

    const terminal = await PosTerminal.findOne({ _id: data.terminal_id, deleted_at: null });
    if (!terminal) throw new ApiError(404, 'POS Terminal not found');

    // Terminal Authorization Check
    if (userId && mongoose.isValidObjectId(userId)) {
      const userDoc = await User.findById(userId);
      const userRole = (userDoc?.role || '').toUpperCase();
      const isElevated =
        userRole === 'SUPER_ADMIN' ||
        userRole === 'RESTAURANT_ADMIN' ||
        userRole === 'BRANCH_MANAGER';

      // Waiters can submit dine-in orders / KOTs from any active terminal in their branch
      const isWaiter = userRole === 'WAITER';

      if (!isElevated && !isWaiter) {
        // Verify assignment if not elevated or waiter
        const assignment = await PosTerminalAssignment.findOne({
          terminal_id: terminal._id,
          user_id: new mongoose.Types.ObjectId(userId),
          is_active: true,
          unassigned_at: null,
        });

        const totalAssignmentsForTerminal = await PosTerminalAssignment.countDocuments({
          terminal_id: terminal._id,
          is_active: true,
          unassigned_at: null,
        });

        // If the terminal has explicit active user assignments and this non-waiter user isn't assigned:
        if (totalAssignmentsForTerminal > 0 && !assignment) {
          // If terminal is not locked to specific users or user belongs to the same branch, allow or auto-assign
          const userBranchId = userDoc?.branchId?.toString();
          const terminalBranchId = terminal.branch_id?.toString();
          if (userBranchId && terminalBranchId && userBranchId !== terminalBranchId) {
            throw new ApiError(403, `User is not assigned or authorized to operate terminal ${terminal.terminal_code || terminal.name}`);
          }
        }
      }
    }

    let branchId = (data.branch_id && mongoose.isValidObjectId(data.branch_id))
      ? new mongoose.Types.ObjectId(data.branch_id)
      : terminal.branch_id;
    if (!branchId) {
      const defBranch = await Branch.findOne();
      if (defBranch) branchId = defBranch._id;
    }

    let restaurantId = (data.restaurant_id && mongoose.isValidObjectId(data.restaurant_id))
      ? new mongoose.Types.ObjectId(data.restaurant_id)
      : terminal.restaurant_id;
    if (!restaurantId && branchId) {
      const branch = await Branch.findById(branchId);
      if (branch) restaurantId = branch.restaurantId;
    }
    if (!restaurantId) {
      const defaultRest = await Restaurant.findOne();
      if (defaultRest) restaurantId = defaultRest._id;
    }

    // Resolve shift
    let shiftId = data.shift_id;
    if (!shiftId || !mongoose.isValidObjectId(shiftId)) {
      const currentShift = await CashierShift.findOne({
        terminal_id: terminal._id,
        status: 'open',
      });
      if (currentShift) {
        shiftId = currentShift._id.toString();
      } else {
        const anyOpenShift = await CashierShift.findOne({
          branch_id: branchId,
          status: 'open',
        });
        if (anyOpenShift) {
          shiftId = anyOpenShift._id.toString();
        }
      }
    }

    // Resolve cashier and role
    let cashierName = 'Cashier';
    let cashierIdObj: any = null;
    let userRole = '';
    if (userId && mongoose.isValidObjectId(userId)) {
      cashierIdObj = new mongoose.Types.ObjectId(userId);
      const user = await User.findById(userId);
      if (user) {
        cashierName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        userRole = user.role || '';
      }
    } else {
      const defaultUser = await User.findOne();
      if (defaultUser) {
        cashierIdObj = defaultUser._id;
        cashierName = defaultUser.name || defaultUser.email;
        userRole = defaultUser.role || '';
      }
    }

    // Check manager approval requirement:
    // If explicitly configured, or terminal is a WAITER terminal, or current operator is a WAITER
    const isWaiter = userRole.toUpperCase() === 'WAITER' || terminal.terminal_type === 'WAITER';
    const requiresApproval = Boolean(terminal.settings?.require_manager_approval) || isWaiter;
    const initialApprovalStatus = requiresApproval ? 'PENDING_APPROVAL' : 'NONE';
    const initialKitchenStatus = requiresApproval ? 'pending' : (data.kitchen_status || 'pending');

    // Generate unique order number
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

    const itemsWithRound = (data.items || []).map((itm: any) => ({
      ...itm,
      kot_round: itm.kot_round || 1,
      kitchenStatus: requiresApproval ? 'pending' : (itm.kitchenStatus || 'pending'),
    }));

    // Create order document
    const order: any = await PosOrder.create({
      orderNumber,
      restaurantId: restaurantId!,
      branchId,
      terminalId: terminal.terminal_code || terminal._id.toString(),
      terminalName: terminal.terminal_name || terminal.name || 'Main POS',
      cashierId: cashierIdObj,
      cashierName,
      shiftId: shiftId || 'SHIFT-01',
      table_number: data.table_number || null,
      customer_name: data.customer_name || null,
      customer_phone: data.customer_phone || null,
      customerId: data.customerId && mongoose.isValidObjectId(data.customerId) ? new mongoose.Types.ObjectId(data.customerId) : null,
      order_type: data.order_type || 'dine_in',
      kitchen_status: initialKitchenStatus,
      approval_status: initialApprovalStatus,
      approval_reason: requiresApproval ? 'Waiter Order - Awaiting Manager Review' : null,
      current_kot_round: 1,
      waiter_id: data.waiter_id && mongoose.isValidObjectId(data.waiter_id) ? new mongoose.Types.ObjectId(data.waiter_id) : (isWaiter ? cashierIdObj : null),
      waiter_name: data.waiter_name || (terminal.terminal_type === 'WAITER' ? cashierName : null),
      items: itemsWithRound,
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      total: data.total,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
      orderStatus: data.orderStatus,
      notes: data.notes || '',
    });

    // Also register corresponding PosTerminalTransaction for financial ledger compliance
    let terminalTxn: any = null;
    try {
      terminalTxn = await PosTerminalTransaction.create({
        restaurant_id: restaurantId!,
        branch_id: branchId,
        terminal_id: terminal._id,
        shift_id: shiftId && mongoose.isValidObjectId(shiftId) ? new mongoose.Types.ObjectId(shiftId) : null,
        cashier_id: cashierIdObj,
        order_id: order._id,
        transaction_reference: `TXN-${orderNumber}`,
        transaction_type: 'sale',
        amount: data.total,
        currency_code: 'INR',
        status: data.paymentStatus === 'PAID' ? 'completed' : 'pending',
        started_at: new Date(),
        completed_at: data.paymentStatus === 'PAID' ? new Date() : null,
        metadata: {
          orderNumber: order.orderNumber,
          paymentMethod: data.paymentMethod,
          table_number: data.table_number || null,
          order_type: data.order_type,
        },
      });
    } catch (txnErr: any) {
      console.warn('Could not register terminal transaction for order:', txnErr.message);
    }

    // Synchronize physical table status
    if (data.table_number) {
      if (data.paymentStatus === 'PAID' && data.orderStatus === 'COMPLETED') {
        await PosService.syncTableStatus(branchId, data.table_number, 'cleaning', cashierIdObj, 'pos', `Immediate paid order #${order.orderNumber} placed. Table moved to cleaning.`);
      } else {
        await PosService.syncTableStatus(branchId, data.table_number, 'occupied', cashierIdObj, 'pos', `Order #${order.orderNumber} placed. Table marked occupied.`);
      }
    }

    // Append to audit ledger
    await this.logAuditEvent({
      restaurant_id: restaurantId,
      branch_id: branchId,
      terminal_id: terminal._id,
      shift_id: shiftId && mongoose.isValidObjectId(shiftId) ? shiftId : null,
      user_id: cashierIdObj,
      action: 'ORDER_CREATED',
      entity_type: 'pos_orders',
      entity_id: order._id,
      new_values: {
        orderNumber: order.orderNumber,
        total: order.total,
        itemsCount: order.items.length,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      },
      outcome: 'success',
    });

    return {
      order,
      transaction: terminalTxn,
    };
  }

  static async getOrderById(orderId: string) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId).lean();
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId }).lean();
    }
    if (!order) throw new ApiError(404, 'POS Order not found');
    return order;
  }

  static async updateOrderStatus(orderId: string, data: UpdateOrderStatusInput, userId?: string) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId);
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId });
    }
    if (!order) throw new ApiError(404, 'POS Order not found');

    const prevStatus = order.orderStatus;
    if (data.orderStatus) order.orderStatus = data.orderStatus;
    if (data.paymentStatus) order.paymentStatus = data.paymentStatus;
    if (data.notes) order.notes = data.notes;

    await order.save();

    // Sync corresponding terminal transaction if exists
    if (order._id) {
      const txnStatus = order.paymentStatus === 'PAID' ? 'completed' : order.orderStatus === 'CANCELLED' ? 'cancelled' : 'pending';
      await PosTerminalTransaction.findOneAndUpdate(
        { order_id: order._id },
        { status: txnStatus, ...(txnStatus === 'completed' ? { completed_at: new Date() } : {}) }
      );
    }

    await this.logAuditEvent({
      restaurant_id: order.restaurantId,
      branch_id: order.branchId,
      user_id: userId,
      action: data.orderStatus === 'CANCELLED' ? 'ORDER_CANCELLED' : 'ORDER_STATUS_UPDATED',
      entity_type: 'pos_orders',
      entity_id: order._id,
      old_values: { orderStatus: prevStatus },
      new_values: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus },
      outcome: 'success',
    });

    // Synchronize physical table status
    if (order.table_number) {
      if (order.orderStatus === 'COMPLETED' || order.paymentStatus === 'PAID') {
        await PosService.syncTableStatus(order.branchId, order.table_number, 'cleaning', userId, 'pos', `Order #${order.orderNumber} ${order.orderStatus}. Table transitioned to cleaning.`);
      } else if (order.orderStatus === 'CANCELLED') {
        await PosService.syncTableStatus(order.branchId, order.table_number, 'available', userId, 'pos', `Order #${order.orderNumber} CANCELLED. Table released to available.`);
      }
    }

    return order;
  }

  /**
   * List POS Orders with full kitchen & service filters
   */
  static async listPosOrders(query: ListPosOrdersQueryInput) {
    const filter: any = {};
    if (query.restaurant_id && mongoose.isValidObjectId(query.restaurant_id)) {
      filter.restaurantId = new mongoose.Types.ObjectId(query.restaurant_id);
    }
    if (query.branch_id && mongoose.isValidObjectId(query.branch_id)) {
      filter.branchId = new mongoose.Types.ObjectId(query.branch_id);
    }
    if (query.terminal_id) {
      filter.terminalId = query.terminal_id;
    }
    if (query.kitchen_status) {
      const statuses = query.kitchen_status.split(',').map((s: string) => s.trim().toLowerCase());
      if (statuses.includes('pending')) {
        filter.$or = [
          { kitchen_status: { $in: statuses } },
          { kitchen_status: { $exists: false } },
          { kitchen_status: null },
        ];
      } else {
        filter.kitchen_status = { $in: statuses };
      }
    }
    if (query.order_type) {
      filter.order_type = query.order_type;
    }
    if (query.orderStatus) {
      filter.orderStatus = query.orderStatus;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.waiter_id) {
      filter.waiter_id = query.waiter_id;
    }
    if (query.customer_name) {
      filter.customer_name = { $regex: query.customer_name.trim(), $options: 'i' };
    }
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { orderNumber: { $regex: s, $options: 'i' } },
        { table_number: { $regex: s, $options: 'i' } },
        { customer_name: { $regex: s, $options: 'i' } },
        { customer_phone: { $regex: s, $options: 'i' } },
        { cashierName: { $regex: s, $options: 'i' } },
        { 'items.name': { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      PosOrder.find(filter)
        .populate('branchId', 'name code')
        .populate('cashierId', 'name email firstName lastName')
        .populate('waiter_id', 'name email firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PosOrder.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update Kitchen Preparation & Ready status
   */
  static async updateKitchenStatus(orderId: string, data: UpdateKitchenStatusInput, userId?: string) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId);
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId });
    }
    if (!order) throw new ApiError(404, 'POS Order not found');

    const prevKitchenStatus = order.kitchen_status;
    order.kitchen_status = data.kitchen_status;

    if (data.kitchen_status === 'preparing' && !order.prepared_at) {
      order.prepared_at = new Date();
    } else if (data.kitchen_status === 'ready' && !order.ready_at) {
      order.ready_at = new Date();
      if (order.items && order.items.length) {
        order.items.forEach((item: any) => {
          item.kitchenStatus = 'ready';
        });
      }
    } else if (data.kitchen_status === 'served') {
      if (!order.served_at) order.served_at = new Date();
      if (order.items && order.items.length) {
        order.items.forEach((item: any) => {
          item.kitchenStatus = 'ready';
        });
      }
      if (order.paymentStatus === 'PAID') {
        order.orderStatus = 'COMPLETED';
      }
    }

    if (data.itemStatuses && Array.isArray(data.itemStatuses)) {
      for (const is of data.itemStatuses) {
        if (order.items && order.items[is.itemIndex]) {
          order.items[is.itemIndex].kitchenStatus = is.kitchenStatus;
        }
      }
    }

    if (data.notes) {
      order.notes = order.notes ? `${order.notes} | ${data.notes}` : data.notes;
    }

    if (data.notify_waiter) {
      order.waiter_notified_at = new Date();
      order.waiter_notified_count = (order.waiter_notified_count || 0) + 1;
      order.markModified('waiter_notified_at');
    }

    order.markModified('kitchen_status');
    await order.save();

    await this.logAuditEvent({
      restaurant_id: order.restaurantId,
      branch_id: order.branchId,
      user_id: userId,
      action: `KITCHEN_STATUS_${data.kitchen_status.toUpperCase()}`,
      entity_type: 'pos_orders',
      entity_id: order._id,
      old_values: { kitchen_status: prevKitchenStatus },
      new_values: {
        kitchen_status: order.kitchen_status,
        prepared_at: order.prepared_at,
        ready_at: order.ready_at,
        served_at: order.served_at,
      },
      outcome: 'success',
    });

    // Synchronize physical table status
    if (order.table_number && (data.kitchen_status === 'served' || order.kitchen_status === 'served') && order.paymentStatus === 'PAID') {
      await PosService.syncTableStatus(order.branchId, order.table_number, 'cleaning', userId, 'kitchen', `All items served and bill paid for Order #${order.orderNumber}. Table transitioned to cleaning.`);
    }

    return order;
  }

  /**
   * Assign Waiter to order
   */
  static async assignWaiter(orderId: string, data: AssignWaiterInput, userId?: string) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId);
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId });
    }
    if (!order) throw new ApiError(404, 'POS Order not found');

    let waiterName = data.waiter_name;
    if (!waiterName && mongoose.isValidObjectId(data.waiter_id)) {
      const waiterUser = await User.findById(data.waiter_id);
      if (waiterUser) {
        waiterName = waiterUser.name || `${waiterUser.firstName || ''} ${waiterUser.lastName || ''}`.trim() || waiterUser.email;
      }
    }

    order.waiter_id = new mongoose.Types.ObjectId(data.waiter_id);
    order.waiter_name = waiterName || 'Waiter';
    if (data.notes) {
      order.notes = order.notes ? `${order.notes} | ${data.notes}` : data.notes;
    }

    await order.save();

    await this.logAuditEvent({
      restaurant_id: order.restaurantId,
      branch_id: order.branchId,
      user_id: userId,
      action: 'WAITER_ASSIGNED',
      entity_type: 'pos_orders',
      entity_id: order._id,
      new_values: { waiter_id: order.waiter_id, waiter_name: order.waiter_name },
      outcome: 'success',
    });

    return order;
  }

  /**
   * Update individual dish / item readiness status
   */
  static async updateOrderItemStatus(
    orderId: string,
    itemIndex: number,
    status: 'pending' | 'preparing' | 'ready',
    userId?: string
  ) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId);
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId });
    }
    if (!order) throw new ApiError(404, 'POS Order not found');
    if (!order.items || !order.items[itemIndex]) throw new ApiError(400, 'Invalid item index');

    order.items[itemIndex].kitchenStatus = status;

    // Check if all items ready
    const allReady = order.items.every((it: any) => it.kitchenStatus === 'ready');
    if (allReady && order.kitchen_status !== 'ready' && order.kitchen_status !== 'served') {
      order.kitchen_status = 'ready';
      if (!order.ready_at) order.ready_at = new Date();
    } else if (status === 'preparing' && order.kitchen_status === 'pending') {
      order.kitchen_status = 'preparing';
      if (!order.prepared_at) order.prepared_at = new Date();
    }

    await order.save();
    return order;
  }

  /**
   * Collect payment for pending/dine-in order
   */
  static async collectOrderPayment(orderId: string, data: CollectOrderPaymentInput, userId?: string) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId);
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId });
    }
    if (!order) throw new ApiError(404, 'POS Order not found');

    order.paymentMethod = data.paymentMethod;
    order.paymentStatus = 'PAID';
    if (order.kitchen_status === 'served') {
      order.orderStatus = 'COMPLETED';
    }
    if (data.notes) {
      order.notes = order.notes ? `${order.notes} | ${data.notes}` : data.notes;
    }

    await order.save();

    await PosTerminalTransaction.findOneAndUpdate(
      { order_id: order._id },
      {
        status: 'completed',
        completed_at: new Date(),
        $set: {
          'metadata.paymentMethod': data.paymentMethod,
          'metadata.tenderedAmount': data.tenderedAmount || order.total,
        },
      },
      { upsert: false }
    );

    await this.logAuditEvent({
      restaurant_id: order.restaurantId,
      branch_id: order.branchId,
      user_id: userId,
      action: 'ORDER_PAYMENT_COLLECTED',
      entity_type: 'pos_orders',
      entity_id: order._id,
      new_values: { paymentMethod: data.paymentMethod, paymentStatus: 'PAID', total: order.total },
      outcome: 'success',
    });

    // Synchronize physical table status: move to 'cleaning' if bill is settled
    if (order.table_number) {
      await PosService.syncTableStatus(
        order.branchId,
        order.table_number,
        'cleaning',
        userId,
        'pos',
        `Bill payment of ₹${order.total} settled via ${data.paymentMethod} for Order #${order.orderNumber}. Table automatically transitioned to cleaning.`
      );
    }

    return order;
  }

  /**
   * Helper: synchronize physical dining table status based on active POS orders
   */
  static async syncTableStatus(
    branchId: any,
    tableNumber: string | null | undefined,
    preferredStatusIfFree: 'cleaning' | 'available' | 'occupied' = 'cleaning',
    userId?: any,
    source: 'pos' | 'kitchen' | 'staff' | 'system' = 'pos',
    reasonNotes?: string
  ) {
    if (!tableNumber || !branchId) return;

    try {
      const trimmedTableNumber = tableNumber.trim();
      const table = await DiningTable.findOne({
        branch_id: branchId,
        table_number: { $regex: new RegExp(`^${trimmedTableNumber}$`, 'i') },
      });

      if (!table) return;

      // Check for any remaining unpaid or in-progress orders for this table
      const activeUnpaidCount = await PosOrder.countDocuments({
        branchId: table.branch_id,
        table_number: { $regex: new RegExp(`^${trimmedTableNumber}$`, 'i') },
        orderStatus: { $nin: ['COMPLETED', 'CANCELLED'] },
        paymentStatus: 'PENDING',
      });

      if (activeUnpaidCount > 0) {
        if (table.current_status !== 'occupied') {
          const prev = table.current_status;
          table.current_status = 'occupied';
          await table.save();

          await DiningTableStatusHistory.create({
            dining_table_id: table._id,
            restaurant_id: table.restaurant_id,
            branch_id: table.branch_id,
            previous_status: prev,
            new_status: 'occupied',
            source,
            notes: reasonNotes || `Active orders running on table ${tableNumber}. Table marked occupied.`,
            changed_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null,
          });
        }
      } else {
        // No active unpaid orders remain!
        if (table.current_status === 'occupied') {
          const prev = table.current_status;
          table.current_status = preferredStatusIfFree;
          await table.save();

          await DiningTableStatusHistory.create({
            dining_table_id: table._id,
            restaurant_id: table.restaurant_id,
            branch_id: table.branch_id,
            previous_status: prev,
            new_status: preferredStatusIfFree,
            source,
            notes:
              reasonNotes ||
              (preferredStatusIfFree === 'cleaning'
                ? `All orders completed / bill payment settled for table ${tableNumber}. Table transitioned to cleaning.`
                : `Table ${tableNumber} released. Transitioned to available.`),
            changed_by: userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null,
          });
        }
      }
    } catch (err: any) {
      console.warn(`[PosService.syncTableStatus] Failed to sync table ${tableNumber}:`, err.message);
    }
  }

  /**
   * Append items to an existing order as a new round / incremental KOT
   */
  static async appendOrderItems(orderId: string, data: AppendOrderItemsInput, userId?: string) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId);
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId });
    }
    if (!order) throw new ApiError(404, 'POS Order not found');

    if (order.orderStatus === 'COMPLETED' || order.orderStatus === 'CANCELLED') {
      throw new ApiError(400, `Cannot add items to a ${order.orderStatus} order`);
    }

    const nextRound = (order.current_kot_round || 1) + 1;
    order.current_kot_round = nextRound;

    // Check user and terminal setting for manager approval
    let requiresApproval = false;
    if (userId && mongoose.isValidObjectId(userId)) {
      const u = await User.findById(userId).select('role').lean();
      if (u?.role && u.role.toUpperCase() === 'WAITER') {
        requiresApproval = true;
      }
    }
    if (!requiresApproval && order.terminalId) {
      const term = await PosTerminal.findOne({
        $or: [{ terminal_code: order.terminalId }, { _id: mongoose.isValidObjectId(order.terminalId) ? order.terminalId : null }],
        deleted_at: null,
      });
      if (term?.settings?.require_manager_approval || term?.terminal_type === 'WAITER') {
        requiresApproval = true;
      }
    }

    const newItemsWithRound = data.items.map((itm: any) => ({
      ...itm,
      kot_round: nextRound,
      kitchenStatus: 'pending',
    }));

    order.items.push(...(newItemsWithRound as any));
    order.subtotal = Number(order.subtotal || 0) + Number(data.subtotal || 0);
    order.tax = Number(order.tax || 0) + Number(data.tax || 0);
    order.discount = Number(order.discount || 0) + Number(data.discount || 0);
    order.total = Number(order.total || 0) + Number(data.total || 0);

    if (requiresApproval) {
      order.approval_status = 'PENDING_APPROVAL';
      order.approval_reason = `Incremental KOT (Round #${nextRound}) Awaiting Manager Review`;
    } else {
      order.kitchen_status = 'pending';
    }

    if (data.notes) {
      order.notes = order.notes ? `${order.notes} | ${data.notes}` : data.notes;
    }

    await order.save();

    await this.logAuditEvent({
      restaurant_id: order.restaurantId,
      branch_id: order.branchId,
      user_id: userId,
      action: 'ORDER_ITEMS_APPENDED',
      entity_type: 'pos_orders',
      entity_id: order._id,
      new_values: {
        round: nextRound,
        newItemsCount: data.items.length,
        newTotal: order.total,
      },
      outcome: 'success',
    });

    return order;
  }

  /**
   * Manager approves order / KOT dispatch
   */
  static async approveOrder(orderId: string, data: ApproveOrderInput, managerUserId?: string) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId);
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId });
    }
    if (!order) throw new ApiError(404, 'POS Order not found');

    order.approval_status = 'APPROVED';
    order.approval_reason = data.notes || 'Approved by Manager';
    order.approved_by = managerUserId && mongoose.isValidObjectId(managerUserId) ? new mongoose.Types.ObjectId(managerUserId) : null;
    order.approved_at = new Date();
    order.kitchen_status = 'pending';

    await order.save();

    await this.logAuditEvent({
      restaurant_id: order.restaurantId,
      branch_id: order.branchId,
      user_id: managerUserId,
      action: 'ORDER_APPROVED',
      entity_type: 'pos_orders',
      entity_id: order._id,
      new_values: { approval_status: 'APPROVED' },
      outcome: 'success',
    });

    return order;
  }

  /**
   * Manager rejects order
   */
  static async rejectOrder(orderId: string, data: RejectOrderInput, managerUserId?: string) {
    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await PosOrder.findById(orderId);
    }
    if (!order) {
      order = await PosOrder.findOne({ orderNumber: orderId });
    }
    if (!order) throw new ApiError(404, 'POS Order not found');

    order.approval_status = 'REJECTED';
    order.approval_reason = data.reason;
    order.approved_by = managerUserId && mongoose.isValidObjectId(managerUserId) ? new mongoose.Types.ObjectId(managerUserId) : null;
    order.approved_at = new Date();
    order.orderStatus = 'CANCELLED';
    order.kitchen_status = 'cancelled';

    await order.save();

    if (order.table_number) {
      await PosService.syncTableStatus(order.branchId, order.table_number, 'available', managerUserId, 'system', `Order #${order.orderNumber} rejected by manager. Table released.`);
    }

    await this.logAuditEvent({
      restaurant_id: order.restaurantId,
      branch_id: order.branchId,
      user_id: managerUserId,
      action: 'ORDER_REJECTED',
      entity_type: 'pos_orders',
      entity_id: order._id,
      new_values: { approval_status: 'REJECTED', reason: data.reason },
      outcome: 'success',
    });

    return order;
  }
}


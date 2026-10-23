import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { PosService } from './pos.service.js';
import {
  createPosTerminalSchema,
  updatePosTerminalSchema,
  updateTerminalStatusSchema,
  listTerminalQuerySchema,
  createReceiptTemplateSchema,
  updateReceiptTemplateSchema,
  previewReceiptTemplateSchema,
  createBillNumberSeriesSchema,
  updateBillNumberSeriesSchema,
  allocateBillNumberSchema,
  updateBillAllocationStatusSchema,
  registerTerminalTransactionSchema,
  updateTerminalTransactionStatusSchema,
  createTransactionAdjustmentSchema,
  rejectAdjustmentSchema,
  completeAdjustmentSchema,
  listAuditLogsQuerySchema,
  createPosOrderSchema,
  updateOrderStatusSchema,
  updateKitchenStatusSchema,
  assignWaiterSchema,
  updateOrderItemStatusSchema,
  collectOrderPaymentSchema,
  listPosOrdersQuerySchema,
  appendOrderItemsSchema,
  approveOrderSchema,
  rejectOrderSchema,
} from './pos.validation.js';

export class PosController {
  // ==========================================
  // 1. TERMINAL MANAGEMENT (Exact User Specs)
  // ==========================================

  /**
   * POST /api/admin/pos/terminals
   * Register a POS terminal
   */
  static registerTerminal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = createPosTerminalSchema.parse(req.body);
      const terminal = await PosService.registerTerminal(data, req.user?.userId);
      res.status(201).json({
        success: true,
        data: terminal,
        message: 'POS terminal registered successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/pos/terminals
   * List terminals with filters and pagination
   */
  static listTerminals = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = listTerminalQuerySchema.parse(req.query);
      const result = await PosService.listTerminals(query);
      res.status(200).json({
        success: true,
        data: result.terminals,
        pagination: result.pagination,
        message: 'POS terminals retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/pos/terminals/:id
   * Get terminal details
   */
  static getTerminalById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const terminal = await PosService.getTerminalById(id);
      res.status(200).json({
        success: true,
        data: terminal,
        message: 'POS terminal details retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/admin/pos/terminals/:id
   * Update terminal name or configuration
   */
  static updateTerminal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = updatePosTerminalSchema.parse(req.body);
      const terminal = await PosService.updateTerminal(id, data);
      res.status(200).json({
        success: true,
        data: terminal,
        message: 'POS terminal updated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/admin/pos/terminals/:id/status
   * Activate, deactivate or mark for maintenance
   */
  static updateTerminalStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = updateTerminalStatusSchema.parse(req.body);
      const terminal = await PosService.updateTerminalStatus(id, data);
      res.status(200).json({
        success: true,
        data: terminal,
        message: `POS terminal status updated to ${terminal.status}`,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/admin/pos/terminals/:id
   * Soft-delete a terminal if eligible
   */
  static deleteTerminal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await PosService.deleteTerminal(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 2. SUMMARY METRICS & TRANSACTIONS
  // ==========================================

  /**
   * GET /api/pos/summary
   */
  static getSummaryCards = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId, branchId, startDate, endDate, terminalId, cashierId } = req.query as Record<string, string>;
      const summary = await PosService.getSummaryCards({
        restaurantId,
        branchId,
        startDate,
        endDate,
        terminalId,
        cashierId,
      });
      res.status(200).json({
        success: true,
        data: summary,
        message: 'POS summary metrics retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/pos/transactions
   */
  static listTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query as Record<string, any>;

      // Explicit legacy order cart view request
      if (q.view === 'orders' || q.orderStatus) {
        const result = await PosService.listTransactions({
          restaurantId: q.restaurantId,
          branchId: q.branchId,
          startDate: q.startDate,
          endDate: q.endDate,
          terminalId: q.terminalId,
          cashierId: q.cashierId,
          search: q.search,
          paymentMethod: q.paymentMethod,
          paymentStatus: q.paymentStatus,
          orderStatus: q.orderStatus,
          page: q.page ? parseInt(q.page, 10) : 1,
          limit: q.limit ? parseInt(q.limit, 10) : 20,
          sortBy: q.sortBy,
          sortOrder: q.sortOrder,
        });

        res.status(200).json({
          success: true,
          data: result.transactions,
          pagination: result.pagination,
          message: 'POS transactions retrieved successfully',
        });
        return;
      }

      // Authoritative Table 15 (pos_terminal_transactions)
      const result = await PosService.listTerminalTransactions(q);

      res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
        message: 'POS terminal transactions retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/pos/shifts
   */
  static listShifts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { branchId, terminalId, cashierId, status, page, limit } = req.query as Record<string, any>;
      const result = await PosService.listCashierShifts({
        branch_id: branchId,
        terminal_id: terminalId,
        cashier_id: cashierId,
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      res.status(200).json({
        success: true,
        data: result.shifts,
        pagination: result.pagination,
        message: 'POS cashier shifts retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 3. TERMINAL ASSIGNMENTS (Exact User Specs)
  // ==========================================

  /**
   * POST /api/admin/pos/terminal-assignments
   * Assign a user to a terminal
   */
  static assignUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { terminal_id, user_id } = req.body;
      const assignment = await PosService.assignUserToTerminal(terminal_id, user_id, req.user?.userId);
      res.status(201).json({
        success: true,
        data: assignment,
        message: 'User assigned to terminal successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/pos/terminal-assignments
   * List assignments
   */
  static listAssignments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { terminal_id, user_id, active_only } = req.query as Record<string, any>;
      const assignments = await PosService.listTerminalAssignments({
        terminal_id,
        user_id,
        active_only: active_only === 'true',
      });
      res.status(200).json({
        success: true,
        data: assignments,
        message: 'Terminal assignments retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/admin/pos/terminal-assignments/:id/unassign
   * End an assignment
   */
  static unassignUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const assignment = await PosService.unassignTerminal(id);
      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Terminal assignment ended successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 4. CASHIER SHIFTS (Exact User Specs)
  // ==========================================

  /**
   * POST /api/admin/pos/shifts/open
   * Open a cashier shift with opening cash
   */
  static openShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { branch_id, terminal_id, opening_cash, cashier_id } = req.body;
      const effectiveCashierId = cashier_id || req.user!.userId;
      const shift = await PosService.openCashierShift(
        branch_id,
        terminal_id,
        Number(opening_cash || 0),
        effectiveCashierId
      );
      res.status(201).json({
        success: true,
        data: shift,
        message: 'Cashier shift opened successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/pos/shifts/current
   * Get the current user's open shift
   */
  static getCurrentShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const terminalId = req.query.terminalId as string | undefined;
      const shift = await PosService.getCurrentOpenShift(req.user!.userId, terminalId);
      res.status(200).json({
        success: true,
        data: shift,
        message: shift ? 'Current open shift retrieved' : 'No open shift found',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/pos/shifts/:id/summary
   * Get shift totals & calculated expected cash
   */
  static getShiftSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const summary = await PosService.getShiftSummary(id);
      res.status(200).json({
        success: true,
        data: summary,
        message: 'Shift summary calculated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/admin/pos/shifts/:id/close
   * Close a shift and record counted cash & variance
   */
  static closeShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { counted_cash, closing_notes } = req.body;
      const shift = await PosService.closeCashierShift(
        id,
        Number(counted_cash || 0),
        closing_notes,
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        data: shift,
        message: 'Cashier shift closed successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 5. CASH MOVEMENTS (Exact User Specs)
  // ==========================================

  /**
   * POST /pos/shifts/:shiftId/cash-movements or POST /admin/pos/cash-movements
   * Record cash in, cash out, payout or petty cash
   */
  static recordCashMovement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shiftId = req.params.shiftId || req.body.shift_id;
      const { movement_type, amount, reason_code, reason, reference_number } = req.body;
      const movement = await PosService.recordCashMovement(
        {
          shift_id: shiftId,
          movement_type,
          amount: Number(amount),
          reason_code,
          reason,
          reference_number,
        },
        req.user!.userId
      );
      res.status(201).json({
        success: true,
        data: movement,
        message: 'Cash movement recorded successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/shifts/:shiftId/cash-movements or GET /pos/cash-movements
   * List cash movements
   */
  static listCashMovements = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawShiftId = req.params.shiftId || (req.query.shift_id as string);
      const shiftId = Array.isArray(rawShiftId) ? rawShiftId[0] : rawShiftId;
      const rawBranchId = req.query.branch_id as string;
      const branchId = Array.isArray(rawBranchId) ? rawBranchId[0] : rawBranchId;
      const movements = await PosService.listCashMovements(shiftId, branchId);
      res.status(200).json({
        success: true,
        data: movements,
        message: 'Cash movements retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/cash-movements/:movementId
   * Get single movement
   */
  static getMovement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const movementId = Array.isArray(req.params.movementId) ? req.params.movementId[0] : req.params.movementId;
      const movement = await PosService.getMovementById(movementId);
      res.status(200).json({
        success: true,
        data: movement,
        message: 'Cash movement retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/cash-movements/:movementId/approve
   * Approve cash movement
   */
  static approveMovement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const movementId = Array.isArray(req.params.movementId) ? req.params.movementId[0] : req.params.movementId;
      const movement = await PosService.approveCashMovement(movementId, req.user!.userId);
      res.status(200).json({
        success: true,
        data: movement,
        message: 'Cash movement approved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 5B. CASH RECONCILIATIONS (G. Tables 7 & 8)
  // ==========================================

  /**
   * POST /pos/shifts/:shiftId/reconciliations
   * Submit a reconciliation
   */
  static submitReconciliation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shiftId = Array.isArray(req.params.shiftId) ? req.params.shiftId[0] : req.params.shiftId;
      const { counted_cash_amount, reconciliation_notes, denominations } = req.body;
      const reconciliation = await PosService.submitReconciliation(
        shiftId,
        {
          counted_cash_amount: Number(counted_cash_amount),
          reconciliation_notes,
          denominations,
        },
        req.user!.userId
      );
      res.status(201).json({
        success: true,
        data: reconciliation,
        message: 'Cash reconciliation submitted successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/shifts/:shiftId/reconciliations
   * List reconciliation attempts for a shift
   */
  static listReconciliations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shiftId = Array.isArray(req.params.shiftId) ? req.params.shiftId[0] : req.params.shiftId;
      const reconciliations = await PosService.listShiftReconciliations(shiftId);
      res.status(200).json({
        success: true,
        data: reconciliations,
        message: 'Shift reconciliations retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/reconciliations/:reconciliationId
   * Get reconciliation by ID with denominations
   */
  static getReconciliation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.reconciliationId) ? req.params.reconciliationId[0] : req.params.reconciliationId;
      const reconciliation = await PosService.getReconciliationById(id);
      res.status(200).json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/reconciliations/:reconciliationId/review
   * Review reconciliation (approve or reject)
   */
  static reviewReconciliation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.reconciliationId) ? req.params.reconciliationId[0] : req.params.reconciliationId;
      const { status, notes } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be either "approved" or "rejected"' });
        return;
      }
      const updated = await PosService.reviewReconciliation(id, status, notes, req.user!.userId);
      res.status(200).json({
        success: true,
        data: updated,
        message: `Reconciliation ${status} successfully`,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/reconciliations/:reconciliationId/request-recount
   * Request recount
   */
  static requestRecount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.reconciliationId) ? req.params.reconciliationId[0] : req.params.reconciliationId;
      const { reason } = req.body;
      const updated = await PosService.requestRecount(id, reason, req.user!.userId);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Recount requested successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/reconciliations/:reconciliationId/denominations
   * Save denomination breakdown
   */
  static saveDenominations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.reconciliationId) ? req.params.reconciliationId[0] : req.params.reconciliationId;
      const { denominations } = req.body;
      const result = await PosService.saveDenominationBreakdown(id, denominations || []);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Denominations saved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/reconciliations/:reconciliationId/denominations
   * List denomination counts
   */
  static getDenominations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.reconciliationId) ? req.params.reconciliationId[0] : req.params.reconciliationId;
      const denominations = await PosService.listDenominationCounts(id);
      res.status(200).json({
        success: true,
        data: denominations,
        message: 'Denominations retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 5C. PERIPHERALS & HARDWARE (H. Tables 9, 10, 11)
  // ==========================================

  /**
   * POST /pos/peripherals
   * Register a new peripheral hardware device
   */
  static registerPeripheral = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const peripheral = await PosService.registerPeripheral(req.body, req.user?.userId);
      res.status(201).json({
        success: true,
        data: peripheral,
        message: 'Peripheral hardware device registered successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/peripherals
   * List peripheral hardware devices
   */
  static listPeripherals = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const peripherals = await PosService.listPeripherals(req.query);
      res.status(200).json({
        success: true,
        data: peripherals,
        message: 'Peripherals retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/peripherals/:peripheralId
   * Get peripheral device details
   */
  static getPeripheral = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const peripheral = await PosService.getPeripheralById(id);
      res.status(200).json({
        success: true,
        data: peripheral,
        message: 'Peripheral retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/peripherals/:peripheralId
   * Update peripheral device details
   */
  static updatePeripheral = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const updated = await PosService.updatePeripheral(id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Peripheral updated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/peripherals/:peripheralId/status
   * Activate, disable, or mark for maintenance
   */
  static updatePeripheralStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const { status } = req.body;
      const updated = await PosService.updatePeripheralStatus(id, status);
      res.status(200).json({
        success: true,
        data: updated,
        message: `Peripheral status updated to "${status}"`,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /pos/peripherals/:peripheralId
   * Soft-delete eligible device
   */
  static deletePeripheral = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const result = await PosService.deletePeripheral(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/peripherals/:peripheralId/assignments
   * Assign peripheral to terminal
   */
  static assignPeripheral = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const assignment = await PosService.assignPeripheralToTerminal(id, req.body, req.user?.userId);
      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Peripheral assigned to terminal successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/peripherals/:peripheralId/assignments
   * Get assignment history
   */
  static listPeripheralAssignments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const assignments = await PosService.listPeripheralAssignments(id);
      res.status(200).json({
        success: true,
        data: assignments,
        message: 'Peripheral assignments retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/peripheral-assignments/:assignmentId/end
   * End terminal peripheral assignment
   */
  static endPeripheralAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.assignmentId) ? req.params.assignmentId[0] : req.params.assignmentId;
      const assignment = await PosService.endPeripheralAssignment(id);
      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Peripheral assignment ended successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/peripherals/:peripheralId/events
   * Read device event diagnostics
   */
  static listPeripheralEvents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const events = await PosService.listPeripheralEvents(id);
      res.status(200).json({
        success: true,
        data: events,
        message: 'Device events retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/peripherals/:peripheralId/heartbeat
   * Report device heartbeat health
   */
  static reportPeripheralHeartbeat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const updated = await PosService.reportPeripheralHeartbeat(id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Heartbeat recorded successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/peripherals/:peripheralId/health
   * Get device health diagnostics
   */
  static getPeripheralHealth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.peripheralId) ? req.params.peripheralId[0] : req.params.peripheralId;
      const health = await PosService.getPeripheralHealth(id);
      res.status(200).json({
        success: true,
        data: health,
        message: 'Device health retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 6. POS TRANSACTIONS & PAYMENTS (Exact User Specs)
  // ==========================================

  /**
   * POST /api/admin/pos/transactions
   * Create a POS sale draft
   */
  static createTransaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const txn = await PosService.createPosSaleDraft(req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        data: txn,
        message: 'POS transaction draft created successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/admin/pos/transactions/:id/payments
   * Add a payment to a transaction (supports split payments)
   */
  static addPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await PosService.addPaymentToTransaction(id, req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Payment recorded successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/admin/pos/transactions/:id/complete
   * Complete the sale after payment requirements are met (idempotent)
   */
  static completeTransaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const txn = await PosService.completeTransaction(id);
      res.status(200).json({
        success: true,
        data: txn,
        message: 'POS transaction completed successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/admin/pos/transactions/:id/void
   * Void a transaction under authorization rules
   */
  static voidTransaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const txn = await PosService.voidTransaction(id, req.body.reason);
      res.status(200).json({
        success: true,
        data: txn,
        message: 'POS transaction voided successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 7. RECEIPT TEMPLATES (Table 12 - Section I)
  // ==========================================

  /**
   * POST /pos/receipt-templates
   * Create template
   */
  static createReceiptTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = createReceiptTemplateSchema.parse(req.body);
      const template = await PosService.createReceiptTemplate(data, req.user?.userId);
      res.status(201).json({
        success: true,
        data: template,
        message: 'Receipt template created successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/receipt-templates
   * List templates
   */
  static listReceiptTemplates = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await PosService.listReceiptTemplates(req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        message: 'Receipt templates retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/receipt-templates/:templateId
   * Get template
   */
  static getReceiptTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
      const template = await PosService.getReceiptTemplateById(id);
      res.status(200).json({
        success: true,
        data: template,
        message: 'Receipt template retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/receipt-templates/:templateId
   * Update draft/template settings
   */
  static updateReceiptTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
      const data = updateReceiptTemplateSchema.parse(req.body);
      const updated = await PosService.updateReceiptTemplate(id, data, req.user?.userId);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Receipt template updated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/receipt-templates/:templateId/activate
   * Activate template version
   */
  static activateReceiptTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
      const activated = await PosService.activateReceiptTemplate(id, req.user?.userId);
      res.status(200).json({
        success: true,
        data: activated,
        message: 'Receipt template version activated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/receipt-templates/:templateId/duplicate
   * Duplicate template
   */
  static duplicateReceiptTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
      const duplicate = await PosService.duplicateReceiptTemplate(id, req.user?.userId);
      res.status(201).json({
        success: true,
        data: duplicate,
        message: 'Receipt template duplicated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/receipt-templates/:templateId/preview
   * Render preview
   */
  static previewReceiptTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
      const data = previewReceiptTemplateSchema.parse(req.body);
      const preview = await PosService.previewReceiptTemplate(id, data.sample_data);
      res.status(200).json({
        success: true,
        data: preview,
        message: 'Receipt template preview rendered successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/receipt-templates/:templateId/archive
   * Archive template
   */
  static archiveReceiptTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
      const archived = await PosService.archiveReceiptTemplate(id, req.user?.userId);
      res.status(200).json({
        success: true,
        data: archived,
        message: 'Receipt template archived successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /pos/receipt-templates/:templateId
   * Delete eligible unused draft
   */
  static deleteReceiptTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
      const result = await PosService.deleteReceiptTemplate(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 8. BILL NUMBERING SERIES & ALLOCATIONS (Tables 13 & 14 - Section J)
  // ==========================================

  /**
   * POST /pos/bill-number-series
   * Create numbering series
   */
  static createBillNumberSeries = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = createBillNumberSeriesSchema.parse(req.body);
      const series = await PosService.createBillNumberSeries(data, req.user?.userId);
      res.status(201).json({
        success: true,
        data: series,
        message: 'Bill numbering series created successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/bill-number-series
   * List series
   */
  static listBillNumberSeries = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await PosService.listBillNumberSeries(req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        message: 'Bill numbering series retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/bill-number-series/:seriesId
   * Get series
   */
  static getBillNumberSeries = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId;
      const series = await PosService.getBillNumberSeriesById(id);
      res.status(200).json({
        success: true,
        data: series,
        message: 'Bill numbering series retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/bill-number-series/:seriesId
   * Update permitted settings
   */
  static updateBillNumberSeries = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId;
      const data = updateBillNumberSeriesSchema.parse(req.body);
      const updated = await PosService.updateBillNumberSeries(id, data, req.user?.userId);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Bill numbering series updated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/bill-number-series/:seriesId/activate
   * Activate series
   */
  static activateBillNumberSeries = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId;
      const activated = await PosService.activateBillNumberSeries(id, req.user?.userId);
      res.status(200).json({
        success: true,
        data: activated,
        message: 'Bill numbering series activated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/bill-number-series/:seriesId/deactivate
   * Deactivate series
   */
  static deactivateBillNumberSeries = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId;
      const deactivated = await PosService.deactivateBillNumberSeries(id, req.user?.userId);
      res.status(200).json({
        success: true,
        data: deactivated,
        message: 'Bill numbering series deactivated successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/bill-number-series/:seriesId/allocations
   * View number allocations
   */
  static listSeriesAllocations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId;
      const result = await PosService.listSeriesAllocations(id, req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        message: 'Bill number allocations retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/bill-number-allocations/:allocationId
   * Get allocation details
   */
  static getAllocation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.allocationId)
        ? req.params.allocationId[0]
        : req.params.allocationId;
      const allocation = await PosService.getAllocationById(id);
      res.status(200).json({
        success: true,
        data: allocation,
        message: 'Bill number allocation retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/bill-number-series/:seriesId/allocate
   * Allocate next bill number
   */
  static allocateBillNumber = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId;
      const data = allocateBillNumberSchema.parse(req.body);
      const allocated = await PosService.allocateBillNumber(id, data, req.user?.userId);
      res.status(200).json({
        success: true,
        message: 'Bill number allocated successfully',
        data: allocated,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/bill-number-allocations/:allocationId/status
   * Update allocation status
   */
  static updateAllocationStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.allocationId)
        ? req.params.allocationId[0]
        : req.params.allocationId;
      const data = updateBillAllocationStatusSchema.parse(req.body);
      const updated = await PosService.updateAllocationStatus(
        id,
        data.status,
        data.failure_reason ?? undefined,
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        data: updated,
        message: `Bill number allocation marked as "${data.status}"`,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /pos/bill-number-allocations/:allocationId
   * Delete eligible unissued allocation
   */
  static deleteAllocation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.allocationId)
        ? req.params.allocationId[0]
        : req.params.allocationId;
      const result = await PosService.deleteAllocation(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 7. TERMINAL TRANSACTIONS (Table 15 - Section K)
  // ==========================================

  /**
   * POST /pos/transactions
   * Register a terminal transaction reference
   */
  static registerTerminalTransaction = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = registerTerminalTransactionSchema.parse(req.body);
      const transaction = await PosService.registerTerminalTransaction(data, req.user?.userId);
      res.status(201).json({
        success: true,
        data: transaction,
        message: 'POS terminal transaction registered successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/transactions/:transactionId
   * Get transaction details
   */
  static getTerminalTransactionById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.transactionId)
        ? req.params.transactionId[0]
        : req.params.transactionId;
      const transaction = await PosService.getTerminalTransactionById(id);
      res.status(200).json({
        success: true,
        data: transaction,
        message: 'Transaction details retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/terminals/:terminalId/transactions
   * View terminal-wise transactions
   */
  static getTerminalWiseTransactions = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const terminalId = Array.isArray(req.params.terminalId)
        ? req.params.terminalId[0]
        : req.params.terminalId;
      const result = await PosService.listTerminalTransactions({
        ...req.query,
        terminal_id: terminalId,
      });
      res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
        message: 'Terminal-wise transactions retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/shifts/:shiftId/transactions
   * View transactions for a shift
   */
  static getShiftWiseTransactions = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const shiftId = Array.isArray(req.params.shiftId)
        ? req.params.shiftId[0]
        : req.params.shiftId;
      const result = await PosService.listTerminalTransactions({
        ...req.query,
        shift_id: shiftId,
      });
      res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
        message: 'Shift transactions retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/transactions/:transactionId/status
   * Update permitted transaction state
   */
  static updateTerminalTransactionStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.transactionId)
        ? req.params.transactionId[0]
        : req.params.transactionId;
      const data = updateTerminalTransactionStatusSchema.parse(req.body);
      const updated = await PosService.updateTerminalTransactionStatus(
        id,
        data.status,
        data.failure_reason
      );
      res.status(200).json({
        success: true,
        data: updated,
        message: `Transaction status updated to "${data.status}"`,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/transactions/:transactionId/adjustments
   * View related voids, refunds, and reversals
   */
  static getTransactionAdjustments = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.transactionId)
        ? req.params.transactionId[0]
        : req.params.transactionId;
      const adjustments = await PosService.getTransactionAdjustments(id);
      res.status(200).json({
        success: true,
        data: adjustments,
        message: 'Transaction adjustments retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 8. VOIDS, CANCELLATIONS, AND REVERSALS (Table 16 - Section L)
  // ==========================================

  /**
   * POST /pos/transactions/:transactionId/adjustments
   * Request void/cancel/refund/reversal
   */
  static requestTransactionAdjustment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.transactionId)
        ? req.params.transactionId[0]
        : req.params.transactionId;
      const data = createTransactionAdjustmentSchema.parse(req.body);
      const adjustment = await PosService.requestTransactionAdjustment(
        id,
        data,
        req.user?.userId || ''
      );
      res.status(201).json({
        success: true,
        data: adjustment,
        message: `Adjustment request (${data.adjustment_type}) submitted successfully`,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/adjustments/:adjustmentId
   * Get adjustment details
   */
  static getAdjustmentById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.adjustmentId)
        ? req.params.adjustmentId[0]
        : req.params.adjustmentId;
      const adjustment = await PosService.getAdjustmentById(id);
      res.status(200).json({
        success: true,
        data: adjustment,
        message: 'Adjustment details retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/adjustments/:adjustmentId/approve
   * Approve restricted adjustment
   */
  static approveAdjustment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.adjustmentId)
        ? req.params.adjustmentId[0]
        : req.params.adjustmentId;
      const approved = await PosService.approveAdjustment(id, req.user?.userId || '');
      res.status(200).json({
        success: true,
        data: approved,
        message: 'Transaction adjustment approved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/adjustments/:adjustmentId/reject
   * Reject adjustment
   */
  static rejectAdjustment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.adjustmentId)
        ? req.params.adjustmentId[0]
        : req.params.adjustmentId;
      const data = rejectAdjustmentSchema.parse(req.body);
      const rejected = await PosService.rejectAdjustment(id, data.reason, req.user?.userId);
      res.status(200).json({
        success: true,
        data: rejected,
        message: 'Transaction adjustment rejected',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/adjustments/:adjustmentId/complete
   * Complete approved adjustment
   */
  static completeAdjustment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.adjustmentId)
        ? req.params.adjustmentId[0]
        : req.params.adjustmentId;
      const data = completeAdjustmentSchema.parse(req.body);
      const completed = await PosService.completeAdjustment(id, data, req.user?.userId);
      res.status(200).json({
        success: true,
        data: completed,
        message: 'Transaction adjustment completed successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/adjustments
   * Search adjustments by filters
   */
  static listAdjustments = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await PosService.listAdjustments(req.query);
      res.status(200).json({
        success: true,
        data: result.adjustments,
        pagination: result.pagination,
        message: 'Adjustments retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 9. AUDIT LOGS & TERMINAL ACTIVITY TRACKING (Table 18 - Section N)
  // ==========================================

  /**
   * GET /pos/audit-logs
   * Search audit logs
   */
  static listAuditLogs = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = listAuditLogsQuerySchema.parse(req.query);
      const tenantScope =
        req.user?.role === 'SUPER_ADMIN'
          ? undefined
          : {
              restaurantId: req.user?.restaurantId || undefined,
              branchId: req.user?.branchId || undefined,
            };

      const result = await PosService.listAuditLogs(query, tenantScope);
      res.status(200).json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/audit-logs/:logId
   * Get audit event
   */
  static getAuditLogById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const logId = Array.isArray(req.params.logId)
        ? req.params.logId[0]
        : req.params.logId;
      const tenantScope =
        req.user?.role === 'SUPER_ADMIN'
          ? undefined
          : {
              restaurantId: req.user?.restaurantId || undefined,
              branchId: req.user?.branchId || undefined,
            };

      const log = await PosService.getAuditLogById(logId, tenantScope);
      res.status(200).json({
        success: true,
        message: 'Audit log retrieved successfully',
        data: log,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/terminals/:terminalId/audit-logs
   * Terminal activity history
   */
  static getTerminalAuditLogs = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const terminalId = Array.isArray(req.params.terminalId)
        ? req.params.terminalId[0]
        : req.params.terminalId;
      const query = listAuditLogsQuerySchema.parse({
        ...req.query,
        terminal_id: terminalId,
      });
      const tenantScope =
        req.user?.role === 'SUPER_ADMIN'
          ? undefined
          : {
              restaurantId: req.user?.restaurantId || undefined,
              branchId: req.user?.branchId || undefined,
            };

      const result = await PosService.listAuditLogs(query, tenantScope);
      res.status(200).json({
        success: true,
        message: 'Terminal audit logs retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/shifts/:shiftId/audit-logs
   * Shift activity history
   */
  static getShiftAuditLogs = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const shiftId = Array.isArray(req.params.shiftId)
        ? req.params.shiftId[0]
        : req.params.shiftId;
      const query = listAuditLogsQuerySchema.parse({
        ...req.query,
        shift_id: shiftId,
      });
      const tenantScope =
        req.user?.role === 'SUPER_ADMIN'
          ? undefined
          : {
              restaurantId: req.user?.restaurantId || undefined,
              branchId: req.user?.branchId || undefined,
            };

      const result = await PosService.listAuditLogs(query, tenantScope);
      res.status(200).json({
        success: true,
        message: 'Shift audit logs retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/users/:userId/pos-audit-logs
   * User activity history
   */
  static getUserPosAuditLogs = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;
      const query = listAuditLogsQuerySchema.parse({
        ...req.query,
        user_id: userId,
      });
      const tenantScope =
        req.user?.role === 'SUPER_ADMIN'
          ? undefined
          : {
              restaurantId: req.user?.restaurantId || undefined,
              branchId: req.user?.branchId || undefined,
            };

      const result = await PosService.listAuditLogs(query, tenantScope);
      res.status(200).json({
        success: true,
        message: 'User POS audit logs retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 10. POS ORDER CREATION & LIFECYCLE
  // ==========================================

  /**
   * POST /pos/orders
   * Create POS Order & associate terminal transaction
   */
  static createPosOrder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = createPosOrderSchema.parse(req.body);
      const result = await PosService.createPosOrder(data, req.user?.userId);
      res.status(201).json({
        success: true,
        message: 'POS Order created successfully',
        data: result.order,
        transaction: result.transaction,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/orders/:orderId
   * Get single POS order details
   */
  static getOrderById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const order = await PosService.getOrderById(orderId);
      res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/orders/:orderId/status
   * Update order status or payment status
   */
  static updateOrderStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const data = updateOrderStatusSchema.parse(req.body);
      const updated = await PosService.updateOrderStatus(orderId, data, req.user?.userId);
      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /pos/orders
   * List POS orders for kitchen display, waiter screen, or cashier
   */
  static listPosOrders = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = listPosOrdersQuerySchema.parse(req.query);
      const result = await PosService.listPosOrders(query);
      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/orders/:orderId/kitchen-status
   * Update order kitchen status (pending -> preparing -> ready -> served)
   */
  static updateKitchenStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const data = updateKitchenStatusSchema.parse(req.body);
      const updated = await PosService.updateKitchenStatus(orderId, data, req.user?.userId);
      res.status(200).json({
        success: true,
        message: `Kitchen status updated to ${data.kitchen_status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/orders/:orderId/waiter
   * Assign waiter to order
   */
  static assignWaiter = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const data = assignWaiterSchema.parse(req.body);
      const updated = await PosService.assignWaiter(orderId, data, req.user?.userId);
      res.status(200).json({
        success: true,
        message: 'Waiter assigned successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /pos/orders/:orderId/items/:itemIndex/status
   * Update individual order item readiness
   */
  static updateOrderItemStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const itemIndex = Number(req.params.itemIndex);
      const data = updateOrderItemStatusSchema.parse(req.body);
      const updated = await PosService.updateOrderItemStatus(orderId, itemIndex, data.kitchenStatus, req.user?.userId);
      res.status(200).json({
        success: true,
        message: `Item #${itemIndex + 1} marked as ${data.kitchenStatus}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/orders/:orderId/pay
   * Collect payment for an order
   */
  static collectOrderPayment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const data = collectOrderPaymentSchema.parse(req.body);
      const updated = await PosService.collectOrderPayment(orderId, data, req.user?.userId);
      res.status(200).json({
        success: true,
        message: 'Payment collected successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/orders/:orderId/items
   * Append items to active order (Incremental KOT)
   */
  static appendOrderItems = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const data = appendOrderItemsSchema.parse(req.body);
      const updated = await PosService.appendOrderItems(orderId, data, req.user?.userId);
      res.status(200).json({
        success: true,
        message: 'Incremental items appended and KOT dispatched successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/orders/:orderId/approve
   * Manager approves order / KOT dispatch
   */
  static approveOrder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const data = approveOrderSchema.parse(req.body);
      const updated = await PosService.approveOrder(orderId, data, req.user?.userId);
      res.status(200).json({
        success: true,
        message: 'Order approved and dispatched to kitchen',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /pos/orders/:orderId/reject
   * Manager rejects order
   */
  static rejectOrder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const data = rejectOrderSchema.parse(req.body);
      const updated = await PosService.rejectOrder(orderId, data, req.user?.userId);
      res.status(200).json({
        success: true,
        message: 'Order rejected and cancelled',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };
}


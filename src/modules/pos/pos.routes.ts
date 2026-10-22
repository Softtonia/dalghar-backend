import { Router } from 'express';
import { PosController } from './pos.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';

const router = Router();

router.use(authenticate);

// ==========================================
// 1. TERMINAL MANAGEMENT (Exact User Specs)
// ==========================================

// Register a POS terminal
router.post(
  '/terminals',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.registerTerminal
);

// List terminals with filters and pagination
router.get(
  '/terminals',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listTerminals
);

// Get terminal details
router.get(
  '/terminals/:id',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getTerminalById
);

// Update terminal name or configuration
router.patch(
  '/terminals/:id',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.updateTerminal
);

// Activate, deactivate or mark for maintenance
router.patch(
  '/terminals/:id/status',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.updateTerminalStatus
);

// Soft-delete a terminal if eligible
router.delete(
  '/terminals/:id',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.deleteTerminal
);

// ==========================================
// 2. SUMMARY METRICS & TRANSACTIONS
// ==========================================

// 6 Summary Cards (Sales, Orders, Terminals, Shifts, Pending, Variance)
router.get(
  '/summary',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getSummaryCards
);

// POS Transactions & Orders with filters & search
router.get(
  '/transactions',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listTransactions
);

// Shifts list for cashier shifts overview
router.get(
  '/shifts',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listShifts
);

// ==========================================
// 3. TERMINAL ASSIGNMENTS
// ==========================================
router.post(
  '/terminal-assignments',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.assignUser
);
router.get(
  '/terminal-assignments',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listAssignments
);
router.patch(
  '/terminal-assignments/:id/unassign',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.unassignUser
);

// ==========================================
// 4. CASHIER SHIFTS
// ==========================================
router.post(
  '/shifts/open',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.openShift
);
router.get(
  '/shifts/current',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getCurrentShift
);
router.get(
  '/shifts/:id/summary',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getShiftSummary
);
router.post(
  '/shifts/:id/close',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.closeShift
);

// Shift-scoped Cash Movements: POST & GET /pos/shifts/:shiftId/cash-movements
router.post(
  '/shifts/:shiftId/cash-movements',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.recordCashMovement
);
router.get(
  '/shifts/:shiftId/cash-movements',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listCashMovements
);

// ==========================================
// 5. CASH MOVEMENTS
// ==========================================
router.post(
  '/cash-movements',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.recordCashMovement
);
router.get(
  '/cash-movements',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listCashMovements
);
router.get(
  '/cash-movements/:movementId',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getMovement
);
router.post(
  '/cash-movements/:movementId/approve',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.approveMovement
);

// ==========================================
// 5B. CASH RECONCILIATIONS (G. Tables 7 & 8)
// ==========================================
router.post(
  '/shifts/:shiftId/reconciliations',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.submitReconciliation
);
router.get(
  '/shifts/:shiftId/reconciliations',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listReconciliations
);
router.get(
  '/reconciliations/:reconciliationId',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getReconciliation
);
router.patch(
  '/reconciliations/:reconciliationId/review',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.reviewReconciliation
);
router.post(
  '/reconciliations/:reconciliationId/request-recount',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.requestRecount
);
router.post(
  '/reconciliations/:reconciliationId/denominations',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.saveDenominations
);
router.get(
  '/reconciliations/:reconciliationId/denominations',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getDenominations
);

// ==========================================
// 5C. PERIPHERAL DEVICES & HARDWARE (H. Tables 9, 10, 11)
// ==========================================
router.post(
  '/peripherals',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.registerPeripheral
);
router.get(
  '/peripherals',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listPeripherals
);
router.get(
  '/peripherals/:peripheralId',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getPeripheral
);
router.patch(
  '/peripherals/:peripheralId',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.updatePeripheral
);
router.patch(
  '/peripherals/:peripheralId/status',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.updatePeripheralStatus
);
router.delete(
  '/peripherals/:peripheralId',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.deletePeripheral
);
router.post(
  '/peripherals/:peripheralId/assignments',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.assignPeripheral
);
router.get(
  '/peripherals/:peripheralId/assignments',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listPeripheralAssignments
);
router.patch(
  '/peripheral-assignments/:assignmentId/end',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.endPeripheralAssignment
);
router.get(
  '/peripherals/:peripheralId/events',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listPeripheralEvents
);
router.post(
  '/peripherals/:peripheralId/heartbeat',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.reportPeripheralHeartbeat
);
router.get(
  '/peripherals/:peripheralId/health',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getPeripheralHealth
);

// ==========================================
// 6. POS TRANSACTIONS & PAYMENTS
// ==========================================
router.post(
  '/transactions',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.createTransaction
);
router.post(
  '/transactions/:id/payments',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.addPayment
);
router.post(
  '/transactions/:id/complete',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.completeTransaction
);
router.post(
  '/transactions/:id/void',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.voidTransaction
);

// ==========================================
// 7. RECEIPT TEMPLATES (Table 12 - Section I)
// ==========================================

// Create receipt template
router.post(
  '/receipt-templates',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.createReceiptTemplate
);

// List templates
router.get(
  '/receipt-templates',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listReceiptTemplates
);

// Get template details
router.get(
  '/receipt-templates/:templateId',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getReceiptTemplate
);

// Update draft/template settings
router.patch(
  '/receipt-templates/:templateId',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.updateReceiptTemplate
);

// Activate template version
router.post(
  '/receipt-templates/:templateId/activate',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.activateReceiptTemplate
);

// Duplicate template
router.post(
  '/receipt-templates/:templateId/duplicate',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.duplicateReceiptTemplate
);

// Render preview
router.post(
  '/receipt-templates/:templateId/preview',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.previewReceiptTemplate
);

// Archive template
router.post(
  '/receipt-templates/:templateId/archive',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.archiveReceiptTemplate
);

// Delete eligible unused draft
router.delete(
  '/receipt-templates/:templateId',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.deleteReceiptTemplate
);

// ==========================================
// 8. BILL NUMBERING SERIES & ALLOCATIONS (Tables 13 & 14 - Section J)
// ==========================================

// Create numbering series
router.post(
  '/bill-number-series',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.createBillNumberSeries
);

// List series
router.get(
  '/bill-number-series',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listBillNumberSeries
);

// Get series details
router.get(
  '/bill-number-series/:seriesId',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getBillNumberSeries
);

// Update permitted settings
router.patch(
  '/bill-number-series/:seriesId',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.updateBillNumberSeries
);

// Activate series
router.post(
  '/bill-number-series/:seriesId/activate',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.activateBillNumberSeries
);

// Deactivate series
router.post(
  '/bill-number-series/:seriesId/deactivate',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.deactivateBillNumberSeries
);

// View number allocations
router.get(
  '/bill-number-series/:seriesId/allocations',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listSeriesAllocations
);

// Allocate next bill number atomically
router.post(
  '/bill-number-series/:seriesId/allocate',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.allocateBillNumber
);

// Get allocation details
router.get(
  '/bill-number-allocations/:allocationId',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getAllocation
);

// Update allocation status (issued, voided, failed)
router.patch(
  '/bill-number-allocations/:allocationId/status',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.updateAllocationStatus
);

// Delete eligible unissued allocation
router.delete(
  '/bill-number-allocations/:allocationId',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.deleteAllocation
);

// ==========================================
// 7. TERMINAL TRANSACTIONS (Table 15 - Section K)
// ==========================================

// Register a terminal transaction reference
router.post(
  '/transactions',
  requirePermission(PERMISSIONS.POS_PAYMENT),
  PosController.registerTerminalTransaction
);

// Get transaction details
router.get(
  '/transactions/:transactionId',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getTerminalTransactionById
);

// View terminal-wise transactions
router.get(
  '/terminals/:terminalId/transactions',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getTerminalWiseTransactions
);

// View transactions for a shift
router.get(
  '/shifts/:shiftId/transactions',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getShiftWiseTransactions
);

// Update permitted transaction state
router.patch(
  '/transactions/:transactionId/status',
  requirePermission(PERMISSIONS.POS_PAYMENT),
  PosController.updateTerminalTransactionStatus
);

// View related voids, refunds, and reversals for a transaction
router.get(
  '/transactions/:transactionId/adjustments',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getTransactionAdjustments
);

// ==========================================
// 8. VOIDS, CANCELLATIONS, AND REVERSALS (Table 16 - Section L)
// ==========================================

// Request void/cancel/refund/reversal
router.post(
  '/transactions/:transactionId/adjustments',
  requirePermission(PERMISSIONS.POS_PAYMENT),
  PosController.requestTransactionAdjustment
);

// Search adjustments by filters
router.get(
  '/adjustments',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.listAdjustments
);

// Get adjustment details
router.get(
  '/adjustments/:adjustmentId',
  requirePermission(PERMISSIONS.POS_VIEW),
  PosController.getAdjustmentById
);

// Approve restricted adjustment (Supervisor/Admin approval)
router.post(
  '/adjustments/:adjustmentId/approve',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.approveAdjustment
);

// Reject adjustment
router.post(
  '/adjustments/:adjustmentId/reject',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  PosController.rejectAdjustment
);

// Complete approved adjustment
router.post(
  '/adjustments/:adjustmentId/complete',
  requirePermission(PERMISSIONS.POS_PAYMENT),
  PosController.completeAdjustment
);

// ==========================================
// 9. AUDIT LOGS & TERMINAL ACTIVITY TRACKING (Table 18 - Section N)
// ==========================================

// Search audit logs
router.get(
  '/audit-logs',
  requirePermission(PERMISSIONS.POS_AUDIT_READ),
  PosController.listAuditLogs
);

// Get audit event
router.get(
  '/audit-logs/:logId',
  requirePermission(PERMISSIONS.POS_AUDIT_READ),
  PosController.getAuditLogById
);

// Terminal activity history
router.get(
  '/terminals/:terminalId/audit-logs',
  requirePermission(PERMISSIONS.POS_AUDIT_READ),
  PosController.getTerminalAuditLogs
);

// Shift activity history
router.get(
  '/shifts/:shiftId/audit-logs',
  requirePermission(PERMISSIONS.POS_AUDIT_READ),
  PosController.getShiftAuditLogs
);

// User activity history
router.get(
  '/users/:userId/pos-audit-logs',
  requirePermission(PERMISSIONS.POS_AUDIT_READ),
  PosController.getUserPosAuditLogs
);

// ==========================================
// 10. POS ORDER CREATION & LIFECYCLE
// ==========================================

// List POS Orders (Kitchen KDS, Waiter, Cashier)
router.get(
  '/orders',
  requirePermission(PERMISSIONS.ORDER_VIEW),
  PosController.listPosOrders
);

// Create new POS Order
router.post(
  '/orders',
  requirePermission(PERMISSIONS.ORDER_CREATE),
  PosController.createPosOrder
);

// Get single POS Order details
router.get(
  '/orders/:orderId',
  requirePermission(PERMISSIONS.ORDER_VIEW),
  PosController.getOrderById
);

// Update order or payment status
router.patch(
  '/orders/:orderId/status',
  requirePermission(PERMISSIONS.ORDER_UPDATE),
  PosController.updateOrderStatus
);

// Kitchen Display System: Update kitchen status (pending -> preparing -> ready -> served)
router.patch(
  '/orders/:orderId/kitchen-status',
  requirePermission(PERMISSIONS.ORDER_UPDATE),
  PosController.updateKitchenStatus
);

// Waiter App: Assign waiter or update service
router.patch(
  '/orders/:orderId/waiter',
  requirePermission(PERMISSIONS.ORDER_UPDATE),
  PosController.assignWaiter
);

// Kitchen item-level readiness toggle
router.patch(
  '/orders/:orderId/items/:itemIndex/status',
  requirePermission(PERMISSIONS.ORDER_UPDATE),
  PosController.updateOrderItemStatus
);

// Collect payment for unpaid / dine-in order
router.post(
  '/orders/:orderId/pay',
  requirePermission(PERMISSIONS.POS_PAYMENT),
  PosController.collectOrderPayment
);

export const posRoutes = router;



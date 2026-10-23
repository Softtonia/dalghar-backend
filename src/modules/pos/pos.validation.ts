import { z } from 'zod';

// ==========================================
// 1. TERMINALS
// ==========================================
export const terminalSettingsValidationSchema = z.object({
  auto_print_receipt: z.boolean().optional().default(true),
  auto_print_kitchen_ticket: z.boolean().optional().default(true),
  require_cashier_login: z.boolean().optional().default(true),
  allow_cash_sales: z.boolean().optional().default(true),
  allow_card_sales: z.boolean().optional().default(true),
  allow_refunds: z.boolean().optional().default(false),
  allow_voids: z.boolean().optional().default(false),
  allow_cash_in: z.boolean().optional().default(true),
  allow_cash_out: z.boolean().optional().default(true),
  allow_offline_sales: z.boolean().optional().default(false),
  require_shift_before_sales: z.boolean().optional().default(true),
  idle_timeout_seconds: z.number().optional().default(300),
  printerType: z.string().optional().default('thermal-80mm'),
  printerIp: z.string().optional().default(''),
  autoPrintReceipt: z.boolean().optional().default(true),
  autoPrintKot: z.boolean().optional().default(true),
  settings_json: z.record(z.string(), z.any()).optional().default({}),
}).passthrough();

export const createPosTerminalSchema = z.object({
  branch_id: z.string().min(1, 'Branch ID (branch_id) is required'),
  restaurant_id: z.string().optional().nullable(),
  terminal_code: z
    .string()
    .trim()
    .min(1, 'Terminal code is required')
    .max(50, 'Terminal code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  name: z.string().trim().min(1, 'Terminal name is required').max(150, 'Name cannot exceed 150 characters'),
  terminal_name: z.string().trim().max(150).optional(),
  device_identifier: z.string().trim().max(255).optional().nullable(),
  device_type: z.enum(['desktop', 'tablet', 'mobile', 'all_in_one']).optional().default('desktop'),
  operating_system: z.string().trim().max(50).optional().default('Windows'),
  app_version: z.string().trim().max(50).optional().default('1.0.0'),
  ip_address: z.string().trim().max(45).optional().nullable(),
  mac_address: z.string().trim().max(50).optional().nullable(),
  status: z
    .enum(['active', 'inactive', 'maintenance', 'retired', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'])
    .optional()
    .default('active')
    .transform((val) => val.toLowerCase()),
  connectivity_status: z.enum(['online', 'offline', 'unknown']).optional().default('unknown'),
  settings: terminalSettingsValidationSchema.optional(),
});

export const updatePosTerminalSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  terminal_name: z.string().trim().max(150).optional(),
  device_identifier: z.string().trim().max(255).optional().nullable(),
  device_type: z.enum(['desktop', 'tablet', 'mobile', 'all_in_one']).optional(),
  operating_system: z.string().trim().max(50).optional(),
  app_version: z.string().trim().max(50).optional(),
  ip_address: z.string().trim().max(45).optional().nullable(),
  mac_address: z.string().trim().max(50).optional().nullable(),
  terminal_code: z.string().trim().min(1).max(50).transform((v) => v.toUpperCase()).optional(),
  settings: terminalSettingsValidationSchema.optional(),
  branch_id: z.string().optional(),
  restaurant_id: z.string().optional().nullable(),
  connectivity_status: z.enum(['online', 'offline', 'unknown']).optional(),
});

export const updateTerminalStatusSchema = z.object({
  status: z
    .enum(['active', 'inactive', 'maintenance', 'retired', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'])
    .transform((val) => val.toLowerCase()),
});

export const listTerminalQuerySchema = z.object({
  branch_id: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==========================================
// 2. TERMINAL ASSIGNMENTS
// ==========================================
export const createTerminalAssignmentSchema = z.object({
  terminal_id: z.string().min(1, 'Terminal ID is required'),
  user_id: z.string().min(1, 'User/Cashier ID is required'),
});

export const listTerminalAssignmentQuerySchema = z.object({
  terminal_id: z.string().optional(),
  user_id: z.string().optional(),
  active_only: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

// ==========================================
// 3. CASHIER SHIFTS & MOVEMENTS
// ==========================================
export const openShiftSchema = z.object({
  branch_id: z.string().min(1, 'Branch ID is required'),
  terminal_id: z.string().min(1, 'Terminal ID is required'),
  opening_cash: z.number().min(0, 'Opening cash must be non-negative').default(0),
});

export const closeShiftSchema = z.object({
  counted_cash: z.number().min(0, 'Counted cash must be non-negative'),
  closing_notes: z.string().trim().optional().nullable(),
});

export const updateShiftNotesSchema = z.object({
  closing_notes: z.string().trim().min(1, 'Notes cannot be empty'),
});

export const listShiftsQuerySchema = z.object({
  branch_id: z.string().optional(),
  terminal_id: z.string().optional(),
  cashier_id: z.string().optional(),
  status: z.enum(['open', 'closed', 'reconciled', 'disputed']).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});

export const recordCashMovementSchema = z.object({
  shift_id: z.string().min(1, 'Shift ID is required'),
  movement_type: z.enum(['cash_in', 'cash_out', 'payout', 'petty_cash']),
  amount: z.number().positive('Amount must be greater than zero'),
  reason: z.string().trim().min(1, 'Reason for movement is required'),
  reference_number: z.string().trim().optional().nullable(),
});

// ==========================================
// 4. POS TRANSACTIONS & ITEMS
// ==========================================
export const transactionItemModifierSchema = z.object({
  modifier_option_id: z.string().optional().nullable(),
  modifier_name: z.string().trim().min(1, 'Modifier name is required'),
  quantity: z.number().min(1).default(1),
  unit_price: z.number().min(0).default(0),
});

export const transactionItemSchema = z.object({
  menu_item_id: z.string().optional().nullable(),
  variant_id: z.string().optional().nullable(),
  item_name: z.string().trim().min(1, 'Item name is required'),
  sku: z.string().trim().optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  discount_amount: z.number().min(0).optional().default(0),
  tax_amount: z.number().min(0).optional().default(0),
  special_instructions: z.string().trim().optional().nullable(),
  modifiers: z.array(transactionItemModifierSchema).optional().default([]),
});

export const createPosTransactionSchema = z.object({
  branch_id: z.string().min(1, 'Branch ID is required'),
  terminal_id: z.string().min(1, 'Terminal ID is required'),
  shift_id: z.string().min(1, 'Shift ID is required'),
  transaction_type: z.enum(['sale', 'return', 'refund']).default('sale'),
  items: z.array(transactionItemSchema).optional().default([]),
  notes: z.string().trim().optional().nullable(),
});

export const addPaymentSchema = z.object({
  payment_method_type: z.enum(['CASH', 'UPI', 'CARD', 'WALLET', 'SPLIT']),
  amount: z.number().positive('Amount must be greater than zero'),
  payment_reference: z.string().trim().optional().nullable(),
  provider_transaction_id: z.string().trim().optional().nullable(),
  currency: z.string().default('INR'),
});

// ==========================================
// 5. RECEIPT TEMPLATES (Table 12)
// ==========================================
export const createReceiptTemplateSchema = z.object({
  restaurant_id: z.string().min(1, 'Restaurant ID (restaurant_id) is required'),
  branch_id: z.string().optional().nullable(),
  terminal_id: z.string().optional().nullable(),
  template_name: z.string().trim().min(1, 'Template name is required').max(150),
  template_type: z.enum(['customer_receipt', 'kitchen_ticket', 'refund_receipt', 'duplicate_receipt']),
  paper_width_mm: z
    .number()
    .refine((val) => [58, 80].includes(val), {
      message: 'paper_width_mm must be an allowed printer width (58 or 80)',
    })
    .default(80),
  header_content: z.string().optional().nullable(),
  body_template: z.string().min(1, 'Body template (body_template) is required'),
  footer_content: z.string().optional().nullable(),
  show_logo: z.boolean().optional().default(true),
  show_tax_breakdown: z.boolean().optional().default(true),
  show_cashier_name: z.boolean().optional().default(true),
  show_terminal_code: z.boolean().optional().default(true),
  show_customer_info: z.boolean().optional().default(false),
  is_default: z.boolean().optional().default(false),
  template_config: z.record(z.string(), z.any()).optional().default({}),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
});

export const updateReceiptTemplateSchema = z.object({
  template_name: z.string().trim().min(1).max(150).optional(),
  template_type: z.enum(['customer_receipt', 'kitchen_ticket', 'refund_receipt', 'duplicate_receipt']).optional(),
  paper_width_mm: z
    .number()
    .refine((val) => [58, 80].includes(val), {
      message: 'paper_width_mm must be an allowed printer width (58 or 80)',
    })
    .optional(),
  header_content: z.string().optional().nullable(),
  body_template: z.string().min(1).optional(),
  footer_content: z.string().optional().nullable(),
  show_logo: z.boolean().optional(),
  show_tax_breakdown: z.boolean().optional(),
  show_cashier_name: z.boolean().optional(),
  show_terminal_code: z.boolean().optional(),
  show_customer_info: z.boolean().optional(),
  is_default: z.boolean().optional(),
  template_config: z.record(z.string(), z.any()).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  branch_id: z.string().optional().nullable(),
  restaurant_id: z.string().optional().nullable(),
});

export const previewReceiptTemplateSchema = z.object({
  sample_data: z.record(z.string(), z.any()).optional(),
});

// ==========================================
// 6. BILL NUMBERING SERIES & ALLOCATIONS (Tables 13 & 14)
// ==========================================
export const createBillNumberSeriesSchema = z.object({
  restaurant_id: z.string().min(1, 'Restaurant ID (restaurant_id) is required'),
  branch_id: z.string().optional().nullable(),
  terminal_id: z.string().optional().nullable(),
  series_name: z.string().trim().min(1, 'Series name is required').max(100),
  document_type: z.enum(['sale', 'refund', 'credit_note', 'kitchen_ticket', 'kot']).default('sale'),
  prefix: z.string().trim().max(30).optional().default(''),
  suffix: z.string().trim().max(30).optional().default(''),
  number_scope: z.enum(['restaurant', 'branch', 'terminal']).default('branch'),
  reset_frequency: z.enum(['never', 'daily', 'monthly', 'yearly']).default('never'),
  minimum_digits: z.number().int().min(1).max(20).default(6),
});

export const updateBillNumberSeriesSchema = z.object({
  series_name: z.string().trim().min(1).max(100).optional(),
  prefix: z.string().trim().max(30).optional(),
  suffix: z.string().trim().max(30).optional().nullable(),
  reset_frequency: z.enum(['never', 'daily', 'monthly', 'yearly']).optional(),
  minimum_digits: z.number().int().min(1).max(20).optional(),
  is_active: z.boolean().optional(),
});

export const allocateBillNumberSchema = z.object({
  terminal_id: z.string().optional().nullable(),
  shift_id: z.string().optional().nullable(),
  document_type: z.string().optional(),
});

export const updateBillAllocationStatusSchema = z.object({
  status: z.enum(['reserved', 'issued', 'voided', 'failed']),
  failure_reason: z.string().trim().optional().nullable(),
});

// ==========================================
// 7. TERMINAL TRANSACTIONS & ADJUSTMENTS (Tables 15 & 16)
// ==========================================
export const registerTerminalTransactionSchema = z.object({
  terminal_id: z.string().min(1, 'Terminal ID (terminal_id) is required'),
  shift_id: z.string().optional().nullable(),
  order_id: z.string().optional().nullable(),
  payment_id: z.string().optional().nullable(),
  bill_allocation_id: z.string().optional().nullable(),
  transaction_reference: z.string().trim().min(1, 'Transaction reference is required').max(100),
  transaction_type: z.enum(['sale', 'refund', 'void', 'payment', 'reversal']).default('sale'),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: 'Amount must be a valid non-negative number',
    }),
  currency_code: z.string().trim().length(3, 'currency_code must be an ISO 3-character code').default('INR'),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled', 'reversed']).default('pending'),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional().nullable(),
  failure_reason: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const updateTerminalTransactionStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'cancelled', 'reversed']),
  failure_reason: z.string().trim().optional().nullable(),
});

export const createTransactionAdjustmentSchema = z.object({
  adjustment_type: z.enum(['void', 'cancel', 'refund', 'reversal']),
  reason_code: z.string().trim().min(1, 'reason_code is required').max(50),
  reason: z.string().trim().min(1, 'reason explanation is required'),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Adjustment amount must be greater than 0',
    }),
  idempotency_key: z.string().trim().optional().nullable(),
});

export const rejectAdjustmentSchema = z.object({
  reason: z.string().trim().optional(),
});

export const completeAdjustmentSchema = z.object({
  idempotency_key: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

// ==========================================
// 8. AUDIT LOGS & ACTIVITY TRACKING (Table 18 - Section N)
// ==========================================
export const listAuditLogsQuerySchema = z.object({
  restaurant_id: z.string().optional(),
  branch_id: z.string().optional(),
  terminal_id: z.string().optional(),
  shift_id: z.string().optional(),
  user_id: z.string().optional(),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  outcome: z.enum(['success', 'failure', 'denied']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z
    .union([z.string(), z.number()])
    .transform((v) => Math.max(1, Number(v) || 1))
    .default(1),
  limit: z
    .union([z.string(), z.number()])
    .transform((v) => Math.min(100, Math.max(1, Number(v) || 20)))
    .default(20),
});

export type CreatePosTerminalInput = z.infer<typeof createPosTerminalSchema>;
export type UpdatePosTerminalInput = z.infer<typeof updatePosTerminalSchema>;
export type UpdateTerminalStatusInput = z.infer<typeof updateTerminalStatusSchema>;
export type ListTerminalQueryInput = z.infer<typeof listTerminalQuerySchema>;
export type CreateReceiptTemplateInput = z.infer<typeof createReceiptTemplateSchema>;
export type UpdateReceiptTemplateInput = z.infer<typeof updateReceiptTemplateSchema>;
export type CreateBillNumberSeriesInput = z.infer<typeof createBillNumberSeriesSchema>;
export type UpdateBillNumberSeriesInput = z.infer<typeof updateBillNumberSeriesSchema>;
export type RegisterTerminalTransactionInput = z.infer<typeof registerTerminalTransactionSchema>;
export type UpdateTerminalTransactionStatusInput = z.infer<typeof updateTerminalTransactionStatusSchema>;
export type CreateTransactionAdjustmentInput = z.infer<typeof createTransactionAdjustmentSchema>;
export type RejectAdjustmentInput = z.infer<typeof rejectAdjustmentSchema>;
export type CompleteAdjustmentInput = z.infer<typeof completeAdjustmentSchema>;
export type ListAuditLogsQueryInput = z.infer<typeof listAuditLogsQuerySchema>;

// ==========================================
// 10. POS ORDER CREATION & WORKFLOW
// ==========================================
export const createPosOrderSchema = z.object({
  restaurant_id: z.string().optional().nullable(),
  branch_id: z.string().optional().nullable(),
  terminal_id: z.string().min(1, 'terminal_id is required'),
  shift_id: z.string().optional().nullable(),
  table_number: z.string().optional().nullable(),
  customer_name: z.string().trim().optional().nullable(),
  customer_phone: z.string().trim().optional().nullable(),
  customerId: z.string().optional().nullable(),
  order_type: z.enum(['dine_in', 'takeaway', 'delivery']).default('dine_in'),
  kitchen_status: z.enum(['pending', 'preparing', 'ready', 'served', 'cancelled']).default('pending'),
  waiter_id: z.string().optional().nullable(),
  waiter_name: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Item ID is required'),
        name: z.string().min(1, 'Item name is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        price: z.number().min(0, 'Price must be non-negative'),
        subtotal: z.number().min(0, 'Subtotal must be non-negative'),
        notes: z.string().optional().nullable(),
        kitchenStatus: z.enum(['pending', 'preparing', 'ready']).optional().default('pending'),
        addons: z
          .array(
            z.object({
              name: z.string(),
              price: z.number().min(0).default(0),
            })
          )
          .optional(),
      })
    )
    .min(1, 'Order must contain at least one item'),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'SPLIT', 'WALLET']).default('CASH'),
  paymentStatus: z.enum(['PAID', 'PENDING', 'FAILED', 'REFUNDED']).default('PAID'),
  orderStatus: z.enum(['COMPLETED', 'IN_PROGRESS', 'CANCELLED']).default('COMPLETED'),
  notes: z.string().optional().nullable(),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['COMPLETED', 'IN_PROGRESS', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PAID', 'PENDING', 'FAILED', 'REFUNDED']).optional(),
  kitchen_status: z.enum(['pending', 'preparing', 'ready', 'served', 'cancelled']).optional(),
  notes: z.string().optional().nullable(),
});

export const updateKitchenStatusSchema = z.object({
  kitchen_status: z.enum(['pending', 'preparing', 'ready', 'served', 'cancelled']),
  notify_waiter: z.boolean().optional(),
  itemStatuses: z
    .array(
      z.object({
        itemIndex: z.number().int().min(0),
        kitchenStatus: z.enum(['pending', 'preparing', 'ready']),
      })
    )
    .optional(),
  notes: z.string().optional().nullable(),
});

export const assignWaiterSchema = z.object({
  waiter_id: z.string().min(1, 'waiter_id is required'),
  waiter_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateOrderItemStatusSchema = z.object({
  kitchenStatus: z.enum(['pending', 'preparing', 'ready']),
});

export const collectOrderPaymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'SPLIT', 'WALLET']).default('CASH'),
  tenderedAmount: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export const listPosOrdersQuerySchema = z.object({
  restaurant_id: z.string().optional(),
  branch_id: z.string().optional(),
  terminal_id: z.string().optional(),
  kitchen_status: z.string().optional(),
  order_type: z.string().optional(),
  orderStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  waiter_id: z.string().optional(),
  customer_name: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});

export type CreatePosOrderInput = z.infer<typeof createPosOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateKitchenStatusInput = z.infer<typeof updateKitchenStatusSchema>;
export type AssignWaiterInput = z.infer<typeof assignWaiterSchema>;
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>;
export type CollectOrderPaymentInput = z.infer<typeof collectOrderPaymentSchema>;
export type ListPosOrdersQueryInput = z.infer<typeof listPosOrdersQuerySchema>;




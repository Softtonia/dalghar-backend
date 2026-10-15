import { z } from 'zod';

export const generalSettingsSchema = z.object({
  brandName: z.string().trim().min(1, 'Brand name is required').max(150),
  brandCode: z.string().trim().min(1, 'Brand code is required').max(50),
  tagline: z.string().trim().max(250).optional().default(''),
  supportEmail: z.string().trim().email('Invalid support email address'),
  supportPhone: z.string().trim().min(6, 'Phone number must be at least 6 digits').max(20),
  defaultLanguage: z.string().trim().default('en'),
});

export const taxSettingsSchema = z.object({
  currency: z.string().trim().min(1).max(10).default('INR'),
  timezone: z.string().trim().min(1).default('Asia/Kolkata'),
  taxEnabled: z.boolean().default(true),
  gstRate: z.number().min(0).max(100).default(5),
  serviceChargeEnabled: z.boolean().default(false),
  serviceChargeRate: z.number().min(0).max(25).default(0),
  invoicePrefix: z.string().trim().max(30).default('DG-INV-'),
  nextInvoiceNumber: z.number().int().min(1).default(1001),
});

export const posSettingsSchema = z.object({
  paperWidth: z.enum(['80mm', '58mm']).default('80mm'),
  autoPrintReceipt: z.boolean().default(true),
  autoPrintKOT: z.boolean().default(true),
  receiptHeader: z.string().trim().max(200).default('DAL GHAR RESTAURANT & DHABA'),
  receiptFooter: z.string().trim().max(500).optional().default(''),
  showFssaiNumber: z.boolean().default(true),
  fssaiNumber: z.string().trim().max(50).optional().default(''),
});

export const notificationSettingsSchema = z.object({
  whatsappBillDispatch: z.boolean().default(true),
  smsOrderAlerts: z.boolean().default(true),
  dailySalesEmail: z.boolean().default(true),
  lowStockThreshold: z.number().int().min(0).default(15),
});

export const updateSettingsSchema = z.object({
  general: generalSettingsSchema.partial().optional(),
  tax: taxSettingsSchema.partial().optional(),
  pos: posSettingsSchema.partial().optional(),
  notifications: notificationSettingsSchema.partial().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password must be at least 6 characters'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type TaxSettingsInput = z.infer<typeof taxSettingsSchema>;
export type PosSettingsInput = z.infer<typeof posSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

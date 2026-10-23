import crypto from 'crypto';
import QRCode from 'qrcode';
import { Types } from 'mongoose';
import { DiningTable } from '../../models/DiningTable.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Branch } from '../../models/Branch.js';
import { Menu } from '../../models/Menu.js';
import { MenuCategory } from '../../models/MenuCategory.js';
import { MenuItem } from '../../models/MenuItem.js';
import { MenuBranchAssignment } from '../../models/MenuBranchAssignment.js';
import { MenuRestaurantAssignment } from '../../models/MenuRestaurantAssignment.js';
import { PosOrder } from '../../models/PosOrder.js';
import { PosTerminal } from '../../models/PosTerminal.js';
import { CashierShift } from '../../models/CashierShift.js';
import { PosTerminalTransaction } from '../../models/PosTerminalTransaction.js';
import { ApiError } from '../../utils/ApiError.js';
import type { AuthJwtPayload } from '../../middleware/auth.middleware.js';

export interface QrCodeDetails {
  token: string;
  table_id: string;
  table_number: string;
  branch_id: string;
  branch_name: string;
  restaurant_id: string;
  restaurant_name: string;
  public_url: string;
  qr_image_data_url: string;
  is_active: boolean;
  generated_at: Date;
}

export class QrMenuService {
  /**
   * Helper: Hash a token using SHA-256
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Helper: Build the client public digital menu URL
   */
  private static getPublicMenuUrl(token: string): string {
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${frontendBase}/qr-menu/${token}`;
  }

  // =========================================================================
  // ADMIN QR CODE MANAGEMENT
  // =========================================================================

  /**
   * Generate or retrieve QR code for a dining table
   */
  static async getOrCreateTableQr(tableId: string, user?: AuthJwtPayload): Promise<QrCodeDetails> {
    const table = await DiningTable.findById(tableId);
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    // Branch / Restaurant tenancy check if user is branch-scoped
    if (user?.branchId && table.branch_id.toString() !== user.branchId.toString()) {
      throw new ApiError(403, 'Unauthorized access to table in another branch');
    }

    let token = table.qr_code?.token;
    let tokenHash = table.qr_code?.token_hash;
    let generatedAt = table.qr_code?.generated_at;

    // Generate new if absent or inactive
    if (!token || !tokenHash || !table.qr_code?.is_active) {
      token = crypto.randomBytes(24).toString('hex');
      tokenHash = this.hashToken(token);
      generatedAt = new Date();

      table.qr_code = {
        token,
        token_hash: tokenHash,
        generated_at: generatedAt,
        is_active: true,
      };
      await table.save();
    }

    const publicUrl = this.getPublicMenuUrl(token);
    const qrImageDataUrl = await QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: {
        dark: '#1B4D2E',
        light: '#FFFFFF',
      },
    });

    const [branch, restaurant] = await Promise.all([
      Branch.findById(table.branch_id).lean(),
      Restaurant.findById(table.restaurant_id).lean(),
    ]);

    return {
      token,
      table_id: table._id.toString(),
      table_number: table.table_number,
      branch_id: table.branch_id.toString(),
      branch_name: (branch as any)?.name || 'Flagship Branch',
      restaurant_id: table.restaurant_id.toString(),
      restaurant_name: (restaurant as any)?.name || 'Dal Ghar',
      public_url: publicUrl,
      qr_image_data_url: qrImageDataUrl,
      is_active: true,
      generated_at: generatedAt || new Date(),
    };
  }

  /**
   * Regenerate QR code for a dining table (revoking old token)
   */
  static async regenerateTableQr(tableId: string, user?: AuthJwtPayload): Promise<QrCodeDetails> {
    const table = await DiningTable.findById(tableId);
    if (!table) {
      throw new ApiError(404, 'Dining table not found');
    }

    if (user?.branchId && table.branch_id.toString() !== user.branchId.toString()) {
      throw new ApiError(403, 'Unauthorized access to table in another branch');
    }

    // Revoke previous by generating new cryptographically random token
    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = this.hashToken(token);
    const generatedAt = new Date();

    table.qr_code = {
      token,
      token_hash: tokenHash,
      generated_at: generatedAt,
      is_active: true,
    };
    await table.save();

    const publicUrl = this.getPublicMenuUrl(token);
    const qrImageDataUrl = await QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: {
        dark: '#1B4D2E',
        light: '#FFFFFF',
      },
    });

    const [branch, restaurant] = await Promise.all([
      Branch.findById(table.branch_id).lean(),
      Restaurant.findById(table.restaurant_id).lean(),
    ]);

    return {
      token,
      table_id: table._id.toString(),
      table_number: table.table_number,
      branch_id: table.branch_id.toString(),
      branch_name: (branch as any)?.name || 'Flagship Branch',
      restaurant_id: table.restaurant_id.toString(),
      restaurant_name: (restaurant as any)?.name || 'Dal Ghar',
      public_url: publicUrl,
      qr_image_data_url: qrImageDataUrl,
      is_active: true,
      generated_at: generatedAt,
    };
  }

  // =========================================================================
  // PUBLIC DIGITAL MENU ENDPOINTS
  // =========================================================================

  /**
   * Resolve Table by validated QR Token
   */
  static async resolveTableByToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new ApiError(400, 'QR Token is required');
    }

    const tokenHash = this.hashToken(token);
    // Find table by hash or direct token fallback
    const table = await DiningTable.findOne({
      $or: [
        { 'qr_code.token_hash': tokenHash },
        { 'qr_code.token': token },
      ],
      'qr_code.is_active': true,
      is_active: true,
    });

    if (!table) {
      throw new ApiError(404, 'Invalid, inactive or revoked QR code');
    }

    const [branch, restaurant] = await Promise.all([
      Branch.findById(table.branch_id).lean(),
      Restaurant.findById(table.restaurant_id).lean(),
    ]);

    if (!branch || (branch as any).operatingStatus !== 'ACTIVE') {
      throw new ApiError(400, 'This restaurant branch is currently not accepting orders');
    }

    return {
      table: {
        id: table._id.toString(),
        table_number: table.table_number,
        display_name: table.display_name || `Table ${table.table_number}`,
        capacity: table.capacity,
        current_status: table.current_status,
      },
      branch: {
        id: branch._id.toString(),
        name: (branch as any).name,
        code: (branch as any).code,
        address: (branch as any).address,
        currency: (branch as any).configuration?.currency || (restaurant as any)?.configuration?.currency || 'INR',
        taxRate: (branch as any).configuration?.defaultTaxRate ?? (restaurant as any)?.configuration?.defaultTaxRate ?? 5,
      },
      restaurant: {
        id: restaurant ? restaurant._id.toString() : '',
        name: (restaurant as any)?.name || 'Dal Ghar',
        logo: (restaurant as any)?.logo?.url || '/qr-menu-assets/dalgharlogo.png',
      },
    };
  }

  /**
   * Get Published Digital Menu for the Scanned Table
   */
  static async getDigitalMenuByToken(token: string) {
    const tableResolution = await this.resolveTableByToken(token);
    const branchId = new Types.ObjectId(tableResolution.branch.id);
    const restaurantId = tableResolution.restaurant.id ? new Types.ObjectId(tableResolution.restaurant.id) : null;

    // 1. Resolve Active Menus assigned to this branch
    const branchAssignments = await MenuBranchAssignment.find({
      branchId,
      status: 'ACTIVE',
    }).lean();

    let menuIds = branchAssignments.map((ba) => ba.menuId);

    // If no branch-specific menu, check restaurant assignments
    if (menuIds.length === 0 && restaurantId) {
      const restAssignments = await MenuRestaurantAssignment.find({
        restaurantId,
        status: 'ACTIVE',
      }).lean();
      menuIds = restAssignments.map((ra) => ra.menuId);
    }

    // Fallback: If still empty, find any ACTIVE published Menu
    if (menuIds.length === 0) {
      const defaultMenus = await Menu.find({ status: { $in: ['active', 'ACTIVE'] } }).limit(5).lean();
      menuIds = defaultMenus.map((m) => m._id);
    }

    // 2. Fetch Categories
    const categories = await MenuCategory.find({
      $or: [
        { menuId: { $in: menuIds } },
        { menuId: null },
      ],
      status: { $in: ['active', 'ACTIVE'] },
    })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // 3. Fetch Available Menu Items
    const itemsFilter: any = {
      isAvailable: true,
      status: { $in: ['active', 'ACTIVE'] },
      deletedAt: null,
    };

    if (menuIds.length > 0) {
      itemsFilter.$or = [
        { menuId: { $in: menuIds } },
        { branchId },
        { restaurantId },
        { menuId: null },
      ];
    }

    const rawItems = await MenuItem.find(itemsFilter)
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Format categories & nest items
    const categoryMap = new Map<string, any>();

    categories.forEach((cat) => {
      categoryMap.set(cat._id.toString(), {
        id: cat._id.toString(),
        name: cat.name,
        code: cat.code || '',
        description: cat.description || '',
        imageUrl: cat.imageUrl || null,
        items: [],
      });
    });

    // Also prepare fallback category for unassigned items
    const defaultCatKey = 'all-delights';
    const defaultCategory = {
      id: defaultCatKey,
      name: 'Dal Ghar Specialties',
      code: 'SPECIALTIES',
      description: 'Handcrafted signature recipes',
      imageUrl: null,
      items: [] as any[],
    };

    for (const item of rawItems) {
      const formattedItem = {
        id: item._id.toString(),
        name: item.name,
        code: item.code || '',
        description: item.description || '',
        category: item.category,
        itemType: item.itemType || 'VEG',
        price: item.price,
        discountPrice: item.discountPrice || item.price,
        imageUrl: item.imageUrl || '/qr-menu-assets/dummy-dish.jpg',
        isAvailable: item.isAvailable,
        preparationTime: item.preparationTime || 15,
        variants: item.variants || [],
        addons: item.addons || [],
      };

      const catId = item.categoryId ? item.categoryId.toString() : null;
      if (catId && categoryMap.has(catId)) {
        categoryMap.get(catId).items.push(formattedItem);
      } else {
        defaultCategory.items.push(formattedItem);
      }
    }

    const formattedCategories = Array.from(categoryMap.values()).filter((c) => c.items.length > 0);
    if (defaultCategory.items.length > 0) {
      formattedCategories.unshift(defaultCategory);
    }

    return {
      table: tableResolution.table,
      branch: tableResolution.branch,
      restaurant: tableResolution.restaurant,
      categories: formattedCategories,
      total_items: rawItems.length,
    };
  }

  // =========================================================================
  // PUBLIC ORDER SUBMISSION (Integrates directly into PosOrder)
  // =========================================================================

  /**
   * Submit an order directly from the QR menu into the Dal Ghar POS system
   */
  static async submitQrOrder(
    token: string,
    orderInput: {
      customer_name: string;
      customer_phone: string;
      items: Array<{
        item_id: string;
        quantity: number;
        notes?: string;
        addons?: Array<{ name: string; price: number }>;
      }>;
      notes?: string;
      payment_method?: 'CASH' | 'UPI' | 'CARD';
      idempotency_key?: string;
    }
  ) {
    // 1. Authoritative Table & Branch Resolution
    const tableResolution = await this.resolveTableByToken(token);
    const branchId = new Types.ObjectId(tableResolution.branch.id);
    const restaurantId = new Types.ObjectId(tableResolution.restaurant.id);
    const tableNumber = tableResolution.table.table_number;

    // Idempotency check: If an idempotency key was sent and processed within the last 2 minutes, return it
    if (orderInput.idempotency_key) {
      const existing = await PosOrder.findOne({
        notes: { $regex: orderInput.idempotency_key },
        branchId,
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Normalize and Validate Customer Information
    const rawPhone = orderInput.customer_phone?.trim().replace(/[^0-9]/g, '') || '';
    if (rawPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }
    const normalizedPhone = rawPhone.slice(-10);
    const customerName = orderInput.customer_name?.trim() || 'Guest Customer';

    // 3. Validate Items and Compute Authoritative Server-Side Prices
    if (!orderInput.items || orderInput.items.length === 0) {
      throw new ApiError(400, 'Your cart is empty. Please select at least one item');
    }

    const itemIds = orderInput.items.map((i) => new Types.ObjectId(i.item_id));
    const dbItems = await MenuItem.find({
      _id: { $in: itemIds },
      isAvailable: true,
      deletedAt: null,
    }).lean();

    const dbItemMap = new Map<string, any>();
    dbItems.forEach((itm) => dbItemMap.set(itm._id.toString(), itm));

    let calculatedSubtotal = 0;
    const orderItems: any[] = [];

    for (const line of orderInput.items) {
      const found = dbItemMap.get(line.item_id);
      if (!found) {
        throw new ApiError(400, `Selected item (${line.item_id}) is currently unavailable or inactive`);
      }

      const qty = Math.max(1, Math.floor(line.quantity));
      const authoritativeUnitPrice = found.discountPrice || found.price;
      const lineSubtotal = authoritativeUnitPrice * qty;
      calculatedSubtotal += lineSubtotal;

      orderItems.push({
        itemId: found._id.toString(),
        name: found.name,
        quantity: qty,
        price: authoritativeUnitPrice,
        subtotal: lineSubtotal,
        notes: line.notes || null,
        kitchenStatus: 'pending',
        kot_round: 1,
        addons: line.addons || [],
      });
    }

    // Calculate Tax & Final Server Total
    const taxRatePercent = tableResolution.branch.taxRate || 5;
    const calculatedTax = Math.round(((calculatedSubtotal * taxRatePercent) / 100) * 100) / 100;
    const calculatedTotal = calculatedSubtotal + calculatedTax;

    // 4. Resolve Dedicated / Active Branch POS Terminal & Shift
    let terminal = await PosTerminal.findOne({
      branch_id: branchId,
      terminal_type: 'MANAGER',
      status: 'active',
    });
    if (!terminal) {
      terminal = await PosTerminal.findOne({
        branch_id: branchId,
        status: 'active',
      });
    }
    const terminalId = terminal?.terminal_code || 'POS-MANAGER-01';
    const terminalName = terminal?.terminal_name || 'Manager Terminal';

    // Shift resolution
    const openShift = await CashierShift.findOne({
      branch_id: branchId,
      status: 'open',
    });
    const shiftId = openShift ? openShift._id.toString() : 'SHIFT-QR-01';

    // 5. Generate Order Number
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `QR-${dateStr}-${randomSuffix}`;

    // 6. Create POS Order with PENDING_APPROVAL for Manager Review & KOT Dispatch
    const newOrder = await PosOrder.create({
      orderNumber,
      restaurantId,
      branchId,
      terminalId,
      terminalName,
      cashierId: restaurantId, // Scoped to restaurant anchor
      cashierName: 'Digital QR Menu',
      shiftId,
      table_number: tableNumber,
      customer_name: customerName,
      customer_phone: normalizedPhone,
      order_source: 'qr_menu',
      order_type: 'dine_in',
      kitchen_status: 'pending',
      approval_status: 'PENDING_APPROVAL',
      approval_reason: `Table ${tableNumber} QR Self-Order - Awaiting Manager Review`,
      items: orderItems,
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      discount: 0,
      total: calculatedTotal,
      paymentMethod: orderInput.payment_method || 'UPI',
      paymentStatus: 'PENDING',
      orderStatus: 'IN_PROGRESS',
      current_kot_round: 1,
      notes: orderInput.notes ? `${orderInput.notes} (QR Self-Order)` : 'Placed via Table QR Menu',
    });

    // 7. Update Table Status to 'occupied'
    await DiningTable.findByIdAndUpdate(tableResolution.table.id, {
      current_status: 'occupied',
    });

    return newOrder;
  }

  /**
   * Get public customer-facing order status (protects internal admin information)
   */
  static async getPublicOrderStatus(orderId: string) {
    let order: any = null;
    if (Types.ObjectId.isValid(orderId)) {
      order = await PosOrder.findById(orderId).lean();
    } else {
      order = await PosOrder.findOne({ orderNumber: orderId }).lean();
    }

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const [branch, restaurant] = await Promise.all([
      Branch.findById(order.branchId).lean(),
      Restaurant.findById(order.restaurantId).lean(),
    ]);

    return {
      order_id: order._id.toString(),
      order_number: order.orderNumber,
      table_number: order.table_number,
      order_type: order.order_type,
      order_status: order.orderStatus,
      kitchen_status: order.kitchen_status,
      approval_status: order.approval_status || 'NONE',
      payment_status: order.paymentStatus,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      items: (order.items || []).map((itm: any) => ({
        name: itm.name,
        quantity: itm.quantity,
        price: itm.price,
        subtotal: itm.subtotal,
        kitchenStatus: itm.kitchenStatus,
      })),
      created_at: order.createdAt,
      restaurant: {
        name: (restaurant as any)?.name || 'Dal Ghar',
      },
      branch: {
        name: (branch as any)?.name || 'Flagship Branch',
      },
    };
  }
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Settings, ISettings } from '../../models/Settings.js';
import { Restaurant } from '../../models/Restaurant.js';
import { User } from '../../models/User.js';
import { UpdateSettingsInput } from './settings.schemas.js';

export class SettingsService {
  /**
   * Helper to normalize restaurantId and branchId queries.
   */
  private static parseTenantQuery(restaurantId?: string | null, branchId?: string | null) {
    const filter: any = {};

    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
      filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }

    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    } else {
      filter.branchId = null;
    }

    return filter;
  }

  /**
   * READ: Get settings for active restaurant (and optional branch) or fallback to active restaurant details
   */
  static async getSettings(restaurantId?: string | null, branchId?: string | null): Promise<ISettings> {
    // If no valid restaurantId provided, pick the first active restaurant in DB
    let targetRestaurant = null;
    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
      targetRestaurant = await Restaurant.findById(restaurantId);
    }
    if (!targetRestaurant) {
      targetRestaurant = await Restaurant.findOne();
    }

    if (!targetRestaurant) {
      throw new Error('No restaurant found to load settings for.');
    }

    const filter = this.parseTenantQuery(targetRestaurant._id.toString(), branchId);

    let settings = await Settings.findOne(filter);

    // If not found, CREATE default settings record populated from restaurant
    if (!settings) {
      settings = await Settings.create({
        restaurantId: targetRestaurant._id,
        branchId: filter.branchId,
        general: {
          brandName: targetRestaurant.name || 'Dal Ghar',
          brandCode: targetRestaurant.code || 'DG-HQ',
          tagline: 'Signature Dal - Dal Ghar Ki Pehchan',
          supportEmail: targetRestaurant.contact?.email || 'contact@dalghar.com',
          supportPhone: targetRestaurant.contact?.phone || '9876543210',
          defaultLanguage: 'en',
        },
        tax: {
          currency: targetRestaurant.configuration?.currency || 'INR',
          timezone: targetRestaurant.configuration?.timezone || 'Asia/Kolkata',
          taxEnabled: targetRestaurant.configuration?.taxEnabled ?? true,
          gstRate: targetRestaurant.configuration?.defaultTaxRate ?? 5,
          serviceChargeEnabled: false,
          serviceChargeRate: 5,
          invoicePrefix: `${targetRestaurant.code || 'DG'}-INV-`,
          nextInvoiceNumber: 1001,
        },
        pos: {
          paperWidth: '80mm',
          autoPrintReceipt: true,
          autoPrintKOT: true,
          receiptHeader: targetRestaurant.name?.toUpperCase() || 'DAL GHAR RESTAURANT & DHABA',
          receiptFooter: 'Thank you for dining with us! Visit again soon ❤️',
          showFssaiNumber: true,
          fssaiNumber: '10019011006543',
        },
        notifications: {
          whatsappBillDispatch: true,
          smsOrderAlerts: true,
          dailySalesEmail: true,
          lowStockThreshold: 15,
        },
      });
    }

    return settings;
  }

  /**
   * UPDATE (or CREATE if not yet existing): Update section(s) or complete settings
   */
  static async updateSettings(
    restaurantId: string | null | undefined,
    branchId: string | null | undefined,
    data: UpdateSettingsInput,
    userId?: string
  ): Promise<ISettings> {
    const existing = await this.getSettings(restaurantId, branchId);

    if (data.general) {
      existing.general = { ...existing.general, ...data.general };
    }
    if (data.tax) {
      existing.tax = { ...existing.tax, ...data.tax };
    }
    if (data.pos) {
      existing.pos = { ...existing.pos, ...data.pos };
    }
    if (data.notifications) {
      existing.notifications = { ...existing.notifications, ...data.notifications };
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      existing.updatedBy = new mongoose.Types.ObjectId(userId);
    }

    await existing.save();
    return existing;
  }

  /**
   * RESET (DELETE/RESTORE defaults): Clears custom settings for tenant and reinitializes with defaults
   */
  static async resetSettings(
    restaurantId: string | null | undefined,
    branchId: string | null | undefined
  ): Promise<ISettings> {
    let targetRestaurant = null;
    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
      targetRestaurant = await Restaurant.findById(restaurantId);
    }
    if (!targetRestaurant) {
      targetRestaurant = await Restaurant.findOne();
    }
    if (!targetRestaurant) {
      throw new Error('No restaurant found to reset settings for.');
    }

    const filter = this.parseTenantQuery(targetRestaurant._id.toString(), branchId);
    await Settings.deleteOne(filter);

    // Re-initialize default record
    return this.getSettings(targetRestaurant._id.toString(), branchId);
  }

  /**
   * Update authenticated user password
   */
  static async updatePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new Error('User not found.');
    }

    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
      if (!isMatch) {
        throw new Error('Current password does not match.');
      }
    }

    user.passwordHash = await bcrypt.hash(newPass, 10);
    await user.save();
  }
}

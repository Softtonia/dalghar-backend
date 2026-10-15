import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { SettingsService } from './settings.service.js';
import { updateSettingsSchema, changePasswordSchema } from './settings.schemas.js';

export class SettingsController {
  private static extractTenantHeaders(req: AuthenticatedRequest) {
    const restaurantId =
      (req.headers['x-restaurant-id'] as string) ||
      (req.query.restaurantId as string) ||
      req.user?.restaurantId ||
      null;

    const branchId =
      (req.headers['x-branch-id'] as string) ||
      (req.query.branchId as string) ||
      req.user?.branchId ||
      null;

    return { restaurantId, branchId };
  }

  /**
   * GET /api/settings
   * Returns active tenant settings
   */
  static async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, branchId } = SettingsController.extractTenantHeaders(req);
      const settings = await SettingsService.getSettings(restaurantId, branchId);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/settings or PATCH /api/settings
   * Update all or partial settings configuration
   */
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateSettingsSchema.parse(req.body);
      const { restaurantId, branchId } = SettingsController.extractTenantHeaders(req);

      const updated = await SettingsService.updateSettings(
        restaurantId,
        branchId,
        parsed,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/settings/reset
   * Reset settings to standard restaurant defaults
   */
  static async reset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, branchId } = SettingsController.extractTenantHeaders(req);
      const resetData = await SettingsService.resetSettings(restaurantId, branchId);

      res.status(200).json({
        success: true,
        message: 'Settings reset to factory defaults successfully',
        data: resetData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/settings/change-password
   * Update authenticated user's credentials
   */
  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      await SettingsService.updatePassword(req.user.userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

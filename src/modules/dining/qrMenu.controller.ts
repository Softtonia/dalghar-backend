import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { QrMenuService } from './qrMenu.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { z } from 'zod';

export const submitQrOrderSchema = z.object({
  customer_name: z.string().min(1, 'Name is required'),
  customer_phone: z.string().min(10, 'Valid 10-digit mobile number is required'),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1, 'Item ID is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        notes: z.string().optional(),
        addons: z
          .array(
            z.object({
              name: z.string(),
              price: z.number(),
            })
          )
          .optional(),
      })
    )
    .min(1, 'At least one item is required'),
  notes: z.string().optional(),
  payment_method: z.enum(['CASH', 'UPI', 'CARD']).optional(),
  idempotency_key: z.string().optional(),
});

export class QrMenuController {
  // ==========================================
  // ADMIN QR MANAGEMENT
  // ==========================================

  static getTableQr = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tableId = Array.isArray(req.params.tableId) ? req.params.tableId[0] : req.params.tableId;
      if (!tableId) throw new ApiError(400, 'Table ID is required');

      const data = await QrMenuService.getOrCreateTableQr(tableId, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Table QR code retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  static regenerateTableQr = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tableId = Array.isArray(req.params.tableId) ? req.params.tableId[0] : req.params.tableId;
      if (!tableId) throw new ApiError(400, 'Table ID is required');

      const data = await QrMenuService.regenerateTableQr(tableId, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Table QR code regenerated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // PUBLIC DIGITAL MENU ENDPOINTS
  // ==========================================

  static getPublicTableDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      if (!token) throw new ApiError(400, 'QR Token is required');

      const data = await QrMenuService.resolveTableByToken(token);
      res.status(200).json({
        success: true,
        data,
        message: 'Table information resolved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  static getPublicDigitalMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      if (!token) throw new ApiError(400, 'QR Token is required');

      const data = await QrMenuService.getDigitalMenuByToken(token);
      res.status(200).json({
        success: true,
        data,
        message: 'Digital menu loaded successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  static submitPublicOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      if (!token) throw new ApiError(400, 'QR Token is required');

      const input = submitQrOrderSchema.parse(req.body);
      const order = await QrMenuService.submitQrOrder(token, input);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order placed successfully and sent to manager review',
      });
    } catch (error) {
      next(error);
    }
  };

  static getPublicOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      if (!orderId) throw new ApiError(400, 'Order ID is required');

      const data = await QrMenuService.getPublicOrderStatus(orderId);
      res.status(200).json({
        success: true,
        data,
        message: 'Order status retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { RestaurantService } from './restaurant.service.js';
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  updateRestaurantStatusSchema,
  listQuerySchema,
} from './schemas/restaurantApiSchemas.js';
import { ApiError } from '../../utils/ApiError.js';

export class RestaurantController {
  /**
   * GET /api/restaurants
   * Handles paginated list of restaurants with filtering & sorting
   */
  static list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const query = listQuerySchema.parse(req.query);
      const result = await RestaurantService.listRestaurants(query, req.user);

      res.status(200).json({
        success: true,
        data: result.restaurants,
        pagination: result.pagination,
        message: 'Restaurants retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/restaurants/:id
   * Handles fetching single restaurant details
   */
  static getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const restaurant = await RestaurantService.getRestaurantById(id, req.user);

      res.status(200).json({
        success: true,
        data: restaurant,
        message: 'Restaurant details retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/restaurants
   * Handles creating a new restaurant (Super Admin only)
   */
  static create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const validatedInput = createRestaurantSchema.parse(req.body);
      const restaurant = await RestaurantService.createRestaurant(validatedInput, req.user.userId);

      res.status(201).json({
        success: true,
        data: restaurant,
        message: 'Restaurant created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/restaurants/:id
   * Handles updating restaurant configuration & information
   */
  static update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const validatedInput = updateRestaurantSchema.parse(req.body);
      const restaurant = await RestaurantService.updateRestaurant(id, validatedInput, req.user);

      res.status(200).json({
        success: true,
        data: restaurant,
        message: 'Restaurant updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/restaurants/:id/status
   * Handles toggling operating status ('ACTIVE' | 'INACTIVE')
   */
  static updateStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const { operatingStatus } = updateRestaurantStatusSchema.parse(req.body);

      const restaurant = await RestaurantService.updateRestaurantStatus(id, operatingStatus, req.user);

      res.status(200).json({
        success: true,
        data: restaurant,
        message: 'Restaurant status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/restaurants/:id
   * Handles deleting a restaurant and cascading branches
   */
  static delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      await RestaurantService.deleteRestaurant(id, req.user);

      res.status(200).json({
        success: true,
        message: 'Restaurant deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/restaurants/summary/stats
   * Handles summary KPI card statistics
   */
  static getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const stats = await RestaurantService.getSummaryStats(req.user);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Restaurant summary statistics retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

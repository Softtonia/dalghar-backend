import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { DiningService } from './dining.service.js';
import {
  createDiningAreaSchema,
  updateDiningAreaSchema,
  listDiningAreaQuerySchema,
  createDiningTableSchema,
  updateDiningTableSchema,
  changeTableStatusSchema,
  listDiningTableQuerySchema,
  checkTableAvailabilityQuerySchema,
} from './dining.validation.js';
import { ApiError } from '../../utils/ApiError.js';

export class DiningController {
  // =========================================================================
  // DINING AREAS
  // =========================================================================

  /**
   * POST /dining-areas
   */
  static createArea = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const input = createDiningAreaSchema.parse(req.body);
      const area = await DiningService.createArea(input, req.user);
      res.status(201).json({
        success: true,
        data: area,
        message: 'Dining area created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-areas
   */
  static listAreas = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const query = listDiningAreaQuerySchema.parse(req.query);
      const result = await DiningService.listAreas(query, req.user);
      res.status(200).json({
        success: true,
        data: result.areas,
        pagination: result.pagination,
        message: 'Dining areas retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-areas/:id
   */
  static getAreaById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const area = await DiningService.getAreaById(id, req.user);
      res.status(200).json({
        success: true,
        data: area,
        message: 'Dining area details retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /dining-areas/:id
   */
  static updateArea = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const input = updateDiningAreaSchema.parse(req.body);
      const area = await DiningService.updateArea(id, input, req.user);
      res.status(200).json({
        success: true,
        data: area,
        message: 'Dining area updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /dining-areas/:id
   */
  static deleteArea = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const result = await DiningService.deleteArea(id, req.user);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-areas/:id/tables
   */
  static getAreaTables = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const tables = await DiningService.getAreaTables(id, req.user);
      res.status(200).json({
        success: true,
        data: tables,
        message: 'Area tables retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-areas/:id/occupancy
   */
  static getAreaOccupancy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const occupancy = await DiningService.getAreaOccupancy(id, req.user);
      res.status(200).json({
        success: true,
        data: occupancy,
        message: 'Area occupancy retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // =========================================================================
  // DINING TABLES
  // =========================================================================

  /**
   * POST /dining-tables
   */
  static createTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const input = createDiningTableSchema.parse(req.body);
      const table = await DiningService.createTable(input, req.user);
      res.status(201).json({
        success: true,
        data: table,
        message: 'Dining table created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-tables
   */
  static listTables = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const query = listDiningTableQuerySchema.parse(req.query);
      const result = await DiningService.listTables(query, req.user);
      res.status(200).json({
        success: true,
        data: result.tables,
        pagination: result.pagination,
        message: 'Dining tables retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-tables/:id
   */
  static getTableById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const table = await DiningService.getTableById(id, req.user);
      res.status(200).json({
        success: true,
        data: table,
        message: 'Dining table details retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /dining-tables/:id
   */
  static updateTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const input = updateDiningTableSchema.parse(req.body);
      const table = await DiningService.updateTable(id, input, req.user);
      res.status(200).json({
        success: true,
        data: table,
        message: 'Dining table updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /dining-tables/:id
   */
  static deleteTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const result = await DiningService.deleteTable(id, req.user);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /dining-tables/:id/status
   */
  static changeTableStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const input = changeTableStatusSchema.parse(req.body);
      const result = await DiningService.changeTableStatus(id, input, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: `Table status changed to ${input.status}`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-tables/:id/status-history
   */
  static getStatusHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const result = await DiningService.getStatusHistory(id, req.user, page, limit);
      res.status(200).json({
        success: true,
        data: result.history,
        table_number: result.table_number,
        pagination: result.pagination,
        message: 'Status history retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-tables/:id/sessions
   */
  static getTableSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const result = await DiningService.getTableSessions(id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Table occupancy sessions retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-tables/:id/orders
   */
  static getTableOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const result = await DiningService.getTableOrders(id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Table assigned orders retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /dining-tables/:id/availability
   */
  static checkAvailability = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new ApiError(401, 'Authentication required');
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const query = checkTableAvailabilityQuerySchema.parse(req.query);
      const result = await DiningService.checkAvailability(id, query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Table availability evaluated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

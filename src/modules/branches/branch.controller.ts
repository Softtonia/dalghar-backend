import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { BranchService } from './branch.service.js';
import {
  createBranchSchema,
  updateBranchSchema,
  updateBranchStatusSchema,
  listBranchQuerySchema,
} from './schemas/branchApiSchemas.js';
import { ApiError } from '../../utils/ApiError.js';

export class BranchController {
  /**
   * GET /api/branches
   * List branches with filtering & pagination
   */
  static list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const query = listBranchQuerySchema.parse(req.query);
      const result = await BranchService.listBranches(query, req.user);

      res.status(200).json({
        success: true,
        data: result.branches,
        pagination: result.pagination,
        message: 'Branches retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/branches/:id
   * Fetch single branch by ID
   */
  static getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const branch = await BranchService.getBranchById(id, req.user);

      res.status(200).json({
        success: true,
        data: branch,
        message: 'Branch details retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/branches
   * Create a new branch
   */
  static create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const validatedInput = createBranchSchema.parse(req.body);
      const branch = await BranchService.createBranch(validatedInput, req.user.userId);

      res.status(201).json({
        success: true,
        data: branch,
        message: 'Branch outlet created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/branches/:id
   * Update branch details
   */
  static update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const validatedInput = updateBranchSchema.parse(req.body);
      const branch = await BranchService.updateBranch(id, validatedInput, req.user);

      res.status(200).json({
        success: true,
        data: branch,
        message: 'Branch outlet updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/branches/:id/status
   * Update branch operating status ('ACTIVE' | 'INACTIVE')
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
      const { operatingStatus } = updateBranchStatusSchema.parse(req.body);

      const branch = await BranchService.updateBranchStatus(id, operatingStatus, req.user);

      res.status(200).json({
        success: true,
        data: branch,
        message: 'Branch status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/branches/:id
   * Delete a branch entity
   */
  static delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      await BranchService.deleteBranch(id, req.user);

      res.status(200).json({
        success: true,
        data: null,
        message: 'Branch outlet deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

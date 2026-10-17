import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { UserService } from './user.service.js';
import { createUserSchema, updateUserSchema, listUserQuerySchema } from './user.schemas.js';

export class UserController {
  /**
   * GET /api/users
   */
  static list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = listUserQuerySchema.parse(req.query);
      const result = await UserService.listUsers(query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/users/:id
   */
  static getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const user = await UserService.getUserById(id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/users
   */
  static create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createUserSchema.parse(req.body);
      const user = await UserService.createUser(body, req.user?.userId);
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully and welcome credentials email sent.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/users/:id
   */
  static update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const body = updateUserSchema.parse(req.body);
      const user = await UserService.updateUser(id, body, req.user?.userId);
      res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/users/:id
   */
  static delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const result = await UserService.deleteUser(id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };
}

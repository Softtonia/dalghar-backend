import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { RoleService } from './role.service.js';
import { createRoleSchema, updateRoleSchema, assignRoleSchema } from './role.schemas.js';

export class RoleController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await RoleService.listRoles({ search, isActive, page, limit });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const role = await RoleService.getRoleById(id);
      res.status(200).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createRoleSchema.parse(req.body);
      const role = await RoleService.createRole(validated);
      res.status(201).json({ success: true, data: role, message: 'Role created successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const validated = updateRoleSchema.parse(req.body);
      const role = await RoleService.updateRole(id, validated);
      res.status(200).json({ success: true, data: role, message: 'Role updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await RoleService.deleteRole(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updatePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const permissions = Array.isArray(req.body.permissions)
        ? req.body.permissions
        : Array.isArray(req.body)
        ? req.body
        : [];
      const role = await RoleService.updateRolePermissions(id, permissions);
      res.status(200).json({ success: true, data: role, message: 'Role permissions updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getPermissions(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await RoleService.getAvailablePermissions();
      res.status(200).json({ success: true, data: permissions });
    } catch (error) {
      next(error);
    }
  }

  static async assignRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = assignRoleSchema.parse(req.body);
      const assignedBy = req.user?.userId;
      const assignment = await RoleService.assignRoleToUser(validated, assignedBy);
      res.status(200).json({ success: true, data: assignment, message: 'Role assigned successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async removeRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      const roleId = String(req.params.roleId);
      const result = await RoleService.removeRoleFromUser(userId, roleId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getUserRoles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      const roles = await RoleService.getUserRoles(userId);
      res.status(200).json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  static async getUsersByRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const users = await RoleService.getUsersByRole(id);
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }
}

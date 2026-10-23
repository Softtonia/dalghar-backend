import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UserRole } from '../models/User.js';
import { ROLE_PERMISSIONS } from '../config/permissions.js';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  restaurantId?: string | null;
  branchId?: string | null;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    if (config.env === 'development' && (token === 'demo_token_123' || token === 'demo_token')) {
      req.user = {
        userId: '6aa41caaaffc77879736147b',
        email: 'sales@softtonia.com',
        role: 'SUPER_ADMIN',
        restaurantId: null,
        branchId: null,
        permissions: ['*'],
      };
      return next();
    }

    const decoded = jwt.verify(token, config.jwtAccessSecret) as AuthJwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
  effectivePermissions?: string[];
}

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: Insufficient role permissions' });
      return;
    }

    next();
  };
};

/**
 * Fine-grained RBAC permission checking middleware.
 * Super Admin bypasses checks.
 * Dynamically queries current permissions from User, assigned Role(s), and direct allows/denials
 * so that any permission updates made by the admin take effect immediately without requiring re-login.
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
        return;
      }

      const { User } = await import('../models/User.js');
      const { calculateUserEffectivePermissions, checkPermissionSatisfied } = await import(
        '../utils/permissionUtils.js'
      );

      const dbUser = await User.findById(req.user.userId);
      if (!dbUser || !dbUser.isActive) {
        res.status(401).json({ success: false, message: 'Account not found or has been disabled.' });
        return;
      }

      // Calculate authoritative live effective permissions
      const permResult = await calculateUserEffectivePermissions(dbUser);
      req.effectivePermissions = permResult.effectivePermissions;

      // Super Admin bypass
      if (
        req.user.role === 'SUPER_ADMIN' ||
        permResult.effectivePermissions.includes('*')
      ) {
        return next();
      }

      // Check all required permissions
      const hasPermission = requiredPermissions.every((perm) =>
        checkPermissionSatisfied(permResult.effectivePermissions, perm)
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Forbidden: Missing required permission(s) [${requiredPermissions.join(', ')}]`,
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Check if user has ANY of the specified permissions.
 * Super Admin bypasses checks.
 */
export const requireAnyPermission = (...allowedPermissions: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
        return;
      }

      const { User } = await import('../models/User.js');
      const { calculateUserEffectivePermissions, checkPermissionSatisfied } = await import(
        '../utils/permissionUtils.js'
      );

      const dbUser = await User.findById(req.user.userId);
      if (!dbUser || !dbUser.isActive) {
        res.status(401).json({ success: false, message: 'Account not found or has been disabled.' });
        return;
      }

      // Calculate authoritative live effective permissions
      const permResult = await calculateUserEffectivePermissions(dbUser);
      req.effectivePermissions = permResult.effectivePermissions;

      // Super Admin bypass
      if (
        req.user.role === 'SUPER_ADMIN' ||
        permResult.effectivePermissions.includes('*')
      ) {
        return next();
      }

      // Check if user has ANY of the specified permissions
      const hasPermission = allowedPermissions.some((perm) =>
        checkPermissionSatisfied(permResult.effectivePermissions, perm)
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Forbidden: Missing required permission (requires one of: [${allowedPermissions.join(', ')}])`,
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};


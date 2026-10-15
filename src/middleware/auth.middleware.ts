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
 * Super Admin bypasses checks. Other roles check ROLE_PERMISSIONS or custom granted permissions.
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
      return;
    }

    // Super Admin bypasses individual permission checks
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const userPermissions = req.user.permissions || ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = requiredPermissions.every(
      (perm) => userPermissions.includes(perm) || userPermissions.includes('*') || userPermissions.includes('restaurant.*')
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Missing required permission(s) [${requiredPermissions.join(', ')}]`,
      });
      return;
    }

    next();
  };
};

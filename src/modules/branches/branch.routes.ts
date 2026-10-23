import { Router } from 'express';
import { authenticate, requirePermission, requireAnyPermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { BranchController } from './branch.controller.js';

const router = Router();

// List branches (Enforces branch.view or branch.create permission so creators can view the dashboard)
router.get('/', authenticate, requireAnyPermission(PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_CREATE), BranchController.list);

// Get single branch details by ID (Enforces branch.view or branch.create permission)
router.get('/:id', authenticate, requireAnyPermission(PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_CREATE), BranchController.getById);

// Create branch (Enforces branch.create permission)
router.post('/', authenticate, requirePermission(PERMISSIONS.BRANCH_CREATE), BranchController.create);

// Update branch details (Enforces branch.update permission - supports PATCH and PUT)
router.patch('/:id', authenticate, requirePermission(PERMISSIONS.BRANCH_UPDATE), BranchController.update);
router.put('/:id', authenticate, requirePermission(PERMISSIONS.BRANCH_UPDATE), BranchController.update);

// Update operating status (Enforces branch.update permission)
router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.BRANCH_UPDATE), BranchController.updateStatus);

// Delete branch (Enforces branch.delete permission)
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.BRANCH_DELETE), BranchController.delete);

export const branchRoutes = router;

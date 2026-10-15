import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { BranchController } from './branch.controller.js';

const router = Router();

// List branches (Enforces branch.view permission)
router.get('/', authenticate, requirePermission(PERMISSIONS.BRANCH_VIEW), BranchController.list);

// Get single branch details by ID (Enforces branch.view permission)
router.get('/:id', authenticate, requirePermission(PERMISSIONS.BRANCH_VIEW), BranchController.getById);

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

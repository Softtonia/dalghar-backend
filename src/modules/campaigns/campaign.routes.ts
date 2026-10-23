import { Router } from 'express';
import { CampaignService } from './campaign.service.js';
import { authenticate, requirePermission, requireAnyPermission } from '../../middleware/auth.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/campaigns
router.get(
  '/',
  requireAnyPermission(PERMISSIONS.CAMPAIGNS_VIEW, PERMISSIONS.CAMPAIGNS_MANAGE),
  async (req, res, next) => {
    try {
      const { search, status, sendType } = req.query;
      const campaigns = await CampaignService.listCampaigns({
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? status : undefined,
        sendType: typeof sendType === 'string' ? sendType : undefined,
      });
      res.json({ success: true, data: campaigns });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/campaigns/:id
router.get(
  '/:id',
  requireAnyPermission(PERMISSIONS.CAMPAIGNS_VIEW, PERMISSIONS.CAMPAIGNS_MANAGE),
  async (req, res, next) => {
    try {
      const campaign = await CampaignService.getCampaignById(req.params.id as string);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/campaigns
router.post(
  '/',
  requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE),
  async (req, res, next) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id;
      const campaign = await CampaignService.createCampaign(req.body, userId);
      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/campaigns/:id
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE),
  async (req, res, next) => {
    try {
      const campaign = await CampaignService.updateCampaign(req.params.id as string, req.body);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/campaigns/:id
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE),
  async (req, res, next) => {
    try {
      const result = await CampaignService.deleteCampaign(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/campaigns/:id/launch
router.post(
  '/:id/launch',
  requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE),
  async (req, res, next) => {
    try {
      const result = await CampaignService.launchCampaign(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export const campaignRoutes = router;

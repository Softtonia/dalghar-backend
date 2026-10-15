import { Router } from 'express';
import { EmailTemplateService } from './email-template.service.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();

// Protect all email template endpoints: Only SUPER_ADMIN and RESTAURANT_ADMIN can manage email templates
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN', 'RESTAURANT_ADMIN'));

/**
 * GET /api/v1/email-templates
 * List all email templates
 */
router.get('/', async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const templates = await EmailTemplateService.listTemplates({ search, isActive });
    res.json({
      success: true,
      data: templates,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/email-templates/:id
 * Get single template by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const template = await EmailTemplateService.getTemplateById(req.params.id);
    res.json({
      success: true,
      data: template,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/email-templates
 * Create a new dynamic email template
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, key, subject, bodyHtml, description, variables, isActive } = req.body;
    if (!name || !key || !subject || !bodyHtml) {
      return res.status(400).json({
        success: false,
        message: 'Name, key, subject, and bodyHtml are required.',
      });
    }

    const template = await EmailTemplateService.createTemplate({
      name,
      key,
      subject,
      bodyHtml,
      description,
      variables,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Email template created successfully',
      data: template,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/email-templates/:id
 * Update an existing email template
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const template = await EmailTemplateService.updateTemplate(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Email template updated successfully',
      data: template,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/email-templates/:id
 * Delete a custom template
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await EmailTemplateService.deleteTemplate(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/email-templates/:id/test
 * Send a test email using this template
 */
router.post('/:id/test', async (req, res, next) => {
  try {
    const { recipient, sampleData } = req.body;
    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address is required for sending a test email.',
      });
    }

    const result = await EmailTemplateService.sendTestEmail(
      req.params.id,
      recipient,
      sampleData || {}
    );

    res.json({
      success: true,
      message: `Test email sent successfully to ${recipient}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export const emailTemplateRoutes = router;

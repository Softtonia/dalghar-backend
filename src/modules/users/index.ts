import { Router } from 'express';

const router = Router();

// Users module routes placeholder
router.get('/', (_req, res) => {
  res.json({ success: true, message: 'Users module placeholder' });
});

export const userRoutes = router;

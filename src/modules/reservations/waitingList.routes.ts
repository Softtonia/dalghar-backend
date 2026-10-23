import { Router } from 'express';
import { ReservationController } from './reservation.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Waiting list endpoints
router.post('/', ReservationController.createWaitingListEntry);
router.get('/', ReservationController.listWaitingList);
router.get('/:id', ReservationController.getWaitingListEntryById);
router.patch('/:id', ReservationController.updateWaitingListEntry);
router.delete('/:id', ReservationController.deleteWaitingListEntry);

// Action endpoints
router.post('/:id/notify', ReservationController.notifyGuest);
router.post('/:id/seat', ReservationController.seatWaitingListGuest);
router.post('/:id/no-show', ReservationController.markWaitingListNoShow);
router.post('/:id/cancel', ReservationController.cancelWaitingListEntry);

export const waitingListRoutes = router;

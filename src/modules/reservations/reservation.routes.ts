import { Router } from 'express';
import { ReservationController } from './reservation.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Special routes first
router.get('/availability', ReservationController.checkAvailability);

// CRUD
router.post('/', ReservationController.createReservation);
router.get('/', ReservationController.listReservations);
router.get('/:id', ReservationController.getReservationById);
router.patch('/:id', ReservationController.updateReservation);
router.delete('/:id', ReservationController.deleteReservation);

// Action endpoints
router.post('/:id/confirm', ReservationController.confirmReservation);
router.post('/:id/cancel', ReservationController.cancelReservation);
router.post('/:id/check-in', ReservationController.checkInReservation);
router.post('/:id/seat', ReservationController.seatReservation);
router.post('/:id/complete', ReservationController.completeReservation);
router.post('/:id/no-show', ReservationController.markNoShow);

// Table assignment sub-resource
router.get('/:id/table-assignments', ReservationController.getTableAssignments);
router.post('/:id/table-assignments', ReservationController.assignTables);
router.patch('/:id/table-assignments/:assignmentId', ReservationController.updateTableAssignment);

export const reservationRoutes = router;

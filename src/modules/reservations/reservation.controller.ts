import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ReservationService } from './reservation.service.js';
import {
  createReservationSchema,
  updateReservationSchema,
  listReservationsQuerySchema,
  cancelReservationSchema,
  seatReservationSchema,
  assignTablesSchema,
  updateTableAssignmentSchema,
  checkAvailabilityQuerySchema,
  createWaitingListEntrySchema,
  updateWaitingListEntrySchema,
  listWaitingListQuerySchema,
  seatWaitingListGuestSchema,
  cancelWaitingListSchema,
} from './reservation.validation.js';

export class ReservationController {
  // ==========================================
  // D. RESERVATIONS
  // ==========================================

  static createReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const input = createReservationSchema.parse(req.body);
      const result = await ReservationService.createReservation(input, req.user!);
      res.status(201).json({
        success: true,
        message: 'Table reservation created successfully',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to create table reservation',
        errors: err.errors || undefined,
      });
    }
  };

  static listReservations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const query = listReservationsQuerySchema.parse(req.query);
      const result = await ReservationService.listReservations(query, req.user!);
      res.status(200).json({
        success: true,
        data: result.reservations,
        pagination: result.pagination,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to fetch reservations',
      });
    }
  };

  static checkAvailability = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const query = checkAvailabilityQuerySchema.parse(req.query);
      const result = await ReservationService.checkAvailability(query, req.user!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to check table availability',
        errors: err.errors || undefined,
      });
    }
  };

  static getReservationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.getReservationById(id, req.user!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 404).json({
        success: false,
        message: err.message || 'Reservation not found',
      });
    }
  };

  static updateReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = updateReservationSchema.parse(req.body);
      const result = await ReservationService.updateReservation(id, input, req.user!);
      res.status(200).json({
        success: true,
        message: 'Reservation updated successfully',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update reservation',
      });
    }
  };

  static deleteReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.deleteReservation(id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Reservation cancelled safely',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to cancel reservation',
      });
    }
  };

  static confirmReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.confirmReservation(id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Reservation confirmed successfully',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to confirm reservation',
      });
    }
  };

  static cancelReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = cancelReservationSchema.parse(req.body);
      const result = await ReservationService.cancelReservation(
        id,
        input.cancellation_reason,
        req.user!
      );
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.reservation,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to cancel reservation',
      });
    }
  };

  static checkInReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.checkInReservation(id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Guest arrival recorded',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to record check-in',
      });
    }
  };

  static seatReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = seatReservationSchema.parse(req.body);
      const result = await ReservationService.seatReservation(id, input, req.user!);
      res.status(200).json({
        success: true,
        message: 'Guests seated and tables marked occupied',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to seat reservation',
      });
    }
  };

  static markNoShow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.markNoShow(id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Reservation marked as no-show',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update reservation',
      });
    }
  };

  static completeReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.completeReservation(id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Dining completed, tables released and marked for cleaning',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to complete reservation',
      });
    }
  };

  static getTableAssignments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.getTableAssignments(id, req.user!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to fetch table assignments',
      });
    }
  };

  static assignTables = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = assignTablesSchema.parse(req.body);
      const result = await ReservationService.assignTables(
        id,
        input.dining_table_ids,
        input.notes,
        req.user!
      );
      res.status(200).json({
        success: true,
        message: 'Tables assigned successfully',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to assign tables',
      });
    }
  };

  static updateTableAssignment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const assignmentId = req.params.assignmentId as string;
      const input = updateTableAssignmentSchema.parse(req.body);
      const result = await ReservationService.updateTableAssignment(
        id,
        assignmentId,
        input.assignment_status,
        input.notes,
        req.user!
      );
      res.status(200).json({
        success: true,
        message: 'Table assignment updated',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update table assignment',
      });
    }
  };

  // ==========================================
  // E. WAITING LIST
  // ==========================================

  static createWaitingListEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const input = createWaitingListEntrySchema.parse(req.body);
      const result = await ReservationService.createWaitingListEntry(input, req.user!);
      res.status(201).json({
        success: true,
        message: 'Walk-in guest added to waiting queue',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to add guest to waiting list',
        errors: err.errors || undefined,
      });
    }
  };

  static listWaitingList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const query = listWaitingListQuerySchema.parse(req.query);
      const result = await ReservationService.listWaitingList(query, req.user!);
      res.status(200).json({
        success: true,
        data: result.waiting_list,
        pagination: result.pagination,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to fetch waiting list',
      });
    }
  };

  static getWaitingListEntryById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.getWaitingListEntryById(id, req.user!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 404).json({
        success: false,
        message: err.message || 'Waiting list entry not found',
      });
    }
  };

  static updateWaitingListEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = updateWaitingListEntrySchema.parse(req.body);
      const result = await ReservationService.updateWaitingListEntry(id, input, req.user!);
      res.status(200).json({
        success: true,
        message: 'Waiting list entry updated',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update queue entry',
      });
    }
  };

  static deleteWaitingListEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.deleteWaitingListEntry(id, req.user!);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.entry,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to cancel queue entry',
      });
    }
  };

  static notifyGuest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.notifyGuest(id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Guest marked as notified',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to notify guest',
      });
    }
  };

  static seatWaitingListGuest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = seatWaitingListGuestSchema.parse(req.body);
      const result = await ReservationService.seatWaitingListGuest(id, input, req.user!);
      res.status(200).json({
        success: true,
        message: 'Guest seated and table marked occupied',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to seat waiting list guest',
      });
    }
  };

  static markWaitingListNoShow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.markWaitingListNoShow(id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Queue entry marked as no-show',
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update queue entry',
      });
    }
  };

  static cancelWaitingListEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = cancelWaitingListSchema.parse(req.body);
      const result = await ReservationService.cancelWaitingListEntry(id, input.reason, req.user!);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.entry,
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to cancel queue entry',
      });
    }
  };
}

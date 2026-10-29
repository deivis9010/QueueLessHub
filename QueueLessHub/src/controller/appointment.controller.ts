import type { NextFunction, Request, Response } from 'express';

import AppointmentService from '../services/appointment.service';

const getAllAppointments = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointments = await AppointmentService.getAll();
    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

const getAppointmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointmentId = req.params.id as string;
    const appointment = await AppointmentService.getById(appointmentId);
    if (!appointment) {
      res.status(404).json({ error: 'Cita no encontrada' });
      return;
    }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

const createAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointment = await AppointmentService.create(req.body as Record<string, unknown>);
    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointmentId = req.params.id as string;
    const appointment = await AppointmentService.update(
      appointmentId,
      req.body as Record<string, unknown>
    );
    if (!appointment) {
      res.status(404).json({ error: 'Cita no encontrada' });
      return;
    }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

const deleteAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointmentId = req.params.id as string;
    const appointment = await AppointmentService.remove(appointmentId);
    if (!appointment) {
      res.status(404).json({ error: 'Cita no encontrada' });
      return;
    }

    res.json({ message: 'Cita eliminada' });
  } catch (error) {
    next(error);
  }
};

const generateAppointmentsFromAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointments = await AppointmentService.generateAppointmentsFromAvailability(
      req.body.doctor || undefined,
      req.body.weeks
    );
    res.status(201).json(appointments);
  } catch (error) {
    next(error);
  }
};

const getFreeAppointmentsForDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorId = (req.params.doctorId || (req.body as { doctorId?: string }).doctorId) as
      | string
      | undefined;
    if (!doctorId) {
      res.status(400).json({ error: 'doctorId requerido' });
      return;
    }

    const appointments = await AppointmentService.getAllFreeAppointmentsForDoctor(doctorId);
    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

export default {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  generateAppointmentsFromAvailability,
  getFreeAppointmentsForDoctor,
};

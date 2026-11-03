import type { NextFunction, Request, Response } from 'express';

import DoctorService from '../services/doctor.service';

const createDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await DoctorService.create(req.body as Record<string, unknown>);
    res.status(201).json(doctor);
  } catch (error) {
    next(error);
  }
};

const getAllDoctors = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctors = await DoctorService.getAll();
    res.json(doctors);
  } catch (error) {
    next(error);
  }
};

const getDoctorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctorId = req.params.id as string;
    const doctor = await DoctorService.getById(doctorId);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor no encontrado' });
      return;
    }

    res.json(doctor);
  } catch (error) {
    next(error);
  }
};

const updateDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctorId = req.params.id as string;
    const doctor = await DoctorService.update(doctorId, req.body as Record<string, unknown>);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor no encontrado' });
      return;
    }

    res.json(doctor);
  } catch (error) {
    next(error);
  }
};

const deleteDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctorId = req.params.id as string;
    const doctor = await DoctorService.remove(doctorId);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor no encontrado' });
      return;
    }

    res.json({ message: 'Doctor eliminado' });
  } catch (error) {
    next(error);
  }
};

export default {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};

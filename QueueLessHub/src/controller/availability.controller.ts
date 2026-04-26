import type { NextFunction, Request, Response } from 'express';

import AvailabilityService from '../services/availability.service';

const createAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const availability = await AvailabilityService.create(req.body as Record<string, unknown>);
    res.status(201).json(availability);
  } catch (error) {
    next(error);
  }
};

const getAllAvailabilities = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const availabilities = await AvailabilityService.getAll();
    res.json(availabilities);
  } catch (error) {
    next(error);
  }
};

const getAvailabilityById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const availabilityId = req.params.id as string;
    const availability = await AvailabilityService.getById(availabilityId);
    if (!availability) {
      res.status(404).json({ error: 'Disponibilidad no encontrada' });
      return;
    }

    res.json(availability);
  } catch (error) {
    next(error);
  }
};

const updateAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const availabilityId = req.params.id as string;
    const availability = await AvailabilityService.update(
      availabilityId,
      req.body as Record<string, unknown>
    );
    if (!availability) {
      res.status(404).json({ error: 'Disponibilidad no encontrada' });
      return;
    }

    res.json(availability);
  } catch (error) {
    next(error);
  }
};

const deleteAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const availabilityId = req.params.id as string;
    const availability = await AvailabilityService.remove(availabilityId);
    if (!availability) {
      res.status(404).json({ error: 'Disponibilidad no encontrada' });
      return;
    }

    res.json({ message: 'Disponibilidad eliminada' });
  } catch (error) {
    next(error);
  }
};

export default {
  createAvailability,
  getAllAvailabilities,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
};

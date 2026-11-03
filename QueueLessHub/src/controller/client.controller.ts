import type { Request, Response } from 'express';

import ClientService from '../services/client.service';

const getAllClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clients = await ClientService.getAll();
    res.json(clients);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ error: message });
  }
};

const getClientById = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.id as string;
    const client = await ClientService.getById(clientId);
    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.json(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ error: message });
  }
};

const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await ClientService.create(req.body as Record<string, unknown>);
    res.status(201).json(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ error: message });
  }
};

const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.id as string;
    const client = await ClientService.update(clientId, req.body as Record<string, unknown>);
    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.json(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ error: message });
  }
};

const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.id as string;
    const client = await ClientService.remove(clientId);
    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ error: message });
  }
};

export default {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};

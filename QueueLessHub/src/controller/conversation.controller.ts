import type { NextFunction, Request, Response } from 'express';

import ConversationService from '../services/conversation.service';

const getAllConversations = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversations = await ConversationService.getAll();
    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

const getConversationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversationId = req.params.id as string;
    const conversation = await ConversationService.getById(conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversación no encontrada' });
      return;
    }

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversation = await ConversationService.create(req.body as Record<string, unknown>);
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

const updateConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversationId = req.params.id as string;
    const conversation = await ConversationService.update(
      conversationId,
      req.body as Record<string, unknown>
    );
    if (!conversation) {
      res.status(404).json({ error: 'Conversación no encontrada' });
      return;
    }

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

const deleteConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversationId = req.params.id as string;
    const conversation = await ConversationService.remove(conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversación no encontrada' });
      return;
    }

    res.json({ message: 'Conversación eliminada' });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
};

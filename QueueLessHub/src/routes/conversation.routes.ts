import express from 'express';

import conversationController from '../controller/conversation.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Conversations
 *     description: Conversation records
 */

/**
 * @openapi
 * /api/conversations:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Get all conversations
 *     responses:
 *       200:
 *         description: List of conversations
 *   post:
 *     tags:
 *       - Conversations
 *     summary: Create a conversation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Conversation'
 *     responses:
 *       201:
 *         description: Conversation created
 */
router.get('/', authMiddleware, conversationController.getAllConversations);
router.get('/:id', authMiddleware, conversationController.getConversationById);
router.post('/', authMiddleware, conversationController.createConversation);
router.put('/:id', authMiddleware, conversationController.updateConversation);
router.delete('/:id', authMiddleware, conversationController.deleteConversation);

/**
 * @openapi
 * /api/conversations/{id}:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Get conversation by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation object
 *   put:
 *     tags:
 *       - Conversations
 *     summary: Update conversation by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Conversation'
 *     responses:
 *       200:
 *         description: Conversation updated
 *   delete:
 *     tags:
 *       - Conversations
 *     summary: Delete conversation by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted
 */

export default router;

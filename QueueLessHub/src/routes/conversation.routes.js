const express = require('express');
const router = express.Router();
const conversationController = require('../controller/conversation.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Solo autenticados pueden acceder a conversaciones
router.get('/', authMiddleware, conversationController.getAllConversations);
router.get('/:id', authMiddleware, conversationController.getConversationById);
router.post('/', authMiddleware, conversationController.createConversation);
router.put('/:id', authMiddleware, conversationController.updateConversation);
router.delete('/:id', authMiddleware, conversationController.deleteConversation);

module.exports = router;

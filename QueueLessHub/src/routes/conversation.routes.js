const express = require('express');
const router = express.Router();
const conversationController = require('../controller/conversation.controller');

router.get('/', conversationController.getAllConversations);
router.get('/:id', conversationController.getConversationById);
router.post('/', conversationController.createConversation);
router.put('/:id', conversationController.updateConversation);
router.delete('/:id', conversationController.deleteConversation);

module.exports = router;

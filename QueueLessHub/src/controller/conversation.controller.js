const ConversationService = require('../services/conversation.service');

exports.getAllConversations = async (req, res) => {
  try {
    const conversations = await ConversationService.getAll();
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConversationById = async (req, res) => {
  try {
    const conversation = await ConversationService.getById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createConversation = async (req, res) => {
  try {
    const conversation = await ConversationService.create(req.body);
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateConversation = async (req, res) => {
  try {
    const conversation = await ConversationService.update(req.params.id, req.body);
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await ConversationService.remove(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });
    res.json({ message: 'Conversación eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

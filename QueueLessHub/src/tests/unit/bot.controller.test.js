const botController = require('../../controller/bot.controller');
const { handleChatFlow } = require('../../services/chatflow.service');
const axios = require('axios');

jest.mock('../../services/chatflow.service');
jest.mock('axios');

describe('Bot Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn(),
      json: jest.fn()
    };
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.WHATSAPP_TOKEN = 'test-token';
    process.env.PHONE_NUMBER_ID = '123456789';
  });

  describe('getWebhook', () => {
    it('should verify webhook with correct token', () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-token',
        'hub.challenge': 'test-challenge'
      };

      botController.getWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('test-challenge');
    });

    it('should reject webhook with incorrect token', () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge'
      };

      botController.getWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should reject webhook with incorrect mode', () => {
      req.query = {
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test-token',
        'hub.challenge': 'test-challenge'
      };

      botController.getWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should reject webhook with missing parameters', () => {
      req.query = {
        'hub.mode': 'subscribe'
      };

      botController.getWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('postWebhook', () => {
    it('should process text message successfully', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+1234567890',
                type: 'text',
                text: { body: 'Hello' }
              }]
            }
          }]
        }]
      };

      const mockResponse = {
        messaging_product: 'whatsapp',
        to: '+1234567890',
        text: { body: 'Response message' }
      };

      handleChatFlow.mockResolvedValue(mockResponse);
      axios.post.mockResolvedValue({ data: { success: true } });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).toHaveBeenCalledWith({
        from: '+1234567890',
        text: 'Hello',
        type: 'text',
        interactive: null
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v19.0/123456789/messages',
        mockResponse,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('Mensaje procesado y respuesta enviada.');
    });

    it('should process interactive button message', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+1234567890',
                type: 'interactive',
                interactive: {
                  button_reply: { id: 'button_1' }
                }
              }]
            }
          }]
        }]
      };

      const mockResponse = {
        messaging_product: 'whatsapp',
        to: '+1234567890',
        text: { body: 'Button processed' }
      };

      handleChatFlow.mockResolvedValue(mockResponse);
      axios.post.mockResolvedValue({ data: { success: true } });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).toHaveBeenCalledWith({
        from: '+1234567890',
        text: 'button_1',
        type: 'interactive',
        interactive: { button_reply: { id: 'button_1' } }
      });
    });

    it('should process interactive list message', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+1234567890',
                type: 'interactive',
                interactive: {
                  list_reply: { id: 'list_item_1' }
                }
              }]
            }
          }]
        }]
      };

      const mockResponse = {
        messaging_product: 'whatsapp',
        to: '+1234567890',
        text: { body: 'List item processed' }
      };

      handleChatFlow.mockResolvedValue(mockResponse);
      axios.post.mockResolvedValue({ data: { success: true } });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).toHaveBeenCalledWith({
        from: '+1234567890',
        text: 'list_item_1',
        type: 'interactive',
        interactive: { list_reply: { id: 'list_item_1' } }
      });
    });

    it('should handle unsupported message types', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+1234567890',
                type: 'audio'
              }]
            }
          }]
        }]
      };

      await botController.postWebhook(req, res);

      expect(handleChatFlow).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it('should handle non-message webhook events', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              statuses: [{ id: 'status_1' }]
            }
          }]
        }]
      };

      await botController.postWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('Evento de webhook no procesado (no es un mensaje).');
    });

    it('should handle errors during message processing', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+1234567890',
                type: 'text',
                text: { body: 'Hello' }
              }]
            }
          }]
        }]
      };

      handleChatFlow.mockRejectedValue(new Error('Processing error'));

      await botController.postWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error interno del servidor.');
    });

    it('should handle axios errors with response data', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+1234567890',
                type: 'text',
                text: { body: 'Hello' }
              }]
            }
          }]
        }]
      };

      const mockResponse = {
        messaging_product: 'whatsapp',
        to: '+1234567890',
        text: { body: 'Response' }
      };

      handleChatFlow.mockResolvedValue(mockResponse);
      axios.post.mockRejectedValue({
        response: { data: { error: 'API error' } }
      });

      await botController.postWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error interno del servidor.');
    });
  });
});

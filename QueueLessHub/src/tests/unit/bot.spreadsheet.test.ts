const botSpreadsheetController = require('../../controller/bot.spreadsheet.controller').default;
const { handleChatFlowSpreadsheet } = require('../../services/chatflow.spreadsheet.service');
const axios = require('axios');

jest.mock('../../services/chatflow.spreadsheet.service');
jest.mock('axios');

describe('Bot Spreadsheet Controller', () => {
  let req, res;
  let next;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn(),
      json: jest.fn(),
    };
    next = jest.fn();
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
        'hub.challenge': 'test-challenge',
      };

      botSpreadsheetController.getWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.type).toHaveBeenCalledWith('text/plain');
      expect(res.send).toHaveBeenCalledWith('test-challenge');
    });

    it('should reject webhook with incorrect token', () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge',
      };

      botSpreadsheetController.getWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should reject webhook with missing mode', () => {
      req.query = {
        'hub.verify_token': 'test-token',
        'hub.challenge': 'test-challenge',
      };

      botSpreadsheetController.getWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('postWebhook', () => {
    it('should process text message successfully', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+1234567890',
                      type: 'text',
                      text: { body: 'Hola' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const mockResponse = {
        responsePayload: {
          messaging_product: 'whatsapp',
          to: '+1234567890',
          text: { body: 'Respuesta del spreadsheet' },
        },
      };

      handleChatFlowSpreadsheet.mockResolvedValue(mockResponse);
      axios.post.mockResolvedValue({ data: { success: true } });

      await botSpreadsheetController.postWebhook(req, res, next);

      expect(handleChatFlowSpreadsheet).toHaveBeenCalledWith({
        from: '+1234567890',
        text: 'Hola',
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v26.0/123456789/messages',
        mockResponse.responsePayload,
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('Mensaje procesado y respuesta enviada.');
    });

    it('should process interactive button message', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+1234567890',
                      type: 'interactive',
                      interactive: {
                        button_reply: { id: 'opcion_1' },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const mockResponse = {
        responsePayload: {
          messaging_product: 'whatsapp',
          to: '+1234567890',
          text: { body: 'Opción procesada' },
        },
      };

      handleChatFlowSpreadsheet.mockResolvedValue(mockResponse);
      axios.post.mockResolvedValue({ data: { success: true } });

      await botSpreadsheetController.postWebhook(req, res, next);

      expect(handleChatFlowSpreadsheet).toHaveBeenCalledWith({
        from: '+1234567890',
        text: 'opcion_1',
      });
    });

    it('should process interactive list message', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+1234567890',
                      type: 'interactive',
                      interactive: {
                        list_reply: { id: 'doctor_1' },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const mockResponse = {
        responsePayload: {
          messaging_product: 'whatsapp',
          to: '+1234567890',
          text: { body: 'Doctor seleccionado' },
        },
      };

      handleChatFlowSpreadsheet.mockResolvedValue(mockResponse);
      axios.post.mockResolvedValue({ data: { success: true } });

      await botSpreadsheetController.postWebhook(req, res, next);

      expect(handleChatFlowSpreadsheet).toHaveBeenCalledWith({
        from: '+1234567890',
        text: 'doctor_1',
      });
    });

    it('should handle unsupported message types', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+1234567890',
                      type: 'image',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await botSpreadsheetController.postWebhook(req, res, next);

      expect(handleChatFlowSpreadsheet).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it('should handle non-message webhook events', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [{ id: 'read_receipt' }],
                },
              },
            ],
          },
        ],
      };

      await botSpreadsheetController.postWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('Evento de webhook no procesado (no es un mensaje).');
    });

    it('should handle errors during processing', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+1234567890',
                      type: 'text',
                      text: { body: 'test' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      handleChatFlowSpreadsheet.mockRejectedValue(new Error('Spreadsheet error'));

      await botSpreadsheetController.postWebhook(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle axios errors with response data', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+1234567890',
                      type: 'text',
                      text: { body: 'test' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const mockResponse = {
        responsePayload: {
          messaging_product: 'whatsapp',
          to: '+1234567890',
          text: { body: 'Response' },
        },
      };

      handleChatFlowSpreadsheet.mockResolvedValue(mockResponse);
      axios.post.mockRejectedValue({
        response: { data: { error: 'WhatsApp API error' } },
      });

      await botSpreadsheetController.postWebhook(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Object));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle interactive message without button_reply or list_reply', async () => {
      req.body = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+1234567890',
                      type: 'interactive',
                      interactive: {},
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const mockResponse = {
        responsePayload: {
          messaging_product: 'whatsapp',
          to: '+1234567890',
          text: { body: 'Empty interactive' },
        },
      };

      handleChatFlowSpreadsheet.mockResolvedValue(mockResponse);
      axios.post.mockResolvedValue({ data: { success: true } });

      await botSpreadsheetController.postWebhook(req, res, next);

      expect(handleChatFlowSpreadsheet).toHaveBeenCalledWith({
        from: '+1234567890',
        text: '',
      });
    });
  });
});

export {};

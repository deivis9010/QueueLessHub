const botController = require('../../controller/bot.controller').default;
const { handleChatFlow } = require('../../services/chatflow.service');
const { sendWhatsAppMessage } = require('../../services/whatsapp.client');
const { enqueueFailedDelivery } = require('../../services/outbox.service');

jest.mock('../../services/chatflow.service');
jest.mock('../../services/whatsapp.client');
jest.mock('../../services/outbox.service');

const webhookWith = (...messages: object[]) => ({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ value: { messages } }] }],
});

describe('Bot Controller', () => {
  let req: { query: Record<string, string>; body: unknown };
  let res: { status: jest.Mock; type: jest.Mock; send: jest.Mock; sendStatus: jest.Mock; json: jest.Mock };

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
    jest.clearAllMocks();

    process.env.WHATSAPP_TOKEN = 'test-token';
    process.env.PHONE_NUMBER_ID = '123456789';
  });

  describe('getWebhook', () => {
    it('should verify webhook with correct token', () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-token',
        'hub.challenge': '1158201444',
      };

      botController.getWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.type).toHaveBeenCalledWith('text/plain');
      expect(res.send).toHaveBeenCalledWith('1158201444');
    });

    it('should reject webhook with incorrect token', () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge',
      };

      botController.getWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should reject webhook with incorrect mode', () => {
      req.query = {
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test-token',
        'hub.challenge': 'test-challenge',
      };

      botController.getWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should reject webhook with missing parameters', () => {
      req.query = {
        'hub.mode': 'subscribe',
      };

      botController.getWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('postWebhook', () => {
    it('should process a text message and send the reply', async () => {
      handleChatFlow.mockResolvedValue({ conversationId: 'conv-1', payload: { type: 'text', to: '+1234567890' } });
      req.body = webhookWith({ id: 'wamid.1', from: '+1234567890', type: 'text', text: { body: '  hola  ' } });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).toHaveBeenCalledWith({
        messageId: 'wamid.1',
        from: '+1234567890',
        value: 'hola',
      });
      expect(sendWhatsAppMessage).toHaveBeenCalledWith({ type: 'text', to: '+1234567890' });
      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it('should use the button id for interactive reply taps', async () => {
      handleChatFlow.mockResolvedValue(null);
      req.body = webhookWith({
        id: 'wamid.2',
        from: '+1234567890',
        type: 'interactive',
        interactive: { type: 'button_reply', button_reply: { id: 'schedule_app', title: 'Schedule' } },
      });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).toHaveBeenCalledWith({
        messageId: 'wamid.2',
        from: '+1234567890',
        value: 'schedule_app',
      });
    });

    it('should use the row id for list reply taps', async () => {
      handleChatFlow.mockResolvedValue(null);
      req.body = webhookWith({
        id: 'wamid.3',
        from: '+1234567890',
        type: 'interactive',
        interactive: { type: 'list_reply', list_reply: { id: 'doctor_abc', title: 'Dr. Test' } },
      });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).toHaveBeenCalledWith(expect.objectContaining({ value: 'doctor_abc' }));
    });

    it('should use the payload of quick-reply template taps (type button)', async () => {
      handleChatFlow.mockResolvedValue(null);
      req.body = webhookWith({
        id: 'wamid.4',
        from: '+1234567890',
        type: 'button',
        button: { payload: 'check_status', text: 'Check status' },
      });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).toHaveBeenCalledWith(expect.objectContaining({ value: 'check_status' }));
    });

    it('should not send anything when the flow returns no reply', async () => {
      handleChatFlow.mockResolvedValue(null);
      req.body = webhookWith({ id: 'wamid.5', from: '+1234567890', type: 'text', text: { body: 'hi' } });

      await botController.postWebhook(req, res);

      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it('should ignore unsupported message types without calling the flow', async () => {
      req.body = webhookWith({ id: 'wamid.6', from: '+1234567890', type: 'image', image: {} });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it('should ignore empty text messages', async () => {
      req.body = webhookWith({ id: 'wamid.7', from: '+1234567890', type: 'text', text: { body: '   ' } });

      await botController.postWebhook(req, res);

      expect(handleChatFlow).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it('should queue the reply for retry when sending fails and still respond 200', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const payload = { type: 'text', to: '+1234567890' };
      handleChatFlow.mockResolvedValue({ conversationId: 'conv-8', payload });
      sendWhatsAppMessage.mockRejectedValue(new Error('Graph API down'));
      req.body = webhookWith({ id: 'wamid.8', from: '+1234567890', type: 'text', text: { body: 'hola' } });

      await botController.postWebhook(req, res);

      expect(enqueueFailedDelivery).toHaveBeenCalledWith({
        conversationId: 'conv-8',
        to: '+1234567890',
        payload,
        error: 'Graph API down',
      });
      expect(res.sendStatus).toHaveBeenCalledWith(200);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should not queue anything when the reply was sent', async () => {
      handleChatFlow.mockResolvedValue({ conversationId: 'conv-9', payload: { type: 'text', to: '+1234567890' } });
      sendWhatsAppMessage.mockResolvedValue(undefined);
      req.body = webhookWith({ id: 'wamid.12', from: '+1234567890', type: 'text', text: { body: 'hola' } });

      await botController.postWebhook(req, res);

      expect(enqueueFailedDelivery).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it('should still respond 200 when the flow throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      handleChatFlow.mockRejectedValue(new Error('DB down'));
      req.body = webhookWith({ id: 'wamid.9', from: '+1234567890', type: 'text', text: { body: 'hola' } });

      await botController.postWebhook(req, res);

      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledWith(200);
      consoleErrorSpy.mockRestore();
    });

    it('should process every message in the payload, even when one fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      handleChatFlow.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(null);
      req.body = webhookWith(
        { id: 'wamid.10', from: '+1111111111', type: 'text', text: { body: 'a' } },
        { id: 'wamid.11', from: '+2222222222', type: 'text', text: { body: 'b' } }
      );

      await botController.postWebhook(req, res);

      expect(handleChatFlow).toHaveBeenCalledTimes(2);
      expect(handleChatFlow).toHaveBeenNthCalledWith(2, expect.objectContaining({ from: '+2222222222', value: 'b' }));
      expect(res.sendStatus).toHaveBeenCalledWith(200);
      consoleErrorSpy.mockRestore();
    });

    it('should ignore payloads that are not from a WhatsApp business account', async () => {
      req.body = { object: 'page', entry: [] };

      await botController.postWebhook(req, res);

      expect(handleChatFlow).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });
  });
});

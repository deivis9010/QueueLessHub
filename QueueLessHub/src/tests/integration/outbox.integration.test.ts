import Client from '../../models/client.model';
import Conversation from '../../models/conversation.model';
import OutboundMessage from '../../models/outbound-message.model';
import {
  MAX_DELIVERY_ATTEMPTS,
  enqueueFailedDelivery,
  processDueMessages,
} from '../../services/outbox.service';
import { sendWhatsAppMessage } from '../../services/whatsapp.client';
import type { WhatsAppPayload } from '../../types/whatsapp.types';

jest.mock('../../services/whatsapp.client');

const sendMock = jest.mocked(sendWhatsAppMessage);
const PHONE = '+test3000000001';

const replyPayload = (): WhatsAppPayload => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: PHONE,
  type: 'text',
  text: { body: 'Hi' },
});

const createConversation = async (state: 'active' | 'closed' = 'active') => {
  const client = await Client.create({ phone: PHONE, name: 'Outbox Test' });
  return Conversation.create({
    client: client._id,
    state,
    currentStep: 'awaiting_choice',
    closedReason: state === 'closed' ? 'completed' : undefined,
    messages: [],
  });
};

const enqueueReply = async (conversationId: string) =>
  enqueueFailedDelivery({
    conversationId,
    to: PHONE,
    payload: replyPayload(),
    error: 'Graph API down',
  });

/** Moves the only queued item to the past so the worker treats it as due. */
const makeDue = () =>
  OutboundMessage.updateOne({}, { $set: { nextAttemptAt: new Date(Date.now() - 1000) } });

describe('Outbox (integration)', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('should keep a failed reply pending until its retry time', async () => {
    const conversation = await createConversation();
    await enqueueReply(String(conversation._id));

    const attempted = await processDueMessages();

    const item = await OutboundMessage.findOne({});
    expect(attempted).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
    expect(item?.status).toBe('pending');
    expect(item?.attempts).toBe(1);
    expect(item?.lastError).toBe('Graph API down');
    expect(item?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should deliver a queued reply once it is due', async () => {
    const conversation = await createConversation();
    await enqueueReply(String(conversation._id));
    await makeDue();
    sendMock.mockResolvedValue(undefined);

    const attempted = await processDueMessages();

    const item = await OutboundMessage.findOne({});
    expect(attempted).toBe(1);
    expect(sendMock).toHaveBeenCalledWith(replyPayload());
    expect(item?.status).toBe('sent');
    expect(item?.attempts).toBe(2);
  });

  it('should close the conversation with send_failed after the last attempt fails', async () => {
    const conversation = await createConversation();
    await enqueueReply(String(conversation._id));
    sendMock.mockRejectedValue(new Error('Graph API down'));

    for (let attempt = 1; attempt < MAX_DELIVERY_ATTEMPTS; attempt += 1) {
      await makeDue();
      await processDueMessages();
    }

    const item = await OutboundMessage.findOne({});
    const closed = await Conversation.findById(conversation._id);
    expect(sendMock).toHaveBeenCalledTimes(MAX_DELIVERY_ATTEMPTS - 1);
    expect(item?.status).toBe('failed');
    expect(item?.attempts).toBe(MAX_DELIVERY_ATTEMPTS);
    expect(closed?.state).toBe('closed');
    expect(closed?.closedReason).toBe('send_failed');
  });

  it('should keep retrying while attempts remain', async () => {
    const conversation = await createConversation();
    await enqueueReply(String(conversation._id));
    sendMock.mockRejectedValue(new Error('Graph API down'));
    await makeDue();

    await processDueMessages();

    const item = await OutboundMessage.findOne({});
    const stillOpen = await Conversation.findById(conversation._id);
    expect(item?.status).toBe('pending');
    expect(item?.attempts).toBe(2);
    expect(item?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(stillOpen?.state).toBe('active');
  });

  it('should not send the same reply twice when two workers run at once', async () => {
    const conversation = await createConversation();
    await enqueueReply(String(conversation._id));
    await makeDue();
    sendMock.mockResolvedValue(undefined);

    await Promise.all([processDueMessages(), processDueMessages()]);

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('should not change a conversation that already closed normally', async () => {
    const conversation = await createConversation('closed');
    await enqueueReply(String(conversation._id));
    sendMock.mockRejectedValue(new Error('Graph API down'));

    for (let attempt = 1; attempt < MAX_DELIVERY_ATTEMPTS; attempt += 1) {
      await makeDue();
      await processDueMessages();
    }

    const closed = await Conversation.findById(conversation._id);
    expect(closed?.closedReason).toBe('completed');
  });
});

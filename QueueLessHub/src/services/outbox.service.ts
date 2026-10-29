import type { Types } from 'mongoose';

import OutboundMessage from '../models/outbound-message.model';
import type { WhatsAppPayload } from '../types/whatsapp.types';

import ConversationService from './conversation.service';
import { sendWhatsAppMessage } from './whatsapp.client';

/** Total send attempts per reply, including the inline attempt made by the controller. */
export const MAX_DELIVERY_ATTEMPTS = 3;
/** Wait before the next attempt, indexed by the attempts already made (1 -> 30 s, 2 -> 2 min). */
const RETRY_DELAYS_MS = [30_000, 120_000];
/** Claimed items are hidden from other workers for this long, so a crashed worker does not block them forever. */
const CLAIM_LEASE_MS = 60_000;
const BATCH_SIZE = 20;
export const WORKER_INTERVAL_MS = 15_000;

export interface OutboxRecord {
  _id: Types.ObjectId;
  conversation?: Types.ObjectId | null;
  to: string;
  payload: WhatsAppPayload;
  attempts: number;
}

export interface FailedDeliveryInput {
  conversationId: string;
  to: string;
  payload: WhatsAppPayload;
  error: string;
}

const retryDelayAfter = (attempts: number): number => RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length) - 1];

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Stores a reply whose inline send just failed. Its first attempt is already counted.
 */
export const enqueueFailedDelivery = async (input: FailedDeliveryInput): Promise<void> => {
  await OutboundMessage.create({
    conversation: input.conversationId,
    to: input.to,
    payload: input.payload,
    attempts: 1,
    status: 'pending',
    nextAttemptAt: new Date(Date.now() + retryDelayAfter(1)),
    lastError: input.error,
  });
};

/**
 * Atomically claims the oldest due item. The lease moves `nextAttemptAt` forward, so two workers never claim the same item.
 */
const claimNextDue = (): Promise<OutboxRecord | null> => {
  const now = new Date();
  return OutboundMessage.findOneAndUpdate(
    { status: 'pending', nextAttemptAt: { $lte: now } },
    { $set: { nextAttemptAt: new Date(now.getTime() + CLAIM_LEASE_MS) } },
    { sort: { nextAttemptAt: 1 }, new: true }
  ).lean<OutboxRecord>();
};

const deliver = async (item: OutboxRecord): Promise<void> => {
  const attempts = item.attempts + 1;

  try {
    await sendWhatsAppMessage(item.payload);
    await OutboundMessage.updateOne(
      { _id: item._id },
      { $set: { status: 'sent', attempts, lastError: null } }
    );
  } catch (error) {
    const lastError = describeError(error);

    if (attempts >= MAX_DELIVERY_ATTEMPTS) {
      await OutboundMessage.updateOne({ _id: item._id }, { $set: { status: 'failed', attempts, lastError } });
      // The user never got the reply, so the open conversation cannot continue. Closing it is a no-op if it already ended.
      if (item.conversation) {
        await ConversationService.closeConversation(String(item.conversation), 'send_failed');
      }
      return;
    }

    await OutboundMessage.updateOne(
      { _id: item._id },
      {
        $set: {
          attempts,
          lastError,
          nextAttemptAt: new Date(Date.now() + retryDelayAfter(attempts)),
        },
      }
    );
  }
};

/**
 * Sends every due item, up to BATCH_SIZE per run. Returns the number of items attempted.
 */
export const processDueMessages = async (): Promise<number> => {
  let attempted = 0;

  for (let index = 0; index < BATCH_SIZE; index += 1) {
    const item = await claimNextDue();
    if (!item) {
      break;
    }
    await deliver(item);
    attempted += 1;
  }

  return attempted;
};

/**
 * Runs processDueMessages on an interval. Overlapping runs are skipped.
 * Must be started from the long-running server process, not from a serverless handler.
 */
export const startOutboxWorker = (intervalMs: number = WORKER_INTERVAL_MS): NodeJS.Timeout => {
  let running = false;

  const timer = setInterval(() => {
    if (running) {
      return;
    }
    running = true;
    processDueMessages()
      .catch((error: unknown) => {
        console.error('Outbox worker run failed:', describeError(error));
      })
      .finally(() => {
        running = false;
      });
  }, intervalMs);

  timer.unref();
  return timer;
};

export default {
  enqueueFailedDelivery,
  processDueMessages,
  startOutboxWorker,
};

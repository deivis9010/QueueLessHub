import ProcessedMessage from '../models/processed-message.model';

const DUPLICATE_KEY_ERROR_CODE = 11000;

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === DUPLICATE_KEY_ERROR_CODE;

/**
 * Marks a WhatsApp message id as processed.
 * Returns false when the id was already processed (duplicate delivery).
 */
const claim = async (messageId: string): Promise<boolean> => {
  try {
    await ProcessedMessage.create({ wamid: messageId });
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return false;
    }
    throw error;
  }
};

export default { claim };

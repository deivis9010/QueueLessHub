import axios from 'axios';

import { sendWhatsAppMessage } from '../../services/whatsapp.client';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);
const payload = {
  messaging_product: 'whatsapp' as const,
  recipient_type: 'individual' as const,
  to: '+1234567890',
  type: 'text' as const,
  text: { body: 'hola' },
};

describe('WhatsApp client', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PHONE_NUMBER_ID = '123456789';
    process.env.WHATSAPP_TOKEN = 'test-token';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should post to the configured Graph API version', async () => {
    mockedAxios.isAxiosError.mockReturnValue(false);
    mockedAxios.post.mockResolvedValue({ data: {} });

    await sendWhatsAppMessage(payload);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v26.0/123456789/messages',
      payload,
      expect.any(Object)
    );
  });

  it('should include Meta error code and message when the API rejects the message', async () => {
    const axiosError = Object.assign(new Error('Request failed with status code 400'), {
      response: {
        status: 400,
        data: { error: { message: 'Recipient phone number not in allowed list', code: 131030 } },
      },
    });
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue(axiosError);

    await expect(sendWhatsAppMessage(payload)).rejects.toThrow(
      'WhatsApp API 400: 131030 Recipient phone number not in allowed list'
    );
  });

  it('should fall back to the raw response body when Meta returns no error object', async () => {
    const axiosError = Object.assign(new Error('Request failed with status code 500'), {
      response: { status: 500, data: 'upstream down' },
    });
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue(axiosError);

    await expect(sendWhatsAppMessage(payload)).rejects.toThrow('WhatsApp API 500: "upstream down"');
  });

  it('should keep the original message for network errors without a response', async () => {
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue(new Error('socket hang up'));

    await expect(sendWhatsAppMessage(payload)).rejects.toThrow('socket hang up');
  });

  it('should throw when credentials are missing', async () => {
    delete process.env.WHATSAPP_TOKEN;

    await expect(sendWhatsAppMessage(payload)).rejects.toThrow('WhatsApp credentials are not configured');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

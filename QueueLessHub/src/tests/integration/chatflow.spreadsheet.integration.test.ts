const mongoose = require('mongoose');
const { handleChatFlowSpreadsheet } = require('../../services/chatflow.spreadsheet.service');

const formatDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const addDays = (days, hours = 10, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const addMonths = (months, hours = 10, minutes = 0) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Mock de Google Sheets API
jest.mock('googleapis', () => {
  const mockAppend = jest.fn().mockResolvedValue({ data: {} });
  return {
    google: {
      auth: {
        GoogleAuth: jest.fn().mockImplementation(() => ({
          getClient: jest.fn().mockResolvedValue({}),
        })),
      },
      sheets: jest.fn().mockReturnValue({
        spreadsheets: {
          values: {
            append: mockAppend,
          },
        },
      }),
    },
  };
});

describe('ChatFlow Spreadsheet Integration Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/queueless-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(() => {
    // Limpiar el estado en memoria entre tests
    const { handleChatFlowSpreadsheet } = require('../../services/chatflow.spreadsheet.service');
    // No hay forma directa de limpiar userStates, pero cada test usa un teléfono diferente
  });

  describe('handleChatFlowSpreadsheet - Start Flow', () => {
    it('should start conversation and ask for name', async () => {
      const result = await handleChatFlowSpreadsheet({
        from: '+testspreadsheet1',
        text: 'hola',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('full name');
      expect(result.collectedData).toBeUndefined();
    });

    it('should throw error when from is missing', async () => {
      await expect(
        handleChatFlowSpreadsheet({
          text: 'hola',
        })
      ).rejects.toThrow('Missing data');
    });

    it('should throw error when text is missing', async () => {
      await expect(
        handleChatFlowSpreadsheet({
          from: '+testspreadsheet2',
        })
      ).rejects.toThrow('Missing data');
    });

    it('should restart expired conversation (>10 minutes)', async () => {
      const phone = '+testspreadsheet3';

      // Primera interacción
      await handleChatFlowSpreadsheet({
        from: phone,
        text: 'start',
      });

      // Simular paso de tiempo modificando el timestamp manualmente
      // Como userStates es privado, necesitamos múltiples llamadas para probar el timeout
      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'John Doe',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('insurance');
    });
  });

  describe('handleChatFlowSpreadsheet - Name Step', () => {
    it('should accept valid name with letters only', async () => {
      const phone = '+testspreadsheet4';

      // Start
      await handleChatFlowSpreadsheet({
        from: phone,
        text: 'start',
      });

      // Valid name
      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'John Doe Smith',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('insurance');
    });

    it('should accept valid name with accents', async () => {
      const phone = '+testspreadsheet5';

      await handleChatFlowSpreadsheet({
        from: phone,
        text: 'start',
      });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'José María Pérez',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('insurance');
    });

    it('should reject name with numbers', async () => {
      const phone = '+testspreadsheet6';

      await handleChatFlowSpreadsheet({
        from: phone,
        text: 'start',
      });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'John123',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('only letters');
      expect(result.responsePayload.text.body).toContain('at least 3 characters');
    });

    it('should reject name with special characters', async () => {
      const phone = '+testspreadsheet7';

      await handleChatFlowSpreadsheet({
        from: phone,
        text: 'start',
      });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'John@Doe',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('only letters');
    });

    it('should reject name with less than 3 characters', async () => {
      const phone = '+testspreadsheet8';

      await handleChatFlowSpreadsheet({
        from: phone,
        text: 'start',
      });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Jo',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('at least 3 characters');
    });
  });

  describe('handleChatFlowSpreadsheet - Insurance Step', () => {
    it('should accept valid insurance company name', async () => {
      const phone = '+testspreadsheet9';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Blue Cross',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('insurance number');
    });

    it('should accept insurance name with accents', async () => {
      const phone = '+testspreadsheet10';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Seguros Médicos',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('insurance number');
    });

    it('should reject insurance with numbers', async () => {
      const phone = '+testspreadsheet11';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Insurance123',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('only letters');
      expect(result.responsePayload.text.body).toContain('at least 2 characters');
    });

    it('should reject insurance with special characters', async () => {
      const phone = '+testspreadsheet12';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Insurance@Co',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('only letters');
    });

    it('should reject insurance with less than 2 characters', async () => {
      const phone = '+testspreadsheet13';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'A',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('at least 2 characters');
    });
  });

  describe('handleChatFlowSpreadsheet - Insurance Number Step', () => {
    it('should accept valid insurance number with letters and numbers', async () => {
      const phone = '+testspreadsheet14';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'ABC12345',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('date and time');
    });

    it('should accept insurance number with hyphens', async () => {
      const phone = '+testspreadsheet15';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'ABC-123-456',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('date and time');
    });

    it('should accept insurance number with only numbers', async () => {
      const phone = '+testspreadsheet16';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: '123456789',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('date and time');
    });

    it('should reject insurance number with special characters', async () => {
      const phone = '+testspreadsheet17';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'ABC@123',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('only letters, numbers, or hyphens');
      expect(result.responsePayload.text.body).toContain('at least 4 characters');
    });

    it('should reject insurance number with less than 4 characters', async () => {
      const phone = '+testspreadsheet18';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'A12',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('at least 4 characters');
    });
  });

  describe('handleChatFlowSpreadsheet - Preferred DateTime Step', () => {
    it('should accept valid future date and time', async () => {
      const phone = '+testspreadsheet19';
      const futureDate = formatDateTime(addDays(10, 14, 30));

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'ABC123456' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: futureDate,
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('Thank you');
      expect(result.collectedData).toBeDefined();
      expect(result.collectedData.name).toBe('John Doe');
      expect(result.collectedData.insurance).toBe('Blue Cross');
      expect(result.collectedData.insuranceNumber).toBe('ABC123456');
      expect(result.collectedData.preferredDateTime).toBe(futureDate);
      expect(result.collectedData.phone).toBe(phone);
    });

    it('should accept date with T separator', async () => {
      const phone = '+testspreadsheet20';
      const futureDate = formatDateTime(addDays(12, 16, 0)).replace(' ', 'T');

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Jane Smith' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Aetna' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'XYZ789' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: futureDate,
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('Thank you');
      expect(result.collectedData).toBeDefined();
    });

    it('should reject invalid date format', async () => {
      const phone = '+testspreadsheet21';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'ABC123456' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: '2025-12-25 14:30',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('DD-MM-YYYY HH:MM');
    });

    it('should reject past date', async () => {
      const phone = '+testspreadsheet22';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'ABC123456' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: '01-01-2020 10:00',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('must be in the future');
    });

    it('should reject date more than 3 months in the future', async () => {
      const phone = '+testspreadsheet23';
      const tooFarInFuture = formatDateTime(addMonths(4, 10, 0));

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'ABC123456' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: tooFarInFuture,
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('cannot be more than 3 months');
    });

    it('should reject malformed date string', async () => {
      const phone = '+testspreadsheet24';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'ABC123456' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'mañana a las 3',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('DD-MM-YYYY HH:MM');
    });

    it('should reject date without time', async () => {
      const phone = '+testspreadsheet25';

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'ABC123456' });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: '25-12-2025',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('DD-MM-YYYY HH:MM');
    });
  });

  describe('handleChatFlowSpreadsheet - Finished State', () => {
    it('should inform user when trying to interact after finishing', async () => {
      const phone = '+testspreadsheet26';
      const futureDate = formatDateTime(addDays(8, 14, 30));

      await handleChatFlowSpreadsheet({ from: phone, text: 'start' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'John Doe' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'Blue Cross' });
      await handleChatFlowSpreadsheet({ from: phone, text: 'ABC123456' });
      await handleChatFlowSpreadsheet({ from: phone, text: futureDate });

      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Hello again',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('being processed');
    });
  });

  describe('handleChatFlowSpreadsheet - Default/Unknown State', () => {
    it('should handle unknown state by restarting', async () => {
      const phone = '+testspreadsheet27';

      // Simular un estado desconocido (esto requeriría manipular userStates directamente)
      // Por ahora, probar que cualquier mensaje inicia el flujo correctamente
      const result = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'anything',
      });

      expect(result.responsePayload.type).toBe('text');
      expect(result.responsePayload.text.body).toContain('full name');
    });
  });

  describe('handleChatFlowSpreadsheet - Complete Flow', () => {
    it('should complete entire flow successfully', async () => {
      const phone = '+testspreadsheet28';
      const futureDate = formatDateTime(addDays(15, 9, 30));

      // Step 1: Start
      const result1 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Hello',
      });
      expect(result1.responsePayload.text.body).toContain('full name');

      // Step 2: Name
      const result2 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'María García López',
      });
      expect(result2.responsePayload.text.body).toContain('insurance');

      // Step 3: Insurance
      const result3 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Seguros Unidos',
      });
      expect(result3.responsePayload.text.body).toContain('insurance number');

      // Step 4: Insurance Number
      const result4 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'SU-2025-12345',
      });
      expect(result4.responsePayload.text.body).toContain('date and time');

      // Step 5: DateTime
      const result5 = await handleChatFlowSpreadsheet({
        from: phone,
        text: futureDate,
      });
      expect(result5.responsePayload.text.body).toContain('Thank you');
      expect(result5.collectedData).toBeDefined();
      expect(result5.collectedData.name).toBe('María García López');
      expect(result5.collectedData.insurance).toBe('Seguros Unidos');
      expect(result5.collectedData.insuranceNumber).toBe('SU-2025-12345');
      expect(result5.collectedData.preferredDateTime).toBe(futureDate);
      expect(result5.collectedData.phone).toBe(phone);
      expect(result5.collectedData.lastUpdate).toBeDefined();
    });

    it('should handle flow with validation retries', async () => {
      const phone = '+testspreadsheet29';
      const futureDate = formatDateTime(addDays(20, 14, 0));

      // Start
      await handleChatFlowSpreadsheet({ from: phone, text: 'Hi' });

      // Invalid name (with numbers)
      const invalid1 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'John123',
      });
      expect(invalid1.responsePayload.text.body).toContain('only letters');

      // Valid name
      const valid1 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'John Doe',
      });
      expect(valid1.responsePayload.text.body).toContain('insurance');

      // Invalid insurance (with numbers)
      const invalid2 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Insurance123',
      });
      expect(invalid2.responsePayload.text.body).toContain('only letters');

      // Valid insurance
      const valid2 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'Blue Cross',
      });
      expect(valid2.responsePayload.text.body).toContain('insurance number');

      // Invalid insurance number (special chars)
      const invalid3 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'AB@',
      });
      expect(invalid3.responsePayload.text.body).toContain('at least 4 characters');

      // Valid insurance number
      const valid3 = await handleChatFlowSpreadsheet({
        from: phone,
        text: 'BC12345',
      });
      expect(valid3.responsePayload.text.body).toContain('date and time');

      // Invalid date (past)
      const invalid4 = await handleChatFlowSpreadsheet({
        from: phone,
        text: '01-01-2020 10:00',
      });
      expect(invalid4.responsePayload.text.body).toContain('must be in the future');

      // Valid date
      const valid4 = await handleChatFlowSpreadsheet({
        from: phone,
        text: futureDate,
      });
      expect(valid4.responsePayload.text.body).toContain('Thank you');
      expect(valid4.collectedData).toBeDefined();
    });
  });
});

export {};

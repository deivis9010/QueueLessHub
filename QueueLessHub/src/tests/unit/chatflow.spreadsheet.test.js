const {
  createTextMessage,
  createReplyButtonsMessage,
  createListMessage
} = require('../../services/chatflow.spreadsheet.service');

describe('ChatFlow Spreadsheet Service - Helper Functions', () => {
  describe('createTextMessage', () => {
    it('should create a text message payload', () => {
      const to = '+9876543210';
      const text = 'Spreadsheet message test';

      const result = createTextMessage(to, text);

      expect(result).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+9876543210',
        type: 'text',
        text: {
          body: 'Spreadsheet message test'
        }
      });
    });

    it('should handle long text messages', () => {
      const longText = 'A'.repeat(500);
      const result = createTextMessage('+1234567890', longText);

      expect(result.text.body).toBe(longText);
      expect(result.text.body.length).toBe(500);
    });

    it('should handle multiline text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = createTextMessage('+1234567890', text);

      expect(result.text.body).toBe(text);
    });
  });

  describe('createReplyButtonsMessage', () => {
    it('should create a message with reply buttons', () => {
      const to = '+9876543210';
      const bodyText = 'Spreadsheet options:';
      const buttons = [
        { id: 'save', title: 'Save to Sheet' },
        { id: 'cancel', title: 'Cancel' }
      ];

      const result = createReplyButtonsMessage(to, bodyText, buttons);

      expect(result).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+9876543210',
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: 'Spreadsheet options:'
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'save',
                  title: 'Save to Sheet'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'cancel',
                  title: 'Cancel'
                }
              }
            ]
          }
        }
      });
    });

    it('should correctly map button properties', () => {
      const buttons = [
        { id: 'btn_id_1', title: 'First' },
        { id: 'btn_id_2', title: 'Second' }
      ];
      const result = createReplyButtonsMessage('+1234567890', 'Text', buttons);

      expect(result.interactive.action.buttons[0].reply.id).toBe('btn_id_1');
      expect(result.interactive.action.buttons[0].reply.title).toBe('First');
      expect(result.interactive.action.buttons[1].reply.id).toBe('btn_id_2');
      expect(result.interactive.action.buttons[1].reply.title).toBe('Second');
    });

    it('should handle buttons with special characters', () => {
      const buttons = [{ id: 'opt_1', title: 'Yes! ✓' }];
      const result = createReplyButtonsMessage('+1234567890', 'Confirm?', buttons);

      expect(result.interactive.action.buttons[0].reply.title).toBe('Yes! ✓');
    });
  });

  describe('createListMessage', () => {
    it('should create a list message payload', () => {
      const to = '+9876543210';
      const bodyText = 'Select from spreadsheet:';
      const buttonText = 'View Options';
      const rows = [
        { id: 'row_1', title: 'Row 1', description: 'First row' },
        { id: 'row_2', title: 'Row 2', description: 'Second row' }
      ];

      const result = createListMessage(to, bodyText, buttonText, rows);

      expect(result).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+9876543210',
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: 'Select from spreadsheet:'
          },
          action: {
            button: 'View Options',
            sections: [
              {
                title: 'Options',
                rows: [
                  { id: 'row_1', title: 'Row 1', description: 'First row' },
                  { id: 'row_2', title: 'Row 2', description: 'Second row' }
                ]
              }
            ]
          }
        }
      });
    });

    it('should handle rows with long descriptions', () => {
      const rows = [
        {
          id: 'long_desc',
          title: 'Title',
          description: 'This is a very long description that contains a lot of information about the option'
        }
      ];
      const result = createListMessage('+1234567890', 'Body', 'Button', rows);

      expect(result.interactive.action.sections[0].rows[0].description.length).toBeGreaterThan(50);
    });

    it('should preserve all row properties', () => {
      const rows = [
        { id: 'test_id', title: 'Test Title', description: 'Test Description' }
      ];
      const result = createListMessage('+1234567890', 'Body', 'Button', rows);

      const row = result.interactive.action.sections[0].rows[0];
      expect(row).toHaveProperty('id', 'test_id');
      expect(row).toHaveProperty('title', 'Test Title');
      expect(row).toHaveProperty('description', 'Test Description');
    });

    it('should handle numeric IDs converted to strings', () => {
      const rows = [{ id: '123', title: 'Numeric ID', description: 'Test' }];
      const result = createListMessage('+1234567890', 'Body', 'Button', rows);

      expect(result.interactive.action.sections[0].rows[0].id).toBe('123');
    });
  });
});

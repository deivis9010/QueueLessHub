const {
  createTextMessage,
  createReplyButtonsMessage,
  createListMessage
} = require('../../services/chatflow.service');

describe('ChatFlow Service - Helper Functions', () => {
  describe('createTextMessage', () => {
    it('should create a text message payload', () => {
      const to = '+1234567890';
      const text = 'Hello, this is a test message';

      const result = createTextMessage(to, text);

      expect(result).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+1234567890',
        type: 'text',
        text: {
          body: 'Hello, this is a test message'
        }
      });
    });

    it('should handle empty text', () => {
      const result = createTextMessage('+1234567890', '');

      expect(result.text.body).toBe('');
    });

    it('should handle special characters in text', () => {
      const text = 'Test with emojis 😊 and symbols !@#$%';
      const result = createTextMessage('+1234567890', text);

      expect(result.text.body).toBe(text);
    });
  });

  describe('createReplyButtonsMessage', () => {
    it('should create a message with reply buttons', () => {
      const to = '+1234567890';
      const bodyText = 'Please select an option:';
      const buttons = [
        { id: 'option_1', title: 'Option 1' },
        { id: 'option_2', title: 'Option 2' }
      ];

      const result = createReplyButtonsMessage(to, bodyText, buttons);

      expect(result).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+1234567890',
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: 'Please select an option:'
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'option_1',
                  title: 'Option 1'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'option_2',
                  title: 'Option 2'
                }
              }
            ]
          }
        }
      });
    });

    it('should handle single button', () => {
      const buttons = [{ id: 'single', title: 'Single Option' }];
      const result = createReplyButtonsMessage('+1234567890', 'Choose:', buttons);

      expect(result.interactive.action.buttons).toHaveLength(1);
      expect(result.interactive.action.buttons[0].reply.id).toBe('single');
    });

    it('should handle maximum 3 buttons', () => {
      const buttons = [
        { id: 'btn_1', title: 'Button 1' },
        { id: 'btn_2', title: 'Button 2' },
        { id: 'btn_3', title: 'Button 3' }
      ];
      const result = createReplyButtonsMessage('+1234567890', 'Choose:', buttons);

      expect(result.interactive.action.buttons).toHaveLength(3);
    });

    it('should handle empty buttons array', () => {
      const result = createReplyButtonsMessage('+1234567890', 'No options', []);

      expect(result.interactive.action.buttons).toEqual([]);
    });
  });

  describe('createListMessage', () => {
    it('should create a list message payload', () => {
      const to = '+1234567890';
      const bodyText = 'Select a doctor:';
      const buttonText = 'View Doctors';
      const rows = [
        { id: 'doc_1', title: 'Dr. Smith', description: 'Cardiologist' },
        { id: 'doc_2', title: 'Dr. Johnson', description: 'Neurologist' }
      ];

      const result = createListMessage(to, bodyText, buttonText, rows);

      expect(result).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+1234567890',
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: 'Select a doctor:'
          },
          action: {
            button: 'View Doctors',
            sections: [
              {
                title: 'Options',
                rows: [
                  { id: 'doc_1', title: 'Dr. Smith', description: 'Cardiologist' },
                  { id: 'doc_2', title: 'Dr. Johnson', description: 'Neurologist' }
                ]
              }
            ]
          }
        }
      });
    });

    it('should handle single row', () => {
      const rows = [{ id: 'single', title: 'Only Option', description: 'The only one' }];
      const result = createListMessage('+1234567890', 'Select:', 'Show List', rows);

      expect(result.interactive.action.sections[0].rows).toHaveLength(1);
      expect(result.interactive.action.sections[0].rows[0].id).toBe('single');
    });

    it('should handle multiple rows', () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        id: `row_${i}`,
        title: `Option ${i}`,
        description: `Description ${i}`
      }));
      const result = createListMessage('+1234567890', 'Choose:', 'Options', rows);

      expect(result.interactive.action.sections[0].rows).toHaveLength(10);
    });

    it('should handle empty rows array', () => {
      const result = createListMessage('+1234567890', 'Empty list', 'Show', []);

      expect(result.interactive.action.sections[0].rows).toEqual([]);
    });

    it('should preserve section title as "Options"', () => {
      const rows = [{ id: 'test', title: 'Test', description: 'Test desc' }];
      const result = createListMessage('+1234567890', 'Body', 'Button', rows);

      expect(result.interactive.action.sections[0].title).toBe('Options');
    });
  });
});

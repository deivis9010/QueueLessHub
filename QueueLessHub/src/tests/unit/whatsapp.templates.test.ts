import { TEMPLATE_LANGUAGE_CODE, WHATSAPP_TEMPLATES, buildTemplateMessage } from '../../services/whatsapp.templates';

const { appointmentReminder, appointmentCancelled } = WHATSAPP_TEMPLATES;

describe('WhatsApp templates', () => {
  describe('definitions', () => {
    it.each(Object.values(WHATSAPP_TEMPLATES))('should use snake_case names for $name', (template) => {
      expect(template.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it.each(Object.values(WHATSAPP_TEMPLATES))(
      'should have one body placeholder per parameter for $name',
      (template) => {
        const placeholders = template.body.match(/{{\d+}}/g) ?? [];
        expect(placeholders).toHaveLength(template.parameters.length);
        placeholders.forEach((placeholder, index) => {
          expect(placeholder).toBe(`{{${index + 1}}}`);
        });
      }
    );

    it('should keep every template in English and in the UTILITY category', () => {
      Object.values(WHATSAPP_TEMPLATES).forEach((template) => {
        expect(template.category).toBe('UTILITY');
        expect(template.body).toMatch(/^[\x20-\x7E]+$/);
      });
    });
  });

  describe('buildTemplateMessage', () => {
    it('should build a template payload with the body parameters in order', () => {
      const message = buildTemplateMessage('+1234567890', appointmentReminder, [
        'Ana',
        'Dr. Lopez',
        'Monday, June 1 at 10:00 AM',
      ]);

      expect(message).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+1234567890',
        type: 'template',
        template: {
          name: 'appointment_reminder',
          language: { code: TEMPLATE_LANGUAGE_CODE },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'Ana' },
                { type: 'text', text: 'Dr. Lopez' },
                { type: 'text', text: 'Monday, June 1 at 10:00 AM' },
              ],
            },
          ],
        },
      });
    });

    it('should use the en_US language code', () => {
      expect(TEMPLATE_LANGUAGE_CODE).toBe('en_US');
    });

    it('should reject a parameter count that does not match the template', () => {
      expect(() => buildTemplateMessage('+1234567890', appointmentCancelled, ['Ana', 'Dr. Lopez'])).toThrow(
        /expects 3 parameters, received 2/
      );
    });

    it('should reject an empty parameter', () => {
      expect(() => buildTemplateMessage('+1234567890', appointmentCancelled, ['Ana', '   ', 'Monday'])).toThrow(
        /doctor_name must not be empty/
      );
    });

    it('should reject parameters that contain line breaks or tabs', () => {
      expect(() => buildTemplateMessage('+1234567890', appointmentCancelled, ['Ana', 'Dr.\nLopez', 'Monday'])).toThrow(
        /unsupported whitespace/
      );
      expect(() => buildTemplateMessage('+1234567890', appointmentCancelled, ['Ana', 'Dr.\tLopez', 'Monday'])).toThrow(
        /unsupported whitespace/
      );
    });

    it('should reject parameters with more than four consecutive spaces', () => {
      expect(() =>
        buildTemplateMessage('+1234567890', appointmentCancelled, ['Ana', 'Dr.     Lopez', 'Monday'])
      ).toThrow(/unsupported whitespace/);
    });
  });
});
